using DatMonAnOnline.API.Common;
using DatMonAnOnline.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace DatMonAnOnline.API.Controllers
{
    [Route("api/nha-hang")]
    [ApiController]
    public class NhaHangController : ControllerBase
    {
        private readonly DatMonAnOnlineContext _context;

        public NhaHangController(DatMonAnOnlineContext context)
        {
            _context = context;
        }

        public class UpdateNhaHangDto
        {
            [Required, MaxLength(150)]
            public string TenNhaHang { get; set; } = string.Empty;

            [MaxLength(500)]
            public string? MoTa { get; set; }

            [Required, MaxLength(255)]
            public string DiaChiQuan { get; set; } = string.Empty;

            [MaxLength(255)]
            public string? AnhBia { get; set; }

            public TimeOnly? GioMoCua { get; set; }

            public TimeOnly? GioDongCua { get; set; }

            [VndAmount]
            public decimal PhiShipMacDinh { get; set; }
        }

        public class UpdateCheDoHoatDongDto
        {
            [Required]
            public string CheDoHoatDong { get; set; } = string.Empty;
        }

        [HttpPost("anh-bia")]
        [Authorize(Roles = "Quan")]
        [RequestSizeLimit(6 * 1024 * 1024)]
        public async Task<IActionResult> UploadAnhBia(
            [FromForm] IFormFile? file,
            [FromServices] IWebHostEnvironment environment)
        {
            var accountId = GetMaTaiKhoan();
            if (accountId == null) return Unauthorized();
            var restaurantId = await _context.Nhahangs.AsNoTracking()
                .Where(x => x.MaTaiKhoan == accountId && x.MaTaiKhoanNavigation.TrangThai == true)
                .Select(x => (int?)x.MaNhaHang).SingleOrDefaultAsync(HttpContext.RequestAborted);
            if (restaurantId == null) return NotFound(new { message = "Không tìm thấy nhà hàng đang hoạt động của tài khoản." });
            if (file == null || file.Length == 0 || file.Length > 5 * 1024 * 1024)
                return BadRequest(new { message = "Chọn ảnh JPEG, PNG hoặc WebP không quá 5 MB." });

            var extension = file.ContentType.ToLowerInvariant() switch
            {
                "image/jpeg" => ".jpg",
                "image/png" => ".png",
                "image/webp" => ".webp",
                _ => null
            };
            if (extension == null) return BadRequest(new { message = "Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP." });
            using var input = new MemoryStream();
            await file.CopyToAsync(input, HttpContext.RequestAborted);
            var (safeImage, error) = SafeImageProcessor.DecodeAndSanitize(input.ToArray(), extension, HttpContext.RequestAborted);
            if (safeImage == null) return BadRequest(new { message = error });

            using var bitmap = SkiaSharp.SKBitmap.Decode(safeImage.Content);
            using var image = SkiaSharp.SKImage.FromBitmap(bitmap);
            using var webp = image.Encode(SkiaSharp.SKEncodedImageFormat.Webp, 85);
            var directory = Path.Combine(environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot"), "uploads", "restaurants");
            Directory.CreateDirectory(directory);
            // Server-owned filename: never trust client paths or overwrite an existing upload.
            var name = $"owner-{restaurantId}-{Guid.NewGuid():N}.webp";
            var target = Path.Combine(directory, name);
            var created = false;
            try
            {
                await using var output = new FileStream(target, FileMode.CreateNew, FileAccess.Write, FileShare.None);
                created = true;
                await output.WriteAsync(webp.ToArray(), HttpContext.RequestAborted);
            }
            catch
            {
                if (created && System.IO.File.Exists(target)) System.IO.File.Delete(target);
                throw;
            }
            // The existing profile PUT applies the selected image when the owner presses Save.
            return Ok(new { anhBia = $"/uploads/restaurants/{name}" });
        }

        // =====================================================
        // PUBLIC: DANH SÁCH NHÀ HÀNG
        // =====================================================

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetDanhSachNhaHang(
            [FromQuery] PaginationQuery pagination,
            [FromQuery] string? search = null,
            [FromQuery] string? sort = null,
            [FromQuery] bool openOnly = false)
        {
            var homNay = DateOnly.FromDateTime(DateTime.Now);
            var query = _context.Nhahangs
                .AsNoTracking()
                .Include(x => x.MaTaiKhoanNavigation)
                .Where(x =>
                    x.TrangThaiDuyet == "DaDuyet" &&
                    x.MaTaiKhoanNavigation.TrangThai == true &&
                    x.Hopdongnhahangs.Any(contract =>
                        contract.TrangThai == "HieuLuc" &&
                        contract.NgayBatDau <= homNay &&
                        contract.NgayKetThuc >= homNay));

            if (!string.IsNullOrWhiteSpace(search))
            {
                var keyword = search.Trim();
                query = query.Where(x =>
                    x.TenNhaHang.Contains(keyword) ||
                    x.DiaChiQuan.Contains(keyword) ||
                    (x.MoTa != null && x.MoTa.Contains(keyword)));
            }

            if (openOnly)
            {
                var currentTime = TimeOnly.FromDateTime(DateTime.Now);
                query = query.Where(x =>
                    x.CheDoHoatDong == "MoThuCong" ||
                    (x.CheDoHoatDong == "TuDong" &&
                     x.GioMoCua.HasValue &&
                     x.GioDongCua.HasValue &&
                     x.GioMoCua.Value != x.GioDongCua.Value &&
                     ((x.GioMoCua.Value < x.GioDongCua.Value &&
                       currentTime >= x.GioMoCua.Value &&
                       currentTime < x.GioDongCua.Value) ||
                      (x.GioMoCua.Value > x.GioDongCua.Value &&
                       (currentTime >= x.GioMoCua.Value ||
                        currentTime < x.GioDongCua.Value)))));
            }

            query = string.Equals(sort, "rating", StringComparison.OrdinalIgnoreCase)
                ? query.OrderByDescending(x => x.DanhGiaTrungBinh).ThenBy(x => x.TenNhaHang)
                : query.OrderBy(x => x.TenNhaHang);

            var page = await query.ToPagedResultAsync(pagination);

            var items = page.Items.Select(x =>
            {
                var trangThai =
                    TrangThaiNhaHangHelper.KiemTra(x);

                return new
                {
                    x.MaNhaHang,
                    x.TenNhaHang,
                    x.MoTa,
                    x.DiaChiQuan,
                    x.AnhBia,
                    x.GioMoCua,
                    x.GioDongCua,

                    // Giữ lại để tương thích code cũ
                    x.TrangThaiHoatDong,

                    // Thông tin mới
                    x.CheDoHoatDong,
                    trangThai.DangMoCua,
                    trangThai.TrangThaiHienThi,

                    x.DanhGiaTrungBinh,
                    x.PhiShipMacDinh
                };
            });

            return Ok(new
            {
                items,
                page.PageNumber,
                page.PageSize,
                page.TotalItems,
                page.TotalPages,
                page.HasPreviousPage,
                page.HasNextPage
            });
        }

        // =====================================================
        // PUBLIC: CHI TIẾT NHÀ HÀNG
        // =====================================================

        [HttpGet("{id:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetChiTietNhaHang(int id)
        {
            var homNay = DateOnly.FromDateTime(DateTime.Now);
            var nhaHang = await _context.Nhahangs
                .AsNoTracking()
                .Include(x => x.MaTaiKhoanNavigation)
                .FirstOrDefaultAsync(x =>
                    x.MaNhaHang == id &&
                    x.TrangThaiDuyet == "DaDuyet" &&
                    x.MaTaiKhoanNavigation.TrangThai == true &&
                    x.Hopdongnhahangs.Any(contract =>
                        contract.TrangThai == "HieuLuc" &&
                        contract.NgayBatDau <= homNay &&
                        contract.NgayKetThuc >= homNay)
                );

            if (nhaHang == null)
            {
                return NotFound(new
                {
                    message =
                        "Không tìm thấy nhà hàng hoặc nhà hàng chưa được duyệt."
                });
            }

            var trangThai =
                TrangThaiNhaHangHelper.KiemTra(nhaHang);

            return Ok(new
            {
                nhaHang.MaNhaHang,
                nhaHang.TenNhaHang,
                nhaHang.MoTa,
                nhaHang.DiaChiQuan,
                nhaHang.AnhBia,
                nhaHang.GioMoCua,
                nhaHang.GioDongCua,

                // Giữ lại để tương thích code cũ
                nhaHang.TrangThaiHoatDong,

                // Thông tin trạng thái mới
                nhaHang.CheDoHoatDong,
                trangThai.DangMoCua,
                trangThai.TrangThaiHienThi,

                nhaHang.DanhGiaTrungBinh,
                nhaHang.PhiShipMacDinh
            });
        }

        // =====================================================
        // QUÁN: LẤY HỒ SƠ NHÀ HÀNG
        // =====================================================

        [HttpGet("ho-so")]
        [Authorize(Roles = "Quan")]
        public async Task<IActionResult> GetHoSoQuan()
        {
            var maTaiKhoan = GetMaTaiKhoan();

            if (maTaiKhoan == null)
            {
                return Unauthorized(new
                {
                    message = "Token không hợp lệ."
                });
            }

            var nhaHang = await _context.Nhahangs
                .AsNoTracking()
                .Include(x => x.MaTaiKhoanNavigation)
                .FirstOrDefaultAsync(x =>
                    x.MaTaiKhoan == maTaiKhoan.Value
                );

            if (nhaHang == null)
            {
                return NotFound(new
                {
                    message =
                        "Không tìm thấy nhà hàng của tài khoản này."
                });
            }

            var trangThai =
                TrangThaiNhaHangHelper.KiemTra(nhaHang);

            var khoaThongTinHopDong =
                nhaHang.TrangThaiDuyet == "ChoDuyet" ||
            await KhoaThongTinHopDong(nhaHang.MaNhaHang);

            return Ok(new
            {
                nhaHang.MaNhaHang,
                nhaHang.MaTaiKhoan,
                nhaHang.TenNhaHang,
                nhaHang.MoTa,
                nhaHang.DiaChiQuan,
                nhaHang.AnhBia,
                nhaHang.GioMoCua,
                nhaHang.GioDongCua,
                nhaHang.TrangThaiDuyet,
                khoaThongTinHopDong,

                // Giữ lại để tương thích code cũ
                nhaHang.TrangThaiHoatDong,

                // Thông tin trạng thái mới
                nhaHang.CheDoHoatDong,
                trangThai.DangMoCua,
                trangThai.TrangThaiHienThi,

                nhaHang.DanhGiaTrungBinh,
                nhaHang.PhiShipMacDinh,

                email = nhaHang.MaTaiKhoanNavigation.Email,
                soDienThoai =
                    nhaHang.MaTaiKhoanNavigation.SoDienThoai
            });
        }

        // =====================================================
        // QUÁN: CẬP NHẬT HỒ SƠ
        // =====================================================

        [HttpPut("ho-so")]
        [Authorize(Roles = "Quan")]
        public async Task<IActionResult> UpdateHoSoQuan(
            UpdateNhaHangDto request
        )
        {
            var maTaiKhoan = GetMaTaiKhoan();

            if (maTaiKhoan == null)
            {
                return Unauthorized(new
                {
                    message = "Token không hợp lệ."
                });
            }

            if (request.PhiShipMacDinh < 0)
            {
                return BadRequest(new
                {
                    message = "PhiShipMacDinh không được âm."
                });
            }

            if (request.GioMoCua.HasValue &&
                request.GioDongCua.HasValue &&
                request.GioMoCua == request.GioDongCua)
            {
                return BadRequest(new
                {
                    message =
                        "Giờ mở cửa và giờ đóng cửa không được giống nhau."
                });
            }

            // Nhà hàng - đồng bộ cập nhật hồ sơ với thao tác ký hợp đồng
            await using var transaction =
                await _context.Database.BeginTransactionAsync();

            var nhaHangs = await _context.Nhahangs
                .FromSqlInterpolated(
                    $"SELECT * FROM nhahang WHERE MaTaiKhoan = {maTaiKhoan.Value} FOR UPDATE")
                .ToListAsync();

            var nhaHang = nhaHangs.SingleOrDefault();

            if (nhaHang == null)
            {
                return NotFound(new
                {
                    message =
                        "Không tìm thấy nhà hàng của tài khoản này."
                });
            }

            var tenMoi = request.TenNhaHang.Trim();
            var diaChiMoi = request.DiaChiQuan.Trim();

            if (string.IsNullOrWhiteSpace(tenMoi) ||
                string.IsNullOrWhiteSpace(diaChiMoi))
            {
                return BadRequest(new
                {
                    message = "Tên và địa chỉ nhà hàng không được để trống."
                });
            }

            var khoaThongTinHopDong =
                nhaHang.TrangThaiDuyet == "ChoDuyet" ||
                await KhoaThongTinHopDong(nhaHang.MaNhaHang);

            var thayDoiThongTinHopDong =
                !string.Equals(
                    tenMoi,
                    nhaHang.TenNhaHang.Trim(),
                    StringComparison.Ordinal) ||
                !string.Equals(
                    diaChiMoi,
                    nhaHang.DiaChiQuan.Trim(),
                    StringComparison.Ordinal);

            if (khoaThongTinHopDong && thayDoiThongTinHopDong)
            {
                return Conflict(new
                {
                    message =
                        "Không thể đổi tên hoặc địa chỉ nhà hàng khi hợp đồng " +
                        "đã ký, đang chờ duyệt hoặc đang có hiệu lực."
                });
            }

            nhaHang.TenNhaHang =
                request.TenNhaHang.Trim();

            nhaHang.MoTa =
                string.IsNullOrWhiteSpace(request.MoTa)
                    ? null
                    : request.MoTa.Trim();

            nhaHang.DiaChiQuan =
                request.DiaChiQuan.Trim();

            nhaHang.AnhBia =
                string.IsNullOrWhiteSpace(request.AnhBia)
                    ? null
                    : request.AnhBia.Trim();

            nhaHang.GioMoCua =
                request.GioMoCua;

            nhaHang.GioDongCua =
                request.GioDongCua;

            nhaHang.PhiShipMacDinh =
                request.PhiShipMacDinh;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            var trangThai =
                TrangThaiNhaHangHelper.KiemTra(nhaHang);

            return Ok(new
            {
                message =
                    "Cập nhật hồ sơ nhà hàng thành công.",

                nhaHang.CheDoHoatDong,
                trangThai.DangMoCua,
                trangThai.TrangThaiHienThi
            });
        }

        // =====================================================
        // QUÁN: CẬP NHẬT CHẾ ĐỘ HOẠT ĐỘNG
        // =====================================================

        [HttpPut("trang-thai-hoat-dong")]
        [Authorize(Roles = "Quan")]
        public async Task<IActionResult> UpdateTrangThai(
            UpdateCheDoHoatDongDto request
        )
        {
            var cheDo = request.CheDoHoatDong.Trim();

            var cheDoHopLe = new[]
            {
                "TuDong",
                "MoThuCong",
                "TamNgung"
            };

            if (!cheDoHopLe.Contains(cheDo))
            {
                return BadRequest(new
                {
                    message =
                        "CheDoHoatDong chỉ nhận TuDong, MoThuCong hoặc TamNgung."
                });
            }

            var maTaiKhoan = GetMaTaiKhoan();

            if (maTaiKhoan == null)
            {
                return Unauthorized(new
                {
                    message = "Token không hợp lệ."
                });
            }

            var nhaHang = await _context.Nhahangs
                .FirstOrDefaultAsync(x =>
                    x.MaTaiKhoan == maTaiKhoan.Value
                );

            if (nhaHang == null)
            {
                return NotFound(new
                {
                    message =
                        "Không tìm thấy nhà hàng của tài khoản này."
                });
            }

            if (nhaHang.TrangThaiDuyet != "DaDuyet")
            {
                return BadRequest(new
                {
                    message =
                        "Nhà hàng chưa được Admin duyệt nên chưa thể nhận đơn."
                });
            }

            nhaHang.CheDoHoatDong = cheDo;

            /*
             * Cột cũ được giữ để code cũ chưa sửa không bị lỗi.
             * Sau này mọi màn hình sẽ sử dụng DangMoCua.
             */
            if (cheDo == "TamNgung")
            {
                nhaHang.TrangThaiHoatDong = "TamNgung";
            }
            else if (cheDo == "MoThuCong")
            {
                nhaHang.TrangThaiHoatDong = "MoCua";
            }
            else
            {
                var ketQuaTuDong =
                    TrangThaiNhaHangHelper.KiemTra(nhaHang);

                nhaHang.TrangThaiHoatDong =
                    ketQuaTuDong.DangMoCua
                        ? "MoCua"
                        : "DongCua";
            }

            await _context.SaveChangesAsync();

            var trangThai =
                TrangThaiNhaHangHelper.KiemTra(nhaHang);

            return Ok(new
            {
                message =
                    "Cập nhật chế độ hoạt động thành công.",

                nhaHang.CheDoHoatDong,
                trangThai.DangMoCua,
                trangThai.TrangThaiHienThi
            });
        }

        private int? GetMaTaiKhoan()
        {
            var value = User.FindFirstValue(
                ClaimTypes.NameIdentifier
            );

            return int.TryParse(value, out var id)
                ? id
                : null;
        }

        // Nhà hàng - khóa thông tin đã dùng trong hợp đồng
        private Task<bool> KhoaThongTinHopDong(int maNhaHang)
        {
            return _context.Hopdongnhahangs.AnyAsync(x =>
                x.MaNhaHang == maNhaHang &&
                (x.TrangThai == "DaKy" ||
                 x.TrangThai == "ChoDuyet" ||
                 x.TrangThai == "HieuLuc")
            );
        }
    }

    // =========================================================
    // LOGIC XÁC ĐỊNH TRẠNG THÁI THỰC TẾ
    // =========================================================

    internal static class TrangThaiNhaHangHelper
    {
        public static (
            bool DangMoCua,
            string TrangThaiHienThi
        ) KiemTra(
            Nhahang nhaHang,
            DateTime? thoiDiem = null
        )
        {
            if (nhaHang.MaTaiKhoanNavigation != null &&
                nhaHang.MaTaiKhoanNavigation.TrangThai != true)
            {
                return (
                    false,
                    "Nhà hàng đang tạm ngưng hoạt động"
                );
            }

            if (nhaHang.TrangThaiDuyet != "DaDuyet")
            {
                return (
                    false,
                    "Nhà hàng chưa được duyệt"
                );
            }

            if (nhaHang.CheDoHoatDong == "MoThuCong")
            {
                return (
                    true,
                    "Đang mở cửa thủ công"
                );
            }

            if (nhaHang.CheDoHoatDong == "TamNgung")
            {
                return (
                    false,
                    "Nhà hàng đang tạm ngưng"
                );
            }

            if (nhaHang.CheDoHoatDong != "TuDong")
            {
                return (
                    false,
                    "Chế độ hoạt động không hợp lệ"
                );
            }

            if (!nhaHang.GioMoCua.HasValue ||
                !nhaHang.GioDongCua.HasValue)
            {
                return (
                    false,
                    "Nhà hàng chưa thiết lập giờ hoạt động"
                );
            }

            var gioMoCua =
                nhaHang.GioMoCua.Value;

            var gioDongCua =
                nhaHang.GioDongCua.Value;

            if (gioMoCua == gioDongCua)
            {
                return (
                    false,
                    "Giờ hoạt động chưa hợp lệ"
                );
            }

            var hienTai = TimeOnly.FromDateTime(
                thoiDiem ?? DateTime.Now
            );

            bool dangTrongGioHoatDong;

            if (gioMoCua < gioDongCua)
            {
                dangTrongGioHoatDong =
                    hienTai >= gioMoCua &&
                    hienTai < gioDongCua;
            }
            else
            {
                // Khung giờ đi qua nửa đêm
                dangTrongGioHoatDong =
                    hienTai >= gioMoCua ||
                    hienTai < gioDongCua;
            }

            if (dangTrongGioHoatDong)
            {
                return (
                    true,
                    "Đang mở cửa theo giờ hoạt động"
                );
            }

            return (
                false,
                "Ngoài giờ hoạt động"
            );
        }
    }
}
