using DatMonAnOnline.API.Hubs;
using DatMonAnOnline.API.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using DatMonAnOnline.API.Security;

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
    private readonly IServiceScopeFactory _scopeFactory;

    public RealtimeNotificationService(
        IHubContext<NotificationHub> hubContext,
        ILogger<RealtimeNotificationService> logger,
        IServiceScopeFactory scopeFactory
    )
    {
        _hubContext = hubContext;
        _logger = logger;
        _scopeFactory = scopeFactory;
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
            maTaiKhoan,
            "DuLieuThayDoi",
            TaoPayload(phamVi, duLieu));
    }

    public Task GuiDuLieuThayDoiTheoVaiTroAsync(
        string vaiTro,
        IEnumerable<string> phamVi,
        object? duLieu = null)
    {
        return GuiChoPhienHopLeAsync(
            null, vaiTro,
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
        return GuiChoPhienHopLeAsync(
            maTaiKhoan, null, tenSuKien, duLieu);
    }

    private async Task GuiChoPhienHopLeAsync(
        int? maTaiKhoan, string? vaiTro,
        string tenSuKien,
        object duLieu)
    {
        try
        {
            // A fresh scope avoids concurrent operations on the request DbContext
            // when callers send several notifications with Task.WhenAll.
            await using var scope = _scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<DatMonAnOnlineContext>();
            var accounts = db.Taikhoans.AsNoTracking().Where(a => a.TrangThai == true);
            if (maTaiKhoan.HasValue) accounts = accounts.Where(a => a.MaTaiKhoan == maTaiKhoan.Value);
            if (vaiTro != null) accounts = accounts.Where(a => a.MaRoleNavigation.TenRole == vaiTro);
            var recipients = await accounts.Select(a => new
            {
                a.MaTaiKhoan, a.MatKhau, Role = a.MaRoleNavigation.TenRole
            }).ToListAsync();
            // Old sockets cannot receive after password/role revocation, even on
            // another API instance. Never broadcast to unversioned role/user groups.
            var groups = recipients.Select(a => NotificationHub.GetSessionGroupName(
                a.MaTaiKhoan, a.Role, PasswordTokenVersion.Create(a.MatKhau))).ToArray();
            if (groups.Length > 0)
                await _hubContext.Clients.Groups(groups).SendAsync(tenSuKien, duLieu);
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
