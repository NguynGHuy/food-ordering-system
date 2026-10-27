using DatMonAnOnline.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DatMonAnOnline.API.Controllers;

[Route("api/vi")]
[ApiController]
[Authorize(Roles = "KhachHang,Quan")]
public class ViController : ControllerBase
{
    private readonly DatMonAnOnlineContext _context;

    public ViController(DatMonAnOnlineContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetMyWallet()
    {
        var maTaiKhoan = GetMaTaiKhoan();
        if (maTaiKhoan == null)
            return Unauthorized(new { message = "Token không hợp lệ." });

        var wallet = await _context.Vis
            .AsNoTracking()
            .Where(item => item.MaTaiKhoan == maTaiKhoan.Value)
            .Select(item => new
            {
                item.MaVi,
                item.SoDu,
                item.DonViTienTe,
                item.TrangThai,
                item.NgayCapNhat
            })
            .FirstOrDefaultAsync();

        if (wallet == null)
            return NotFound(new { message = "Tài khoản chưa có ví. Vui lòng chạy script cập nhật database." });

        return Ok(wallet);
    }

    [HttpGet("giao-dich")]
    public async Task<IActionResult> GetMyTransactions(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? loaiBienDong = null,
        [FromQuery] string? loaiGiaoDich = null)
    {
        var maTaiKhoan = GetMaTaiKhoan();
        if (maTaiKhoan == null)
            return Unauthorized(new { message = "Token không hợp lệ." });

        if (pageNumber < 1 || pageSize is < 1 or > 100)
            return BadRequest(new { message = "Số trang phải từ 1 và kích thước trang phải từ 1 đến 100." });

        var offset = (long)(pageNumber - 1) * pageSize;
        if (offset > int.MaxValue)
            return BadRequest(new { message = "Số trang quá lớn. Vui lòng chọn trang nhỏ hơn." });

        var query = _context.Giaodichvis
            .AsNoTracking()
            .Where(item => item.MaViNavigation.MaTaiKhoan == maTaiKhoan.Value);

        if (!string.IsNullOrWhiteSpace(loaiBienDong))
        {
            if (loaiBienDong is not ("Cong" or "Tru"))
                return BadRequest(new { message = "Loại biến động không hợp lệ." });

            query = query.Where(item => item.LoaiBienDong == loaiBienDong);
        }

        if (!string.IsNullOrWhiteSpace(loaiGiaoDich))
        {
            var loaiHopLe = new[]
            {
                "NapTien", "ThanhToan", "HoanTien", "ThuNhapDonHang", "NhanDoiSoat",
                "RutTien", "ChuyenTien", "DieuChinh", "KhoiTao"
            };

            if (!loaiHopLe.Contains(loaiGiaoDich))
                return BadRequest(new { message = "Loại giao dịch không hợp lệ." });

            query = query.Where(item => item.LoaiGiaoDich == loaiGiaoDich);
        }

        var totalItems = await query.CountAsync();
        var items = await query
            .OrderByDescending(item => item.NgayTao)
            .ThenByDescending(item => item.MaGiaoDichVi)
            .Skip((int)offset)
            .Take(pageSize)
            .Select(item => new
            {
                item.MaGiaoDichVi,
                item.MaDonHang,
                item.MaHoanTien,
                item.MaDoiSoat,
                item.LoaiGiaoDich,
                item.LoaiBienDong,
                item.SoTien,
                item.SoDuTruoc,
                item.SoDuSau,
                item.TrangThai,
                item.MaThamChieu,
                item.NoiDung,
                item.NgayTao
            })
            .ToListAsync();

        var totalPages = totalItems == 0
            ? 0
            : (int)Math.Ceiling(totalItems / (double)pageSize);

        return Ok(new
        {
            items,
            pageNumber,
            pageSize,
            totalItems,
            totalPages,
            hasPreviousPage = pageNumber > 1,
            hasNextPage = pageNumber < totalPages
        });
    }

    private int? GetMaTaiKhoan()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(value, out var id) && id > 0 ? id : null;
    }
}
