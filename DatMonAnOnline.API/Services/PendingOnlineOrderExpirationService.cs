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
        await using var scope = _scopeFactory.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<DatMonAnOnlineContext>();
        var realtime = scope.ServiceProvider.GetRequiredService<IRealtimeNotificationService>();
        var expiredBefore = DateTime.Now.Subtract(OrderPaymentRules.OnlinePaymentLifetime);
        var realtimeEvents = new List<(int AccountId, Thongbao Notification, Donhang Order)>();

        var candidates = await context.Donhangs
            .Include(order => order.Thanhtoans)
                .ThenInclude(payment => payment.MaPhuongThucNavigation)
            .Include(order => order.MaKhuyenMaiNavigation)
            .Include(order => order.MaKhachHangNavigation)
            .Where(order =>
                order.MaTrangThai == 1 &&
                order.ThoiGianDat <= expiredBefore &&
                order.Thanhtoans.Any())
            .ToListAsync(cancellationToken);

        foreach (var order in candidates)
        {
            var latestPayment = order.Thanhtoans
                .OrderByDescending(payment => payment.MaThanhToan)
                .First();

            if (OrderPaymentRules.IsCod(latestPayment) ||
                order.Thanhtoans.Any(payment => payment.TrangThaiThanhToan == "ThanhCong"))
            {
                continue;
            }

            var claimed = await context.Donhangs
                .Where(item => item.MaDonHang == order.MaDonHang && item.MaTrangThai == 1)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(item => item.MaTrangThai, 6)
                    .SetProperty(
                        item => item.LyDoHuy,
                        "Hệ thống tự hủy do thanh toán online quá hạn 15 phút."),
                    cancellationToken);

            if (claimed == 0)
                continue;

            foreach (var payment in order.Thanhtoans.Where(payment =>
                         payment.TrangThaiThanhToan == "ChoThanhToan"))
            {
                payment.TrangThaiThanhToan = "ThatBai";
                payment.ThoiGianThanhToan = DateTime.Now;
            }

            order.MaTrangThai = 6;
            order.LyDoHuy = "Hệ thống tự hủy do thanh toán online quá hạn 15 phút.";

            if (order.MaKhuyenMaiNavigation != null &&
                order.MaKhuyenMaiNavigation.SoLuongDaDung > 0)
            {
                order.MaKhuyenMaiNavigation.SoLuongDaDung--;
            }

            context.Lichsutrangthaidonhangs.Add(new Lichsutrangthaidonhang
            {
                MaDonHang = order.MaDonHang,
                MaTrangThai = 6,
                MaTaiKhoan = null,
                ThoiGianTao = DateTime.Now,
                GhiChu = "Hệ thống tự hủy: thanh toán online quá hạn 15 phút."
            });

            var notification = new Thongbao
            {
                MaTaiKhoan = order.MaKhachHangNavigation.MaTaiKhoan,
                TieuDe = "Đơn hàng đã tự hủy",
                NoiDung = $"Đơn {order.MaDonHangHienThi} đã tự hủy vì chưa hoàn tất thanh toán trong 15 phút.",
                Loai = "DonHang",
                DuongDan = $"/don-hang/{order.MaDonHang}",
                DaDoc = false,
                NgayTao = DateTime.Now
            };
            context.Thongbaos.Add(notification);
            realtimeEvents.Add((
                order.MaKhachHangNavigation.MaTaiKhoan,
                notification,
                order));
        }

        if (context.ChangeTracker.HasChanges())
        {
            await context.SaveChangesAsync(cancellationToken);

            foreach (var item in realtimeEvents)
            {
                await Task.WhenAll(
                    realtime.GuiThongBaoAsync(item.AccountId, item.Notification),
                    realtime.GuiDonHangDaHuyAsync(
                        item.AccountId,
                        new
                        {
                            item.Order.MaDonHang,
                            item.Order.MaDonHangHienThi,
                            trangThai = "DaHuy",
                            lyDoHuy = item.Order.LyDoHuy
                        }));
            }
        }
    }
}
