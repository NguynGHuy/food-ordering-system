using DatMonAnOnline.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using DatMonAnOnline.API.Common;

namespace DatMonAnOnline.API.Controllers
{
    [ApiController]
    public class DanhGiaController : ControllerBase
    {
        private readonly DatMonAnOnlineContext _context;

        public DanhGiaController(DatMonAnOnlineContext context)
        {
            _context = context;
        }

        private async Task<int> GetKhachHangIdAsync()
        {
            if (!int.TryParse(
                    User.FindFirstValue(ClaimTypes.NameIdentifier),
                    out var tkId) || tkId <= 0)
            {
                return 0;
            }

            return await _context.Khachhangs
                .AsNoTracking()
                .Where(k => k.MaTaiKhoan == tkId)
                .Select(k => k.MaKhachHang)
                .FirstOrDefaultAsync();
        }

        private static string? ChuanHoaNoiDung(string? value)
            => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        private static bool HinhAnhHopLe(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return true;

            var normalized = value.Trim();
            if (normalized.Length > 255) return false;
            if (normalized.Any(char.IsControl) || normalized.Contains('\\'))
                return false;

            if (Uri.TryCreate(normalized, UriKind.Absolute, out var absolute))
                return absolute.Scheme == Uri.UriSchemeHttps &&
                       !string.IsNullOrWhiteSpace(absolute.Host);

            return normalized.StartsWith('/') &&
                   !normalized.StartsWith("//") &&
                   Uri.TryCreate(normalized, UriKind.Relative, out _);
        }

        [HttpGet("api/don-hang/{id:int}/danh-gia-cua-toi")]
        [Authorize(Roles = "KhachHang")]
        public async Task<IActionResult> LayDanhGiaCuaToiTrongDon(int id)
        {
            var maKhachHang = await GetKhachHangIdAsync();

            if (maKhachHang == 0)
                return Unauthorized(new
                {
                    message = "Không tìm thấy thông tin khách hàng."
                });

            var donHang = await _context.Donhangs
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.MaDonHang == id);

            if (donHang == null)
                return NotFound(new
                {
                    message = "Không tìm thấy đơn hàng."
                });

            if (donHang.MaKhachHang != maKhachHang)
                return StatusCode(403, new
                {
                    message = "Bạn không có quyền xem đánh giá của đơn này."
                });

            var danhGiaQuan = await _context.Danhgianhahangs
                .AsNoTracking()
                .Where(x =>
                    x.MaDonHang == id &&
                    x.MaKhachHang == maKhachHang)
                .Select(x => new
                {
                    x.MaDanhGia,
                    x.MaNhaHang,
                    x.SoSao,
                    x.NoiDung,
                    x.NgayDanhGia
                })
                .FirstOrDefaultAsync();

            var danhGiaMon = await _context.Danhgiamonans
                .AsNoTracking()
                .Where(x =>
                    x.MaDonHang == id &&
                    x.MaKhachHang == maKhachHang)
                .OrderBy(x => x.MaMonAn)
                .Select(x => new
                {
                    x.MaDanhGia,
                    x.MaMonAn,
                    x.SoSao,
                    x.NoiDung,
                    x.NgayDanhGia
                })
                .ToListAsync();

            return Ok(new
            {
                maDonHang = id,
                danhGiaQuan,
                danhGiaMon
            });
        }

        [HttpPost("api/danh-gia-mon-an")]
        [Authorize(Roles = "KhachHang")]
        public async Task<IActionResult> DanhGiaMonAn([FromBody] DanhGiaMonAnRequest req)
        {
            int maKhachHang = await GetKhachHangIdAsync();

            var donHang = await _context.Donhangs
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.MaDonHang == req.MaDonHang);
            if (donHang == null || donHang.MaTrangThai != 5)
                return BadRequest("Chỉ được đánh giá các đơn hàng đã hoàn thành.");

            if (maKhachHang == 0)
                return Unauthorized("Không tìm thấy thông tin khách hàng.");

            if (donHang.MaKhachHang != maKhachHang)
                return Forbid();

            if (!HinhAnhHopLe(req.HinhAnh))
                return BadRequest("Đường dẫn hình ảnh không hợp lệ. Chỉ chấp nhận HTTPS hoặc đường dẫn nội bộ bắt đầu bằng /.");

            bool monThuocDon = await _context.Chitietdonhangs
                .AnyAsync(x =>
                    x.MaDonHang == req.MaDonHang &&
                    x.MaMonAn == req.MaMonAn);

            if (!monThuocDon)
                return BadRequest("Món ăn không thuộc đơn hàng này.");

            await using var transaction = await _context.Database.BeginTransactionAsync();

            var monAnDaKhoa = await _context.Monans
                .FromSqlInterpolated(
                    $"SELECT * FROM monan WHERE MaMonAn = {req.MaMonAn} FOR UPDATE")
                .SingleOrDefaultAsync();

            if (monAnDaKhoa == null)
                return BadRequest("Món ăn không tồn tại.");

            bool isExist = await _context.Danhgiamonans.AnyAsync(x =>
                x.MaKhachHang == maKhachHang &&
                x.MaMonAn == req.MaMonAn &&
                x.MaDonHang == req.MaDonHang);
            if (isExist)
                return Conflict("Bạn đã đánh giá món này trong đơn hàng này rồi.");

            // Chuyển dữ liệu từ Request (DTO) sang Entity Model để lưu vào DB
            var model = new Danhgiamonan
            {
                MaKhachHang = maKhachHang,
                MaMonAn = req.MaMonAn,
                MaDonHang = req.MaDonHang,
                SoSao = req.SoSao,
                NoiDung = ChuanHoaNoiDung(req.NoiDung),
                HinhAnh = string.IsNullOrWhiteSpace(req.HinhAnh)
                    ? null
                    : req.HinhAnh.Trim(),
                NgayDanhGia = DateTime.Now
            };

            _context.Danhgiamonans.Add(model);
            try
            {
                await _context.SaveChangesAsync();

                var avg = await _context.Danhgiamonans
                    .Where(x => x.MaMonAn == model.MaMonAn)
                    .AverageAsync(x => x.SoSao);
                monAnDaKhoa.DanhGiaTrungBinh = (float)avg;
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (DbUpdateException ex)
                when (ex.InnerException is MySqlException { Number: 1062 })
            {
                await transaction.RollbackAsync();
                return Conflict("Bạn đã đánh giá món này trong đơn hàng này rồi.");
            }

            return Ok(new { message = "Đánh giá món ăn thành công" });
        }

        [HttpGet("api/mon-an/{id}/danh-gia")]
        public async Task<IActionResult> XemDanhGiaMonAn(
            int id,
            [FromQuery] PaginationQuery pagination)
        {
            var list = await _context.Danhgiamonans
                .AsNoTracking()
                .Where(x => x.MaMonAn == id)
                .OrderByDescending(x => x.NgayDanhGia)
                .ToPagedResultAsync(pagination);
            return Ok(list);
        }

        [HttpPost("api/danh-gia-nha-hang")]
        [Authorize(Roles = "KhachHang")]
        public async Task<IActionResult> DanhGiaNhaHang([FromBody] DanhGiaNhaHangRequest req)
        {
            int maKhachHang = await GetKhachHangIdAsync();

            var donHang = await _context.Donhangs
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.MaDonHang == req.MaDonHang);
            if (donHang == null || donHang.MaTrangThai != 5)
                return BadRequest("Chỉ được đánh giá các đơn hàng đã hoàn thành.");

            if (maKhachHang == 0)
                return Unauthorized("Không tìm thấy thông tin khách hàng.");

            if (donHang.MaKhachHang != maKhachHang)
                return Forbid();

            if (donHang.MaNhaHang != req.MaNhaHang)
                return BadRequest("Nhà hàng không thuộc đơn hàng này.");

            await using var transaction = await _context.Database.BeginTransactionAsync();

            var nhaHangDaKhoa = await _context.Nhahangs
                .FromSqlInterpolated(
                    $"SELECT * FROM nhahang WHERE MaNhaHang = {req.MaNhaHang} FOR UPDATE")
                .SingleOrDefaultAsync();

            if (nhaHangDaKhoa == null)
                return BadRequest("Nhà hàng không tồn tại.");

            bool isExist = await _context.Danhgianhahangs.AnyAsync(x =>
                x.MaKhachHang == maKhachHang && x.MaNhaHang == req.MaNhaHang && x.MaDonHang == req.MaDonHang);
            if (isExist) return Conflict("Bạn đã đánh giá nhà hàng này rồi.");

            var model = new Danhgianhahang
            {
                MaKhachHang = maKhachHang,
                MaNhaHang = req.MaNhaHang,
                MaDonHang = req.MaDonHang,
                SoSao = req.SoSao,
                NoiDung = ChuanHoaNoiDung(req.NoiDung),
                NgayDanhGia = DateTime.Now
            };

            _context.Danhgianhahangs.Add(model);
            try
            {
                await _context.SaveChangesAsync();

                var avg = await _context.Danhgianhahangs
                    .Where(x => x.MaNhaHang == model.MaNhaHang)
                    .AverageAsync(x => x.SoSao);
                nhaHangDaKhoa.DanhGiaTrungBinh = (float)avg;
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (DbUpdateException ex)
                when (ex.InnerException is MySqlException { Number: 1062 })
            {
                await transaction.RollbackAsync();
                return Conflict("Bạn đã đánh giá nhà hàng này rồi.");
            }

            return Ok(new { message = "Đánh giá nhà hàng thành công" });
        }

        [HttpGet("api/nha-hang/{id}/danh-gia")]
        public async Task<IActionResult> XemDanhGiaNhaHang(
            int id,
            [FromQuery] PaginationQuery pagination)
        {
            var list = await _context.Danhgianhahangs
                .AsNoTracking()
                .Where(x => x.MaNhaHang == id)
                .OrderByDescending(x => x.NgayDanhGia)
                .ToPagedResultAsync(pagination);
            return Ok(list);
        }
    }

    // --- CÁC CLASS DTO HỨNG DỮ LIỆU TỪ POSTMAN ---
    public class DanhGiaMonAnRequest
    {
        [Range(1, int.MaxValue)]
        public int MaMonAn { get; set; }

        [Range(1, int.MaxValue)]
        public int MaDonHang { get; set; }

        [Range(1, 5)]
        public sbyte SoSao { get; set; }

        [MaxLength(500)]
        public string? NoiDung { get; set; }

        [MaxLength(255)]
        public string? HinhAnh { get; set; }
    }

    public class DanhGiaNhaHangRequest
    {
        [Range(1, int.MaxValue)]
        public int MaNhaHang { get; set; }

        [Range(1, int.MaxValue)]
        public int MaDonHang { get; set; }

        [Range(1, 5)]
        public sbyte SoSao { get; set; }

        [MaxLength(500)]
        public string? NoiDung { get; set; }
    }
}
