using DatMonAnOnline.API.Common;
using DatMonAnOnline.API.Models;
using DatMonAnOnline.API.Options;
using DatMonAnOnline.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MySqlConnector;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace DatMonAnOnline.API.Controllers;

[ApiController]
[Route("api/admin/doi-soat")]
[Authorize(Roles = "Admin")]
public class AdminDoiSoatController : ControllerBase
{
    private readonly DatMonAnOnlineContext _context;
    private readonly IWalletService _walletService;
    private readonly IRealtimeNotificationService _realtime;
    private readonly ILogger<AdminDoiSoatController> _logger;
    private readonly DateTime _batDauApDung;
    private readonly TimeProvider _timeProvider;

    public AdminDoiSoatController(
        DatMonAnOnlineContext context,
        IWalletService walletService,
        IRealtimeNotificationService realtime,
        ILogger<AdminDoiSoatController> logger,
        IOptions<DoiSoatOptions> options,
        TimeProvider? timeProvider = null)
    {
        _context = context;
        _walletService = walletService;
        _realtime = realtime;
        _logger = logger;
        _batDauApDung = options.Value.BatDauApDung;
        _timeProvider = timeProvider ?? TimeProvider.System;
    }

    private async Task NotifySafelyAsync(params Task[] notifications)
    {
        try
        {
            await Task.WhenAll(notifications);
        }
        catch (Exception ex)
        {
            // Realtime is only a refresh hint. The committed DB record remains
            // the source of truth and will be loaded again after reconnect.
            _logger.LogWarning(ex, "Không thể phát realtime cho thay đổi đối soát đã commit.");
        }
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
                x.TongTienHang, x.TongGiamGiaNhaHang,
                x.TongGiamGiaHeThong, x.TongPhiShip, x.TongPhiNenTang,
                x.TongTienHoan, x.TongTienNhaHangNhan, x.TongTienNhaHangDaThu,
                x.TrangThai, x.NgayTao
            }).ToPagedResultAsync(pagination);

        return Ok(list);
    }

    [HttpGet("nha-hang-lua-chon")]
    public async Task<IActionResult> GetNhaHangLuaChon([FromQuery] string? search = null)
    {
        var keyword = search?.Trim();
        if (keyword?.Length > 100)
            return BadRequest(new { message = "Từ khóa tìm kiếm tối đa 100 ký tự." });

        var query = _context.Nhahangs
            .AsNoTracking()
            .Where(x => x.TrangThaiDuyet == "DaDuyet");

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var isRestaurantId = int.TryParse(keyword, out var restaurantId);
            query = query.Where(x =>
                x.TenNhaHang.Contains(keyword) ||
                x.DiaChiQuan.Contains(keyword) ||
                (isRestaurantId && x.MaNhaHang == restaurantId));
        }

        var restaurants = await query
            .OrderBy(x => x.TenNhaHang)
            .ThenBy(x => x.MaNhaHang)
            .Take(30)
            .Select(x => new
            {
                x.MaNhaHang,
                x.TenNhaHang,
                x.DiaChiQuan,
                TaiKhoanDangHoatDong = x.MaTaiKhoanNavigation.TrangThai
            })
            .ToListAsync();

        return Ok(restaurants);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetChiTiet(int id)
    {
        var doiSoat = await _context.Doisoatnhahangs.AsNoTracking()
            .Where(x => x.MaDoiSoat == id)
            .Select(x => new
            {
                x.MaDoiSoat,
                x.MaNhaHang,
                x.MaNhaHangNavigation.TenNhaHang,
                x.TuNgay,
                x.DenNgay,
                x.TongSoDon,
                x.TongTienHang,
                x.TongGiamGiaNhaHang,
                x.TongGiamGiaHeThong,
                x.TongPhiShip,
                x.TongPhiNenTang,
                x.TongTienHoan,
                x.TongTienNhaHangNhan,
                x.TongTienNhaHangDaThu,
                x.SoTienCanDoiSoat,
                x.TrangThai,
                x.MaGiaoDichDoiSoat,
                x.GhiChu,
                x.NgayTao,
                x.NgayXacNhan,
                x.NgayThanhToan,
                LichSu = x.Lichsudoisoats
                    .OrderByDescending(ls => ls.ThoiGian)
                    .ThenByDescending(ls => ls.MaLichSuDoiSoat)
                    .Select(ls => new
                    {
                        ls.MaLichSuDoiSoat,
                        ls.HanhDong,
                        ls.TrangThaiTruoc,
                        ls.TrangThaiSau,
                        ls.MaGiaoDich,
                        ls.GhiChu,
                        ls.ThoiGian,
                        ls.MaTaiKhoan,
                        VaiTroNguoiThucHien = ls.MaTaiKhoanNavigation.MaRoleNavigation.TenRole
                    })
                    .ToList(),
                ChiTiet = x.Chitietdoisoats
                    .OrderBy(ct => ct.MaChiTietDoiSoat)
                    .Select(ct => new
                    {
                        ct.MaDonHang,
                        ct.Donhang.MaDonHangHienThi,
                        ct.Donhang.ThoiGianGiaoThucTe,
                        ct.TongTienHang,
                        ct.GiamGiaNhaHang,
                        ct.GiamGiaHeThong,
                        ct.PhiShip,
                        ct.TyLePhiNenTang,
                        ct.PhiNenTang,
                        ct.SoTienHoan,
                        ct.SoTienNhaHangNhan,
                        ct.TienNhaHangDaThu,
                        ct.SoTienCanDoiSoat,
                        TienDaCongVaoVi = ct.Donhang.Giaodichvis
                            .Where(giaoDich =>
                                giaoDich.LoaiGiaoDich == WalletTransactionTypes.ThuNhapDonHang &&
                                giaoDich.LoaiBienDong == "Cong" &&
                                giaoDich.TrangThai == "ThanhCong")
                            .Sum(giaoDich => (decimal?)giaoDich.SoTien) ?? 0m,
                        TienThuCod = ct.Donhang.Thanhtoans
                            .OrderByDescending(thanhToan => thanhToan.MaThanhToan)
                            .Select(thanhToan =>
                                thanhToan.MaPhuongThucNavigation.TenPhuongThuc == "COD"
                                    ? (decimal?)thanhToan.SoTien
                                    : 0m)
                            .FirstOrDefault() ?? 0m,
                        PhuongThucThanhToan = ct.Donhang.Thanhtoans
                            .OrderByDescending(thanhToan => thanhToan.MaThanhToan)
                            .Select(thanhToan => thanhToan.MaPhuongThucNavigation.TenPhuongThuc)
                            .FirstOrDefault(),
                        ct.Donhang.ThanhTien
                    })
                    .ToList()
            })
            .SingleOrDefaultAsync();

        if (doiSoat == null) return NotFound();
        return Ok(doiSoat);
    }

    public class TaoDoiSoatRequest { public int MaNhaHang { get; set; } public DateOnly TuNgay { get; set; } public DateOnly DenNgay { get; set; } }
    public class ThanhToanRequest
    {
        [MaxLength(100)]
        public string? MaGiaoDich { get; set; }

        [MaxLength(20)]
        public string HinhThucThanhToan { get; set; } = "ChuyenKhoan";

        [MaxLength(500)]
        public string? GhiChu { get; set; }
    }

    public class GiaiQuyetTranhChapRequest
    {
        [Required, MaxLength(500)]
        public string GhiChu { get; set; } = null!;
    }

    [HttpPost("tao-ky")]
    public async Task<IActionResult> TaoKyDoiSoat([FromBody] TaoDoiSoatRequest req)
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(claim, out var maAdmin)) return Unauthorized();

        // 1. Validation cơ bản
        if (req.MaNhaHang <= 0) return BadRequest(new { message = "Mã nhà hàng không hợp lệ." });
        if (req.TuNgay.Year < 1000 || req.DenNgay.Year < 1000) return BadRequest(new { message = "Ngày đối soát không hợp lệ." });
        if (req.TuNgay > req.DenNgay) return BadRequest(new { message = "Từ ngày không được lớn hơn Đến ngày." });
        if (req.DenNgay >= DateOnly.FromDateTime(VietnamBusinessTime.Now(_timeProvider))) return BadRequest(new { message = "Chỉ được đối soát ngày đã kết thúc theo giờ Việt Nam (đến hết ngày hôm qua)." });
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
            x.DenNgay >= req.TuNgay);

        if (isOverlap) return Conflict(new { message = "Khoảng thời gian này đã bị trùng lấp với một kỳ đối soát khác của nhà hàng." });

        var start = req.TuNgay.ToDateTime(TimeOnly.MinValue);
        var endExclusive = req.DenNgay.AddDays(1).ToDateTime(TimeOnly.MinValue);

        // 5. Lấy đơn hàng hoàn thành, LỌC THEO THỜI GIAN GIAO THỰC TẾ
        var donHangs = await _context.Donhangs.AsNoTracking()
            .Where(x =>
                x.MaNhaHang == req.MaNhaHang &&
                x.MaTrangThai == 5 &&
                x.MaHopDong != null &&
                x.ThoiGianDat >= _batDauApDung &&
                x.ThoiGianGiaoThucTe.HasValue &&
                x.ThoiGianGiaoThucTe.Value >= start &&
                x.ThoiGianGiaoThucTe.Value < endExclusive &&
                !x.Thanhtoans
                    .SelectMany(t => t.Hoantiens)
                    .Any(h => h.TrangThai == "ThanhCong") &&
                !_context.Chitietdoisoats.Any(ct => ct.MaDonHang == x.MaDonHang))
            .OrderBy(x => x.ThoiGianGiaoThucTe)
            .ThenBy(x => x.MaDonHang)
            .Select(x => new
            {
                x.MaDonHang,
                x.MaNhaHang,
                x.TongTienHang,
                x.GiamGiaNhaHang,
                x.GiamGiaHeThong,
                x.PhiShip,
                x.TyLePhiNenTang,
                x.PhiNenTang,
                x.SoTienNhaHangNhan,
                x.ThanhTien,
                SoTienHoan = x.Thanhtoans
                    .SelectMany(t => t.Hoantiens)
                    .Where(h => h.TrangThai == "ThanhCong")
                    .Sum(h => (decimal?)h.SoTienHoan) ?? 0m,
                TienDaCongVaoVi = x.Giaodichvis
                    .Where(giaoDich =>
                        giaoDich.LoaiGiaoDich == WalletTransactionTypes.ThuNhapDonHang &&
                        giaoDich.LoaiBienDong == "Cong" &&
                        giaoDich.TrangThai == "ThanhCong")
                    .Sum(giaoDich => (decimal?)giaoDich.SoTien) ?? 0m,
                TenPhuongThuc = x.Thanhtoans
                    .OrderByDescending(t => t.MaThanhToan)
                    .Select(t => t.MaPhuongThucNavigation.TenPhuongThuc)
                    .FirstOrDefault(),
                TrangThaiThanhToan = x.Thanhtoans
                    .OrderByDescending(t => t.MaThanhToan)
                    .Select(t => t.TrangThaiThanhToan)
                    .FirstOrDefault(),
                SoTienThanhToan = x.Thanhtoans
                    .OrderByDescending(t => t.MaThanhToan)
                    .Select(t => (decimal?)t.SoTien)
                    .FirstOrDefault()
            })
            .ToListAsync();

        if (!donHangs.Any())
        {
            return BadRequest(new { message = "Không có đơn hàng hợp lệ nào đã hoàn thành và chưa được đối soát trong khoảng thời gian này." });
        }

        var doiSoat = new Doisoatnhahang
        {
            MaNhaHang = req.MaNhaHang, TuNgay = req.TuNgay, DenNgay = req.DenNgay,
            TrangThai = "ChoXacNhan", NgayTao = VietnamBusinessTime.Now(_timeProvider)
        };
        _context.Doisoatnhahangs.Add(doiSoat);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
            when (ex.InnerException is MySqlException { Number: 1062 })
        {
            await transaction.RollbackAsync();
            return Conflict(new
            {
                message = "Kỳ đối soát này đã tồn tại hoặc dữ liệu vừa được xử lý bởi một yêu cầu khác."
            });
        }

        foreach (var dh in donHangs)
        {
            if (!string.Equals(
                    dh.TrangThaiThanhToan,
                    "ThanhCong",
                    StringComparison.Ordinal) ||
                dh.SoTienThanhToan != dh.ThanhTien)
            {
                await transaction.RollbackAsync();
                return Conflict(new
                {
                    message = $"Đơn hàng #{dh.MaDonHang} chưa có thanh toán thành công khớp tổng tiền. Kỳ đối soát chưa được tạo."
                });
            }

            var isCod = string.Equals(
                dh.TenPhuongThuc,
                "COD",
                StringComparison.OrdinalIgnoreCase);

            OrderSettlementAmounts settlement;
            try
            {
                settlement = OrderSettlementRules.Calculate(
                    dh.SoTienNhaHangNhan,
                    dh.ThanhTien,
                    isCod);
            }
            catch (ArgumentOutOfRangeException)
            {
                await transaction.RollbackAsync();
                return Conflict(new
                {
                    message = $"Đơn hàng #{dh.MaDonHang} có số liệu tài chính không hợp lệ. Kỳ đối soát chưa được tạo."
                });
            }

            // Bao gồm tiền mặt COD quán đã thu và khoản hệ thống đã tự động cộng ví khi hoàn thành.
            if (dh.TienDaCongVaoVi != 0 &&
                dh.TienDaCongVaoVi != settlement.WalletCredit)
            {
                await transaction.RollbackAsync();
                return Conflict(new
                {
                    message = $"Đơn hàng #{dh.MaDonHang} có giao dịch thu nhập ví không khớp số tiền phải nhận. Kỳ đối soát chưa được tạo."
                });
            }

            var tienNhaHangDaThu =
                settlement.DirectlyCollected + dh.TienDaCongVaoVi;

            var chiTiet = new Chitietdoisoat
            {
                MaDoiSoat = doiSoat.MaDoiSoat, MaDonHang = dh.MaDonHang, MaNhaHang = dh.MaNhaHang,
                TongTienHang = dh.TongTienHang, GiamGiaNhaHang = dh.GiamGiaNhaHang, GiamGiaHeThong = dh.GiamGiaHeThong,
                PhiShip = dh.PhiShip, TyLePhiNenTang = dh.TyLePhiNenTang, PhiNenTang = dh.PhiNenTang,
                SoTienHoan = dh.SoTienHoan,
                SoTienNhaHangNhan = dh.SoTienNhaHangNhan, TienNhaHangDaThu = tienNhaHangDaThu,
                NgayThem = VietnamBusinessTime.Now(_timeProvider)
            };
            _context.Chitietdoisoats.Add(chiTiet);

            doiSoat.TongSoDon++;
            doiSoat.TongTienHang += dh.TongTienHang;
            doiSoat.TongGiamGiaNhaHang += dh.GiamGiaNhaHang;
            doiSoat.TongGiamGiaHeThong += dh.GiamGiaHeThong;
            doiSoat.TongPhiShip += dh.PhiShip;
            doiSoat.TongPhiNenTang += dh.PhiNenTang;
            doiSoat.TongTienHoan += dh.SoTienHoan;
            doiSoat.TongTienNhaHangNhan += dh.SoTienNhaHangNhan;
            doiSoat.TongTienNhaHangDaThu += tienNhaHangDaThu;
        }

        _context.Lichsudoisoats.Add(new Lichsudoisoat
        {
            MaDoiSoat = doiSoat.MaDoiSoat,
            MaTaiKhoan = maAdmin,
            HanhDong = "TaoKy",
            TrangThaiSau = "ChoXacNhan",
            GhiChu = $"Tạo kỳ {req.TuNgay:yyyy-MM-dd} đến {req.DenNgay:yyyy-MM-dd}, gồm {doiSoat.TongSoDon} đơn.",
            ThoiGian = VietnamBusinessTime.Now(_timeProvider)
        });

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
            when (ex.InnerException is MySqlException { Number: 1062 })
        {
            await transaction.RollbackAsync();
            return Conflict(new
            {
                message = "Một hoặc nhiều đơn hàng vừa được đưa vào kỳ đối soát khác. Vui lòng tải lại dữ liệu."
            });
        }

        var result = await IdempotencyStore.SaveSuccessAsync(_context, idem, new { 
            message = "Đã tạo kỳ đối soát thành công.", 
            maDoiSoat = doiSoat.MaDoiSoat 
        }, StatusCodes.Status201Created);

        await transaction.CommitAsync();

        await NotifySafelyAsync(
            _realtime.GuiDuLieuThayDoiAsync(
                nhaHang.MaTaiKhoan,
                new[] { "doiSoat" },
                new { doiSoat.MaDoiSoat, hanhDong = "TaoKy" }),
            _realtime.GuiDuLieuThayDoiTheoVaiTroAsync(
                "Admin",
                new[] { "doiSoat", "taiChinh" },
                new { doiSoat.MaDoiSoat, hanhDong = "TaoKy" }));

        return result;
    }

    [HttpPut("{id:int}/thanh-toan")]
    public async Task<IActionResult> ThanhToanDoiSoat(int id, [FromBody] ThanhToanRequest req)
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(claim, out var maAdmin)) return Unauthorized();

        await using var transaction = await _context.Database.BeginTransactionAsync();

        // Lock row DoiSoat
        var dsList = await _context.Doisoatnhahangs.FromSqlInterpolated($"SELECT * FROM doisoatnhahang WHERE MaDoiSoat = {id} FOR UPDATE").ToListAsync();
        var doiSoat = dsList.SingleOrDefault();

        var idem = await IdempotencyStore.CheckAsync(_context, Request, maAdmin, req);
        if (idem.Result != null) return idem.Result;

        if (doiSoat == null || doiSoat.TrangThai != "DaXacNhan") 
            return BadRequest(new { message = "Kỳ đối soát không tồn tại hoặc chưa được nhà hàng xác nhận." });

        var taiKhoanNhaHang = await _context.Nhahangs
            .Where(x => x.MaNhaHang == doiSoat.MaNhaHang)
            .Select(x => (int?)x.MaTaiKhoan)
            .SingleOrDefaultAsync();

        if (!taiKhoanNhaHang.HasValue)
            return BadRequest(new { message = "Không tìm thấy tài khoản của nhà hàng." });

        var soTienCanDoiSoat = doiSoat.SoTienCanDoiSoat ?? 0;
        var hinhThuc = req.HinhThucThanhToan?.Trim() ?? string.Empty;
        var congVaoVi = string.Equals(hinhThuc, "ViNhaHang", StringComparison.Ordinal);
        var khongPhatSinh = soTienCanDoiSoat == 0;

        if (!khongPhatSinh && congVaoVi && soTienCanDoiSoat <= 0)
            return BadRequest(new { message = "Chỉ có thể cộng vào ví khi hệ thống cần thanh toán cho nhà hàng." });

        if (!khongPhatSinh &&
            !congVaoVi &&
            !string.Equals(hinhThuc, "ChuyenKhoan", StringComparison.Ordinal))
            return BadRequest(new { message = "Hình thức thanh toán không hợp lệ." });

        var maGiaoDich = khongPhatSinh
            ? $"ZERO-DOISOAT:{id}"
            : congVaoVi
                ? $"VI-DOISOAT:{id}"
                : req.MaGiaoDich?.Trim();

        if (!khongPhatSinh &&
            !congVaoVi &&
            string.IsNullOrWhiteSpace(maGiaoDich))
            return BadRequest(new { message = "Mã giao dịch không được để trống." });

        var isDup = await _context.Doisoatnhahangs.AnyAsync(x => x.MaGiaoDichDoiSoat == maGiaoDich);
        if (isDup) return Conflict(new { message = "Mã giao dịch này đã được sử dụng cho một kỳ đối soát khác." });

        if (!khongPhatSinh && congVaoVi)
        {
            var ketQuaVi = await _walletService.CreditAsync(
                taiKhoanNhaHang.Value,
                soTienCanDoiSoat,
                WalletTransactionTypes.NhanDoiSoat,
                maGiaoDich!,
                $"Nhận tiền đối soát kỳ #{id}",
                maDoiSoat: id,
                cancellationToken: HttpContext.RequestAborted);

            if (!ketQuaVi.Succeeded)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = ketQuaVi.Error });
            }
        }

        doiSoat.TrangThai = "DaThanhToan";
        doiSoat.NgayThanhToan = VietnamBusinessTime.Now(_timeProvider);
        doiSoat.MaGiaoDichDoiSoat = maGiaoDich!;
        doiSoat.MaTaiKhoanDuyet = maAdmin;

        var huongThanhToan = khongPhatSinh
            ? "Không phát sinh công nợ."
            : soTienCanDoiSoat > 0
                ? $"Hệ thống ghi nhận đã trả nhà hàng {soTienCanDoiSoat:0} VND bằng {hinhThuc}."
                : $"Hệ thống ghi nhận nhà hàng đã trả lại {Math.Abs(soTienCanDoiSoat):0} VND bằng {hinhThuc}.";

        var auditNote = string.IsNullOrWhiteSpace(req.GhiChu)
            ? huongThanhToan
            : $"{huongThanhToan} {req.GhiChu.Trim()}";

        _context.Lichsudoisoats.Add(new Lichsudoisoat
        {
            MaDoiSoat = id,
            MaTaiKhoan = maAdmin,
            HanhDong = "ThanhToan",
            TrangThaiTruoc = "DaXacNhan",
            TrangThaiSau = "DaThanhToan",
            MaGiaoDich = maGiaoDich,
            GhiChu = auditNote.Length <= 500 ? auditNote : auditNote[..500],
            ThoiGian = VietnamBusinessTime.Now(_timeProvider)
        });
        
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
            when (ex.InnerException is MySqlException { Number: 1062 })
        {
            await transaction.RollbackAsync();
            return Conflict(new
            {
                message = "Mã giao dịch này đã được sử dụng cho một kỳ đối soát khác."
            });
        }

        var result = await IdempotencyStore.SaveSuccessAsync(_context, idem, new { 
            message = khongPhatSinh
                ? "Đã chốt kỳ đối soát không phát sinh công nợ."
                : congVaoVi
                ? "Đã cộng tiền đối soát vào ví nhà hàng."
                : soTienCanDoiSoat > 0
                    ? "Đã ghi nhận hệ thống thanh toán cho nhà hàng (mô phỏng)."
                    : "Đã ghi nhận nhà hàng thanh toán lại cho hệ thống (mô phỏng)."
        });

        await transaction.CommitAsync();

        var phamViNhaHang = congVaoVi
            ? new[] { "doiSoat", "vi" }
            : new[] { "doiSoat" };

        await NotifySafelyAsync(
            _realtime.GuiDuLieuThayDoiAsync(
                taiKhoanNhaHang.Value,
                phamViNhaHang,
                new { doiSoat.MaDoiSoat, hanhDong = "ThanhToan" }),
            _realtime.GuiDuLieuThayDoiTheoVaiTroAsync(
                "Admin",
                new[] { "doiSoat", "taiChinh" },
                new { doiSoat.MaDoiSoat, hanhDong = "ThanhToan" }));

        return result;
    }

    [HttpPut("{id:int}/giai-quyet-tranh-chap")]
    public async Task<IActionResult> GiaiQuyetTranhChap(int id, [FromBody] GiaiQuyetTranhChapRequest req)
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(claim, out var maAdmin)) return Unauthorized();

        var ghiChu = req.GhiChu?.Trim();
        if (string.IsNullOrWhiteSpace(ghiChu))
            return BadRequest(new { message = "Ghi chú giải quyết tranh chấp không được để trống." });

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var rows = await _context.Doisoatnhahangs
            .FromSqlInterpolated($"SELECT * FROM doisoatnhahang WHERE MaDoiSoat = {id} FOR UPDATE")
            .ToListAsync();
        var doiSoat = rows.SingleOrDefault();

        var idem = await IdempotencyStore.CheckAsync(_context, Request, maAdmin, req);
        if (idem.Result != null) return idem.Result;

        if (doiSoat == null || doiSoat.TrangThai != "TranhChap")
            return Conflict(new { message = "Kỳ đối soát không ở trạng thái tranh chấp." });

        var taiKhoanNhaHang = await _context.Nhahangs
            .Where(x => x.MaNhaHang == doiSoat.MaNhaHang)
            .Select(x => (int?)x.MaTaiKhoan)
            .SingleOrDefaultAsync();
        if (!taiKhoanNhaHang.HasValue)
            return Conflict(new { message = "Không tìm thấy tài khoản của nhà hàng." });

        doiSoat.TrangThai = "DaXacNhan";
        doiSoat.NgayXacNhan = VietnamBusinessTime.Now(_timeProvider);
        doiSoat.MaTaiKhoanDuyet = maAdmin;

        _context.Lichsudoisoats.Add(new Lichsudoisoat
        {
            MaDoiSoat = id,
            MaTaiKhoan = maAdmin,
            HanhDong = "GiaiQuyetTranhChap",
            TrangThaiTruoc = "TranhChap",
            TrangThaiSau = "DaXacNhan",
            GhiChu = ghiChu,
            ThoiGian = VietnamBusinessTime.Now(_timeProvider)
        });

        await _context.SaveChangesAsync();
        var result = await IdempotencyStore.SaveSuccessAsync(_context, idem, new
        {
            message = "Đã giải quyết tranh chấp. Kỳ đối soát có thể được ghi nhận thanh toán."
        });
        await transaction.CommitAsync();

        await NotifySafelyAsync(
            _realtime.GuiDuLieuThayDoiAsync(
                taiKhoanNhaHang.Value,
                new[] { "doiSoat" },
                new { doiSoat.MaDoiSoat, hanhDong = "GiaiQuyetTranhChap" }),
            _realtime.GuiDuLieuThayDoiTheoVaiTroAsync(
                "Admin",
                new[] { "doiSoat", "taiChinh" },
                new { doiSoat.MaDoiSoat, hanhDong = "GiaiQuyetTranhChap" }));

        return result;
    }
}

[ApiController]
[Route("api/nha-hang/doi-soat")]
[Authorize(Roles = "Quan")]
public class QuanDoiSoatController : ControllerBase
{
    private readonly DatMonAnOnlineContext _context;
    private readonly IRealtimeNotificationService _realtime;
    private readonly ILogger<QuanDoiSoatController> _logger;

    public QuanDoiSoatController(
        DatMonAnOnlineContext context,
        IRealtimeNotificationService realtime,
        ILogger<QuanDoiSoatController> logger)
    {
        _context = context;
        _realtime = realtime;
        _logger = logger;
    }

    private async Task NotifySafelyAsync(params Task[] notifications)
    {
        try
        {
            await Task.WhenAll(notifications);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không thể phát realtime cho thay đổi đối soát đã commit.");
        }
    }

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
            .Select(x => new
            {
                x.MaDoiSoat,
                x.MaNhaHang,
                x.MaNhaHangNavigation.TenNhaHang,
                x.TuNgay,
                x.DenNgay,
                x.TongSoDon,
                x.TongTienHang,
                x.TongGiamGiaNhaHang,
                x.TongGiamGiaHeThong,
                x.TongPhiShip,
                x.TongPhiNenTang,
                x.TongTienHoan,
                x.TongTienNhaHangNhan,
                x.TongTienNhaHangDaThu,
                x.SoTienCanDoiSoat,
                x.TrangThai,
                x.NgayTao
            })
            .ToPagedResultAsync(pagination);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetChiTiet(int id)
    {
        var maNhaHang = await GetMaNhaHang();
        var doiSoat = await _context.Doisoatnhahangs.AsNoTracking()
            .Where(x => x.MaDoiSoat == id && x.MaNhaHang == maNhaHang)
            .Select(x => new
            {
                x.MaDoiSoat,
                x.MaNhaHang,
                x.MaNhaHangNavigation.TenNhaHang,
                x.TuNgay,
                x.DenNgay,
                x.TongSoDon,
                x.TongTienHang,
                x.TongGiamGiaNhaHang,
                x.TongGiamGiaHeThong,
                x.TongPhiShip,
                x.TongPhiNenTang,
                x.TongTienHoan,
                x.TongTienNhaHangNhan,
                x.TongTienNhaHangDaThu,
                x.SoTienCanDoiSoat,
                x.TrangThai,
                x.MaGiaoDichDoiSoat,
                x.GhiChu,
                x.NgayTao,
                x.NgayXacNhan,
                x.NgayThanhToan,
                LichSu = x.Lichsudoisoats
                    .OrderByDescending(ls => ls.ThoiGian)
                    .ThenByDescending(ls => ls.MaLichSuDoiSoat)
                    .Select(ls => new
                    {
                        ls.MaLichSuDoiSoat,
                        ls.HanhDong,
                        ls.TrangThaiTruoc,
                        ls.TrangThaiSau,
                        ls.MaGiaoDich,
                        ls.GhiChu,
                        ls.ThoiGian,
                        ls.MaTaiKhoan,
                        VaiTroNguoiThucHien = ls.MaTaiKhoanNavigation.MaRoleNavigation.TenRole
                    })
                    .ToList(),
                ChiTiet = x.Chitietdoisoats
                    .OrderBy(ct => ct.MaChiTietDoiSoat)
                    .Select(ct => new
                    {
                        ct.MaDonHang,
                        ct.Donhang.MaDonHangHienThi,
                        ct.Donhang.ThoiGianGiaoThucTe,
                        ct.TongTienHang,
                        ct.GiamGiaNhaHang,
                        ct.GiamGiaHeThong,
                        ct.PhiShip,
                        ct.TyLePhiNenTang,
                        ct.PhiNenTang,
                        ct.SoTienHoan,
                        ct.SoTienNhaHangNhan,
                        ct.TienNhaHangDaThu,
                        ct.SoTienCanDoiSoat,
                        TienDaCongVaoVi = ct.Donhang.Giaodichvis
                            .Where(giaoDich =>
                                giaoDich.LoaiGiaoDich == WalletTransactionTypes.ThuNhapDonHang &&
                                giaoDich.LoaiBienDong == "Cong" &&
                                giaoDich.TrangThai == "ThanhCong")
                            .Sum(giaoDich => (decimal?)giaoDich.SoTien) ?? 0m,
                        TienThuCod = ct.Donhang.Thanhtoans
                            .OrderByDescending(thanhToan => thanhToan.MaThanhToan)
                            .Select(thanhToan =>
                                thanhToan.MaPhuongThucNavigation.TenPhuongThuc == "COD"
                                    ? (decimal?)thanhToan.SoTien
                                    : 0m)
                            .FirstOrDefault() ?? 0m,
                        PhuongThucThanhToan = ct.Donhang.Thanhtoans
                            .OrderByDescending(thanhToan => thanhToan.MaThanhToan)
                            .Select(thanhToan => thanhToan.MaPhuongThucNavigation.TenPhuongThuc)
                            .FirstOrDefault(),
                        ct.Donhang.ThanhTien
                    })
                    .ToList()
            })
            .SingleOrDefaultAsync();
        if (doiSoat == null) return NotFound();
        return Ok(doiSoat);
    }

    [HttpPut("{id:int}/xac-nhan")]
    public async Task<IActionResult> XacNhanDoiSoat(int id)
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(claim, out var maTaiKhoan)) return Unauthorized();

        var maNhaHang = await GetMaNhaHang();

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var dsList = await _context.Doisoatnhahangs.FromSqlInterpolated($"SELECT * FROM doisoatnhahang WHERE MaDoiSoat = {id} AND MaNhaHang = {maNhaHang} FOR UPDATE").ToListAsync();
        var doiSoat = dsList.SingleOrDefault();

        var idem = await IdempotencyStore.CheckAsync(_context, Request, maTaiKhoan, new { id });
        if (idem.Result != null) return idem.Result;

        if (doiSoat == null || doiSoat.TrangThai != "ChoXacNhan") 
            return BadRequest(new { message = "Phiếu không hợp lệ hoặc đã được xác nhận." });

        doiSoat.TrangThai = "DaXacNhan";
        doiSoat.NgayXacNhan = VietnamBusinessTime.Now();

        _context.Lichsudoisoats.Add(new Lichsudoisoat
        {
            MaDoiSoat = id,
            MaTaiKhoan = maTaiKhoan,
            HanhDong = "XacNhan",
            TrangThaiTruoc = "ChoXacNhan",
            TrangThaiSau = "DaXacNhan",
            GhiChu = "Nhà hàng xác nhận số liệu đối soát.",
            ThoiGian = VietnamBusinessTime.Now()
        });
        await _context.SaveChangesAsync();

        var result = await IdempotencyStore.SaveSuccessAsync(_context, idem, new { message = "Đã xác nhận số liệu đối soát." });
        await transaction.CommitAsync();

        await NotifySafelyAsync(
            _realtime.GuiDuLieuThayDoiAsync(
                maTaiKhoan,
                new[] { "doiSoat" },
                new { doiSoat.MaDoiSoat, hanhDong = "XacNhan" }),
            _realtime.GuiDuLieuThayDoiTheoVaiTroAsync(
                "Admin",
                new[] { "doiSoat", "taiChinh" },
                new { doiSoat.MaDoiSoat, hanhDong = "XacNhan" }));

        return result;
    }

    public class MoTranhChapRequest
    {
        [Required, MaxLength(500)]
        public string LyDo { get; set; } = null!;
    }

    [HttpPut("{id:int}/tranh-chap")]
    public async Task<IActionResult> MoTranhChap(int id, [FromBody] MoTranhChapRequest req)
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(claim, out var maTaiKhoan)) return Unauthorized();

        var lyDo = req.LyDo?.Trim();
        if (string.IsNullOrWhiteSpace(lyDo))
            return BadRequest(new { message = "Lý do tranh chấp không được để trống." });

        var maNhaHang = await GetMaNhaHang();
        if (!maNhaHang.HasValue) return Unauthorized();

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var rows = await _context.Doisoatnhahangs
            .FromSqlInterpolated($"SELECT * FROM doisoatnhahang WHERE MaDoiSoat = {id} AND MaNhaHang = {maNhaHang.Value} FOR UPDATE")
            .ToListAsync();
        var doiSoat = rows.SingleOrDefault();

        var idem = await IdempotencyStore.CheckAsync(_context, Request, maTaiKhoan, req);
        if (idem.Result != null) return idem.Result;

        if (doiSoat == null ||
            (doiSoat.TrangThai != "ChoXacNhan" && doiSoat.TrangThai != "DaXacNhan"))
        {
            return Conflict(new
            {
                message = "Chỉ có thể mở tranh chấp trước khi kỳ đối soát được ghi nhận thanh toán."
            });
        }

        var trangThaiTruoc = doiSoat.TrangThai;
        doiSoat.TrangThai = "TranhChap";
        doiSoat.NgayXacNhan = null;

        _context.Lichsudoisoats.Add(new Lichsudoisoat
        {
            MaDoiSoat = id,
            MaTaiKhoan = maTaiKhoan,
            HanhDong = "MoTranhChap",
            TrangThaiTruoc = trangThaiTruoc,
            TrangThaiSau = "TranhChap",
            GhiChu = lyDo,
            ThoiGian = VietnamBusinessTime.Now()
        });

        await _context.SaveChangesAsync();
        var result = await IdempotencyStore.SaveSuccessAsync(_context, idem, new
        {
            message = "Đã mở tranh chấp đối soát. Admin cần giải quyết trước khi thanh toán."
        });
        await transaction.CommitAsync();

        await NotifySafelyAsync(
            _realtime.GuiDuLieuThayDoiAsync(
                maTaiKhoan,
                new[] { "doiSoat" },
                new { doiSoat.MaDoiSoat, hanhDong = "MoTranhChap" }),
            _realtime.GuiDuLieuThayDoiTheoVaiTroAsync(
                "Admin",
                new[] { "doiSoat", "taiChinh" },
                new { doiSoat.MaDoiSoat, hanhDong = "MoTranhChap" }));

        return result;
    }
}
