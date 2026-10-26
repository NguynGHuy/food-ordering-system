using DatMonAnOnline.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace DatMonAnOnline.API.Controllers
{
    [Route("api/danh-muc")]
    [ApiController]
    public class DanhMucController : ControllerBase
    {
        private readonly DatMonAnOnlineContext _context;

        public DanhMucController(DatMonAnOnlineContext context)
        {
            _context = context;
        }

        // =========================================================
        // REQUEST MODELS
        // =========================================================

        public class TaoDanhMucRequest
        {
            [Required, MaxLength(100)]
            public string TenDanhMuc { get; set; } = string.Empty;

            [Range(0, int.MaxValue)]
            public int ThuTuHienThi { get; set; }
        }

        public class CapNhatDanhMucRequest
        {
            [Required, MaxLength(100)]
            public string TenDanhMuc { get; set; } = string.Empty;

            [Range(0, int.MaxValue)]
            public int ThuTuHienThi { get; set; }
        }

        public class SapXepDanhMucItem
        {
            [Range(1, int.MaxValue)]
            public int MaDanhMuc { get; set; }

            [Range(0, int.MaxValue)]
            public int ThuTuHienThi { get; set; }
        }

        // =========================================================
        // 1. GET /api/danh-muc?maNhaHang={id}
        // Public - Khách xem danh sách danh mục của quán
        // =========================================================

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetDanhMucs(
            [FromQuery] int maNhaHang)
        {
            if (maNhaHang <= 0)
            {
                return BadRequest(new
                {
                    message = "MaNhaHang không hợp lệ."
                });
            }

            // Kiểm tra nhà hàng có tồn tại, đã duyệt và đủ điều kiện nhận đơn.
            var homNay = DateOnly.FromDateTime(DateTime.Now);
            var nhaHangTonTai = await _context.Nhahangs
                .AsNoTracking()
                .AnyAsync(x =>
                    x.MaNhaHang == maNhaHang &&
                    x.TrangThaiDuyet == "DaDuyet" &&
                    x.MaTaiKhoanNavigation.TrangThai == true &&
                    x.Hopdongnhahangs.Any(contract =>
                        contract.TrangThai == "HieuLuc" &&
                        contract.NgayBatDau <= homNay &&
                        contract.NgayKetThuc >= homNay));

            if (!nhaHangTonTai)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy nhà hàng hoặc nhà hàng chưa được duyệt."
                });
            }

            var result = await _context.Danhmucs
                .AsNoTracking()
                .Where(x => x.MaNhaHang == maNhaHang)
                .OrderBy(x => x.ThuTuHienThi ?? int.MaxValue)
                .ThenBy(x => x.MaDanhMuc)
                .Select(x => new
                {
                    x.MaDanhMuc,
                    x.MaNhaHang,
                    x.TenDanhMuc,
                    x.ThuTuHienThi
                })
                .ToListAsync();

            return Ok(result);
        }

        // =========================================================
        // 2. POST /api/danh-muc
        // Quán tạo danh mục
        // =========================================================

        [HttpPost]
        [Authorize(Roles = "Quan")]
        public async Task<IActionResult> CreateDanhMuc(
            TaoDanhMucRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.TenDanhMuc))
            {
                return BadRequest(new
                {
                    message = "Tên danh mục không được để trống."
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

            // Tìm nhà hàng thuộc tài khoản Quán đang đăng nhập
            var nhaHang = await _context.Nhahangs
                .FirstOrDefaultAsync(x =>
                    x.MaTaiKhoan == maTaiKhoan.Value);

            if (nhaHang == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy nhà hàng của tài khoản này."
                });
            }

            // UC-13: Nhà hàng phải được Admin duyệt
            if (nhaHang.TrangThaiDuyet != "DaDuyet")
            {
                return BadRequest(new
                {
                    message = "Nhà hàng chưa được Admin duyệt."
                });
            }

            var danhMuc = new Danhmuc
            {
                MaNhaHang = nhaHang.MaNhaHang,
                TenDanhMuc = request.TenDanhMuc.Trim(),
                ThuTuHienThi = request.ThuTuHienThi
            };

            _context.Danhmucs.Add(danhMuc);

            await _context.SaveChangesAsync();

            return Created(
                $"/api/danh-muc?maNhaHang={nhaHang.MaNhaHang}",
                new
                {
                    message = "Tạo danh mục thành công.",
                    maDanhMuc = danhMuc.MaDanhMuc
                });
        }

        // =========================================================
        // 3. PUT /api/danh-muc/{id}
        // Quán sửa danh mục
        // =========================================================

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Quan")]
        public async Task<IActionResult> UpdateDanhMuc(
            int id,
            CapNhatDanhMucRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.TenDanhMuc))
            {
                return BadRequest(new
                {
                    message = "Tên danh mục không được để trống."
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
                    x.MaTaiKhoan == maTaiKhoan.Value);

            if (nhaHang == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy nhà hàng của tài khoản này."
                });
            }

            if (nhaHang.TrangThaiDuyet != "DaDuyet")
            {
                return BadRequest(new
                {
                    message = "Nhà hàng chưa được Admin duyệt."
                });
            }

            var danhMuc = await _context.Danhmucs
                .FirstOrDefaultAsync(x =>
                    x.MaDanhMuc == id);

            if (danhMuc == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy danh mục."
                });
            }

            // Không cho Quán sửa danh mục của quán khác
            if (danhMuc.MaNhaHang != nhaHang.MaNhaHang)
            {
                return Forbid();
            }

            danhMuc.TenDanhMuc = request.TenDanhMuc.Trim();
            danhMuc.ThuTuHienThi = request.ThuTuHienThi;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật danh mục thành công."
            });
        }

        // =========================================================
        // 4. DELETE /api/danh-muc/{id}
        // Quán xoá danh mục
        // =========================================================

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Quan")]
        public async Task<IActionResult> DeleteDanhMuc(int id)
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
                .FirstOrDefaultAsync(x =>
                    x.MaTaiKhoan == maTaiKhoan.Value);

            if (nhaHang == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy nhà hàng của tài khoản này."
                });
            }

            if (nhaHang.TrangThaiDuyet != "DaDuyet")
            {
                return BadRequest(new
                {
                    message = "Nhà hàng chưa được Admin duyệt."
                });
            }

            var danhMuc = await _context.Danhmucs
                .FirstOrDefaultAsync(x =>
                    x.MaDanhMuc == id);

            if (danhMuc == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy danh mục."
                });
            }

            // Không cho xoá danh mục của quán khác
            if (danhMuc.MaNhaHang != nhaHang.MaNhaHang)
            {
                return Forbid();
            }

            // Đặc tả yêu cầu:
            // Nếu danh mục còn món -> 409 Conflict
            var coMonAn = await _context.Monans
                .AsNoTracking()
                .AnyAsync(x => x.MaDanhMuc == id);

            if (coMonAn)
            {
                return Conflict(new
                {
                    message = "Không thể xoá danh mục vì vẫn còn món ăn thuộc danh mục này."
                });
            }

            _context.Danhmucs.Remove(danhMuc);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Xoá danh mục thành công."
            });
        }

        // =========================================================
        // 5. PUT /api/danh-muc/sap-xep
        // Quán cập nhật thứ tự hàng loạt
        // =========================================================

        [HttpPut("sap-xep")]
        [Authorize(Roles = "Quan")]
        public async Task<IActionResult> SapXepDanhMuc(
            List<SapXepDanhMucItem> request)
        {
            if (request == null || request.Count == 0)
            {
                return BadRequest(new
                {
                    message = "Danh sách sắp xếp không được để trống."
                });
            }

            // Không cho gửi trùng MaDanhMuc
            if (request
                .Select(x => x.MaDanhMuc)
                .Distinct()
                .Count() != request.Count)
            {
                return BadRequest(new
                {
                    message = "Danh sách sắp xếp không được chứa danh mục trùng nhau."
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
                    x.MaTaiKhoan == maTaiKhoan.Value);

            if (nhaHang == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy nhà hàng của tài khoản này."
                });
            }

            if (nhaHang.TrangThaiDuyet != "DaDuyet")
            {
                return BadRequest(new
                {
                    message = "Nhà hàng chưa được Admin duyệt."
                });
            }

            var ids = request
                .Select(x => x.MaDanhMuc)
                .ToList();

            var danhMucs = await _context.Danhmucs
                .Where(x => ids.Contains(x.MaDanhMuc))
                .ToListAsync();

            // Có ID không tồn tại
            if (danhMucs.Count != ids.Count)
            {
                return NotFound(new
                {
                    message = "Một hoặc nhiều danh mục không tồn tại."
                });
            }

            // Có ID thuộc nhà hàng khác
            if (danhMucs.Any(x =>
                x.MaNhaHang != nhaHang.MaNhaHang))
            {
                return Forbid();
            }

            var requestById = request
                .ToDictionary(
                    x => x.MaDanhMuc,
                    x => x.ThuTuHienThi);

            foreach (var danhMuc in danhMucs)
            {
                danhMuc.ThuTuHienThi =
                    requestById[danhMuc.MaDanhMuc];
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Sắp xếp danh mục thành công."
            });
        }

        // =========================================================
        // LẤY MÃ TÀI KHOẢN TỪ JWT
        // Giống phong cách NhaHangController hiện tại
        // =========================================================

        private int? GetMaTaiKhoan()
        {
            var value =
                User.FindFirstValue(ClaimTypes.NameIdentifier);

            return int.TryParse(value, out var id)
                ? id
                : null;
        }
    }
}
