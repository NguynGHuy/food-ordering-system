using DatMonAnOnline.API.Models;
using Microsoft.EntityFrameworkCore;

namespace DatMonAnOnline.API.Services;

public static class OrderPaymentRules
{
    public static readonly TimeSpan OnlinePaymentLifetime = TimeSpan.FromMinutes(15);

    public static bool IsCod(Thanhtoan payment)
        => string.Equals(
            payment.MaPhuongThucNavigation?.TenPhuongThuc,
            "COD",
            StringComparison.OrdinalIgnoreCase);

    public static bool IsOnlinePaymentExpired(Donhang order, DateTime? now = null)
        => order.ThoiGianDat <= (now ?? DateTime.Now).Subtract(OnlinePaymentLifetime);

    public static IQueryable<Donhang> ExpiredUnpaidOnlineOrders(IQueryable<Donhang> orders, DateTime expiredBefore)
        => orders.Where(order =>
            order.MaTrangThai == 1 && order.ThoiGianDat <= expiredBefore &&
            order.Thanhtoans.Any() &&
            !order.Thanhtoans.Any(payment => payment.TrangThaiThanhToan == "ThanhCong") &&
            order.Thanhtoans.OrderByDescending(payment => payment.MaThanhToan)
                .Select(payment => payment.MaPhuongThucNavigation.TenPhuongThuc)
                .FirstOrDefault() != "COD");
}

public sealed class PendingOnlineOrderExpirationService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PendingOnlineOrderExpirationService> _logger;

    public PendingOnlineOrderExpirationService(
        IServiceScopeFactory scopeFactory,
        ILogger<PendingOnlineOrderExpirationService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));

        do
        {
            try
            {
                await ExpirePendingOrders(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Không thể xử lý các đơn online quá hạn.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task ExpirePendingOrders(CancellationToken cancellationToken)
    {
        var expiredBefore = DateTime.Now.Subtract(OrderPaymentRules.OnlinePaymentLifetime);
        List<int> candidateIds;

        await using (var scope = _scopeFactory.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<DatMonAnOnlineContext>();
            // Filter in SQL BEFORE the batch limit; old COD/paid orders must not
            // permanently occupy every slot. All conditions are rechecked under lock.
            candidateIds = await OrderPaymentRules.ExpiredUnpaidOnlineOrders(
                    context.Donhangs.AsNoTracking(), expiredBefore)
                .OrderBy(order => order.MaDonHang)
                .Select(order => order.MaDonHang)
                .Take(100)
                .ToListAsync(cancellationToken);
        }

        foreach (var orderId in candidateIds)
        {
            try
            {
                await ExpirePendingOrder(orderId, cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception exception)
            {
                _logger.LogError(
                    exception,
                    "Không thể tự hủy đơn online quá hạn {OrderId}.",
                    orderId);
            }
        }
    }

    private async Task ExpirePendingOrder(int orderId, CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<DatMonAnOnlineContext>();
        var realtime = scope.ServiceProvider.GetRequiredService<IRealtimeNotificationService>();
        await using var transaction =
            await context.Database.BeginTransactionAsync(cancellationToken);

        var order = await context.Donhangs
            .FromSqlInterpolated($"SELECT * FROM donhang WHERE MaDonHang = {orderId} FOR UPDATE")
            .SingleOrDefaultAsync(cancellationToken);

        if (order is null ||
            order.MaTrangThai != 1 ||
            !OrderPaymentRules.IsOnlinePaymentExpired(order))
        {
            await transaction.RollbackAsync(cancellationToken);
            return;
        }

        // Mọi luồng ghi đơn hàng đều khóa theo thứ tự: đơn -> thanh toán -> ví.
        var payments = await context.Thanhtoans
            .FromSqlInterpolated($"SELECT * FROM thanhtoan WHERE MaDonHang = {orderId} ORDER BY MaThanhToan FOR UPDATE")
            .ToListAsync(cancellationToken);

        var paymentMethodIds = payments
            .Select(payment => payment.MaPhuongThuc)
            .Distinct()
            .ToList();
        if (paymentMethodIds.Count > 0)
        {
            await context.Phuongthucthanhtoans
                .Where(method => paymentMethodIds.Contains(method.MaPhuongThuc))
                .LoadAsync(cancellationToken);
        }

        var latestPayment = payments
            .OrderByDescending(payment => payment.MaThanhToan)
            .FirstOrDefault();

        if (latestPayment is null ||
            OrderPaymentRules.IsCod(latestPayment) ||
            payments.Any(payment => payment.TrangThaiThanhToan == "ThanhCong"))
        {
            await transaction.RollbackAsync(cancellationToken);
            return;
        }

        var accountId = await context.Khachhangs
            .Where(customer => customer.MaKhachHang == order.MaKhachHang)
            .Select(customer => (int?)customer.MaTaiKhoan)
            .SingleOrDefaultAsync(cancellationToken);
        if (!accountId.HasValue)
        {
            await transaction.RollbackAsync(cancellationToken);
            _logger.LogWarning(
                "Không thể tự hủy đơn {OrderId} vì không tìm thấy tài khoản khách hàng.",
                orderId);
            return;
        }

        var now = DateTime.Now;
        order.MaTrangThai = 6;
        order.LyDoHuy = "Hệ thống tự hủy do thanh toán online quá hạn 15 phút.";

        foreach (var payment in payments.Where(payment =>
                     payment.TrangThaiThanhToan == "ChoThanhToan"))
        {
            payment.TrangThaiThanhToan = "ThatBai";
            payment.ThoiGianThanhToan = now;
        }

        await DatMonAnOnline.API.Common.PromotionWriteHelper.ReturnUsageIfEligibleAsync(
            context,
            order.MaKhuyenMai,
            now,
            cancellationToken);

        context.Lichsutrangthaidonhangs.Add(new Lichsutrangthaidonhang
        {
            MaDonHang = order.MaDonHang,
            MaTrangThai = 6,
            MaTaiKhoan = null,
            ThoiGianTao = now,
            GhiChu = "Hệ thống tự hủy: thanh toán online quá hạn 15 phút."
        });

        var notification = new Thongbao
        {
            MaTaiKhoan = accountId.Value,
            TieuDe = "Đơn hàng đã tự hủy",
            NoiDung = $"Đơn {order.MaDonHangHienThi} đã tự hủy vì chưa hoàn tất thanh toán trong 15 phút.",
            Loai = "DonHang",
            DuongDan = $"/don-hang/{order.MaDonHang}",
            DaDoc = false,
            NgayTao = now
        };
        context.Thongbaos.Add(notification);

        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        // SignalR chỉ là tín hiệu làm mới; bản ghi DB ở trên là nguồn dữ liệu bền vững.
        await Task.WhenAll(
            realtime.GuiThongBaoAsync(accountId.Value, notification),
            realtime.GuiDonHangDaHuyAsync(
                accountId.Value,
                new
                {
                    order.MaDonHang,
                    order.MaDonHangHienThi,
                    trangThai = "DaHuy",
                    lyDoHuy = order.LyDoHuy
                }));
    }
}
