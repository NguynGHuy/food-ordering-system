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
        if (tuNgay.HasValue && denNgay.HasValue && tuNgay > denNgay)
        {
            return BadRequest(new
            {
                message = "Từ ngày không được lớn hơn đến ngày."
            });
        }

        var start = tuNgay?.ToDateTime(TimeOnly.MinValue);
        var endExclusive = denNgay?.AddDays(1).ToDateTime(TimeOnly.MinValue);

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

        var completedOrders = await orderQuery
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
            })
            .ToListAsync(cancellationToken);

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
            .ToList();

        var invalidOrderCount = completedOrders.Count - validOrders.Count;
        var tongPhiNenTang = validOrders.Sum(order => order.PhiNenTang);
        var tongChiPhiKhuyenMaiHeThong = validOrders.Sum(order => order.GiamGiaHeThong);
        var doanhThuThuan = tongPhiNenTang - tongChiPhiKhuyenMaiHeThong;
        var ordersPendingReconciliation = validOrders
            .Where(order => !order.MaDoiSoat.HasValue)
            .ToList();

        var recentRevenueOrders = validOrders
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
                TrangThaiDoiSoat = order.MaDoiSoat.HasValue
                    ? "DaDuaVaoKy"
                    : "ChuaDoiSoat"
            })
            .ToList();

        var periodQuery = _context.Doisoatnhahangs
            .AsNoTracking()
            .Where(period => period.TrangThai != "TranhChap");

        if (tuNgay.HasValue)
            periodQuery = periodQuery.Where(period => period.DenNgay >= tuNgay.Value);

        if (denNgay.HasValue)
            periodQuery = periodQuery.Where(period => period.TuNgay <= denNgay.Value);

        var periods = await periodQuery
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
            })
            .ToListAsync(cancellationToken);

        var paidPeriods = periods
            .Where(period => period.TrangThai == "DaThanhToan")
            .ToList();
        var unpaidPeriods = periods
            .Where(period => period.TrangThai != "DaThanhToan")
            .ToList();

        var recentPeriods = periods
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
            .ToList();

        return Ok(new
        {
            tuNgay,
            denNgay,
            tongSoKy = periods.Count,
            soKyDaThanhToan = paidPeriods.Count,
            soKyChoXuLy = unpaidPeriods.Count,
            tongSoDon = validOrders.Count,
            soDonDuLieuKhongHopLe = invalidOrderCount,
            tongPhiNenTang,
            tongChiPhiKhuyenMaiHeThong,
            doanhThuThuan,
            // Ghi nhận theo nguyên tắc dồn tích tại thời điểm đơn hoàn thành.
            doanhThuDaGhiNhan = doanhThuThuan,
            doanhThuDaDoiSoat = validOrders
                .Where(order => order.MaDoiSoat.HasValue)
                .Sum(order => order.PhiNenTang - order.GiamGiaHeThong),
            doanhThuChoDoiSoat = ordersPendingReconciliation
                .Sum(order => order.PhiNenTang - order.GiamGiaHeThong),
            soDonChoDoiSoat = ordersPendingReconciliation.Count,
            daThanhToanChoNhaHang = paidPeriods
                .Where(period => period.SoTienCanDoiSoat > 0)
                .Sum(period => period.SoTienCanDoiSoat),
            daThuTuNhaHang = paidPeriods
                .Where(period => period.SoTienCanDoiSoat < 0)
                .Sum(period => -period.SoTienCanDoiSoat),
            conPhaiTraNhaHang = unpaidPeriods
                .Where(period => period.SoTienCanDoiSoat > 0)
                .Sum(period => period.SoTienCanDoiSoat),
            conPhaiThuNhaHang = unpaidPeriods
                .Where(period => period.SoTienCanDoiSoat < 0)
                .Sum(period => -period.SoTienCanDoiSoat),
            cacDonDoanhThuGanDay = recentRevenueOrders,
            cacKyGanDay = recentPeriods,
            capNhatLuc = DateTime.Now
        });
    }
}
