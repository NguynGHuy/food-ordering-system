using DatMonAnOnline.API.Common;
using DatMonAnOnline.API.Models;
using Microsoft.EntityFrameworkCore;

namespace DatMonAnOnline.API.Services;

public sealed class OrderWorkflowService(DatMonAnOnlineContext db, IWalletService wallet,
    IRealtimeNotificationService realtime, ILogger<OrderWorkflowService> logger, TimeProvider? clock = null)
{
    private DateTime Now => VietnamBusinessTime.Now(clock);

    public IQueryable<Donhang> AccessibleOrders(int account, string role) => db.Donhangs.AsNoTracking().Where(x =>
        role == "Admin" || (role == "KhachHang" && x.MaKhachHangNavigation.MaTaiKhoan == account) ||
        (role == "Quan" && x.MaNhaHangNavigation.MaTaiKhoan == account));

    public async Task<object?> ReadAsync(int orderId, int account, string role, CancellationToken ct)
    {
        var order = await AccessibleOrders(account, role).SingleOrDefaultAsync(x => x.MaDonHang == orderId, ct);
        if (order == null) return null;
        var tracking = await db.OrderWorkflows.AsNoTracking().SingleOrDefaultAsync(x => x.OrderId == orderId, ct);
        var synced = tracking?.StateCode == order.MaTrangThai;
        var latest = await db.Thanhtoans.AsNoTracking().Include(x => x.MaPhuongThucNavigation)
            .Where(x => x.MaDonHang == orderId).OrderByDescending(x => x.MaThanhToan).FirstOrDefaultAsync(ct);
        var now = Now;
        var thresholds = OrderWorkflowRules.Thresholds(order.MaTrangThai);
        var ready = order.MaTrangThai == 1 ? tracking?.ReadyAt : null;
        var acceptance = ready?.AddMinutes(10);
        var reminder = synced && thresholds.HasValue ? tracking!.StateEnteredAt.AddMinutes(thresholds.Value.Reminder) : (DateTime?)null;
        var escalation = synced && thresholds.HasValue ? tracking!.StateEnteredAt.AddMinutes(thresholds.Value.Escalation) : (DateTime?)null;
        var supports = await db.OrderSupports.AsNoTracking().Where(x => x.OrderId == orderId).OrderByDescending(x => x.Id).ToListAsync(ct);
        return new
        {
            orderId, state = order.MaTrangThai, tracked = tracking != null,
            serverNow = OrderWorkflowRules.WithOffset(now),
            stateEnteredAt = synced ? OrderWorkflowRules.WithOffset(tracking!.StateEnteredAt) : null,
            readyAt = OrderWorkflowRules.WithOffset(ready),
            paymentDeadline = tracking != null && order.MaTrangThai == 1 && ready == null && latest != null &&
                !OrderPaymentRules.IsCod(latest) && latest.TrangThaiThanhToan != "ThanhCong"
                    ? OrderWorkflowRules.WithOffset(order.ThoiGianDat.AddMinutes(15)) : null,
            acceptanceDeadline = OrderWorkflowRules.WithOffset(acceptance),
            reminderAt = OrderWorkflowRules.WithOffset(reminder), escalationAt = OrderWorkflowRules.WithOffset(escalation),
            late = (acceptance.HasValue && now >= acceptance) || (reminder.HasValue && now >= reminder),
            needsAdmin = escalation.HasValue && now >= escalation,
            canRequestSupport = order.MaTrangThai is >= 1 and <= 4,
            canSubmitSupport = order.MaTrangThai is >= 1 and <= 4 && !supports.Any(x => x.Status == "NeedsReview" ||
                (x.Status == "Pending" && x.Kind == "Manual" && x.RequesterId == account)),
            supports
        };
    }

    // Leading partition matches completion/reconciliation. No support row is ever locked first.
    public async Task<(Donhang Order, List<Thanhtoan> Payments, OrderWorkflow? Workflow)?> LockAsync(int id, CancellationToken ct)
    {
        var restaurantId = await db.Donhangs.AsNoTracking().Where(x => x.MaDonHang == id).Select(x => (int?)x.MaNhaHang).SingleOrDefaultAsync(ct);
        if (!restaurantId.HasValue) return null;
        await db.Nhahangs.FromSqlInterpolated($"SELECT * FROM nhahang WHERE MaNhaHang={restaurantId.Value} FOR UPDATE").ToListAsync(ct);
        var order = (await db.Donhangs.FromSqlInterpolated($"SELECT * FROM donhang WHERE MaDonHang={id} FOR UPDATE").ToListAsync(ct)).SingleOrDefault();
        if (order == null) return null;
        var payments = await db.Thanhtoans.FromSqlInterpolated($"SELECT * FROM thanhtoan WHERE MaDonHang={id} ORDER BY MaThanhToan FOR UPDATE").ToListAsync(ct);
        var methods = payments.Select(x => x.MaPhuongThuc).Distinct().ToList();
        await db.Phuongthucthanhtoans.Where(x => methods.Contains(x.MaPhuongThuc)).LoadAsync(ct);
        var tracking = (await db.OrderWorkflows.FromSqlInterpolated($"SELECT * FROM orderworkflow WHERE OrderId={id} FOR UPDATE").ToListAsync(ct)).SingleOrDefault();
        return (order, payments, tracking);
    }

    public async Task ProcessAsync(int id, CancellationToken ct = default)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted, ct);
        var locked = await LockAsync(id, ct);
        if (locked == null) return;
        var (order, payments, tracking) = locked.Value;
        if (tracking == null || tracking.StateCode != order.MaTrangThai || order.MaTrangThai is < 1 or > 4) return;
        var now = Now;
        var bit = 1 << order.MaTrangThai;
        var notifications = new List<Thongbao>();
        if (order.MaTrangThai == 1)
        {
            var latest = payments.MaxBy(x => x.MaThanhToan);
            var ready = tracking.ReadyAt;
            // A marker alone never turns an unpaid/ambiguous online transaction into a paid order.
            if (ready == null || latest == null || (!OrderPaymentRules.IsCod(latest) && !payments.Any(x => x.TrangThaiThanhToan == "ThanhCong"))) return;
            if (now >= ready.Value.AddMinutes(10) && (tracking.EscalationMask & bit) == 0)
            {
                var reason = "Hệ thống tự hủy: Quán chưa nhận đơn trong 10 phút kể từ khi sẵn sàng.";
                var blocked = await WorkflowCancellation.ApplyAsync(db, wallet, order, payments, null, reason, now, ct);
                tracking.ReminderMask |= bit; tracking.EscalationMask |= bit;
                if (blocked != null)
                {
                    await AddSupportAsync(order, tracking, null, "Acceptance", blocked, "NeedsReview", now, ct);
                    await AddNotifications(order, "Đơn cần kiểm tra tài chính", blocked, true, true, true, notifications, now, ct);
                }
                else await AddNotifications(order, "Đơn đã tự hủy do Quán chưa nhận", reason + " Khoản đã thanh toán hợp lệ được hoàn vào FoodPay.", true, true, true, notifications, now, ct);
            }
            else if (now >= ready.Value.AddMinutes(5) && (tracking.ReminderMask & bit) == 0)
            {
                tracking.ReminderMask |= bit;
                await AddNotifications(order, "Đơn đang chờ Quán nhận", "Vui lòng nhận hoặc từ chối đơn trước hạn 10 phút.", false, true, false, notifications, now, ct);
            }
        }
        else if (OrderWorkflowRules.Thresholds(order.MaTrangThai) is { } thresholds)
        {
            if (now >= tracking.StateEnteredAt.AddMinutes(thresholds.Escalation) && (tracking.EscalationMask & bit) == 0)
            {
                tracking.EscalationMask |= bit; tracking.ReminderMask |= bit;
                var reason = $"Đơn đang ở trạng thái {order.MaTrangThai} quá {thresholds.Escalation} phút; cần kiểm tra tiến độ.";
                await AddSupportAsync(order, tracking, null, "SLA", reason, "Pending", now, ct);
                await AddNotifications(order, "Đơn cần hỗ trợ tiến độ", reason + " Hệ thống không tự hủy đơn đang xử lý.", true, true, true, notifications, now, ct);
            }
            else if (now >= tracking.StateEnteredAt.AddMinutes(thresholds.Reminder) && (tracking.ReminderMask & bit) == 0)
            {
                tracking.ReminderMask |= bit;
                await AddNotifications(order, "Nhắc cập nhật tiến độ đơn", "Vui lòng kiểm tra đơn và báo sự cố nếu không thể tiếp tục phục vụ.", false, true, false, notifications, now, ct);
            }
        }
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        if (notifications.Count > 0) await PublishAsync(order.MaDonHang, notifications);
    }

    public async Task<OrderSupport> AddSupportAsync(Donhang order, OrderWorkflow? tracking, int? requester,
        string kind, string reason, string status, DateTime now, CancellationToken ct)
    {
        var support = new OrderSupport { OrderId = order.MaDonHang, RequesterId = requester, Kind = kind,
            Reason = reason, Status = status, StateWhenRequested = order.MaTrangThai,
            StateEnteredAtWhenRequested = tracking?.StateEnteredAt, CreatedAt = now, UpdatedAt = now };
        db.OrderSupports.Add(support);
        await db.SaveChangesAsync(ct);
        db.OrderSupportAudits.Add(new OrderSupportAudit
        { SupportId = support.Id, ActorId = requester, Action = "Created", Reason = reason, CreatedAt = now });
        return support;
    }

    public async Task AddNotifications(Donhang order, string title, string message, bool customer, bool merchant,
        bool admin, List<Thongbao> output, DateTime now, CancellationToken ct)
    {
        var recipients = new List<(int Id, string Path)>();
        if (customer) recipients.Add((await db.Khachhangs.Where(x => x.MaKhachHang == order.MaKhachHang).Select(x => x.MaTaiKhoan).SingleAsync(ct), $"/don-hang/{order.MaDonHang}"));
        if (merchant) recipients.Add((await db.Nhahangs.Where(x => x.MaNhaHang == order.MaNhaHang).Select(x => x.MaTaiKhoan).SingleAsync(ct), $"/quan/don-hang/{order.MaDonHang}"));
        if (admin) recipients.AddRange((await db.Taikhoans.Where(x => x.TrangThai == true && x.MaRoleNavigation.TenRole == "Admin").Select(x => x.MaTaiKhoan).ToListAsync(ct))
            .Select(x => (x, "/admin/ho-tro-don-hang")));
        foreach (var recipient in recipients.Distinct())
        {
            var notification = new Thongbao { MaTaiKhoan = recipient.Id, TieuDe = title,
                NoiDung = ($"Đơn {order.MaDonHangHienThi}: " + message)[..Math.Min(500, ($"Đơn {order.MaDonHangHienThi}: " + message).Length)],
                Loai = "DonHang", DuongDan = recipient.Path, NgayTao = now, DaDoc = false };
            db.Thongbaos.Add(notification); output.Add(notification);
        }
    }

    public async Task PublishAsync(int orderId, List<Thongbao> notifications)
    {
        // Durable DB records are already committed. Delivery failures never replay financial writes.
        foreach (var notification in notifications)
        {
            try
            {
                await realtime.GuiThongBaoAsync(notification.MaTaiKhoan, notification);
                if (notification.DuongDan?.StartsWith("/admin/", StringComparison.Ordinal) != true)
                    await realtime.GuiDuLieuThayDoiAsync(notification.MaTaiKhoan, new[] { "donHang", "tongQuan", "vi", "thongBao" }, new { orderId, hanhDong = "Workflow" });
            }
            catch (Exception e) { logger.LogWarning(e, "Workflow {OrderId} committed; account {AccountId} delivery failed.", orderId, notification.MaTaiKhoan); }
        }
        try { await realtime.GuiDuLieuThayDoiTheoVaiTroAsync("Admin", new[] { "donHang", "tongQuan", "taiChinh" }, new { orderId, hanhDong = "Workflow" }); }
        catch (Exception e) { logger.LogWarning(e, "Workflow {OrderId} committed; admin delivery failed.", orderId); }
    }
}
