using DatMonAnOnline.API.Models;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace DatMonAnOnline.API.Common;

// Khuyến mãi - chuẩn hóa trước khi lưu
public static class PromotionWriteHelper
{
    public static decimal CalculateDiscount(Khuyenmai voucher, decimal itemTotal)
    {
        var discount = voucher.LoaiGiam == "SoTien"
            ? voucher.GiaTriGiam : itemTotal * voucher.GiaTriGiam / 100m;
        if (voucher.GiamToiDa.HasValue) discount = Math.Min(discount, voucher.GiamToiDa.Value);
        discount = Math.Min(Math.Max(discount, 0m), Math.Max(itemTotal, 0m));
        // VND snapshots and wallet ledger use whole units. Apply the same rule
        // at preview and checkout, never recompute existing order snapshots.
        return Math.Round(discount, 0, MidpointRounding.AwayFromZero);
    }

    public static void Normalize(PromotionCreateRequest request)
    {
        request.MaCode = request.MaCode.Trim().ToUpperInvariant();
        request.MoTa = string.IsNullOrWhiteSpace(request.MoTa)
            ? null
            : request.MoTa.Trim();

        if (request.LoaiGiam == "SoTien")
        {
            request.GiamToiDa = request.GiaTriGiam;
        }
    }

    // Unique constraint trong database bảo vệ cả request đồng thời.
    public static async Task<bool> SaveNewAsync(
        DatMonAnOnlineContext context)
    {
        try
        {
            await context.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateException ex)
            when (ex.InnerException is MySqlException { Number: 1062 })
        {
            return false;
        }
    }

    // Caller phải giành quyền chuyển đơn sang DaHuy trước khi gọi.
    // Voucher hết hạn không được trả lượt theo chính sách hiện tại.
    public static Task<int> ReturnUsageIfEligibleAsync(
        DatMonAnOnlineContext context,
        int? maKhuyenMai,
        DateTime now,
        CancellationToken cancellationToken = default)
    {
        if (!maKhuyenMai.HasValue)
            return Task.FromResult(0);

        return context.Database.ExecuteSqlInterpolatedAsync(
            $@"UPDATE khuyenmai
               SET SoLuongDaDung = SoLuongDaDung - 1
               WHERE MaKhuyenMai = {maKhuyenMai.Value}
                 AND SoLuongDaDung > 0
                 AND NgayBatDau <= {now}
                 AND NgayKetThuc >= {now}",
            cancellationToken);
    }
}
