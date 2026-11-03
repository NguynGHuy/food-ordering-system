using DatMonAnOnline.API.Common;
using DatMonAnOnline.API.Models;
using Microsoft.EntityFrameworkCore;

namespace DatMonAnOnline.API.Services;

// New workflow callers already own restaurant -> order -> payment locks and a transaction.
// The ordinary cancellation endpoint keeps its original state guards.
public static class WorkflowCancellation
{
    public static async Task<string?> ApplyAsync(DatMonAnOnlineContext db, IWalletService wallet,
        Donhang order, List<Thanhtoan> payments, int? actor, string reason, DateTime now, CancellationToken ct, long? resolvingSupportId = null)
    {
        if (db.Database.CurrentTransaction == null) throw new InvalidOperationException("Cancellation requires transaction.");
        if (order.MaTrangThai is < 1 or > 4) return "Đơn không còn đang xử lý.";
        if (await db.Chitietdoisoats.AnyAsync(x => x.MaDonHang == order.MaDonHang, ct) ||
            await db.Giaodichvis.AnyAsync(x => x.MaDonHang == order.MaDonHang &&
                (x.MaDoiSoat != null || x.LoaiGiaoDich == WalletTransactionTypes.ThuNhapDonHang), ct))
            return "Đơn đã có thu nhập/đối soát; cần xử lý tài chính riêng.";
        if (await db.Hoantiens.AnyAsync(x => x.MaDonHang == order.MaDonHang, ct))
            return "Đơn đã có hồ sơ hoàn tiền; cần đối chiếu riêng.";
        if (await db.OrderSupports.AnyAsync(x => x.OrderId == order.MaDonHang && x.Status == "NeedsReview", ct))
            return "Đơn có yêu cầu cần xử lý riêng chưa được đối chiếu.";

        var latest = payments.MaxBy(x => x.MaThanhToan);
        if (latest == null) return "Thiếu giao dịch thanh toán.";
        var successful = payments.Where(x => x.TrangThaiThanhToan == "ThanhCong").ToList();
        var cod = OrderPaymentRules.IsCod(latest);
        if (payments.Any(x => x.SoTien != order.ThanhTien) || successful.Count > 1 ||
            (successful.Count == 1 && successful[0] != latest) ||
            (cod && (successful.Count != 0 || latest.TrangThaiThanhToan != "ChoThanhToan")) ||
            (!cod && order.MaTrangThai >= 3 && successful.Count != 1) ||
            payments.Any(x => x.TrangThaiThanhToan is not ("ChoThanhToan" or "ThanhCong" or "ThatBai")))
            return "Thanh toán chưa rõ hoặc không khớp; cần xử lý riêng.";

        var customerAccount = await db.Khachhangs.Where(x => x.MaKhachHang == order.MaKhachHang)
            .Select(x => x.MaTaiKhoan).SingleAsync(ct);
        if (!cod && successful.Count == 1 && order.ThanhTien > 0)
        {
            // Nonlocking preliminary check; the existing wallet service still locks/rechecks
            // after the voucher lock. Never reverse promotion -> wallet lock ordering.
            var balance = await db.Vis.AsNoTracking().SingleOrDefaultAsync(x => x.MaTaiKhoan == customerAccount, ct);
            if (balance == null || balance.TrangThai == "Dong" || balance.DonViTienTe != "VND" ||
                !VndAmountAttribute.IsSupported(balance.SoDu + order.ThanhTien))
                return "Ví nhận hoàn chưa đủ điều kiện; cần xử lý riêng.";
            if (string.Equals(latest.MaPhuongThucNavigation.TenPhuongThuc, "FoodPay", StringComparison.OrdinalIgnoreCase) &&
                !await db.Giaodichvis.AnyAsync(x => x.MaDonHang == order.MaDonHang &&
                    x.LoaiGiaoDich == WalletTransactionTypes.ThanhToan && x.LoaiBienDong == "Tru" &&
                    x.TrangThai == "ThanhCong" && x.SoTien == order.ThanhTien, ct))
                return "Chưa đối chiếu được giao dịch trừ FoodPay.";
        }

        order.MaTrangThai = 6;
        order.LyDoHuy = reason[..Math.Min(500, reason.Length)];
        await OrderWorkflowTracking.StateChangedAsync(db, order.MaDonHang, 6, now);
        foreach (var payment in payments.Where(x => x.TrangThaiThanhToan == "ChoThanhToan"))
        { payment.TrangThaiThanhToan = "ThatBai"; payment.ThoiGianThanhToan = now; }
        await PromotionWriteHelper.ReturnUsageIfEligibleAsync(db, order.MaKhuyenMai, now, ct);
        db.Lichsutrangthaidonhangs.Add(new Lichsutrangthaidonhang
        { MaDonHang = order.MaDonHang, MaTrangThai = 6, MaTaiKhoan = actor, ThoiGianTao = now, GhiChu = reason[..Math.Min(200, reason.Length)] });

        if (!cod && successful.Count == 1 && order.ThanhTien > 0)
        {
            var refund = new Hoantien
            {
                MaDonHang = order.MaDonHang, MaThanhToan = latest.MaThanhToan,
                MaTaiKhoanYeuCau = actor, MaTaiKhoanXuLy = actor, SoTienHoan = order.ThanhTien,
                LyDoHoan = order.LyDoHuy, KenhHoanTien = "FoodPay", TrangThai = "ThanhCong",
                MaYeuCauHoan = $"HOAN-{order.MaDonHang}", ThoiGianYeuCau = now,
                ThoiGianXuLy = now, ThoiGianHoanThanh = now, NgayCapNhat = now
            };
            db.Hoantiens.Add(refund);
            await db.SaveChangesAsync(ct);
            var credit = await wallet.CreditAsync(customerAccount, order.ThanhTien, WalletTransactionTypes.HoanTien,
                $"WALLET-REFUND:{order.MaDonHang}", $"Hoàn tiền đơn {order.MaDonHangHienThi}",
                maDonHang: order.MaDonHang, maHoanTien: refund.MaHoanTien, cancellationToken: ct);
            if (!credit.Succeeded) throw new InvalidOperationException("Refund wallet write failed; rollback required.");
        }
        var related = await db.OrderSupports.Where(x => x.OrderId == order.MaDonHang && x.Status == "Pending" &&
            (!resolvingSupportId.HasValue || x.Id != resolvingSupportId.Value)).ToListAsync(ct);
        foreach (var support in related)
        {
            support.Status = "Cancelled"; support.UpdatedAt = now; support.DecisionAdminId = actor;
            support.DecisionReason = "Đơn đã được hủy hợp lệ trong cùng giao dịch: " + order.LyDoHuy;
            db.OrderSupportAudits.Add(new OrderSupportAudit { SupportId = support.Id, ActorId = actor,
                Action = "ClosedByCancellation", Reason = support.DecisionReason, CreatedAt = now });
        }
        return null;
    }
}
