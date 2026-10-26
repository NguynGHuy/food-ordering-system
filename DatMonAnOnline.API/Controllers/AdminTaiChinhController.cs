using System.Data;
using DatMonAnOnline.API.Common;
using DatMonAnOnline.API.Models;
using DatMonAnOnline.API.Options;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DatMonAnOnline.API.Controllers;

[ApiController]
[Route("api/admin/tai-chinh")]
[Authorize(Roles = "Admin")]
public class AdminTaiChinhController : ControllerBase
{
    private readonly DatMonAnOnlineContext _context;
    private readonly DateTime _batDauApDung;

    public AdminTaiChinhController(
        DatMonAnOnlineContext context,
        IOptions<DoiSoatOptions> options)
    {
        _context = context;
        _batDauApDung = options.Value.BatDauApDung;
    }

    [HttpGet("tong-quan")]
    public async Task<IActionResult> GetTongQuan(
        [FromQuery] DateOnly? tuNgay,
        [FromQuery] DateOnly? denNgay,
        CancellationToken cancellationToken)
    {
        if (tuNgay.HasValue && denNgay.HasValue && tuNgay > denNgay ||
            tuNgay?.Year < 1000 || denNgay?.Year < 1000 || denNgay == DateOnly.MaxValue)
        {
            return BadRequest(new
            {
                message = "Từ ngày không được lớn hơn đến ngày."
            });
        }

        var start = tuNgay?.ToDateTime(TimeOnly.MinValue);
        var endExclusive = denNgay?.AddDays(1).ToDateTime(TimeOnly.MinValue);

        // All aggregate/detail queries must share one InnoDB consistent read view.
        // Read committed/autocommit can mix a count before completion with totals after it.
        await using var snapshot = await _context.Database.BeginTransactionAsync(
            IsolationLevel.RepeatableRead, cancellationToken);

        // Doanh thu nền tảng được ghi nhận ngay khi đơn hoàn thành. Các cột
        // PhiNenTang/GiamGiaHeThong là snapshot bất biến tại lúc đặt đơn, vì vậy
        // không phụ thuộc vào việc Admin đã tạo kỳ đối soát hay chưa.
        var orderQuery = _context.Donhangs
            .AsNoTracking()
            .Where(order =>
                order.MaTrangThai == 5 &&
                order.MaHopDong != null &&
                order.ThoiGianDat >= _batDauApDung &&
                order.ThoiGianGiaoThucTe.HasValue);

        if (start.HasValue)
        {
            orderQuery = orderQuery.Where(order =>
                order.ThoiGianGiaoThucTe!.Value >= start.Value);
        }

        if (endExclusive.HasValue)
        {
            orderQuery = orderQuery.Where(order =>
                order.ThoiGianGiaoThucTe!.Value < endExclusive.Value);
        }

        var completedOrders = orderQuery
            .Select(order => new
            {
                order.MaDonHang,
                order.MaDonHangHienThi,
                order.MaNhaHang,
                TenNhaHang = order.TenNhaHangLucDat ??
                    order.MaNhaHangNavigation.TenNhaHang,
                order.ThoiGianGiaoThucTe,
                order.TongTienHang,
                order.ThanhTien,
                order.PhiNenTang,
                order.GiamGiaHeThong,
                IsReconciled = order.Chitietdoisoats.Any(),
                MaDoiSoat = order.Chitietdoisoats
                    .Select(detail => (int?)detail.MaDoiSoat)
                    .FirstOrDefault(),
                LatestPayment = order.Thanhtoans
                    .OrderByDescending(payment => payment.MaThanhToan)
                    .Select(payment => new
                    {
                        payment.SoTien,
                        payment.TrangThaiThanhToan,
                        TenPhuongThuc = payment.MaPhuongThucNavigation.TenPhuongThuc
                    })
                    .FirstOrDefault()
            });

        // Không đưa đơn có dữ liệu thanh toán hỏng vào báo cáo tài chính.
        // Số lượng lỗi được trả riêng để Admin biết cần kiểm tra thay vì âm thầm
        // hiển thị một con số doanh thu sai.
        var validOrders = completedOrders
            .Where(order =>
                order.LatestPayment != null &&
                order.LatestPayment.TrangThaiThanhToan == "ThanhCong" &&
                order.LatestPayment.SoTien == order.ThanhTien &&
                order.PhiNenTang >= 0 &&
                order.GiamGiaHeThong >= 0)
            ;

        // Aggregate in SQL; only the recent 20 rows are materialized below.
        var totalOrderCount = await orderQuery.CountAsync(cancellationToken);
        var orderStats = await validOrders.GroupBy(_ => 1).Select(group => new
        {
            Count = group.Count(),
            Fees = group.Sum(order => order.PhiNenTang),
            Discounts = group.Sum(order => order.GiamGiaHeThong),
            PendingCount = group.Count(order => !order.IsReconciled),
            PendingRevenue = group.Sum(order => !order.IsReconciled ? order.PhiNenTang - order.GiamGiaHeThong : 0m),
            SettledRevenue = group.Sum(order => order.IsReconciled ? order.PhiNenTang - order.GiamGiaHeThong : 0m)
        }).SingleOrDefaultAsync(cancellationToken);
        var invalidOrderCount = totalOrderCount - (orderStats?.Count ?? 0);
        var tongPhiNenTang = orderStats?.Fees ?? 0m;
        var tongChiPhiKhuyenMaiHeThong = orderStats?.Discounts ?? 0m;
        var doanhThuThuan = tongPhiNenTang - tongChiPhiKhuyenMaiHeThong;
        var recentRevenueOrders = await validOrders
            .OrderByDescending(order => order.ThoiGianGiaoThucTe)
            .ThenByDescending(order => order.MaDonHang)
            .Take(20)
            .Select(order => new
            {
                order.MaDonHang,
                order.MaDonHangHienThi,
                order.MaNhaHang,
                order.TenNhaHang,
                order.ThoiGianGiaoThucTe,
                order.TongTienHang,
                order.ThanhTien,
                order.PhiNenTang,
                order.GiamGiaHeThong,
                DoanhThuThuan = order.PhiNenTang - order.GiamGiaHeThong,
                PhuongThucThanhToan = order.LatestPayment!.TenPhuongThuc,
                order.MaDoiSoat,
                TrangThaiDoiSoat = order.IsReconciled
                    ? "DaDuaVaoKy"
                    : "ChuaDoiSoat"
            })
            .ToListAsync(cancellationToken);

        var periodQuery = _context.Doisoatnhahangs
            .AsNoTracking()
            .Where(period => period.TrangThai != "TranhChap");

        if (tuNgay.HasValue)
            periodQuery = periodQuery.Where(period => period.DenNgay >= tuNgay.Value);

        if (denNgay.HasValue)
            periodQuery = periodQuery.Where(period => period.TuNgay <= denNgay.Value);

        var periods = periodQuery
            .Select(period => new
            {
                period.MaDoiSoat,
                period.MaNhaHang,
                period.MaNhaHangNavigation.TenNhaHang,
                period.TuNgay,
                period.DenNgay,
                period.TongSoDon,
                period.TongPhiNenTang,
                period.TongGiamGiaHeThong,
                SoTienCanDoiSoat = period.SoTienCanDoiSoat ?? 0,
                period.TrangThai,
                period.MaGiaoDichDoiSoat,
                period.NgayThanhToan
            });

        var periodStats = await periods.GroupBy(_ => 1).Select(group => new
        {
            Count = group.Count(),
            PaidCount = group.Count(period => period.TrangThai == "DaThanhToan"),
            PaidToRestaurant = group.Sum(period => period.TrangThai == "DaThanhToan" && period.SoTienCanDoiSoat > 0 ? period.SoTienCanDoiSoat : 0m),
            ReceivedFromRestaurant = group.Sum(period => period.TrangThai == "DaThanhToan" && period.SoTienCanDoiSoat < 0 ? -period.SoTienCanDoiSoat : 0m),
            OwedToRestaurant = group.Sum(period => period.TrangThai != "DaThanhToan" && period.SoTienCanDoiSoat > 0 ? period.SoTienCanDoiSoat : 0m),
            OwedByRestaurant = group.Sum(period => period.TrangThai != "DaThanhToan" && period.SoTienCanDoiSoat < 0 ? -period.SoTienCanDoiSoat : 0m)
        }).SingleOrDefaultAsync(cancellationToken);

        var recentPeriods = await periods
            .OrderByDescending(period => period.NgayThanhToan)
            .ThenByDescending(period => period.MaDoiSoat)
            .Take(10)
            .Select(period => new
            {
                period.MaDoiSoat,
                period.MaNhaHang,
                period.TenNhaHang,
                period.TuNgay,
                period.DenNgay,
                period.TongSoDon,
                period.TongPhiNenTang,
                period.TongGiamGiaHeThong,
                DoanhThuThuan = period.TongPhiNenTang - period.TongGiamGiaHeThong,
                period.SoTienCanDoiSoat,
                period.TrangThai,
                period.MaGiaoDichDoiSoat,
                HinhThucThanhToan = period.MaGiaoDichDoiSoat != null &&
                    period.MaGiaoDichDoiSoat.StartsWith("ZERO-DOISOAT:")
                    ? "KhongPhatSinh"
                    : period.MaGiaoDichDoiSoat != null &&
                      period.MaGiaoDichDoiSoat.StartsWith("VI-DOISOAT:")
                        ? "ViNhaHang"
                        : period.TrangThai == "DaThanhToan" ? "ChuyenKhoan" : null,
                period.NgayThanhToan
            })
            .ToListAsync(cancellationToken);

        await snapshot.CommitAsync(cancellationToken);

        return Ok(new
        {
            tuNgay,
            denNgay,
            tongSoKy = periodStats?.Count ?? 0,
            soKyDaThanhToan = periodStats?.PaidCount ?? 0,
            soKyChoXuLy = (periodStats?.Count ?? 0) - (periodStats?.PaidCount ?? 0),
            tongSoDon = orderStats?.Count ?? 0,
            soDonDuLieuKhongHopLe = invalidOrderCount,
            tongPhiNenTang,
            tongChiPhiKhuyenMaiHeThong,
            doanhThuThuan,
            // Ghi nhận theo nguyên tắc dồn tích tại thời điểm đơn hoàn thành.
            doanhThuDaGhiNhan = doanhThuThuan,
            doanhThuDaDoiSoat = orderStats?.SettledRevenue ?? 0m,
            doanhThuChoDoiSoat = orderStats?.PendingRevenue ?? 0m,
            soDonChoDoiSoat = orderStats?.PendingCount ?? 0,
            daThanhToanChoNhaHang = periodStats?.PaidToRestaurant ?? 0m,
            daThuTuNhaHang = periodStats?.ReceivedFromRestaurant ?? 0m,
            conPhaiTraNhaHang = periodStats?.OwedToRestaurant ?? 0m,
            conPhaiThuNhaHang = periodStats?.OwedByRestaurant ?? 0m,
            cacDonDoanhThuGanDay = recentRevenueOrders,
            cacKyGanDay = recentPeriods,
            capNhatLuc = VietnamBusinessTime.Now()
        });
    }
}
