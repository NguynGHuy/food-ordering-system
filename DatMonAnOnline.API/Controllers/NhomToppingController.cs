using DatMonAnOnline.API.Models;
using DatMonAnOnline.API.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace DatMonAnOnline.API.Controllers
{
    [Route("api/nhom-topping")]
    [ApiController]
    public class NhomToppingController : ControllerBase
    {
        private readonly DatMonAnOnlineContext _context;

        public NhomToppingController(DatMonAnOnlineContext context)
        {
            _context = context;
        }

        // =========================================================
        // REQUEST
        // =========================================================

        public class TaoNhomToppingRequest
        {
            [Required, MaxLength(100)]
            public string TenNhom { get; set; } = string.Empty;

            public bool BatBuocChon { get; set; }

            [Range(1, int.MaxValue)]
            public int? ChonToiDa { get; set; }
        }

        public class CapNhatNhomToppingRequest
        {
            [Required, MaxLength(100)]
            public string TenNhom { get; set; } = string.Empty;

            public bool BatBuocChon { get; set; }

            [Range(1, int.MaxValue)]
            public int? ChonToiDa { get; set; }
        }

        // =========================================================
        // GET - DANH SÁCH NHÓM TOPPING CỦA QUÁN
        // GET /api/nhom-topping?maNhaHang={id}
        // =========================================================

        [HttpGet]
        [Authorize(Roles = "Quan")]
        public async Task<IActionResult> GetNhomToppings(
            [FromQuery] int maNhaHang,
            [FromQuery] int? pageNumber = null,
            [FromQuery] int? pageSize = null)
        {
            if (pageNumber < 1 || pageSize is < 1 or > 100)
                return BadRequest(new { message = "Phân trang không hợp lệ." });
            if (maNhaHang <= 0)
            {
                return BadRequest(new
                {
                    message = "MaNhaHang không hợp lệ."
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
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.MaNhaHang == maNhaHang &&
                    x.MaTaiKhoan == maTaiKhoan.Value);

            if (nhaHang == null)
            {
                return Forbid();
            }

            if (nhaHang.TrangThaiDuyet != "DaDuyet")
            {
                return BadRequest(new
                {
                    message = "Nhà hàng chưa được Admin duyệt."
                });
            }

            var result = _context.Nhomtoppings
                .AsNoTracking()
                .Where(x => x.MaNhaHang == maNhaHang)
                .OrderBy(x => x.MaNhomTopping)
                .Select(x => new
                {
                    x.MaNhomTopping,
                    x.MaNhaHang,
                    x.TenNhom,
                    x.BatBuocChon,
                    x.ChonToiDa
                });

            if (!pageNumber.HasValue && !pageSize.HasValue)
                return Ok(await result.ToListAsync());
            return Ok(await result.ToPagedResultAsync(new PaginationQuery
            {
                PageNumber = pageNumber ?? 1,
                PageSize = pageSize ?? 10
            }));
        }

        // =========================================================
        // POST - TẠO NHÓM TOPPING
        // POST /api/nhom-topping
        // =========================================================

        [HttpPost]
        [Authorize(Roles = "Quan")]
        public async Task<IActionResult> CreateNhomTopping(
            TaoNhomToppingRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.TenNhom))
            {
                return BadRequest(new
                {
                    message = "Tên nhóm topping không được để trống."
                });
            }

            if (request.ChonToiDa.HasValue &&
                request.ChonToiDa.Value <= 0)
            {
                return BadRequest(new
                {
                    message = "ChonToiDa phải lớn hơn 0."
                });
            }

            if (request.BatBuocChon &&
                (!request.ChonToiDa.HasValue ||
                 request.ChonToiDa.Value <= 0))
            {
                return BadRequest(new
                {
                    message = "Nhóm bắt buộc chọn phải có ChonToiDa lớn hơn 0."
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

            var nhomTopping = new Nhomtopping
            {
                MaNhaHang = nhaHang.MaNhaHang,
                TenNhom = request.TenNhom.Trim(),
                BatBuocChon = request.BatBuocChon,
                ChonToiDa = request.ChonToiDa
            };

            _context.Nhomtoppings.Add(nhomTopping);

            await _context.SaveChangesAsync();

            return Created(
                $"/api/nhom-topping?maNhaHang={nhaHang.MaNhaHang}",
                new
                {
                    message = "Tạo nhóm topping thành công.",
                    maNhomTopping = nhomTopping.MaNhomTopping
                });
        }

        // =========================================================
        // PUT - SỬA NHÓM TOPPING
        // PUT /api/nhom-topping/{id}
        // =========================================================

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Quan")]
        public async Task<IActionResult> UpdateNhomTopping(
            int id,
            CapNhatNhomToppingRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.TenNhom))
            {
                return BadRequest(new
                {
                    message = "Tên nhóm topping không được để trống."
                });
            }

            if (request.ChonToiDa.HasValue &&
                request.ChonToiDa.Value <= 0)
            {
                return BadRequest(new
                {
                    message = "ChonToiDa phải lớn hơn 0."
                });
            }

            if (request.BatBuocChon &&
                (!request.ChonToiDa.HasValue ||
                 request.ChonToiDa.Value <= 0))
            {
                return BadRequest(new
                {
                    message = "Nhóm bắt buộc chọn phải có ChonToiDa lớn hơn 0."
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

            var nhomTopping = await _context.Nhomtoppings
                .FirstOrDefaultAsync(x =>
                    x.MaNhomTopping == id);

            if (nhomTopping == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy nhóm topping."
                });
            }

            if (nhomTopping.MaNhaHang != nhaHang.MaNhaHang)
            {
                return Forbid();
            }

            nhomTopping.TenNhom = request.TenNhom.Trim();
            nhomTopping.BatBuocChon = request.BatBuocChon;
            nhomTopping.ChonToiDa = request.ChonToiDa;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật nhóm topping thành công."
            });
        }

        // =========================================================
        // DELETE - XOÁ NHÓM TOPPING
        // DELETE /api/nhom-topping/{id}
        // =========================================================

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Quan")]
        public async Task<IActionResult> DeleteNhomTopping(int id)
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

            var nhomTopping = await _context.Nhomtoppings
                .FirstOrDefaultAsync(x =>
                    x.MaNhomTopping == id);

            if (nhomTopping == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy nhóm topping."
                });
            }

            if (nhomTopping.MaNhaHang != nhaHang.MaNhaHang)
            {
                return Forbid();
            }

            // Kiểm tra nhóm topping đang được gán cho món nào
            var dangGanMonAn = await _context.Monans
                .AsNoTracking()
                .AnyAsync(x =>
                    x.MaNhomToppings.Any(t =>
                        t.MaNhomTopping == id));

            if (dangGanMonAn)
            {
                return Conflict(new
                {
                    message = "Không thể xoá nhóm topping vì nhóm đang được gán cho món ăn."
                });
            }

            // Kiểm tra nhóm vẫn còn topping
            var conTopping = await _context.Toppings
                .AsNoTracking()
                .AnyAsync(x =>
                    x.MaNhomTopping == id);

            if (conTopping)
            {
                return Conflict(new
                {
                    message = "Không thể xoá nhóm topping vì vẫn còn topping thuộc nhóm này."
                });
            }

            _context.Nhomtoppings.Remove(nhomTopping);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Xoá nhóm topping thành công."
            });
        }

        // =========================================================
        // LẤY MaTaiKhoan TỪ JWT
        // =========================================================

        private int? GetMaTaiKhoan()
        {
            var value = User.FindFirstValue(
                ClaimTypes.NameIdentifier);

            return int.TryParse(value, out var id)
                ? id
                : null;
        }
    }
}
