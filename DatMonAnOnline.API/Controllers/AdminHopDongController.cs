using DatMonAnOnline.API.Common;
using DatMonAnOnline.API.Models;
using DatMonAnOnline.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace DatMonAnOnline.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminHopDongController : ControllerBase
{
    private readonly DatMonAnOnlineContext _context;
    private readonly IWebHostEnvironment _environment;
    private readonly IRealtimeNotificationService _realtime;

    public AdminHopDongController(
        DatMonAnOnlineContext context,
        IWebHostEnvironment environment,
        IRealtimeNotificationService realtime)
    {
        _context = context;
        _environment = environment;
        _realtime = realtime;
    }

    [HttpGet("nha-hang/{id:int}/hop-dong")]
    public async Task<IActionResult> XemHoSoHopDong(int id)
    {
        var nhaHang = await _context.Nhahangs
            .AsNoTracking()
            .Where(x => x.MaNhaHang == id)
            .Select(x => new
            {
                x.MaNhaHang,
                x.TenNhaHang,
                x.DiaChiQuan,
                x.MoTa,
                x.AnhBia,
                x.GioMoCua,
                x.GioDongCua,
                x.TrangThaiDuyet,
                email = x.MaTaiKhoanNavigation.Email,
                soDienThoai = x.MaTaiKhoanNavigation.SoDienThoai
            })
            .FirstOrDefaultAsync();

        if (nhaHang == null)
            return NotFound(new
            {
                message = "Không tìm thấy nhà hàng."
            });

        var hopDong = await _context.Hopdongnhahangs
            .AsNoTracking()
            .Where(x => x.MaNhaHang == id)
            .OrderByDescending(x => x.MaHopDong)
            .Select(x => new
            {
                x.MaHopDong,
                x.MaNhaHang,
                x.SoHopDong,
                x.TrangThai,
                x.NguoiDaiDien,
                x.ChucVuNguoiDaiDien,
                x.SoGiayToNguoiDaiDien,
                x.TenPhapLy,
                x.MaSoThue,
                x.DiaChiPhapLy,
                x.SoGiayPhepKinhDoanh,
                x.PhienBanDieuKhoan,
                x.TyLePhiNenTang,
                x.NgayBatDau,
                x.NgayKetThuc,
                x.ThoiGianKy,
                x.ThoiGianDongYDieuKhoan,
                x.ThoiGianGuiDuyet,
                x.ThoiGianDuyet,
                x.MaTaiKhoanDuyet,
                x.LyDoTuChoi,
                x.LyDoChamDut,
                x.MaTaiKhoanChamDut,
                x.ThoiGianChamDut,
                x.NoiDungHopDong,
                coGiayPhep = x.FileGiayPhepKinhDoanh != null,
                coGiayToDaiDien = x.FileGiayToNguoiDaiDien != null,
                coTepHopDong = x.FileHopDong != null
            })
            .FirstOrDefaultAsync();

        var thamDinh = hopDong == null
            ? null
            : await _context.Thamdinhhosonhahangs
                .AsNoTracking()
                .Where(x => x.MaHopDong == hopDong.MaHopDong)
                .Select(x => new
                {
                    x.KetQuaGiayPhep,
                    x.KetQuaGiayToDaiDien,
                    x.KetQuaHopDong,
                    x.KetQua,
                    x.GhiChu,
                    x.ThoiGian,
                    x.MaTaiKhoanAdmin
                })
                .FirstOrDefaultAsync();

        return Ok(new { nhaHang, hopDong, thamDinh });
    }

    [HttpGet("hop-dong/{id:int}/tep/{loai}")]
    public async Task<IActionResult> TaiTepHopDong(int id, string loai)
    {
        if (loai != "giay-phep" &&
            loai != "giay-to" &&
            loai != "hop-dong")
        {
            return BadRequest(new
            {
                message = "Loại tệp không hợp lệ."
            });
        }

        var hopDong = await _context.Hopdongnhahangs
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.MaHopDong == id);

        if (hopDong == null)
            return NotFound(new
            {
                message = "Không tìm thấy hợp đồng."
            });

        var thamChieu = loai switch
        {
            "giay-phep" => hopDong.FileGiayPhepKinhDoanh,
            "giay-to" => hopDong.FileGiayToNguoiDaiDien,
            _ => hopDong.FileHopDong
        };

        if (string.IsNullOrWhiteSpace(thamChieu))
            return NotFound(new
            {
                message = "Hợp đồng chưa có tệp này."
            });

        var tenTep = Path.GetFileName(thamChieu);

        if (thamChieu != $"{hopDong.MaNhaHang}/{tenTep}")
            return BadRequest(new
            {
                message = "Tham chiếu tệp không hợp lệ."
            });

        var extension = Path.GetExtension(tenTep).ToLowerInvariant();

        var contentType = extension switch
        {
            ".pdf" => "application/pdf",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".txt" => "text/plain; charset=utf-8",
            _ => null
        };

        if (contentType == null)
            return BadRequest(new
            {
                message = "Định dạng tệp không được hỗ trợ."
            });

        var thuMuc = loai == "hop-dong"
            ? "HopDong"
            : "HoSoPhapLy";

        var duongDan = Path.Combine(
            _environment.ContentRootPath,
            "App_Data",
            thuMuc,
            hopDong.MaNhaHang.ToString(),
            tenTep
        );

        if (!System.IO.File.Exists(duongDan))
            return NotFound(new
            {
                message = "Không tìm thấy tệp trên máy chủ."
            });

        Response.Headers["Cache-Control"] = "no-store";
        Response.Headers["X-Content-Type-Options"] = "nosniff";

        return PhysicalFile(
            duongDan,
            contentType,
            $"{loai}-nhahang-{hopDong.MaNhaHang}{extension}"
        );
    }

    public sealed class ChamDutHopDongRequest
    {
        [Required, MaxLength(500)]
        public string LyDo { get; set; } = "";
    }

    // Admin - chấm dứt hợp đồng và lưu lịch sử
    [HttpPut("hop-dong/{id:int}/cham-dut")]
    public async Task<IActionResult> ChamDutHopDong(
        int id,
        [FromBody] ChamDutHopDongRequest request)
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!int.TryParse(claim, out var maAdmin) || maAdmin <= 0)
            return Unauthorized();

        var lyDo = request.LyDo.Trim();

        if (string.IsNullOrWhiteSpace(lyDo))
            return BadRequest(new
            {
                message = "Vui lòng nhập lý do chấm dứt."
            });

        var maNhaHang = await _context.Hopdongnhahangs
            .AsNoTracking()
            .Where(x => x.MaHopDong == id)
            .Select(x => (int?)x.MaNhaHang)
            .FirstOrDefaultAsync();

        if (maNhaHang == null)
            return NotFound(new
            {
                message = "Không tìm thấy hợp đồng."
            });

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        var nhaHangs = await _context.Nhahangs
            .FromSqlInterpolated(
                $"SELECT * FROM nhahang WHERE MaNhaHang = {maNhaHang.Value} FOR UPDATE")
            .ToListAsync();

        var nhaHang = nhaHangs.SingleOrDefault();

        if (nhaHang == null)
            return NotFound(new
            {
                message = "Không tìm thấy nhà hàng."
            });

        var idem = await IdempotencyStore.CheckAsync(
            _context,
            Request,
            maAdmin,
            new { maHopDong = id, lyDo });

        if (idem.Result != null)
            return idem.Result;

        var hopDong = await _context.Hopdongnhahangs
            .Where(x => x.MaNhaHang == nhaHang.MaNhaHang)
            .OrderByDescending(x => x.MaHopDong)
            .FirstOrDefaultAsync();

        if (hopDong == null ||
            hopDong.MaHopDong != id ||
            hopDong.TrangThai != "HieuLuc")
        {
            return Conflict(new
            {
                message =
                    "Chỉ được chấm dứt hợp đồng gần nhất đang có hiệu lực."
            });
        }

        var thoiGian = DateTime.Now;

        hopDong.TrangThai = "ChamDut";
        hopDong.LyDoChamDut = lyDo;
        hopDong.MaTaiKhoanChamDut = maAdmin;
        hopDong.ThoiGianChamDut = thoiGian;

        // Giữ kết quả duyệt và các đơn hàng cũ.
        var thongBao = new Thongbao
        {
            MaTaiKhoan = nhaHang.MaTaiKhoan,
            TieuDe = "Hợp đồng nhà hàng đã bị chấm dứt",
            NoiDung =
                $"Hợp đồng {hopDong.SoHopDong} đã bị chấm dứt. " +
                "Vui lòng mở trang hợp đồng để xem lý do.",
            Loai = "HopDong",
            DuongDan = "/quan/hop-dong",
            DaDoc = false,
            NgayTao = thoiGian
        };
        _context.Thongbaos.Add(thongBao);

        await _context.SaveChangesAsync();

        var result = await IdempotencyStore.SaveSuccessAsync(
            _context,
            idem,
            new
            {
                message = "Đã chấm dứt hợp đồng.",
                hopDong.MaHopDong,
                hopDong.TrangThai,
                hopDong.LyDoChamDut,
                hopDong.MaTaiKhoanChamDut,
                hopDong.ThoiGianChamDut
            });

        await transaction.CommitAsync();

        await Task.WhenAll(
            _realtime.GuiThongBaoAsync(nhaHang.MaTaiKhoan, thongBao),
            _realtime.GuiDuLieuThayDoiAsync(
                nhaHang.MaTaiKhoan,
                new[] { "hopDong", "nhaHang" },
                new { hopDong.MaHopDong, hanhDong = "ChamDut" }),
            _realtime.GuiDuLieuThayDoiTheoVaiTroAsync(
                "Admin",
                new[] { "hopDong", "nhaHang", "tongQuan" },
                new { hopDong.MaHopDong, hanhDong = "ChamDut" }));

        return result;
    }

    // Admin - danh sách hợp đồng mới nhất của từng nhà hàng
    [HttpGet("hop-dong")]
    public async Task<IActionResult> DanhSachHopDong(
        [FromQuery] PaginationQuery pagination,
        [FromQuery] string? search = null,
        [FromQuery] string? state = null)
    {
        var states = new[]
        {
        "Nhap", "ChoKy", "DaKy", "ChoDuyet",
        "HieuLuc", "HetHan", "TuChoi", "ChamDut"
    };

        if (!string.IsNullOrWhiteSpace(state) &&
            !states.Contains(state))
        {
            return BadRequest(new
            {
                message = "Trạng thái hợp đồng không hợp lệ."
            });
        }

        var query = _context.Hopdongnhahangs
            .AsNoTracking()
            .Where(x => !_context.Hopdongnhahangs.Any(newer =>
                newer.MaNhaHang == x.MaNhaHang &&
                newer.MaHopDong > x.MaHopDong));

        if (!string.IsNullOrWhiteSpace(state))
            query = query.Where(x => x.TrangThai == state);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var keyword = search.Trim();

            query = query.Where(x =>
                x.SoHopDong.Contains(keyword) ||
                x.MaNhaHangNavigation.TenNhaHang.Contains(keyword));
        }

        var result = await query
            .OrderByDescending(x => x.MaHopDong)
            .Select(x => new
            {
                x.MaHopDong,
                x.MaNhaHang,
                x.SoHopDong,
                tenNhaHang = x.MaNhaHangNavigation.TenNhaHang,
                x.NguoiDaiDien,
                x.TrangThai,
                x.NgayBatDau,
                x.NgayKetThuc,
                x.TyLePhiNenTang
            })
            .ToPagedResultAsync(pagination);

        return Ok(result);
    }
}
