using DatMonAnOnline.API.Common;
using DatMonAnOnline.API.Models;
using DatMonAnOnline.API.Options;
using DatMonAnOnline.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace DatMonAnOnline.API.Controllers;

[ApiController]
[Route("api/admin/doi-soat")]
[Authorize(Roles = "Admin")]
public class AdminDoiSoatController : ControllerBase
{
    private readonly DatMonAnOnlineContext _context;
    private readonly DateTime _batDauApDung;

    public AdminDoiSoatController(
        DatMonAnOnlineContext context,
        IOptions<DoiSoatOptions> options)
    {
        _context = context;
        _batDauApDung = options.Value.BatDauApDung;
    }

    [HttpGet]
    public async Task<IActionResult> GetDanhSach([FromQuery] PaginationQuery pagination, [FromQuery] int? maNhaHang)
    {
        var query = _context.Doisoatnhahangs.AsNoTracking().Include(x => x.MaNhaHangNavigation).AsQueryable();
        if (maNhaHang.HasValue) query = query.Where(x => x.MaNhaHang == maNhaHang);

        var list = await query.OrderByDescending(x => x.MaDoiSoat)
            .Select(x => new
            {
                x.MaDoiSoat, x.MaNhaHang, x.MaNhaHangNavigation.TenNhaHang,
                x.TuNgay, x.DenNgay, x.TongSoDon, x.SoTienCanDoiSoat,
                x.TrangThai, x.NgayTao
            }).ToPagedResultAsync(pagination);

        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetChiTiet(int id)
    {
        var doiSoat = await _context.Doisoatnhahangs.AsNoTracking()
            .Include(x => x.MaNhaHangNavigation)
            .Include(x => x.Chitietdoisoats)
            .ThenInclude(ct => ct.Donhang)
            .FirstOrDefaultAsync(x => x.MaDoiSoat == id);

        if (doiSoat == null) return NotFound();

        return Ok(new
        {
            doiSoat.MaDoiSoat, doiSoat.MaNhaHang, doiSoat.MaNhaHangNavigation.TenNhaHang,
            doiSoat.TuNgay, doiSoat.DenNgay, doiSoat.TongSoDon,
            doiSoat.TongTienHang, doiSoat.TongGiamGiaNhaHang, doiSoat.TongGiamGiaHeThong,
            doiSoat.TongPhiNenTang, doiSoat.TongTienNhaHangNhan, doiSoat.TongTienNhaHangDaThu,
            doiSoat.SoTienCanDoiSoat, doiSoat.TrangThai, doiSoat.MaGiaoDichDoiSoat,
            ChiTiet = doiSoat.Chitietdoisoats.Select(ct => new {
                ct.MaDonHang, ct.Donhang.MaDonHangHienThi, ct.Donhang.ThoiGianGiaoThucTe,
                ct.TongTienHang, ct.GiamGiaNhaHang, ct.PhiNenTang, ct.SoTienNhaHangNhan, ct.TienNhaHangDaThu,
                ct.Donhang.ThanhTien
            })
        });
    }

    public class TaoDoiSoatRequest { public int MaNhaHang { get; set; } public DateOnly TuNgay { get; set; } public DateOnly DenNgay { get; set; } }
    public class ThanhToanRequest { [Required, MaxLength(100)] public string MaGiaoDich { get; set; } = string.Empty; }

    [HttpPost("tao-ky")]
    public async Task<IActionResult> TaoKyDoiSoat([FromBody] TaoDoiSoatRequest req)
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(claim, out var maAdmin)) return Unauthorized();

        // 1. Validation cơ bản
        if (req.MaNhaHang <= 0) return BadRequest(new { message = "Mã nhà hàng không hợp lệ." });
        if (req.TuNgay > req.DenNgay) return BadRequest(new { message = "Từ ngày không được lớn hơn Đến ngày." });
        if (req.DenNgay > DateOnly.FromDateTime(DateTime.Now)) return BadRequest(new { message = "Không thể đối soát cho tương lai." });
        if (req.DenNgay.DayNumber - req.TuNgay.DayNumber > 31) return BadRequest(new { message = "Khoảng thời gian đối soát tối đa là 31 ngày." });

        await using var transaction = await _context.Database.BeginTransactionAsync();

        // 2. Lock row Nhà hàng để chặn race condition khi tạo 2 kỳ đối soát cùng lúc cho 1 nhà hàng
        var nhaHangs = await _context.Nhahangs.FromSqlInterpolated($"SELECT * FROM nhahang WHERE MaNhaHang = {req.MaNhaHang} FOR UPDATE").ToListAsync();
        var nhaHang = nhaHangs.SingleOrDefault();
        
        if (nhaHang == null || nhaHang.TrangThaiDuyet != "DaDuyet") 
            return BadRequest(new { message = "Nhà hàng không tồn tại hoặc chưa được duyệt." });

        // 3. Kiểm tra Idempotency
        var idem = await IdempotencyStore.CheckAsync(_context, Request, maAdmin, req);
        if (idem.Result != null) return idem.Result;

        // 4. Kiểm tra xem có bị trùng/chồng lấp khoảng thời gian với kỳ khác không
        var isOverlap = await _context.Doisoatnhahangs.AnyAsync(x => 
            x.MaNhaHang == req.MaNhaHang && 
            x.TuNgay <= req.DenNgay && 
            x.DenNgay >= req.TuNgay && 
            x.TrangThai != "TranhChap");

        if (isOverlap) return Conflict(new { message = "Khoảng thời gian này đã bị trùng lấp với một kỳ đối soát khác của nhà hàng." });

        var start = req.TuNgay.ToDateTime(TimeOnly.MinValue);
        var endExclusive = req.DenNgay.AddDays(1).ToDateTime(TimeOnly.MinValue);

        // 5. Lấy đơn hàng hoàn thành, LỌC THEO THỜI GIAN GIAO THỰC TẾ
        var donHangs = await _context.Donhangs
            .Include(x => x.Thanhtoans).ThenInclude(x => x.MaPhuongThucNavigation)
            .Where(x =>
                x.MaNhaHang == req.MaNhaHang &&
                x.MaTrangThai == 5 &&
                x.MaHopDong != null &&
                x.ThoiGianDat >= _batDauApDung &&
                x.ThoiGianGiaoThucTe.HasValue &&
                x.ThoiGianGiaoThucTe.Value >= start &&
                x.ThoiGianGiaoThucTe.Value < endExclusive &&
                !_context.Chitietdoisoats.Any(ct => ct.MaDonHang == x.MaDonHang))
            .ToListAsync();

        if (!donHangs.Any())
        {
            return BadRequest(new { message = "Không có đơn hàng hợp lệ nào đã hoàn thành và chưa được đối soát trong khoảng thời gian này." });
        }

        var doiSoat = new Doisoatnhahang
        {
            MaNhaHang = req.MaNhaHang, TuNgay = req.TuNgay, DenNgay = req.DenNgay,
            TrangThai = "ChoXacNhan", NgayTao = DateTime.Now
        };
        _context.Doisoatnhahangs.Add(doiSoat);
        await _context.SaveChangesAsync();

        foreach (var dh in donHangs)
        {
            var isCod = dh.Thanhtoans.OrderByDescending(t => t.MaThanhToan)
                          .FirstOrDefault()?.MaPhuongThucNavigation.TenPhuongThuc == "COD";
            
            // Công thức: COD thì nhà hàng đã giữ tiền (bằng chính ThanhTien khách đưa). Online thì = 0.
            decimal tienNhaHangDaThu = isCod ? dh.ThanhTien : 0;

            var chiTiet = new Chitietdoisoat
            {
                MaDoiSoat = doiSoat.MaDoiSoat, MaDonHang = dh.MaDonHang, MaNhaHang = dh.MaNhaHang,
                TongTienHang = dh.TongTienHang, GiamGiaNhaHang = dh.GiamGiaNhaHang, GiamGiaHeThong = dh.GiamGiaHeThong,
                PhiShip = dh.PhiShip, TyLePhiNenTang = dh.TyLePhiNenTang, PhiNenTang = dh.PhiNenTang,
                SoTienNhaHangNhan = dh.SoTienNhaHangNhan, TienNhaHangDaThu = tienNhaHangDaThu,
                NgayThem = DateTime.Now
            };
            _context.Chitietdoisoats.Add(chiTiet);

            doiSoat.TongSoDon++;
            doiSoat.TongTienHang += dh.TongTienHang;
            doiSoat.TongGiamGiaNhaHang += dh.GiamGiaNhaHang;
            doiSoat.TongGiamGiaHeThong += dh.GiamGiaHeThong;
            doiSoat.TongPhiShip += dh.PhiShip;
            doiSoat.TongPhiNenTang += dh.PhiNenTang;
            doiSoat.TongTienNhaHangNhan += dh.SoTienNhaHangNhan;
            doiSoat.TongTienNhaHangDaThu += tienNhaHangDaThu;
        }

        await _context.SaveChangesAsync();

        var result = await IdempotencyStore.SaveSuccessAsync(_context, idem, new { 
            message = "Đã tạo kỳ đối soát thành công.", 
            maDoiSoat = doiSoat.MaDoiSoat 
        });

        await transaction.CommitAsync();
        return result;
    }

    [HttpPut("{id:int}/thanh-toan")]
    public async Task<IActionResult> ThanhToanDoiSoat(int id, [FromBody] ThanhToanRequest req)
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(claim, out var maAdmin)) return Unauthorized();

        var maGiaoDich = req.MaGiaoDich.Trim();
        if (string.IsNullOrWhiteSpace(maGiaoDich)) return BadRequest(new { message = "Mã giao dịch không được để trống." });

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var idem = await IdempotencyStore.CheckAsync(_context, Request, maAdmin, req);
        if (idem.Result != null) return idem.Result;

        // Lock row DoiSoat
        var dsList = await _context.Doisoatnhahangs.FromSqlInterpolated($"SELECT * FROM doisoatnhahang WHERE MaDoiSoat = {id} FOR UPDATE").ToListAsync();
        var doiSoat = dsList.SingleOrDefault();

        if (doiSoat == null || doiSoat.TrangThai != "DaXacNhan") 
            return BadRequest(new { message = "Kỳ đối soát không tồn tại hoặc chưa được nhà hàng xác nhận." });

        var isDup = await _context.Doisoatnhahangs.AnyAsync(x => x.MaGiaoDichDoiSoat == maGiaoDich);
        if (isDup) return Conflict(new { message = "Mã giao dịch này đã được sử dụng cho một kỳ đối soát khác." });

        doiSoat.TrangThai = "DaThanhToan";
        doiSoat.NgayThanhToan = DateTime.Now;
        doiSoat.MaGiaoDichDoiSoat = maGiaoDich;
        doiSoat.MaTaiKhoanDuyet = maAdmin;
        
        await _context.SaveChangesAsync();

        var result = await IdempotencyStore.SaveSuccessAsync(_context, idem, new { 
            message = "Đã cập nhật trạng thái thanh toán thành công." 
        });

        await transaction.CommitAsync();
        return result;
    }
}

[ApiController]
[Route("api/nha-hang/doi-soat")]
[Authorize(Roles = "Quan")]
public class QuanDoiSoatController : ControllerBase
{
    private readonly DatMonAnOnlineContext _context;
    public QuanDoiSoatController(DatMonAnOnlineContext context) { _context = context; }

    private async Task<int?> GetMaNhaHang()
    {
        var maTaiKhoan = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        return await _context.Nhahangs.Where(n => n.MaTaiKhoan == maTaiKhoan).Select(n => (int?)n.MaNhaHang).FirstOrDefaultAsync();
    }

    [HttpGet]
    public async Task<IActionResult> GetCuaToi([FromQuery] PaginationQuery pagination)
    {
        var maNhaHang = await GetMaNhaHang();
        if (maNhaHang == null) return Unauthorized();

        var list = await _context.Doisoatnhahangs.AsNoTracking().Where(x => x.MaNhaHang == maNhaHang)
            .OrderByDescending(x => x.MaDoiSoat)
            .Select(x => new { x.MaDoiSoat, x.TuNgay, x.DenNgay, x.TongSoDon, x.SoTienCanDoiSoat, x.TrangThai })
            .ToPagedResultAsync(pagination);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetChiTiet(int id)
    {
        var maNhaHang = await GetMaNhaHang();
        var doiSoat = await _context.Doisoatnhahangs.AsNoTracking().Include(x => x.Chitietdoisoats).ThenInclude(ct => ct.Donhang)
            .FirstOrDefaultAsync(x => x.MaDoiSoat == id && x.MaNhaHang == maNhaHang);
        if (doiSoat == null) return NotFound();

        return Ok(new {
            doiSoat.MaDoiSoat, doiSoat.TuNgay, doiSoat.DenNgay, doiSoat.TongSoDon,
            doiSoat.TongTienHang, doiSoat.TongGiamGiaNhaHang, doiSoat.TongPhiNenTang,
            doiSoat.TongTienNhaHangNhan, doiSoat.TongTienNhaHangDaThu, doiSoat.SoTienCanDoiSoat,
            doiSoat.TrangThai, doiSoat.MaGiaoDichDoiSoat,
            ChiTiet = doiSoat.Chitietdoisoats.Select(ct => new {
                ct.MaDonHang, ct.Donhang.MaDonHangHienThi, ct.Donhang.ThoiGianGiaoThucTe,
                ct.TongTienHang, ct.GiamGiaNhaHang, ct.PhiNenTang, ct.SoTienNhaHangNhan, ct.TienNhaHangDaThu,
                ct.Donhang.ThanhTien
            })
        });
    }

    [HttpPut("{id:int}/xac-nhan")]
    public async Task<IActionResult> XacNhanDoiSoat(int id)
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(claim, out var maTaiKhoan)) return Unauthorized();

        var maNhaHang = await GetMaNhaHang();

        await using var transaction = await _context.Database.BeginTransactionAsync();
        
        var idem = await IdempotencyStore.CheckAsync(_context, Request, maTaiKhoan, new { id });
        if (idem.Result != null) return idem.Result;

        var dsList = await _context.Doisoatnhahangs.FromSqlInterpolated($"SELECT * FROM doisoatnhahang WHERE MaDoiSoat = {id} AND MaNhaHang = {maNhaHang} FOR UPDATE").ToListAsync();
        var doiSoat = dsList.SingleOrDefault();

        if (doiSoat == null || doiSoat.TrangThai != "ChoXacNhan") 
            return BadRequest(new { message = "Phiếu không hợp lệ hoặc đã được xác nhận." });

        doiSoat.TrangThai = "DaXacNhan";
        doiSoat.NgayXacNhan = DateTime.Now;
        await _context.SaveChangesAsync();

        var result = await IdempotencyStore.SaveSuccessAsync(_context, idem, new { message = "Đã xác nhận số liệu đối soát." });
        await transaction.CommitAsync();

        return result;
    }
}