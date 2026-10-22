using DatMonAnOnline.API.Hubs;
using DatMonAnOnline.API.Models;
using Microsoft.AspNetCore.SignalR;

namespace DatMonAnOnline.API.Services;

public interface IRealtimeNotificationService
{
    Task GuiThongBaoAsync(
        int maTaiKhoan,
        object duLieu
    );

    Task GuiDonHangMoiAsync(
        int maTaiKhoan,
        object duLieu
    );

    Task GuiDonHangCapNhatAsync(
        int maTaiKhoan,
        object duLieu
    );

    Task GuiDonHangDaHuyAsync(
        int maTaiKhoan,
        object duLieu
    );

    Task GuiDuLieuThayDoiAsync(
        int maTaiKhoan,
        IEnumerable<string> phamVi,
        object? duLieu = null
    );

    Task GuiDuLieuThayDoiTheoVaiTroAsync(
        string vaiTro,
        IEnumerable<string> phamVi,
        object? duLieu = null
    );
}

public class RealtimeNotificationService
    : IRealtimeNotificationService
{
    private readonly IHubContext<NotificationHub>
        _hubContext;
    private readonly ILogger<RealtimeNotificationService> _logger;

    public RealtimeNotificationService(
        IHubContext<NotificationHub> hubContext,
        ILogger<RealtimeNotificationService> logger
    )
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public Task GuiThongBaoAsync(
        int maTaiKhoan,
        object duLieu
    )
    {
        if (duLieu is Thongbao thongBao)
        {
            var payload = new
            {
                thongBao.MaThongBao,
                thongBao.MaTaiKhoan,
                thongBao.TieuDe,
                thongBao.NoiDung,
                thongBao.Loai,
                thongBao.DuongDan,
                thongBao.DaDoc,
                thongBao.NgayTao
            };

            return GuiAsync(
                maTaiKhoan,
                "NhanThongBao",
                payload
            );
        }

        return GuiAsync(
            maTaiKhoan,
            "NhanThongBao",
            duLieu
        );
    }

    public Task GuiDonHangMoiAsync(
        int maTaiKhoan,
        object duLieu
    )
    {
        return GuiAsync(
            maTaiKhoan,
            "DonHangMoi",
            duLieu
        );
    }

    public Task GuiDonHangCapNhatAsync(
        int maTaiKhoan,
        object duLieu
    )
    {
        return GuiAsync(
            maTaiKhoan,
            "DonHangCapNhat",
            duLieu
        );
    }

    public Task GuiDonHangDaHuyAsync(
        int maTaiKhoan,
        object duLieu
    )
    {
        return GuiAsync(
            maTaiKhoan,
            "DonHangDaHuy",
            duLieu
        );
    }

    public Task GuiDuLieuThayDoiAsync(
        int maTaiKhoan,
        IEnumerable<string> phamVi,
        object? duLieu = null)
    {
        return GuiAsync(
            _hubContext.Clients.User(maTaiKhoan.ToString()),
            "DuLieuThayDoi",
            TaoPayload(phamVi, duLieu));
    }

    public Task GuiDuLieuThayDoiTheoVaiTroAsync(
        string vaiTro,
        IEnumerable<string> phamVi,
        object? duLieu = null)
    {
        return GuiAsync(
            _hubContext.Clients.Group(NotificationHub.GetRoleGroupName(vaiTro)),
            "DuLieuThayDoi",
            TaoPayload(phamVi, duLieu));
    }

    private static object TaoPayload(
        IEnumerable<string> phamVi,
        object? duLieu)
    {
        var scopes = phamVi
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .Select(item => item.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        return new
        {
            phamVi = scopes,
            duLieu,
            thoiGianUtc = DateTime.UtcNow
        };
    }

    private Task GuiAsync(
        int maTaiKhoan,
        string tenSuKien,
        object duLieu
    )
    {
        return GuiAsync(
            _hubContext.Clients.User(maTaiKhoan.ToString()),
            tenSuKien,
            duLieu);
    }

    private async Task GuiAsync(
        IClientProxy client,
        string tenSuKien,
        object duLieu)
    {
        try
        {
            await client.SendAsync(tenSuKien, duLieu);
        }
        catch (Exception exception)
        {
            // Realtime is best-effort. A disconnected browser or a temporary
            // backplane failure must never roll back an already committed order,
            // wallet transaction, reconciliation period, or contract update.
            _logger.LogWarning(
                exception,
                "Khong gui duoc su kien SignalR {TenSuKien}.",
                tenSuKien);
        }
    }
}
