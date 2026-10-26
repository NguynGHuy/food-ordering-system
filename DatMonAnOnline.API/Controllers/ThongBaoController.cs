using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DatMonAnOnline.API.Models;
using System.Security.Claims;
using DatMonAnOnline.API.Common;

namespace DatMonAnOnline.API.Controllers
{
    [ApiController]
    [Route("api/thong-bao")]
    [Authorize]
    public class ThongBaoController : ControllerBase
    {
        private readonly DatMonAnOnlineContext _context;

        public ThongBaoController(DatMonAnOnlineContext context)
        {
            _context = context;
        }

        private int? GetCurrentUserId()
        {
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(value, out var id) && id > 0 ? id : null;
        }

        [HttpGet]
        public async Task<IActionResult> LayDanhSachThongBao(
            [FromQuery] PaginationQuery pagination,
            [FromQuery] string? filter = null)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null)
                return Unauthorized(new { message = "Token không hợp lệ." });

            var baseQuery = _context.Thongbaos
                .AsNoTracking()
                .Where(x => x.MaTaiKhoan == currentUserId.Value);

            var unreadCount = await baseQuery.CountAsync(x => !x.DaDoc);
            var totalCount = await baseQuery.CountAsync();

            var query = filter?.Trim().ToLowerInvariant() switch
            {
                "unread" => baseQuery.Where(x => !x.DaDoc),
                "read" => baseQuery.Where(x => x.DaDoc),
                _ => baseQuery
            };

            var list = await query
                .OrderByDescending(x => x.NgayTao)
                .ToPagedResultAsync(pagination);

            return Ok(new
            {
                list.Items,
                list.PageNumber,
                list.PageSize,
                list.TotalItems,
                list.TotalPages,
                list.HasPreviousPage,
                list.HasNextPage,
                counts = new
                {
                    all = totalCount,
                    unread = unreadCount,
                    read = totalCount - unreadCount
                }
            });
        }

        [HttpPut("{id}/da-doc")]
        public async Task<IActionResult> DanhDauDaDoc(int id)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null)
                return Unauthorized(new { message = "Token không hợp lệ." });

            var tb = await _context.Thongbaos.FirstOrDefaultAsync(x =>
                x.MaThongBao == id &&
                x.MaTaiKhoan == currentUserId.Value);
            if (tb == null) return NotFound();

            tb.DaDoc = true;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã đánh dấu đọc" });
        }

        [HttpPut("danh-dau-tat-ca")]
        public async Task<IActionResult> DanhDauTatCaDaDoc()
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null)
                return Unauthorized(new { message = "Token không hợp lệ." });

            await _context.Thongbaos
                .Where(x => x.MaTaiKhoan == currentUserId.Value && !x.DaDoc)
                .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.DaDoc, true));
            return Ok(new { message = "Đã đánh dấu đọc tất cả" });
        }
    }
}
