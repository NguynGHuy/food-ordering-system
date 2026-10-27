using DatMonAnOnline.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using DatMonAnOnline.API.Common;

namespace DatMonAnOnline.API.Controllers
{
    [Route("api/mon-an")]
    [ApiController]
    public class MonAnController : ControllerBase
    {
        private readonly DatMonAnOnlineContext _context;

        public MonAnController(DatMonAnOnlineContext context)
        {
            _context = context;
        }

        public class TaoMonAnRequest
        {
            [Range(1, int.MaxValue)]
            public int MaDanhMuc { get; set; }

            [Required, MaxLength(150)]
            public string TenMonAn { get; set; } = string.Empty;

            [MaxLength(500)]
            public string? MoTa { get; set; }

            [VndAmount]
            public decimal Gia { get; set; }

            [MaxLength(255), FoodImageReference]
            public string? HinhAnh { get; set; }
        }

        public class CapNhatMonAnRequest
        {
            [Range(1, int.MaxValue)]
            public int MaDanhMuc { get; set; }

            [Required, MaxLength(150)]
            public string TenMonAn { get; set; } = string.Empty;

            [MaxLength(500)]
            public string? MoTa { get; set; }

            [VndAmount]
            public decimal Gia { get; set; }

            [MaxLength(255), FoodImageReference]
            public string? HinhAnh { get; set; }
        }

        public class CapNhatTrangThaiMonAnRequest
        {
            public bool TrangThai { get; set; }
        }

        // GET /api/mon-an?maNhaHang={id}
        // Public: khách hàng chỉ được nhìn thấy món đang bán.
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetMonAns(
            [FromQuery] int maNhaHang,
            [FromQuery] PaginationQuery pagination,
            [FromQuery] string? search = null,
            [FromQuery] int? maDanhMuc = null)
        {
            if (maNhaHang <= 0)
            {
                return BadRequest(new { message = "MaNhaHang không hợp lệ." });
            }

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
                return NotFound(new { message = "Không tìm thấy nhà hàng hoặc nhà hàng chưa được duyệt." });
            }

            var query = _context.Monans
                .AsNoTracking()
                .Where(x => x.MaNhaHang == maNhaHang && x.TrangThai == true);

            var soMonDangBan = await query.CountAsync();

            var counts = new
            {
                all = soMonDangBan,
                selling = soMonDangBan,
                hidden = 0
            };

            if (!string.IsNullOrWhiteSpace(search))
            {
                var keyword = search.Trim();
                query = query.Where(x =>
                    x.TenMonAn.Contains(keyword) ||
                    (x.MoTa != null && x.MoTa.Contains(keyword)));
            }

            if (maDanhMuc.HasValue)
            {
                query = query.Where(x => x.MaDanhMuc == maDanhMuc.Value);
            }

            var result = await query
                .OrderBy(x => x.MaDanhMuc)
                .ThenBy(x => x.TenMonAn)
                .Select(x => new
                {
                    x.MaMonAn,
                    x.MaNhaHang,
                    x.MaDanhMuc,
                    TenDanhMuc = x.MaDanhMucNavigation.TenDanhMuc,
                    x.TenMonAn,
                    x.MoTa,
                    x.Gia,
                    x.HinhAnh,
                    x.TrangThai,
                    x.DanhGiaTrungBinh
                })
                .ToPagedResultAsync(pagination);

            return Ok(new
            {
                result.Items,
                result.PageNumber,
                result.PageSize,
                result.TotalItems,
                result.TotalPages,
                result.HasPreviousPage,
                result.HasNextPage,
                counts
            });
        }

        // GET /api/mon-an/{id}
        // Public: chi tiết món + nhóm topping + topping đang bật.
        [HttpGet("{id:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetMonAn(int id)
        {
            if (id <= 0)
            {
                return BadRequest(new { message = "MaMonAn không hợp lệ." });
            }

            var homNay = DateOnly.FromDateTime(DateTime.Now);
            var monAn = await _context.Monans
                .AsNoTracking()
                .Include(x => x.MaDanhMucNavigation)
                .Include(x => x.MaNhaHangNavigation)
                    .ThenInclude(restaurant => restaurant.MaTaiKhoanNavigation)
                .Include(x => x.MaNhomToppings)
                    .ThenInclude(x => x.Toppings)
                .FirstOrDefaultAsync(x => x.MaMonAn == id && x.TrangThai == true);

            if (monAn == null ||
                monAn.MaNhaHangNavigation.TrangThaiDuyet != "DaDuyet" ||
                monAn.MaNhaHangNavigation.MaTaiKhoanNavigation.TrangThai != true ||
                !await _context.Hopdongnhahangs.AsNoTracking().AnyAsync(contract =>
                    contract.MaNhaHang == monAn.MaNhaHang &&
                    contract.TrangThai == "HieuLuc" &&
                    contract.NgayBatDau <= homNay &&
                    contract.NgayKetThuc >= homNay))
            {
                return NotFound(new { message = "Không tìm thấy món ăn." });
            }

            return Ok(TaoChiTietMonAn(monAn));
        }

        // GET /api/mon-an/quan
        // Quản lý: chủ quán xem được cả món đang bán và món đã ẩn.
        [HttpGet("quan")]
        [Authorize(Roles = "Quan")]
        public async Task<IActionResult> GetMonAnsCuaQuan(
            [FromQuery] PaginationQuery pagination,
            [FromQuery] string? search = null,
            [FromQuery] int? maDanhMuc = null,
            [FromQuery] bool? trangThai = null)
        {
            var nhaHang = await GetAuthorizedRestaurantAsync();
            if (nhaHang.Result != null)
            {
                return nhaHang.Result;
            }

            var maNhaHang = nhaHang.Restaurant!.MaNhaHang;
            var query = _context.Monans
                .AsNoTracking()
                .Where(x => x.MaNhaHang == maNhaHang);

            var counts = new
            {
                all = await query.CountAsync(),
                selling = await query.CountAsync(x => x.TrangThai == true),
                hidden = await query.CountAsync(x => x.TrangThai != true)
            };

            if (!string.IsNullOrWhiteSpace(search))
            {
                var keyword = search.Trim();
                query = query.Where(x =>
                    x.TenMonAn.Contains(keyword) ||
                    (x.MoTa != null && x.MoTa.Contains(keyword)));
            }

            if (maDanhMuc.HasValue)
            {
                query = query.Where(x => x.MaDanhMuc == maDanhMuc.Value);
            }

            if (trangThai.HasValue)
            {
                query = query.Where(x => x.TrangThai == trangThai.Value);
            }

            var result = await query
                .OrderBy(x => x.MaDanhMuc)
                .ThenBy(x => x.TenMonAn)
                .Select(x => new
                {
                    x.MaMonAn,
                    x.MaNhaHang,
                    x.MaDanhMuc,
                    TenDanhMuc = x.MaDanhMucNavigation.TenDanhMuc,
                    x.TenMonAn,
                    x.MoTa,
                    x.Gia,
                    x.HinhAnh,
                    x.TrangThai,
                    x.DanhGiaTrungBinh
                })
                .ToPagedResultAsync(pagination);

            return Ok(new
            {
                result.Items,
                result.PageNumber,
                result.PageSize,
                result.TotalItems,
                result.TotalPages,
                result.HasPreviousPage,
                result.HasNextPage,
                counts
            });
        }

        [HttpGet("quan/{id:int}")]
        [Authorize(Roles = "Quan")]
        public async Task<IActionResult> GetMonAnCuaQuan(int id)
        {
            if (id <= 0)
            {
                return BadRequest(new { message = "MaMonAn không hợp lệ." });
            }

            var nhaHang = await GetAuthorizedRestaurantAsync();
            if (nhaHang.Result != null)
            {
                return nhaHang.Result;
            }

            var monAn = await _context.Monans
                .AsNoTracking()
                .Include(x => x.MaDanhMucNavigation)
                .Include(x => x.MaNhaHangNavigation)
                    .ThenInclude(restaurant => restaurant.MaTaiKhoanNavigation)
                .Include(x => x.MaNhomToppings)
                    .ThenInclude(x => x.Toppings)
                .FirstOrDefaultAsync(x =>
                    x.MaMonAn == id &&
                    x.MaNhaHang == nhaHang.Restaurant!.MaNhaHang);

            if (monAn == null)
            {
                return NotFound(new { message = "Không tìm thấy món ăn của nhà hàng." });
            }

            return Ok(TaoChiTietMonAn(monAn));
        }

        [HttpPost]
        [Authorize(Roles = "Quan")]
        public async Task<IActionResult> CreateMonAn(TaoMonAnRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.TenMonAn))
            {
                return BadRequest(new { message = "Tên món ăn không được để trống." });
            }

            var nhaHang = await GetAuthorizedRestaurantAsync();
            if (nhaHang.Result != null)
            {
                return nhaHang.Result;
            }

            var restaurant = nhaHang.Restaurant!;

            var danhMucHopLe = await _context.Danhmucs
                .AsNoTracking()
                .AnyAsync(x => x.MaDanhMuc == request.MaDanhMuc && x.MaNhaHang == restaurant.MaNhaHang);

            if (!danhMucHopLe)
            {
                return BadRequest(new { message = "Danh mục không tồn tại hoặc không thuộc nhà hàng này." });
            }

            var monAn = new Monan
            {
                MaNhaHang = restaurant.MaNhaHang,
                MaDanhMuc = request.MaDanhMuc,
                TenMonAn = request.TenMonAn.Trim(),
                MoTa = string.IsNullOrWhiteSpace(request.MoTa) ? null : request.MoTa.Trim(),
                Gia = request.Gia,
                HinhAnh = string.IsNullOrWhiteSpace(request.HinhAnh) ? null : request.HinhAnh.Trim(),
                TrangThai = true,
                DanhGiaTrungBinh = 0
            };

            _context.Monans.Add(monAn);
            await _context.SaveChangesAsync();

            return Created($"/api/mon-an/{monAn.MaMonAn}", new
            {
                message = "Tạo món ăn thành công.",
                maMonAn = monAn.MaMonAn
            });
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Quan")]
        public async Task<IActionResult> UpdateMonAn(int id, CapNhatMonAnRequest request)
        {
            if (id <= 0)
            {
                return BadRequest(new { message = "MaMonAn không hợp lệ." });
            }

            if (string.IsNullOrWhiteSpace(request.TenMonAn))
            {
                return BadRequest(new { message = "Tên món ăn không được để trống." });
            }

            var nhaHang = await GetAuthorizedRestaurantAsync();
            if (nhaHang.Result != null)
            {
                return nhaHang.Result;
            }

            var restaurant = nhaHang.Restaurant!;

            var monAn = await _context.Monans.FirstOrDefaultAsync(x => x.MaMonAn == id);
            if (monAn == null)
            {
                return NotFound(new { message = "Không tìm thấy món ăn." });
            }

            if (monAn.MaNhaHang != restaurant.MaNhaHang)
            {
                return Forbid();
            }

            var danhMucHopLe = await _context.Danhmucs
                .AsNoTracking()
                .AnyAsync(x => x.MaDanhMuc == request.MaDanhMuc && x.MaNhaHang == restaurant.MaNhaHang);

            if (!danhMucHopLe)
            {
                return BadRequest(new { message = "Danh mục không tồn tại hoặc không thuộc nhà hàng này." });
            }

            monAn.MaDanhMuc = request.MaDanhMuc;
            monAn.TenMonAn = request.TenMonAn.Trim();
            monAn.MoTa = string.IsNullOrWhiteSpace(request.MoTa) ? null : request.MoTa.Trim();
            monAn.Gia = request.Gia;
            monAn.HinhAnh = string.IsNullOrWhiteSpace(request.HinhAnh) ? null : request.HinhAnh.Trim();

            await _context.SaveChangesAsync();

            return Ok(new { message = "Cập nhật món ăn thành công." });
        }

        [HttpPut("{id:int}/trang-thai")]
        [Authorize(Roles = "Quan")]
        public async Task<IActionResult> UpdateTrangThaiMonAn(int id, CapNhatTrangThaiMonAnRequest request)
        {
            if (id <= 0)
            {
                return BadRequest(new { message = "MaMonAn không hợp lệ." });
            }

            var nhaHang = await GetAuthorizedRestaurantAsync();
            if (nhaHang.Result != null)
            {
                return nhaHang.Result;
            }

            var restaurant = nhaHang.Restaurant!;

            var monAn = await _context.Monans.FirstOrDefaultAsync(x => x.MaMonAn == id);
            if (monAn == null)
            {
                return NotFound(new { message = "Không tìm thấy món ăn." });
            }

            if (monAn.MaNhaHang != restaurant.MaNhaHang)
            {
                return Forbid();
            }

            monAn.TrangThai = request.TrangThai;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = request.TrangThai ? "Đã bật bán món ăn." : "Đã tắt bán món ăn.",
                trangThai = request.TrangThai
            });
        }

        // Chỉ xóa cứng khi món chưa từng tham gia dữ liệu nghiệp vụ.
        // Nếu đang nằm trong giỏ, đơn hàng hoặc đã có đánh giá thì yêu cầu tắt bán thay vì xóa.
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Quan")]
        public async Task<IActionResult> DeleteMonAn(int id)
        {
            if (id <= 0)
            {
                return BadRequest(new { message = "MaMonAn không hợp lệ." });
            }

            var nhaHang = await GetAuthorizedRestaurantAsync();
            if (nhaHang.Result != null)
            {
                return nhaHang.Result;
            }

            var restaurant = nhaHang.Restaurant!;

            var monAn = await _context.Monans
                .Include(x => x.MaNhomToppings)
                .FirstOrDefaultAsync(x => x.MaMonAn == id);

            if (monAn == null)
            {
                return NotFound(new { message = "Không tìm thấy món ăn." });
            }

            if (monAn.MaNhaHang != restaurant.MaNhaHang)
            {
                return Forbid();
            }

            var daCoTrongDonHang = await _context.Chitietdonhangs
                .AsNoTracking()
                .AnyAsync(x => x.MaMonAn == id);

            if (daCoTrongDonHang)
            {
                return Conflict(new
                {
                    message = "Món ăn đã xuất hiện trong đơn hàng nên không thể xóa. Hãy chuyển món sang trạng thái tắt bán."
                });
            }

            var dangCoTrongGioHang = await _context.Chitietgiohangs
                .AsNoTracking()
                .AnyAsync(x => x.MaMonAn == id);

            if (dangCoTrongGioHang)
            {
                return Conflict(new
                {
                    message = "Món ăn đang có trong giỏ hàng của khách nên không thể xóa. Hãy chuyển món sang trạng thái tắt bán."
                });
            }

            var daCoDanhGia = await _context.Danhgiamonans
                .AsNoTracking()
                .AnyAsync(x => x.MaMonAn == id);

            if (daCoDanhGia)
            {
                return Conflict(new
                {
                    message = "Món ăn đã có đánh giá nên không thể xóa. Hãy chuyển món sang trạng thái tắt bán."
                });
            }

            monAn.MaNhomToppings.Clear();
            _context.Monans.Remove(monAn);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Xóa món ăn thành công." });
        }

        [HttpPost("{maMonAn:int}/gan-topping")]
        [Authorize(Roles = "Quan")]
        public async Task<IActionResult> GanNhomTopping(int maMonAn, [FromBody] int maNhomTopping)
        {
            if (maMonAn <= 0 || maNhomTopping <= 0)
            {
                return BadRequest(new { message = "Mã món ăn hoặc mã nhóm topping không hợp lệ." });
            }

            var nhaHang = await GetAuthorizedRestaurantAsync();
            if (nhaHang.Result != null)
            {
                return nhaHang.Result;
            }

            var restaurant = nhaHang.Restaurant!;

            var monAn = await _context.Monans
                .Include(x => x.MaNhomToppings)
                .FirstOrDefaultAsync(x => x.MaMonAn == maMonAn);

            if (monAn == null)
            {
                return NotFound(new { message = "Không tìm thấy món ăn." });
            }

            if (monAn.MaNhaHang != restaurant.MaNhaHang)
            {
                return Forbid();
            }

            var nhomTopping = await _context.Nhomtoppings
                .FirstOrDefaultAsync(x => x.MaNhomTopping == maNhomTopping && x.MaNhaHang == restaurant.MaNhaHang);

            if (nhomTopping == null)
            {
                return BadRequest(new { message = "Nhóm topping không tồn tại hoặc không thuộc nhà hàng này." });
            }

            if (monAn.MaNhomToppings.Any(x => x.MaNhomTopping == maNhomTopping))
            {
                return Conflict(new { message = "Món ăn đã có nhóm topping này." });
            }

            monAn.MaNhomToppings.Add(nhomTopping);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Gán nhóm topping cho món ăn thành công." });
        }

        [HttpDelete("{maMonAn:int}/go-topping/{maNhomTopping:int}")]
        [Authorize(Roles = "Quan")]
        public async Task<IActionResult> GoNhomTopping(int maMonAn, int maNhomTopping)
        {
            if (maMonAn <= 0 || maNhomTopping <= 0)
            {
                return BadRequest(new { message = "Mã món ăn hoặc mã nhóm topping không hợp lệ." });
            }

            var nhaHang = await GetAuthorizedRestaurantAsync();
            if (nhaHang.Result != null)
            {
                return nhaHang.Result;
            }

            var restaurant = nhaHang.Restaurant!;

            var monAn = await _context.Monans
                .Include(x => x.MaNhomToppings)
                .FirstOrDefaultAsync(x => x.MaMonAn == maMonAn);

            if (monAn == null)
            {
                return NotFound(new { message = "Không tìm thấy món ăn." });
            }

            if (monAn.MaNhaHang != restaurant.MaNhaHang)
            {
                return Forbid();
            }

            var nhom = monAn.MaNhomToppings.FirstOrDefault(x => x.MaNhomTopping == maNhomTopping);
            if (nhom == null)
            {
                return BadRequest(new { message = "Món ăn chưa có nhóm topping này." });
            }

            monAn.MaNhomToppings.Remove(nhom);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Gỡ nhóm topping khỏi món ăn thành công." });
        }

        private int? GetMaTaiKhoan()
        {
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(value, out var id) ? id : null;
        }

        private static object TaoChiTietMonAn(Monan monAn)
        {
            return new
            {
                monAn.MaMonAn,
                monAn.MaNhaHang,
                monAn.MaDanhMuc,
                tenDanhMuc = monAn.MaDanhMucNavigation.TenDanhMuc,
                monAn.TenMonAn,
                monAn.MoTa,
                monAn.Gia,
                monAn.HinhAnh,
                monAn.TrangThai,
                monAn.DanhGiaTrungBinh,
                nhomToppings = monAn.MaNhomToppings
                    .OrderBy(x => x.MaNhomTopping)
                    .Select(x => new
                    {
                        x.MaNhomTopping,
                        x.TenNhom,
                        x.BatBuocChon,
                        x.ChonToiDa,
                        toppings = x.Toppings
                            .Where(t => t.TrangThai == true)
                            .OrderBy(t => t.MaTopping)
                            .Select(t => new
                            {
                                t.MaTopping,
                                t.TenTopping,
                                t.GiaThem,
                                t.TrangThai
                            })
                            .ToList()
                    })
                    .ToList()
            };
        }

        private async Task<(Nhahang? Restaurant, IActionResult? Result)> GetAuthorizedRestaurantAsync()
        {
            var maTaiKhoan = GetMaTaiKhoan();
            if (maTaiKhoan == null)
            {
                return (null, Unauthorized(new { message = "Token không hợp lệ." }));
            }

            var nhaHang = await _context.Nhahangs
                .FirstOrDefaultAsync(x => x.MaTaiKhoan == maTaiKhoan.Value);

            if (nhaHang == null)
            {
                return (null, NotFound(new { message = "Không tìm thấy nhà hàng của tài khoản này." }));
            }

            if (nhaHang.TrangThaiDuyet != "DaDuyet")
            {
                return (null, BadRequest(new { message = "Nhà hàng chưa được Admin duyệt." }));
            }

            return (nhaHang, null);
        }
    }
}
