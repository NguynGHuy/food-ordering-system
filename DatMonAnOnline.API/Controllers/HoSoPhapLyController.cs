using DatMonAnOnline.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace DatMonAnOnline.API.Controllers;

[ApiController]
[Route("api/nha-hang/ho-so-phap-ly")]
[Authorize(Roles = "Quan")]
public class HoSoPhapLyController : ControllerBase
{
    private readonly DatMonAnOnlineContext _context;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<HoSoPhapLyController> _logger;

    public HoSoPhapLyController(
        DatMonAnOnlineContext context,
        IWebHostEnvironment environment,
        ILogger<HoSoPhapLyController> logger)
    {
        _context = context;
        _environment = environment;
        _logger = logger;
    }

    private int? LayMaTaiKhoan()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);

        return int.TryParse(value, out var id) && id > 0
            ? id
            : null;
    }

    private static string? ChuanHoa(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private async Task<bool> DuocChinhSua(Nhahang nhaHang)
    {
        if (nhaHang.TrangThaiDuyet != "ChuaHoanTat" &&
            nhaHang.TrangThaiDuyet != "TuChoi")
        {
            return false;
        }

        return !await _context.Hopdongnhahangs.AnyAsync(x =>
            x.MaNhaHang == nhaHang.MaNhaHang &&
            (x.TrangThai == "DaKy" ||
             x.TrangThai == "ChoDuyet" ||
             x.TrangThai == "HieuLuc"));
    }

    [HttpGet]
    public async Task<IActionResult> LayHoSo()
    {
        var maTaiKhoan = LayMaTaiKhoan();
        if (maTaiKhoan == null) return Unauthorized();

        var nhaHang = await _context.Nhahangs
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.MaTaiKhoan == maTaiKhoan.Value);

        if (nhaHang == null)
            return NotFound(new
            {
                message = "Không tìm thấy nhà hàng của tài khoản này."
            });

        var hoSo = await _context.Hosophaplynhahangs
            .AsNoTracking()
            .Where(x => x.MaNhaHang == nhaHang.MaNhaHang)
            .Select(x => new
            {
                x.NguoiDaiDien,
                x.ChucVuNguoiDaiDien,
                x.SoGiayToNguoiDaiDien,
                x.TenPhapLy,
                x.MaSoThue,
                x.DiaChiPhapLy,
                x.SoGiayPhepKinhDoanh,
                x.FileGiayPhepKinhDoanh,
                x.FileGiayToNguoiDaiDien,
                x.NgayCapNhat
            })
            .FirstOrDefaultAsync();

        return Ok(new
        {
            nhaHang.MaNhaHang,
            nhaHang.TrangThaiDuyet,
            duocChinhSua = await DuocChinhSua(nhaHang),
            hoSo
        });
    }

    [HttpPut]
    public async Task<IActionResult> LuuHoSo(
        [FromBody] LuuHoSoPhapLyRequest request)
    {
        var maTaiKhoan = LayMaTaiKhoan();
        if (maTaiKhoan == null) return Unauthorized();

        var nhaHang = await _context.Nhahangs
            .FirstOrDefaultAsync(x => x.MaTaiKhoan == maTaiKhoan.Value);

        if (nhaHang == null)
            return NotFound(new
            {
                message = "Không tìm thấy nhà hàng của tài khoản này."
            });

        if (!await DuocChinhSua(nhaHang))
            return Conflict(new
            {
                message = "Hồ sơ đã ký hoặc gửi xét duyệt, không thể chỉnh sửa trực tiếp."
            });

        var hoSo = await _context.Hosophaplynhahangs
            .FirstOrDefaultAsync(x => x.MaNhaHang == nhaHang.MaNhaHang);

        if (hoSo == null)
        {
            hoSo = new Hosophaplynhahang
            {
                MaNhaHang = nhaHang.MaNhaHang,
                NgayTao = DateTime.Now
            };

            _context.Hosophaplynhahangs.Add(hoSo);
        }

        hoSo.NguoiDaiDien = ChuanHoa(request.NguoiDaiDien);
        hoSo.ChucVuNguoiDaiDien = ChuanHoa(request.ChucVuNguoiDaiDien);
        hoSo.SoGiayToNguoiDaiDien = ChuanHoa(request.SoGiayToNguoiDaiDien);
        hoSo.TenPhapLy = ChuanHoa(request.TenPhapLy);
        hoSo.MaSoThue = ChuanHoa(request.MaSoThue);
        hoSo.DiaChiPhapLy = ChuanHoa(request.DiaChiPhapLy);
        hoSo.SoGiayPhepKinhDoanh = ChuanHoa(request.SoGiayPhepKinhDoanh);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Đã lưu hồ sơ pháp lý.",
            nhaHang.MaNhaHang
        });
    }

    [HttpPost("tep/{loai}")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> TaiGiayTo(
    string loai,
    [FromForm] IFormFile file)
    {
        if (loai != "giay-phep" && loai != "giay-to")
            return BadRequest(new
            {
                message = "Loại giấy tờ không hợp lệ."
            });

        const long dungLuongToiDa = 5 * 1024 * 1024;

        if (file == null || file.Length < 8)
            return BadRequest(new
            {
                message = "Vui lòng chọn tệp hợp lệ."
            });

        if (file.Length > dungLuongToiDa)
            return BadRequest(new
            {
                message = "Dung lượng tệp không được vượt quá 5 MB."
            });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

        if (extension != ".pdf" &&
            extension != ".jpg" &&
            extension != ".jpeg" &&
            extension != ".png")
        {
            return BadRequest(new
            {
                message = "Chỉ hỗ trợ PDF, JPG, JPEG hoặc PNG."
            });
        }

        if (!DatMonAnOnline.API.Common.LegalDocumentValidator.HasExpectedContentType(
            extension,
            file.ContentType))
        {
            return BadRequest(new
            {
                message = "Loại nội dung của tệp không khớp với phần mở rộng."
            });
        }

        var maTaiKhoan = LayMaTaiKhoan();
        if (maTaiKhoan == null) return Unauthorized();

        var nhaHang = await _context.Nhahangs
            .FirstOrDefaultAsync(x => x.MaTaiKhoan == maTaiKhoan.Value);

        if (nhaHang == null)
            return NotFound(new
            {
                message = "Không tìm thấy nhà hàng."
            });

        if (!await DuocChinhSua(nhaHang))
            return Conflict(new
            {
                message = "Hồ sơ đã ký hoặc gửi xét duyệt, không thể thay giấy tờ."
            });

        var hoSo = await _context.Hosophaplynhahangs
            .FirstOrDefaultAsync(x => x.MaNhaHang == nhaHang.MaNhaHang);

        byte[] noiDungTep;

        await using (var input = file.OpenReadStream())
        await using (var memory = new MemoryStream())
        {
            await input.CopyToAsync(memory, HttpContext.RequestAborted);

            if (memory.Length > dungLuongToiDa)
                return BadRequest(new
                {
                    message = "Dung lượng tệp không được vượt quá 5 MB."
                });

            noiDungTep = memory.ToArray();
        }

        if (!DatMonAnOnline.API.Common.LegalDocumentValidator.TryValidate(
            noiDungTep,
            extension,
            out var loiTep))
        {
            return BadRequest(new
            {
                message = loiTep
            });
        }

        if (extension != ".pdf")
        {
            var (safeImage, imageError) = DatMonAnOnline.API.Common.SafeImageProcessor
                .DecodeAndSanitize(
                    noiDungTep,
                    extension,
                    HttpContext.RequestAborted);

            if (safeImage == null)
                return BadRequest(new { message = imageError });

            noiDungTep = safeImage.Content;
            extension = safeImage.Extension;
        }

        if (hoSo == null)
        {
            hoSo = new Hosophaplynhahang
            {
                MaNhaHang = nhaHang.MaNhaHang,
                NgayTao = DateTime.Now
            };

            _context.Hosophaplynhahangs.Add(hoSo);
        }

        var tenTep = $"{Guid.NewGuid():N}{extension}";

        var thuMuc = Path.Combine(
            _environment.ContentRootPath,
            "App_Data",
            "HoSoPhapLy",
            nhaHang.MaNhaHang.ToString()
        );

        Directory.CreateDirectory(thuMuc);

        var duongDanVatLy = Path.Combine(thuMuc, tenTep);
        var thamChieuTep = $"{nhaHang.MaNhaHang}/{tenTep}";
        var thamChieuTepCu = loai == "giay-phep"
            ? hoSo.FileGiayPhepKinhDoanh
            : hoSo.FileGiayToNguoiDaiDien;

        try
        {
            await using (var output = new FileStream(
                duongDanVatLy,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None))
            {
                await output.WriteAsync(noiDungTep, HttpContext.RequestAborted);
            }

            if (loai == "giay-phep")
                hoSo.FileGiayPhepKinhDoanh = thamChieuTep;
            else
                hoSo.FileGiayToNguoiDaiDien = thamChieuTep;

            await _context.SaveChangesAsync();
        }
        catch
        {
            if (System.IO.File.Exists(duongDanVatLy))
                System.IO.File.Delete(duongDanVatLy);

            throw;
        }

        await XoaTepCuNeuKhongConDuocThamChieu(
            nhaHang.MaNhaHang,
            thamChieuTepCu,
            thamChieuTep);

        return Ok(new
        {
            message = "Đã tải giấy tờ lên.",
            loai,
            tep = thamChieuTep
        });
    }

    [HttpGet("tep/{loai}")]
    public async Task<IActionResult> TaiTepDaLuu(string loai)
    {
        if (loai != "giay-phep" && loai != "giay-to")
            return BadRequest(new
            {
                message = "Loại giấy tờ không hợp lệ."
            });

        var maTaiKhoan = LayMaTaiKhoan();
        if (maTaiKhoan == null) return Unauthorized();

        var nhaHang = await _context.Nhahangs
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.MaTaiKhoan == maTaiKhoan.Value);

        if (nhaHang == null)
            return NotFound(new
            {
                message = "Không tìm thấy nhà hàng."
            });

        var hoSo = await _context.Hosophaplynhahangs
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.MaNhaHang == nhaHang.MaNhaHang);

        var thamChieu = loai == "giay-phep"
            ? hoSo?.FileGiayPhepKinhDoanh
            : hoSo?.FileGiayToNguoiDaiDien;

        if (string.IsNullOrWhiteSpace(thamChieu))
            return NotFound(new
            {
                message = "Chưa có tệp giấy tờ."
            });

        var tenTep = Path.GetFileName(thamChieu);

        // Chỉ nhận tham chiếu đúng thư mục của quán hiện tại.
        if (thamChieu != $"{nhaHang.MaNhaHang}/{tenTep}")
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
            _ => null
        };

        if (contentType == null)
            return BadRequest(new
            {
                message = "Định dạng tệp không được hỗ trợ."
            });

        var duongDan = Path.Combine(
            _environment.ContentRootPath,
            "App_Data",
            "HoSoPhapLy",
            nhaHang.MaNhaHang.ToString(),
            tenTep
        );

        if (!System.IO.File.Exists(duongDan))
            return NotFound(new
            {
                message = "Không tìm thấy tệp trên máy chủ."
            });

        Response.Headers["Cache-Control"] = "no-store";
        Response.Headers["X-Content-Type-Options"] = "nosniff";

        var tenTaiVe = $"{loai}-nhahang-{nhaHang.MaNhaHang}{extension}";

        return PhysicalFile(duongDan, contentType, tenTaiVe);
    }

    private async Task XoaTepCuNeuKhongConDuocThamChieu(
        int maNhaHang,
        string? thamChieuCu,
        string thamChieuMoi)
    {
        if (string.IsNullOrWhiteSpace(thamChieuCu) ||
            thamChieuCu == thamChieuMoi)
        {
            return;
        }

        // Giữ giấy tờ đã nằm trong hợp đồng cũ để bảo toàn lịch sử xét duyệt.
        var dangDuocHopDongThamChieu = await _context.Hopdongnhahangs
            .AsNoTracking()
            .AnyAsync(x =>
                x.FileGiayPhepKinhDoanh == thamChieuCu ||
                x.FileGiayToNguoiDaiDien == thamChieuCu);

        if (dangDuocHopDongThamChieu)
            return;

        var tenTep = Path.GetFileName(thamChieuCu);
        if (thamChieuCu != $"{maNhaHang}/{tenTep}")
            return;

        var duongDan = Path.Combine(
            _environment.ContentRootPath,
            "App_Data",
            "HoSoPhapLy",
            maNhaHang.ToString(),
            tenTep);

        try
        {
            if (System.IO.File.Exists(duongDan))
                System.IO.File.Delete(duongDan);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            _logger.LogWarning(
                ex,
                "Không thể xóa giấy tờ pháp lý cũ {LegalDocumentPath}.",
                duongDan);
        }
    }

}

public class LuuHoSoPhapLyRequest
{
    [MaxLength(100)]
    public string? NguoiDaiDien { get; set; }

    [MaxLength(100)]
    public string? ChucVuNguoiDaiDien { get; set; }

    [MaxLength(30)]
    public string? SoGiayToNguoiDaiDien { get; set; }

    [MaxLength(200)]
    public string? TenPhapLy { get; set; }

    [MaxLength(30)]
    public string? MaSoThue { get; set; }

    [MaxLength(255)]
    public string? DiaChiPhapLy { get; set; }

    [MaxLength(50)]
    public string? SoGiayPhepKinhDoanh { get; set; }
}
