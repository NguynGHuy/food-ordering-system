using DatMonAnOnline.API.Models;
using Microsoft.EntityFrameworkCore;

namespace DatMonAnOnline.API.Services;

public sealed class ContractExpirationService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ContractExpirationService> _logger;

    public ContractExpirationService(
        IServiceScopeFactory scopeFactory,
        ILogger<ContractExpirationService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));

        try
        {
            do
            {
                try
                {
                    await UpdateExpiredContracts(stoppingToken);
                }
                catch (OperationCanceledException)
                    when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(
                        ex,
                        "Không cập nhật được hợp đồng hết hạn.");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException)
            when (stoppingToken.IsCancellationRequested)
        {
            // Backend đang dừng.
        }
    }

    private async Task UpdateExpiredContracts(
        CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();

        var context = scope.ServiceProvider
            .GetRequiredService<DatMonAnOnlineContext>();
        var realtime = scope.ServiceProvider
            .GetRequiredService<IRealtimeNotificationService>();

        var homNay = DateOnly.FromDateTime(DateTime.Now);

        var maNhaHangs = await context.Hopdongnhahangs
            .AsNoTracking()
            .Where(x =>
                x.TrangThai == "HieuLuc" &&
                x.NgayKetThuc < homNay)
            .Select(x => x.MaNhaHang)
            .Distinct()
            .ToListAsync(cancellationToken);

        foreach (var maNhaHang in maNhaHangs)
        {
            cancellationToken.ThrowIfCancellationRequested();

            await using var transaction =
                await context.Database.BeginTransactionAsync(
                    cancellationToken);

            // Khóa cùng dòng nhà hàng với luồng ký và xét duyệt.
            var nhaHangs = await context.Nhahangs
                .FromSqlInterpolated(
                    $"SELECT * FROM nhahang WHERE MaNhaHang = {maNhaHang} FOR UPDATE")
                .ToListAsync(cancellationToken);

            var nhaHang = nhaHangs.SingleOrDefault();

            if (nhaHang == null)
            {
                await transaction.RollbackAsync(cancellationToken);
                context.ChangeTracker.Clear();
                continue;
            }

            var hopDongs = await context.Hopdongnhahangs
                .Where(x =>
                    x.MaNhaHang == maNhaHang &&
                    x.TrangThai == "HieuLuc" &&
                    x.NgayKetThuc < homNay)
                .ToListAsync(cancellationToken);

            var thoiGian = DateTime.Now;
            var notifications = new List<Thongbao>();

            foreach (var hopDong in hopDongs)
            {
                hopDong.TrangThai = "HetHan";
                hopDong.NgayCapNhat = thoiGian;

                var notification = new Thongbao
                {
                    MaTaiKhoan = nhaHang.MaTaiKhoan,
                    TieuDe = "Hợp đồng nhà hàng đã hết hạn",
                    NoiDung =
                        $"Hợp đồng {hopDong.SoHopDong} đã hết hạn " +
                        $"vào ngày {hopDong.NgayKetThuc:dd/MM/yyyy}. " +
                        "Vui lòng xem hợp đồng để thực hiện thủ tục tiếp theo.",
                    Loai = "HopDong",
                    DuongDan = "/quan/hop-dong",
                    DaDoc = false,
                    NgayTao = thoiGian
                };
                context.Thongbaos.Add(notification);
                notifications.Add(notification);
            }

            await context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            var notificationTasks = notifications
                .Select(notification => realtime.GuiThongBaoAsync(
                    nhaHang.MaTaiKhoan,
                    notification));

            await Task.WhenAll(notificationTasks.Append(
                realtime.GuiDuLieuThayDoiAsync(
                    nhaHang.MaTaiKhoan,
                    new[] { "hopDong", "nhaHang" },
                    new { nhaHang.MaNhaHang, hanhDong = "HetHan" })));

            await realtime.GuiDuLieuThayDoiTheoVaiTroAsync(
                "Admin",
                new[] { "hopDong", "nhaHang", "tongQuan" },
                new { nhaHang.MaNhaHang, hanhDong = "HetHan" });

            context.ChangeTracker.Clear();
        }
    }
}
