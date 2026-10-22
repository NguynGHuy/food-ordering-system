using DatMonAnOnline.API.Models;
using DatMonAnOnline.API.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DatMonAnOnline.API.Services;

/// <summary>
/// One-shot startup repair for orders completed before automatic wallet
/// settlement was deployed. It deliberately excludes orders that are already
/// in reconciliation and is safe to run concurrently on multiple API nodes.
/// </summary>
public sealed class CompletedOrderWalletRecoveryService : BackgroundService
{
    private const int BatchSize = 100;

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CompletedOrderWalletRecoveryService> _logger;
    private readonly DateTime _effectiveFrom;

    public CompletedOrderWalletRecoveryService(
        IServiceScopeFactory scopeFactory,
        ILogger<CompletedOrderWalletRecoveryService> logger,
        IOptions<DoiSoatOptions> options)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _effectiveFrom = options.Value.BatDauApDung;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            var creditedCount = 0;
            var creditedAmount = 0m;
            var lastOrderId = 0;

            while (!stoppingToken.IsCancellationRequested)
            {
                var candidateIds = await GetCandidateIdsAsync(
                    lastOrderId,
                    stoppingToken);

                if (candidateIds.Count == 0)
                    break;

                foreach (var orderId in candidateIds)
                {
                    lastOrderId = orderId;
                    var amount = await TryRecoverOrderAsync(
                        orderId,
                        stoppingToken);

                    if (amount > 0)
                    {
                        creditedCount++;
                        creditedAmount += amount;
                    }
                }

                if (candidateIds.Count < BatchSize)
                    break;
            }

            if (creditedCount > 0)
            {
                TryLog(() => _logger.LogInformation(
                    "Đã phục hồi thu nhập ví cho {OrderCount} đơn, tổng {Amount} VND.",
                    creditedCount,
                    creditedAmount));
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal application shutdown.
        }
        catch (Exception exception)
        {
            // Recovery must never prevent the API from starting. Each actual
            // wallet mutation is still protected by its own DB transaction.
            TryLog(() => _logger.LogError(
                exception,
                "Không thể chạy tác vụ phục hồi thu nhập ví khi khởi động."));
        }
    }

    private async Task<List<int>> GetCandidateIdsAsync(
        int afterOrderId,
        CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<DatMonAnOnlineContext>();

        return await context.Donhangs
            .AsNoTracking()
            .Where(order =>
                order.MaDonHang > afterOrderId &&
                order.MaTrangThai == 5 &&
                order.MaHopDong != null &&
                order.ThoiGianDat >= _effectiveFrom &&
                order.ThoiGianGiaoThucTe.HasValue &&
                order.SoTienNhaHangNhan > 0 &&
                !order.Chitietdoisoats.Any() &&
                !order.Giaodichvis.Any(transaction =>
                    transaction.LoaiGiaoDich == WalletTransactionTypes.ThuNhapDonHang &&
                    transaction.TrangThai == "ThanhCong"))
            .OrderBy(order => order.MaDonHang)
            .Select(order => order.MaDonHang)
            .Take(BatchSize)
            .ToListAsync(cancellationToken);
    }

    private async Task<decimal> TryRecoverOrderAsync(
        int orderId,
        CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<DatMonAnOnlineContext>();
        var settlementService = scope.ServiceProvider
            .GetRequiredService<IOrderIncomeSettlementService>();
        var realtime = scope.ServiceProvider
            .GetRequiredService<IRealtimeNotificationService>();

        // Resolve the lock partition outside the transaction so this read does
        // not create a stale REPEATABLE READ snapshot while waiting for the
        // restaurant lock held by reconciliation.
        var restaurantId = await context.Donhangs
            .AsNoTracking()
            .Where(order => order.MaDonHang == orderId)
            .Select(order => (int?)order.MaNhaHang)
            .SingleOrDefaultAsync(cancellationToken);

        if (!restaurantId.HasValue)
            return 0;

        await using var transaction =
            await context.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            // Lock restaurant -> order -> wallet. Reconciliation uses the same
            // leading restaurant lock, so the workflows cannot race/deadlock.
            var restaurants = await context.Nhahangs
                .FromSqlInterpolated(
                    $"SELECT * FROM nhahang WHERE MaNhaHang = {restaurantId.Value} FOR UPDATE")
                .ToListAsync(cancellationToken);
            var restaurant = restaurants.SingleOrDefault();

            var orders = await context.Donhangs
                .FromSqlInterpolated(
                    $"SELECT * FROM donhang WHERE MaDonHang = {orderId} FOR UPDATE")
                .ToListAsync(cancellationToken);
            var order = orders.SingleOrDefault();

            if (restaurant == null ||
                order == null ||
                order.MaNhaHang != restaurant.MaNhaHang ||
                order.MaTrangThai != 5 ||
                !order.MaHopDong.HasValue ||
                order.ThoiGianDat < _effectiveFrom ||
                !order.ThoiGianGiaoThucTe.HasValue ||
                await context.Chitietdoisoats.AnyAsync(
                    item => item.MaDonHang == orderId,
                    cancellationToken))
            {
                await transaction.RollbackAsync(cancellationToken);
                return 0;
            }

            var latestPayment = await context.Thanhtoans
                .Include(payment => payment.MaPhuongThucNavigation)
                .Where(payment => payment.MaDonHang == orderId)
                .OrderByDescending(payment => payment.MaThanhToan)
                .FirstOrDefaultAsync(cancellationToken);

            if (latestPayment == null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return 0;
            }

            var result = await settlementService.SettleAsync(
                order,
                latestPayment,
                restaurant.MaTaiKhoan,
                cancellationToken);

            if (!result.Succeeded)
            {
                await transaction.RollbackAsync(cancellationToken);
                TryLog(() => _logger.LogWarning(
                    "Bỏ qua phục hồi ví cho đơn {OrderId}: {Reason}",
                    orderId,
                    result.Error));
                return 0;
            }

            await context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            if (result.WalletCredit > 0)
            {
                await Task.WhenAll(
                    realtime.GuiDuLieuThayDoiAsync(
                        restaurant.MaTaiKhoan,
                        new[] { "vi", "donHang" },
                        new { order.MaDonHang, hanhDong = "PhucHoiThuNhap" }),
                    realtime.GuiDuLieuThayDoiTheoVaiTroAsync(
                        "Admin",
                        new[] { "taiChinh", "doiSoat" },
                        new { order.MaDonHang, hanhDong = "PhucHoiThuNhap" }));
            }

            return result.WalletCredit;
        }
        catch (Exception exception) when (
            exception is not OperationCanceledException ||
            !cancellationToken.IsCancellationRequested)
        {
            await transaction.RollbackAsync(CancellationToken.None);
            TryLog(() => _logger.LogError(
                exception,
                "Không thể phục hồi thu nhập ví cho đơn {OrderId}.",
                orderId));
            return 0;
        }
    }

    private static void TryLog(Action writeLog)
    {
        try
        {
            writeLog();
        }
        catch
        {
            // A platform logger (for example Windows EventLog) must not turn a
            // best-effort recovery failure into an application shutdown.
        }
    }
}
