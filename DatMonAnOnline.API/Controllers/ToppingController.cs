using DatMonAnOnline.API.Models;
using DatMonAnOnline.API.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace DatMonAnOnline.API.Controllers
{
    [Route("api/topping")]
    [ApiController]
    public class ToppingController : ControllerBase
    {
        private readonly DatMonAnOnlineContext _context;

        public ToppingController(DatMonAnOnlineContext context)
        {
            _context = context;
        }

        public class TaoToppingRequest
        {
            [Range(1, int.MaxValue)]
            public int MaNhomTopping { get; set; }

            [Required, MaxLength(100)]
            public string TenTopping { get; set; } = string.Empty;

            [VndAmount]
            public decimal GiaThem { get; set; }
        }

        public class CapNhatToppingRequest
        {
            [Required, MaxLength(100)]
            public string TenTopping { get; set; } = string.Empty;

            [VndAmount]
            public decimal GiaThem { get; set; }
        }

        public class CapNhatTrangThaiRequest
        {
            public bool TrangThai { get; set; }
        }

        // GET /api/topping?maNhomTopping={id}
        // Public: chỉ trả dữ liệu nếu nhóm topping thuộc nhà hàng đã được duyệt.
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetToppings([FromQuery] int maNhomTopping)
        {
            if (maNhomTopping <= 0)
            {
                return BadRequest(new { message = "Mã nhóm topping không hợp lệ." });
            }

            var homNay = DateOnly.FromDateTime(DateTime.Now);
            var nhomHopLe = await _context.Nhomtoppings
                .AsNoTracking()
                .AnyAsync(x =>
                    x.MaNhomTopping == maNhomTopping &&
                    x.MaNhaHangNavigation.TrangThaiDuyet == "DaDuyet" &&
                    x.MaNhaHangNavigation.MaTaiKhoanNavigation.TrangThai == true &&
                    x.MaNhaHangNavigation.Hopdongnhahangs.Any(contract =>
                        contract.TrangThai == "HieuLuc" &&
                        contract.NgayBatDau <= homNay &&
                        contract.NgayKetThuc >= homNay));

            if (!nhomHopLe)
            {
                return NotFound(new { message = "Không tìm thấy nhóm topping." });
            }

            var data = await _context.Toppings
                .AsNoTracking()
                .Where(x => x.MaNhomTopping == maNhomTopping)
                .OrderBy(x => x.MaTopping)
                .Select(x => new
                {
                    x.MaTopping,
                    x.MaNhomTopping,
                    x.TenTopping,
                    x.GiaThem,
                    x.TrangThai
                })
                .ToListAsync();

            return Ok(data);
        }

        [HttpPost]
        [Authorize(Roles = "Quan")]
        public async Task<IActionResult> CreateTopping(TaoToppingRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.TenTopping))
            {
                return BadRequest(new { message = "Tên topping không được để trống." });
            }

            var maTaiKhoan = GetMaTaiKhoan();
            if (maTaiKhoan == null)
            {
                return Unauthorized(new { message = "Token không hợp lệ." });
            }

            var nhom = await _context.Nhomtoppings
                .Include(x => x.MaNhaHangNavigation)
                .FirstOrDefaultAsync(x => x.MaNhomTopping == request.MaNhomTopping);

            if (nhom == null)
            {
                return NotFound(new { message = "Không tìm thấy nhóm topping." });
            }

            if (nhom.MaNhaHangNavigation.MaTaiKhoan != maTaiKhoan.Value)
            {
                return Forbid();
            }

            if (nhom.MaNhaHangNavigation.TrangThaiDuyet != "DaDuyet")
            {
                return BadRequest(new { message = "Nhà hàng chưa được Admin duyệt." });
            }

            var topping = new Topping
            {
                MaNhomTopping = request.MaNhomTopping,
                TenTopping = request.TenTopping.Trim(),
                GiaThem = request.GiaThem,
                TrangThai = true
            };

            _context.Toppings.Add(topping);
            await _context.SaveChangesAsync();

            return Created($"/api/topping?maNhomTopping={request.MaNhomTopping}", new
            {
                message = "Tạo topping thành công.",
                maTopping = topping.MaTopping
            });
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Quan")]
        public async Task<IActionResult> UpdateTopping(int id, CapNhatToppingRequest request)
        {
            if (id <= 0)
            {
                return BadRequest(new { message = "Mã topping không hợp lệ." });
            }

            if (string.IsNullOrWhiteSpace(request.TenTopping))
            {
                return BadRequest(new { message = "Tên topping không được để trống." });
            }

            var maTaiKhoan = GetMaTaiKhoan();
            if (maTaiKhoan == null)
            {
                return Unauthorized(new { message = "Token không hợp lệ." });
            }

            var topping = await _context.Toppings
                .Include(x => x.MaNhomToppingNavigation)
                    .ThenInclude(x => x.MaNhaHangNavigation)
                .FirstOrDefaultAsync(x => x.MaTopping == id);

            if (topping == null)
            {
                return NotFound(new { message = "Không tìm thấy topping." });
            }

            var nhaHang = topping.MaNhomToppingNavigation.MaNhaHangNavigation;
            if (nhaHang.MaTaiKhoan != maTaiKhoan.Value)
            {
                return Forbid();
            }

            if (nhaHang.TrangThaiDuyet != "DaDuyet")
            {
                return BadRequest(new { message = "Nhà hàng chưa được Admin duyệt." });
            }

            topping.TenTopping = request.TenTopping.Trim();
            topping.GiaThem = request.GiaThem;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Cập nhật topping thành công." });
        }

        [HttpPut("{id:int}/trang-thai")]
        [Authorize(Roles = "Quan")]
        public async Task<IActionResult> UpdateTrangThai(int id, CapNhatTrangThaiRequest request)
        {
            if (id <= 0)
            {
                return BadRequest(new { message = "Mã topping không hợp lệ." });
            }

            var maTaiKhoan = GetMaTaiKhoan();
            if (maTaiKhoan == null)
            {
                return Unauthorized(new { message = "Token không hợp lệ." });
            }

            var topping = await _context.Toppings
                .Include(x => x.MaNhomToppingNavigation)
                    .ThenInclude(x => x.MaNhaHangNavigation)
                .FirstOrDefaultAsync(x => x.MaTopping == id);

            if (topping == null)
            {
                return NotFound(new { message = "Không tìm thấy topping." });
            }

            var nhaHang = topping.MaNhomToppingNavigation.MaNhaHangNavigation;
            if (nhaHang.MaTaiKhoan != maTaiKhoan.Value)
            {
                return Forbid();
            }

            if (nhaHang.TrangThaiDuyet != "DaDuyet")
            {
                return BadRequest(new { message = "Nhà hàng chưa được Admin duyệt." });
            }

            topping.TrangThai = request.TrangThai;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = request.TrangThai ? "Đã bật topping." : "Đã tắt topping.",
                trangThai = request.TrangThai
            });
        }

        // Chỉ xóa cứng khi topping chưa từng được dùng trong giỏ hoặc đơn hàng.
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Quan")]
        public async Task<IActionResult> DeleteTopping(int id)
        {
            if (id <= 0)
            {
                return BadRequest(new { message = "Mã topping không hợp lệ." });
            }

            var maTaiKhoan = GetMaTaiKhoan();
            if (maTaiKhoan == null)
            {
                return Unauthorized(new { message = "Token không hợp lệ." });
            }

            var topping = await _context.Toppings
                .Include(x => x.MaNhomToppingNavigation)
                    .ThenInclude(x => x.MaNhaHangNavigation)
                .FirstOrDefaultAsync(x => x.MaTopping == id);

            if (topping == null)
            {
                return NotFound(new { message = "Không tìm thấy topping." });
            }

            var nhaHang = topping.MaNhomToppingNavigation.MaNhaHangNavigation;
            if (nhaHang.MaTaiKhoan != maTaiKhoan.Value)
            {
                return Forbid();
            }

            if (nhaHang.TrangThaiDuyet != "DaDuyet")
            {
                return BadRequest(new { message = "Nhà hàng chưa được Admin duyệt." });
            }

            var daCoTrongDonHang = await _context.ChitietdonhangToppings
                .AsNoTracking()
                .AnyAsync(x => x.MaTopping == id);

            if (daCoTrongDonHang)
            {
                return Conflict(new
                {
                    message = "Topping đã xuất hiện trong đơn hàng nên không thể xóa. Hãy chuyển topping sang trạng thái tắt."
                });
            }

            var dangCoTrongGioHang = await _context.ChitietgiohangToppings
                .AsNoTracking()
                .AnyAsync(x => x.MaTopping == id);

            if (dangCoTrongGioHang)
            {
                return Conflict(new
                {
                    message = "Topping đang có trong giỏ hàng của khách nên không thể xóa. Hãy chuyển topping sang trạng thái tắt."
                });
            }

            _context.Toppings.Remove(topping);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Xóa topping thành công." });
        }

        private int? GetMaTaiKhoan()
        {
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(value, out var id) ? id : null;
        }
    }
}
