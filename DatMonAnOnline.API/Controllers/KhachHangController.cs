using DatMonAnOnline.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace DatMonAnOnline.API.Controllers
{
    [Route("api/khach-hang")]
    [ApiController]
    [Authorize(Roles = "KhachHang")]
    public class KhachHangController : ControllerBase
    {
        private readonly DatMonAnOnlineContext _context;
        private readonly IWebHostEnvironment _environment;

        public KhachHangController(
            DatMonAnOnlineContext context,
            IWebHostEnvironment environment)
        {
            _context = context;
            _environment = environment;
        }

        public class UpdateHoSoDto
        {
            [Required, MaxLength(100)] public string HoTen { get; set; } = string.Empty;
            public DateOnly? NgaySinh { get; set; }
            [MaxLength(10)] public string? GioiTinh { get; set; }
        }

        [HttpGet("ho-so")]
        public async Task<IActionResult> GetHoSo()
        {
            var maTaiKhoan = GetMaTaiKhoan();
            if (maTaiKhoan == null) return Unauthorized(new { message = "Token không hợp lệ." });

            var khachHang = await _context.Khachhangs
                .AsNoTracking()
                .Include(x => x.MaTaiKhoanNavigation)
                    .ThenInclude(x => x.Vi)
                .FirstOrDefaultAsync(x => x.MaTaiKhoan == maTaiKhoan.Value);

            if (khachHang == null)
                return NotFound(new { message = "Không tìm thấy hồ sơ khách hàng." });

            return Ok(new
            {
                maKhachHang = khachHang.MaKhachHang,
                maTaiKhoan = khachHang.MaTaiKhoan,
                hoTen = khachHang.HoTen,
                ngaySinh = khachHang.NgaySinh,
                gioiTinh = khachHang.GioiTinh,
                soDuVi = khachHang.MaTaiKhoanNavigation.Vi?.SoDu ?? 0,
                email = khachHang.MaTaiKhoanNavigation?.Email,
                soDienThoai = khachHang.MaTaiKhoanNavigation?.SoDienThoai,
                anhDaiDien = khachHang.MaTaiKhoanNavigation?.AnhDaiDien
            });
        }

        [HttpGet("hoan-tien")]
        public async Task<IActionResult> GetHoanTien()
        {
            var maTaiKhoan = GetMaTaiKhoan();
            if (maTaiKhoan == null) return Unauthorized(new { message = "Token không hợp lệ." });

            var maKhachHang = await _context.Khachhangs
                .Where(item => item.MaTaiKhoan == maTaiKhoan.Value)
                .Select(item => (int?)item.MaKhachHang)
                .FirstOrDefaultAsync();
            if (maKhachHang == null)
                return NotFound(new { message = "Không tìm thấy hồ sơ khách hàng." });

            var danhSach = await _context.Hoantiens
                .AsNoTracking()
                .Where(item => _context.Donhangs.Any(order =>
                    order.MaDonHang == item.MaDonHang &&
                    order.MaKhachHang == maKhachHang))
                .OrderByDescending(item => item.ThoiGianHoanThanh)
                .Select(item => new
                {
                    item.LyDoHoan,
                    MaDonHangHienThi = _context.Donhangs
                        .Where(order => order.MaDonHang == item.MaDonHang)
                        .Select(order => order.MaDonHangHienThi)
                        .FirstOrDefault(),
                    item.SoTienHoan,
                    item.ThoiGianHoanThanh
                })
                .ToListAsync();

            return Ok(danhSach);
        }

        [HttpPut("ho-so")]
        public async Task<IActionResult> UpdateHoSo(UpdateHoSoDto request)
        {
            var maTaiKhoan = GetMaTaiKhoan();
            if (maTaiKhoan == null) return Unauthorized(new { message = "Token không hợp lệ." });

            var khachHang = await _context.Khachhangs
                .FirstOrDefaultAsync(x => x.MaTaiKhoan == maTaiKhoan.Value);

            if (khachHang == null)
                return NotFound(new { message = "Không tìm thấy hồ sơ khách hàng." });

            khachHang.HoTen = request.HoTen.Trim();
            khachHang.NgaySinh = request.NgaySinh;
            khachHang.GioiTinh = string.IsNullOrWhiteSpace(request.GioiTinh) ? null : request.GioiTinh.Trim();

            await _context.SaveChangesAsync();

            return Ok(new { message = "Cập nhật hồ sơ khách hàng thành công." });
        }

        [HttpPost("anh-dai-dien")]
        [RequestSizeLimit(5 * 1024 * 1024)]
        public async Task<IActionResult> UploadAnhDaiDien(IFormFile? file)
        {
            var maTaiKhoan = GetMaTaiKhoan();
            if (maTaiKhoan == null) return Unauthorized(new { message = "Token không hợp lệ." });

            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Vui lòng chọn ảnh đại diện." });

            if (file.Length > 5 * 1024 * 1024)
                return BadRequest(new { message = "Ảnh đại diện không được lớn hơn 5 MB." });

            var requestedExtension = file.ContentType.ToLowerInvariant() switch
            {
                "image/jpeg" => ".jpg",
                "image/png" => ".png",
                "image/webp" => ".webp",
                _ => null
            };

            if (requestedExtension == null)
                return BadRequest(new { message = "Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP hợp lệ." });

            byte[] uploadedBytes;
            await using (var input = file.OpenReadStream())
            await using (var memory = new MemoryStream())
            {
                await input.CopyToAsync(memory, HttpContext.RequestAborted);
                uploadedBytes = memory.ToArray();
            }

            var (safeImage, imageError) = Common.SafeImageProcessor.DecodeAndSanitize(
                uploadedBytes,
                requestedExtension,
                HttpContext.RequestAborted);

            if (safeImage == null)
                return BadRequest(new { message = imageError });

            var account = await _context.Taikhoans
                .FirstOrDefaultAsync(item => item.MaTaiKhoan == maTaiKhoan.Value);

            if (account == null)
                return NotFound(new { message = "Không tìm thấy tài khoản." });

            var uploadDirectory = GetAvatarDirectory();
            Directory.CreateDirectory(uploadDirectory);

            var fileName = $"{maTaiKhoan.Value}_{Guid.NewGuid():N}{safeImage.Extension}";
            var physicalPath = Path.Combine(uploadDirectory, fileName);
            var publicPath = $"/uploads/avatars/{fileName}";
            var oldAvatar = account.AnhDaiDien;

            await using (var output = new FileStream(
                physicalPath,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None))
            {
                await output.WriteAsync(safeImage.Content, HttpContext.RequestAborted);
            }

            try
            {
                account.AnhDaiDien = publicPath;
                await _context.SaveChangesAsync();
                DeleteStoredAvatar(oldAvatar);
            }
            catch
            {
                if (System.IO.File.Exists(physicalPath))
                    System.IO.File.Delete(physicalPath);
                throw;
            }

            return Ok(new
            {
                message = "Ảnh đại diện đã được cập nhật.",
                anhDaiDien = publicPath
            });
        }

        [HttpDelete("anh-dai-dien")]
        public async Task<IActionResult> DeleteAnhDaiDien()
        {
            var maTaiKhoan = GetMaTaiKhoan();
            if (maTaiKhoan == null) return Unauthorized(new { message = "Token không hợp lệ." });

            var account = await _context.Taikhoans
                .FirstOrDefaultAsync(item => item.MaTaiKhoan == maTaiKhoan.Value);

            if (account == null)
                return NotFound(new { message = "Không tìm thấy tài khoản." });

            var oldAvatar = account.AnhDaiDien;
            account.AnhDaiDien = null;
            await _context.SaveChangesAsync();
            DeleteStoredAvatar(oldAvatar);

            return Ok(new { message = "Đã gỡ ảnh đại diện." });
        }

        private string GetAvatarDirectory()
        {
            var webRoot = _environment.WebRootPath ??
                          Path.Combine(_environment.ContentRootPath, "wwwroot");
            return Path.Combine(webRoot, "uploads", "avatars");
        }

        private void DeleteStoredAvatar(string? publicPath)
        {
            if (string.IsNullOrWhiteSpace(publicPath) ||
                !publicPath.StartsWith("/uploads/avatars/", StringComparison.Ordinal))
            {
                return;
            }

            var fileName = Path.GetFileName(publicPath);
            var fullPath = Path.Combine(GetAvatarDirectory(), fileName);

            if (System.IO.File.Exists(fullPath))
                System.IO.File.Delete(fullPath);
        }

        private int? GetMaTaiKhoan()
        {
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(value, out var id) ? id : null;
        }
    }
}
