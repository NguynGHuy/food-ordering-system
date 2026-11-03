using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using DatMonAnOnline.API.Common;
using DatMonAnOnline.API.Models;
using DatMonAnOnline.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DatMonAnOnline.API.Controllers;

[ApiController, Route("api"), Authorize(Roles = "KhachHang,Quan,Admin")]
public sealed class OrderWorkflowController(DatMonAnOnlineContext db, OrderWorkflowService workflow,
    IWalletService wallet, TimeProvider? clock = null) : ControllerBase
{
    private int Account => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var value) ? value : 0;
    private string Role => User.FindFirstValue(ClaimTypes.Role) ?? "";
    private DateTime Now => VietnamBusinessTime.Now(clock);
    public sealed class SupportRequest
    {
        [Required, StringLength(1000, MinimumLength = 5)] public string Reason { get; set; } = "";
    }
    public sealed class Decision
    {
        [Required] public string Action { get; set; } = "";
        [Required, StringLength(700, MinimumLength = 5)] public string Reason { get; set; } = "";
        [Range(1, 6)] public int ExpectedState { get; set; }
        public bool VerifiedUnableToServe { get; set; }
        public bool? NoCostDispute { get; set; }
    }

    [HttpGet("don-hang/{id:int}/workflow")]
    public async Task<IActionResult> Read(int id, CancellationToken ct)
    {
        if (Account == 0) return Unauthorized();
        var result = await workflow.ReadAsync(id, Account, Role, ct);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpPost("don-hang/{id:int}/support"), Authorize(Roles = "KhachHang,Quan")]
    public async Task<IActionResult> RequestSupport(int id, SupportRequest request, CancellationToken ct)
    {
        if (Account == 0) return Unauthorized();
        var reason = request.Reason.Trim();
        if (reason.Length < 5) return BadRequest(new { message = "Vui lòng ghi rõ lý do (ít nhất 5 ký tự)." });
        await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted, ct);
        var locked = await workflow.LockAsync(id, ct);
        if (locked == null || !await workflow.AccessibleOrders(Account, Role).AnyAsync(x => x.MaDonHang == id, ct)) return NotFound();
        var idem = await IdempotencyStore.CheckAsync(db, Request, Account, request);
        if (idem.Result != null) return idem.Result;
        if (locked.Value.Order.MaTrangThai is < 1 or > 4) return Conflict(new { message = "Chỉ gửi hỗ trợ cho đơn đang xử lý." });
        var existing = await db.OrderSupports.FirstOrDefaultAsync(x => x.OrderId == id &&
            (x.Status == "NeedsReview" || (x.Status == "Pending" && x.Kind == "Manual" && x.RequesterId == Account)), ct);
        var notifications = new List<Thongbao>();
        var support = existing ?? await workflow.AddSupportAsync(locked.Value.Order, locked.Value.Workflow, Account, "Manual", reason, "Pending", Now, ct);
        if (existing == null)
            await workflow.AddNotifications(locked.Value.Order, "Yêu cầu hỗ trợ đơn hàng", reason, true, true, true, notifications, Now, ct);
        await db.SaveChangesAsync(ct);
        var result = await IdempotencyStore.SaveSuccessAsync(db, idem, new { support.Id, support.Status, message = existing == null ? "Đã gửi yêu cầu hỗ trợ." : "Đơn đã có yêu cầu đang được xử lý." }, existing == null ? 201 : 200);
        await transaction.CommitAsync(ct);
        if (notifications.Count > 0) await workflow.PublishAsync(id, notifications);
        return result;
    }

    [HttpGet("order-workflow/attention")]
    public async Task<IActionResult> Attention(CancellationToken ct)
    {
        if (Account == 0) return Unauthorized();
        var now = Now;
        var rows = await workflow.AccessibleOrders(Account, Role).Join(db.OrderWorkflows.AsNoTracking(), o => o.MaDonHang, w => w.OrderId, (o, w) => new
        { orderId = o.MaDonHang, code = o.MaDonHangHienThi, state = o.MaTrangThai, w.StateCode, w.ReadyAt, w.StateEnteredAt })
            .Where(x => x.state == x.StateCode && ((x.state == 1 && x.ReadyAt <= now.AddMinutes(-5)) ||
                (x.state == 2 && x.StateEnteredAt <= now.AddMinutes(-10)) || (x.state == 3 && x.StateEnteredAt <= now.AddMinutes(-30)) ||
                (x.state == 4 && x.StateEnteredAt <= now.AddMinutes(-45))))
            .OrderBy(x => x.StateEnteredAt).Take(20).ToListAsync(ct);
        return Ok(new { serverNow = OrderWorkflowRules.WithOffset(now), items = rows.Select(x => new
        { x.orderId, x.code, x.state, acceptanceDeadline = x.state == 1 ? OrderWorkflowRules.WithOffset(x.ReadyAt?.AddMinutes(10)) : null }) });
    }

    [HttpGet("admin/order-support"), Authorize(Roles = "Admin")]
    public async Task<IActionResult> Queue([FromQuery] PaginationQuery pagination, [FromQuery, MaxLength(150)] string? search,
        [FromQuery] string? status, CancellationToken ct)
    {
        if (status != null && status is not ("Open" or "Pending" or "NeedsReview" or "Cancelled" or "Rejected")) return BadRequest(new { message = "Trạng thái hỗ trợ không hợp lệ." });
        var query = db.OrderSupports.AsNoTracking().Join(db.Donhangs.AsNoTracking(), s => s.OrderId, o => o.MaDonHang, (s, o) => new
        { s.Id, s.OrderId, o.MaDonHangHienThi, state = o.MaTrangThai, s.Status, s.Kind, s.Reason, s.CreatedAt, s.UpdatedAt });
        if (status == "Open") query = query.Where(x => x.Status == "Pending" || x.Status == "NeedsReview");
        else if (status != null) query = query.Where(x => x.Status == status);
        if (!string.IsNullOrWhiteSpace(search)) query = query.Where(x => x.MaDonHangHienThi.Contains(search) || x.Reason.Contains(search));
        return Ok(await query.OrderByDescending(x => x.Id).ToPagedResultAsync(pagination, ct));
    }

    [HttpGet("admin/order-support/{id:long}"), Authorize(Roles = "Admin")]
    public async Task<IActionResult> Detail(long id, CancellationToken ct)
    {
        var support = await db.OrderSupports.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct);
        if (support == null) return NotFound();
        var order = await db.Donhangs.AsNoTracking().Where(x => x.MaDonHang == support.OrderId)
            .Select(x => new { x.MaDonHang, x.MaDonHangHienThi, x.MaTrangThai, x.ThanhTien, x.SoTienNhaHangNhan, x.LyDoHuy }).SingleAsync(ct);
        return Ok(new
        {
            support, order,
            workflow = await workflow.ReadAsync(support.OrderId, Account, Role, ct),
            payments = await db.Thanhtoans.AsNoTracking().Where(x => x.MaDonHang == support.OrderId)
                .Select(x => new { x.MaThanhToan, method = x.MaPhuongThucNavigation.TenPhuongThuc, x.SoTien, x.TrangThaiThanhToan, x.ThoiGianThanhToan }).ToListAsync(ct),
            refunds = await db.Hoantiens.AsNoTracking().Where(x => x.MaDonHang == support.OrderId).Select(x => new { x.MaHoanTien, x.SoTienHoan, x.TrangThai, x.KenhHoanTien }).ToListAsync(ct),
            income = await db.Giaodichvis.AsNoTracking().Where(x => x.MaDonHang == support.OrderId && x.LoaiGiaoDich == WalletTransactionTypes.ThuNhapDonHang)
                .Select(x => new { x.MaGiaoDichVi, x.SoTien, x.TrangThai }).ToListAsync(ct),
            reconciliationCount = await db.Chitietdoisoats.CountAsync(x => x.MaDonHang == support.OrderId, ct),
            history = await db.Lichsutrangthaidonhangs.AsNoTracking().Where(x => x.MaDonHang == support.OrderId).OrderBy(x => x.MaLichSu).ToListAsync(ct),
            audit = await db.OrderSupportAudits.AsNoTracking().Where(x => x.SupportId == id).OrderBy(x => x.Id).ToListAsync(ct)
        });
    }

    [HttpPut("admin/order-support/{id:long}/decision"), Authorize(Roles = "Admin")]
    public async Task<IActionResult> Decide(long id, Decision request, CancellationToken ct)
    {
        if (Account == 0) return Unauthorized();
        if (request.Action is not ("ApproveCancel" or "Reject" or "ReviewSeparately") || request.Reason.Trim().Length < 5)
            return BadRequest(new { message = "Quyết định hoặc lý do không hợp lệ." });
        var orderId = await db.OrderSupports.AsNoTracking().Where(x => x.Id == id).Select(x => (int?)x.OrderId).SingleOrDefaultAsync(ct);
        if (!orderId.HasValue) return NotFound();
        await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.ReadCommitted, ct);
        var locked = await workflow.LockAsync(orderId.Value, ct);
        if (locked == null) return NotFound();
        var (order, _, tracking) = locked.Value;
        var support = (await db.OrderSupports.FromSqlInterpolated($"SELECT * FROM ordersupport WHERE Id={id} FOR UPDATE").ToListAsync(ct)).Single();
        var idem = await IdempotencyStore.CheckAsync(db, Request, Account, request);
        if (idem.Result != null) return idem.Result;
        if (order.MaTrangThai != request.ExpectedState) return Conflict(new { message = "Trạng thái đơn đã đổi. Hãy tải lại trước khi quyết định." });
        if (support.Status != "Pending" && !(support.Status == "NeedsReview" && request.Action == "Reject"))
            return Conflict(new { message = "Yêu cầu đã được quyết định hoặc đang cần xử lý tài chính riêng." });
        var now = Now;
        var reason = request.Reason.Trim();
        var status = request.Action == "Reject" ? "Rejected" : "NeedsReview";
        if (request.Action == "ApproveCancel")
        {
            if (!request.VerifiedUnableToServe) return BadRequest(new { message = "Cần xác minh đơn không thể tiếp tục phục vụ." });
            if (request.NoCostDispute == true && order.MaTrangThai == support.StateWhenRequested &&
                (!support.StateEnteredAtWhenRequested.HasValue || tracking?.StateEnteredAt == support.StateEnteredAtWhenRequested))
            {
                var blocked = await WorkflowCancellation.ApplyAsync(db, wallet, order, locked.Value.Payments, Account,
                    $"Admin xử lý hỗ trợ #{support.Id}: {reason}", now, ct, support.Id);
                status = blocked == null ? "Cancelled" : "NeedsReview";
                if (blocked != null) reason = (reason + " — " + blocked)[..Math.Min(1000, (reason + " — " + blocked).Length)];
            }
            else reason += " — Trạng thái/mốc đơn đã đổi hoặc chi phí Quán cần được phân xử; không tự đảo tiền.";
        }
        support.Status = status; support.DecisionReason = reason; support.DecisionAdminId = Account; support.UpdatedAt = now;
        db.OrderSupportAudits.Add(new OrderSupportAudit { SupportId = id, ActorId = Account, Action = status, CreatedAt = now,
            Reason = $"VerifiedUnableToServe={request.VerifiedUnableToServe}; NoCostDispute={request.NoCostDispute}; ExpectedState={request.ExpectedState}; {request.Reason}" });
        var notifications = new List<Thongbao>();
        await workflow.AddNotifications(order, "Kết quả hỗ trợ đơn hàng", status == "Cancelled"
            ? "Đã hủy hợp lệ; khoản đã thanh toán hợp lệ được hoàn vào FoodPay." : status == "Rejected"
            ? "Yêu cầu đã được từ chối: " + reason : "Yêu cầu cần xử lý riêng, chưa hủy hoặc hoàn tiền: " + reason,
            true, true, true, notifications, now, ct);
        await db.SaveChangesAsync(ct);
        var result = await IdempotencyStore.SaveSuccessAsync(db, idem, new { support.Id, support.Status, support.DecisionReason, state = order.MaTrangThai });
        await transaction.CommitAsync(ct);
        await workflow.PublishAsync(order.MaDonHang, notifications);
        return result;
    }
}
