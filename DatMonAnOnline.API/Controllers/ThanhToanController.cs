using DatMonAnOnline.API.Models;
using DatMonAnOnline.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace DatMonAnOnline.API.Controllers
{
    [Route("api/thanh-toan")]
    [ApiController]
    public class ThanhToanController : ControllerBase
    {
        private readonly DatMonAnOnlineContext _context;
        private readonly IRealtimeNotificationService _realtime;
        private readonly ILogger<ThanhToanController> _logger;

        public ThanhToanController(
            DatMonAnOnlineContext context,
            IRealtimeNotificationService realtime,
            ILogger<ThanhToanController> logger)
        {
            _context = context;
            _realtime = realtime;
            _logger = logger;
        }

        public class TaoThanhToanDto
        {
            [Required]
            public int MaDonHang { get; set; }

            [Required]
            public int MaPhuongThuc { get; set; }
        }

        public class MoPhongKetQuaDto
        {
            [Required, MaxLength(20)]
            public string KetQua { get; set; } = string.Empty;
        }

        public class DoiPhuongThucDto
        {
            [Required]
            public int MaPhuongThuc { get; set; }
        }

        [HttpGet("phuong-thuc")]
        [Authorize]
        public async Task<IActionResult> GetPhuongThucThanhToan()
        {
            var maTaiKhoan = GetMaTaiKhoan();

            if (maTaiKhoan == null)
                return Unauthorized(new { message = "Token không hợp lệ." });

            var result = await _context.Phuongthucthanhtoans
                .AsNoTracking()
                .Where(x => x.TrangThai == true)
                .OrderBy(x => x.MaPhuongThuc)
                .Select(x => new
                {
                    x.MaPhuongThuc,
                    x.TenPhuongThuc,
                    x.TrangThai
                })
                .ToListAsync();

            return Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "KhachHang")]
        public async Task<IActionResult> TaoThanhToan(
            TaoThanhToanDto request)
        {
            var khachHang = await GetCurrentKhachHang();

            if (khachHang == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy hồ sơ khách hàng."
                });
            }

            var donHang = await _context.Donhangs
                .Include(order => order.MaKhuyenMaiNavigation)
                .Include(order => order.Thanhtoans)
                    .ThenInclude(payment => payment.MaPhuongThucNavigation)
                .FirstOrDefaultAsync(x =>
                    x.MaDonHang == request.MaDonHang
                );

            if (donHang == null)
                return NotFound(new { message = "Không tìm thấy đơn hàng." });

            if (donHang.MaKhachHang != khachHang.MaKhachHang)
            {
                return StatusCode(403, new
                {
                    message = "Bạn không có quyền thanh toán đơn hàng này."
                });
            }

            if (donHang.MaTrangThai != 1)
            {
                return BadRequest(new
                {
                    message = "Đơn hàng không còn ở trạng thái chờ thanh toán/xác nhận."
                });
            }

            var latestPayment = donHang.Thanhtoans
                .OrderByDescending(payment => payment.MaThanhToan)
                .FirstOrDefault();

            if (latestPayment != null &&
                await ExpireOnlineOrderIfNeeded(latestPayment))
            {
                return StatusCode(StatusCodes.Status410Gone, new
                {
                    message = "Đơn hàng đã tự hủy vì quá hạn thanh toán online 15 phút."
                });
            }

            await using var transaction =
                await _context.Database.BeginTransactionAsync();

            await _context.Donhangs
                .FromSqlInterpolated(
                    $"SELECT * FROM donhang WHERE MaDonHang = {donHang.MaDonHang} FOR UPDATE")
                .AsNoTracking()
                .ToListAsync();

            var idem = await IdempotencyStore.CheckAsync(
                _context, Request, khachHang.MaTaiKhoan, request);

            if (idem.Result != null)
                return idem.Result;

            var daThanhCong = await _context.Thanhtoans.AnyAsync(x =>
                x.MaDonHang == donHang.MaDonHang &&
                x.TrangThaiThanhToan == "ThanhCong"
            );

            if (daThanhCong)
            {
                await transaction.RollbackAsync();
                return BadRequest(new
                {
                    message = "Đơn hàng đã thanh toán thành công."
                });
            }

            var dangCho = await _context.Thanhtoans.AnyAsync(x =>
                x.MaDonHang == donHang.MaDonHang &&
                x.TrangThaiThanhToan == "ChoThanhToan"
            );

            if (dangCho)
            {
                await transaction.RollbackAsync();
                return BadRequest(new
                {
                    message = "Đơn hàng đang có giao dịch chờ thanh toán."
                });
            }

            var phuongThuc = await LayPhuongThucDangBat(
                request.MaPhuongThuc
            );

            if (phuongThuc == null)
            {
                await transaction.RollbackAsync();
                return BadRequest(new
                {
                    message = "Phương thức thanh toán không hợp lệ hoặc đã tắt."
                });
            }

            var tuChoiVi = await TruViFoodPayNeuCan(
                khachHang,
                phuongThuc.TenPhuongThuc,
                donHang.ThanhTien);

            if (tuChoiVi != null)
            {
                await transaction.RollbackAsync();
                return tuChoiVi;
            }

            var laFoodPay = LaFoodPay(phuongThuc.TenPhuongThuc);

            var thanhToan = new Thanhtoan
            {
                MaDonHang = donHang.MaDonHang,
                MaPhuongThuc = phuongThuc.MaPhuongThuc,
                SoTien = donHang.ThanhTien,
                TrangThaiThanhToan = laFoodPay ? "ThanhCong" : "ChoThanhToan",
                MaGiaoDich = laFoodPay
                    ? $"FOODPAY_{DateTime.Now:yyyyMMddHHmmss}"
                    : null,
                ThoiGianThanhToan = laFoodPay ? DateTime.Now : null
            };

            _context.Thanhtoans.Add(thanhToan);

            (int MaTaiKhoan, Thongbao ThongBao)? thongBaoDonMoi = null;

            if (string.Equals(
                phuongThuc.TenPhuongThuc,
                "COD",
                StringComparison.OrdinalIgnoreCase) ||
                laFoodPay)
            {
                thongBaoDonMoi =
                    await TaoThongBaoDonMoiChoQuan(donHang);
            }

            await _context.SaveChangesAsync();

            var response = new
            {
                message = "Tạo thanh toán thành công.",
                maThanhToan = thanhToan.MaThanhToan,
                maDonHang = thanhToan.MaDonHang,
                maPhuongThuc = thanhToan.MaPhuongThuc,
                tenPhuongThuc = phuongThuc.TenPhuongThuc,
                soTien = thanhToan.SoTien,
                trangThaiThanhToan = thanhToan.TrangThaiThanhToan
            };

            var result = await IdempotencyStore.SaveSuccessAsync(
                _context, idem, response);

            await transaction.CommitAsync();

            if (thongBaoDonMoi.HasValue)
            {
                await GuiDonMoiRealtimeAnToan(
                    thongBaoDonMoi.Value.MaTaiKhoan,
                    thongBaoDonMoi.Value.ThongBao,
                    donHang
                );
            }

            return result;
        }

        [HttpGet("don-hang/{maDonHang:int}")]
        [Authorize]
        public async Task<IActionResult> GetThanhToanTheoDonHang(
            int maDonHang)
        {
            var maTaiKhoan = GetMaTaiKhoan();

            if (maTaiKhoan == null)
                return Unauthorized(new { message = "Token không hợp lệ." });

            var donHang = await _context.Donhangs
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.MaDonHang == maDonHang
                );

            if (donHang == null)
                return NotFound(new { message = "Không tìm thấy đơn hàng." });

            var role = User.FindFirstValue(ClaimTypes.Role);

            var duocXem = await KiemTraQuyenXemDonHang(
                role,
                maTaiKhoan.Value,
                donHang
            );

            if (duocXem == false)
            {
                return StatusCode(403, new
                {
                    message = "Bạn không có quyền xem thanh toán đơn hàng này."
                });
            }

            if (duocXem == null)
                return Unauthorized(new { message = "Token không hợp lệ." });

            var result = await _context.Thanhtoans
                .AsNoTracking()
                .Where(x => x.MaDonHang == maDonHang)
                .OrderByDescending(x => x.MaThanhToan)
                .Select(x => new
                {
                    x.MaThanhToan,
                    x.MaDonHang,
                    x.MaPhuongThuc,
                    tenPhuongThuc =
                        x.MaPhuongThucNavigation.TenPhuongThuc,
                    x.SoTien,
                    x.TrangThaiThanhToan,
                    x.MaGiaoDich,
                    x.ThoiGianThanhToan
                })
                .ToListAsync();

            return Ok(result);
        }

        [HttpPut("{id:int}/mo-phong")]
        [Authorize(Roles = "KhachHang")]
        public async Task<IActionResult> MoPhongKetQuaThanhToan(
            int id,
            MoPhongKetQuaDto request)
        {
            var ketQua = request.KetQua.Trim();

            if (ketQua != "ThanhCong" &&
                ketQua != "ThatBai")
            {
                return BadRequest(new
                {
                    message = "KetQua chỉ nhận ThanhCong hoặc ThatBai."
                });
            }

            var khachHang = await GetCurrentKhachHang();

            if (khachHang == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy hồ sơ khách hàng."
                });
            }

            var thanhToan = await _context.Thanhtoans
                .Include(x => x.MaDonHangNavigation)
                    .ThenInclude(order => order.MaKhuyenMaiNavigation)
                .Include(x => x.MaDonHangNavigation)
                    .ThenInclude(order => order.Thanhtoans)
                .Include(x => x.MaPhuongThucNavigation)
                .FirstOrDefaultAsync(x =>
                    x.MaThanhToan == id
                );

            if (thanhToan == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy giao dịch thanh toán."
                });
            }

            var donHang = thanhToan.MaDonHangNavigation;

            if (donHang.MaKhachHang != khachHang.MaKhachHang)
            {
                return StatusCode(403, new
                {
                    message = "Bạn không có quyền xử lý giao dịch này."
                });
            }

            if (donHang.MaTrangThai != 1)
            {
                return BadRequest(new
                {
                    message = "Đơn hàng không còn ở trạng thái chờ thanh toán/xác nhận."
                });
            }

            if (await ExpireOnlineOrderIfNeeded(thanhToan))
            {
                return StatusCode(StatusCodes.Status410Gone, new
                {
                    message = "Đơn hàng đã tự hủy vì quá hạn thanh toán online 15 phút."
                });
            }

            await using var transaction =
                await _context.Database.BeginTransactionAsync();

            await _context.Thanhtoans
                .FromSqlInterpolated(
                    $"SELECT * FROM thanhtoan WHERE MaThanhToan = {id} FOR UPDATE")
                .AsNoTracking()
                .ToListAsync();

            var idem = await IdempotencyStore.CheckAsync(
                _context, Request, khachHang.MaTaiKhoan, request);

            if (idem.Result != null)
                return idem.Result;

            if (thanhToan.TrangThaiThanhToan != "ChoThanhToan")
            {
                await transaction.RollbackAsync();
                return BadRequest(new
                {
                    message = "Chỉ mô phỏng được giao dịch đang chờ thanh toán."
                });
            }

            if (string.Equals(
                thanhToan.MaPhuongThucNavigation.TenPhuongThuc,
                "COD",
                StringComparison.OrdinalIgnoreCase))
            {
                await transaction.RollbackAsync();
                return BadRequest(new
                {
                    message = "Thanh toán khi nhận hàng không mô phỏng. Giao dịch sẽ thành công khi quán hoàn thành đơn."
                });
            }

            if (LaFoodPay(thanhToan.MaPhuongThucNavigation.TenPhuongThuc))
            {
                await transaction.RollbackAsync();
                return BadRequest(new
                {
                    message = "Thanh toán FoodPay không mô phỏng. Giao dịch thành công ngay khi đặt đơn."
                });
            }

            thanhToan.TrangThaiThanhToan = ketQua;
            thanhToan.ThoiGianThanhToan = DateTime.Now;
            thanhToan.MaGiaoDich =
                $"{thanhToan.MaPhuongThucNavigation.TenPhuongThuc.ToUpperInvariant()}_" +
                $"{DateTime.Now:yyyyMMddHHmmss}_" +
                $"{thanhToan.MaThanhToan}";

            (int MaTaiKhoan, Thongbao ThongBao)? thongBaoDonMoi = null;

            if (ketQua == "ThanhCong")
            {
                thongBaoDonMoi =
                    await TaoThongBaoDonMoiChoQuan(donHang);
            }

            await _context.SaveChangesAsync();

            var response = new
            {
                message = ketQua == "ThanhCong"
                    ? "Thanh toán thành công."
                    : "Thanh toán thất bại.",
                maThanhToan = thanhToan.MaThanhToan,
                tenPhuongThuc =
                    thanhToan.MaPhuongThucNavigation.TenPhuongThuc,
                trangThaiThanhToan =
                    thanhToan.TrangThaiThanhToan,
                maGiaoDich = thanhToan.MaGiaoDich,
                thoiGianThanhToan =
                    thanhToan.ThoiGianThanhToan
            };

            var result = await IdempotencyStore.SaveSuccessAsync(
                _context, idem, response);

            await transaction.CommitAsync();

            if (thongBaoDonMoi.HasValue)
            {
                await GuiDonMoiRealtimeAnToan(
                    thongBaoDonMoi.Value.MaTaiKhoan,
                    thongBaoDonMoi.Value.ThongBao,
                    donHang
                );
            }

            return result;
        }

        [HttpPost("{id:int}/doi-phuong-thuc")]
        [Authorize(Roles = "KhachHang")]
        public async Task<IActionResult> DoiPhuongThucKhiThatBai(
            int id,
            DoiPhuongThucDto request)
        {
            var khachHang = await GetCurrentKhachHang();

            if (khachHang == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy hồ sơ khách hàng."
                });
            }

            var thanhToanCu = await _context.Thanhtoans
                .Include(x => x.MaDonHangNavigation)
                    .ThenInclude(order => order.MaKhuyenMaiNavigation)
                .Include(x => x.MaDonHangNavigation)
                    .ThenInclude(order => order.Thanhtoans)
                .Include(x => x.MaPhuongThucNavigation)
                .FirstOrDefaultAsync(x =>
                    x.MaThanhToan == id
                );

            if (thanhToanCu == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy giao dịch thanh toán."
                });
            }

            var donHang = thanhToanCu.MaDonHangNavigation;

            if (donHang.MaKhachHang != khachHang.MaKhachHang)
            {
                return StatusCode(403, new
                {
                    message = "Bạn không có quyền đổi phương thức giao dịch này."
                });
            }

            if (donHang.MaTrangThai != 1)
            {
                return BadRequest(new
                {
                    message = "Đơn hàng không còn chờ thanh toán."
                });
            }

            if (await ExpireOnlineOrderIfNeeded(thanhToanCu))
            {
                return StatusCode(StatusCodes.Status410Gone, new
                {
                    message = "Đơn hàng đã tự hủy vì quá hạn thanh toán online 15 phút."
                });
            }

            await using var transaction =
                await _context.Database.BeginTransactionAsync();

            await _context.Donhangs
                .FromSqlInterpolated(
                    $"SELECT * FROM donhang WHERE MaDonHang = {donHang.MaDonHang} FOR UPDATE")
                .AsNoTracking()
                .ToListAsync();

            var idem = await IdempotencyStore.CheckAsync(
                _context, Request, khachHang.MaTaiKhoan, request);

            if (idem.Result != null)
                return idem.Result;

            if (thanhToanCu.TrangThaiThanhToan == "ThanhCong")
            {
                await transaction.RollbackAsync();
                return BadRequest(new
                {
                    message = "Đơn đã thanh toán thành công, không thể đổi phương thức."
                });
            }

            if (thanhToanCu.TrangThaiThanhToan != "ThatBai")
            {
                await transaction.RollbackAsync();
                return BadRequest(new
                {
                    message = "Chỉ đổi phương thức khi giao dịch thất bại."
                });
            }

            if (donHang.MaTrangThai == 6)
            {
                await transaction.RollbackAsync();
                return BadRequest(new
                {
                    message = "Đơn hàng đã huỷ, không thể đổi phương thức thanh toán."
                });
            }

            var daThanhCong = await _context.Thanhtoans.AnyAsync(x =>
                x.MaDonHang == thanhToanCu.MaDonHang &&
                x.TrangThaiThanhToan == "ThanhCong"
            );

            if (daThanhCong)
            {
                await transaction.RollbackAsync();
                return BadRequest(new
                {
                    message = "Đơn hàng đã thanh toán thành công."
                });
            }

            var dangCho = await _context.Thanhtoans.AnyAsync(x =>
                x.MaDonHang == thanhToanCu.MaDonHang &&
                x.TrangThaiThanhToan == "ChoThanhToan"
            );

            if (dangCho)
            {
                await transaction.RollbackAsync();
                return BadRequest(new
                {
                    message = "Đơn hàng đang có giao dịch chờ thanh toán."
                });
            }

            var phuongThuc = await LayPhuongThucDangBat(
                request.MaPhuongThuc
            );

            if (phuongThuc == null)
            {
                await transaction.RollbackAsync();
                return BadRequest(new
                {
                    message = "Phương thức thanh toán không hợp lệ hoặc đã tắt."
                });
            }

            var tuChoiVi = await TruViFoodPayNeuCan(
                khachHang,
                phuongThuc.TenPhuongThuc,
                donHang.ThanhTien);

            if (tuChoiVi != null)
            {
                await transaction.RollbackAsync();
                return tuChoiVi;
            }

            var laFoodPay = LaFoodPay(phuongThuc.TenPhuongThuc);

            var thanhToanMoi = new Thanhtoan
            {
                MaDonHang = thanhToanCu.MaDonHang,
                MaPhuongThuc = phuongThuc.MaPhuongThuc,
                SoTien = donHang.ThanhTien,
                TrangThaiThanhToan = laFoodPay ? "ThanhCong" : "ChoThanhToan",
                MaGiaoDich = laFoodPay
                    ? $"FOODPAY_{DateTime.Now:yyyyMMddHHmmss}"
                    : null,
                ThoiGianThanhToan = laFoodPay ? DateTime.Now : null
            };

            _context.Thanhtoans.Add(thanhToanMoi);

            (int MaTaiKhoan, Thongbao ThongBao)? thongBaoDonMoi = null;

            if (string.Equals(
                phuongThuc.TenPhuongThuc,
                "COD",
                StringComparison.OrdinalIgnoreCase) ||
                laFoodPay)
            {
                thongBaoDonMoi =
                    await TaoThongBaoDonMoiChoQuan(donHang);
            }

            await _context.SaveChangesAsync();

            var response = new
            {
                message = "Đã tạo giao dịch mới với phương thức thanh toán khác.",
                maThanhToanCu = thanhToanCu.MaThanhToan,
                maThanhToanMoi = thanhToanMoi.MaThanhToan,
                maPhuongThuc = thanhToanMoi.MaPhuongThuc,
                tenPhuongThuc = phuongThuc.TenPhuongThuc,
                soTien = thanhToanMoi.SoTien,
                trangThaiThanhToan =
                    thanhToanMoi.TrangThaiThanhToan
            };

            var result = await IdempotencyStore.SaveSuccessAsync(
                _context, idem, response);

            await transaction.CommitAsync();

            if (thongBaoDonMoi.HasValue)
            {
                await GuiDonMoiRealtimeAnToan(
                    thongBaoDonMoi.Value.MaTaiKhoan,
                    thongBaoDonMoi.Value.ThongBao,
                    donHang
                );
            }

            return result;
        }

        private static bool LaFoodPay(string? tenPhuongThuc)
        {
            return string.Equals(
                tenPhuongThuc,
                "FoodPay",
                StringComparison.OrdinalIgnoreCase);
        }

        private async Task<IActionResult?> TruViFoodPayNeuCan(
            Khachhang khachHang,
            string tenPhuongThuc,
            decimal soTien)
        {
            if (!LaFoodPay(tenPhuongThuc))
                return null;

            await _context.Khachhangs
                .FromSqlInterpolated(
                    $"SELECT * FROM khachhang WHERE MaKhachHang = {khachHang.MaKhachHang} FOR UPDATE")
                .AsNoTracking()
                .ToListAsync();

            await _context.Entry(khachHang).ReloadAsync();

            var soTienVi = (int)soTien;

            if (khachHang.DiemTichLuy < soTienVi)
            {
                return BadRequest(new
                {
                    message = "Số dư ví FoodPay không đủ để thanh toán."
                });
            }

            khachHang.DiemTichLuy -= soTienVi;
            return null;
        }

        private async Task<bool> ExpireOnlineOrderIfNeeded(Thanhtoan payment)
        {
            var order = payment.MaDonHangNavigation;

            if (order.MaTrangThai != 1 ||
                OrderPaymentRules.IsCod(payment) ||
                !OrderPaymentRules.IsOnlinePaymentExpired(order))
            {
                return false;
            }

            var claimed = await _context.Donhangs
                .Where(item => item.MaDonHang == order.MaDonHang && item.MaTrangThai == 1)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(item => item.MaTrangThai, 6)
                    .SetProperty(
                        item => item.LyDoHuy,
                        "Hệ thống tự hủy do thanh toán online quá hạn 15 phút."));

            if (claimed == 0)
                return true;

            foreach (var pendingPayment in order.Thanhtoans.Where(item =>
                         item.TrangThaiThanhToan == "ChoThanhToan"))
            {
                pendingPayment.TrangThaiThanhToan = "ThatBai";
                pendingPayment.ThoiGianThanhToan = DateTime.Now;
            }

            order.MaTrangThai = 6;
            order.LyDoHuy = "Hệ thống tự hủy do thanh toán online quá hạn 15 phút.";

            if (order.MaKhuyenMaiNavigation != null &&
                order.MaKhuyenMaiNavigation.SoLuongDaDung > 0)
            {
                order.MaKhuyenMaiNavigation.SoLuongDaDung--;
            }

            _context.Lichsutrangthaidonhangs.Add(new Lichsutrangthaidonhang
            {
                MaDonHang = order.MaDonHang,
                MaTrangThai = 6,
                MaTaiKhoan = null,
                ThoiGianTao = DateTime.Now,
                GhiChu = "Hệ thống tự hủy: thanh toán online quá hạn 15 phút."
            });

            await _context.SaveChangesAsync();
            return true;
        }

        private async Task<(
            int MaTaiKhoan,
            Thongbao ThongBao
        )?> TaoThongBaoDonMoiChoQuan(
            Donhang donHang)
        {
            var nhaHang = await _context.Nhahangs
                .AsNoTracking()
                .Where(x =>
                    x.MaNhaHang == donHang.MaNhaHang
                )
                .Select(x => new
                {
                    x.MaTaiKhoan,
                    x.TenNhaHang
                })
                .FirstOrDefaultAsync();

            if (nhaHang == null)
                return null;

            var daThongBao = await _context.Thongbaos
                .AsNoTracking()
                .AnyAsync(x =>
                    x.MaTaiKhoan == nhaHang.MaTaiKhoan &&
                    x.Loai == "DonHang" &&
                    x.TieuDe == "Bạn có đơn hàng mới" &&
                    x.NoiDung.Contains(
                        donHang.MaDonHangHienThi
                    )
                );

            if (daThongBao)
                return null;

            var noiDung =
                $"Bạn có đơn hàng mới " +
                $"{donHang.MaDonHangHienThi}, " +
                $"trị giá {donHang.ThanhTien:N0}đ.";

            var thongBao = new Thongbao
            {
                MaTaiKhoan = nhaHang.MaTaiKhoan,
                TieuDe = "Bạn có đơn hàng mới",
                NoiDung = noiDung.Length > 500
                    ? noiDung[..500]
                    : noiDung,
                Loai = "DonHang",
                DuongDan = $"/quan/don-hang/{donHang.MaDonHang}",
                DaDoc = false,
                NgayTao = DateTime.Now
            };

            _context.Thongbaos.Add(thongBao);

            return (
                nhaHang.MaTaiKhoan,
                thongBao
            );
        }

        private async Task GuiDonMoiRealtimeAnToan(
            int maTaiKhoanQuan,
            Thongbao thongBao,
            Donhang donHang)
        {
            var thongBaoPayload = new
            {
                maThongBao = thongBao.MaThongBao,
                tieuDe = thongBao.TieuDe,
                noiDung = thongBao.NoiDung,
                loai = thongBao.Loai,
                duongDan = thongBao.DuongDan,
                daDoc = false,
                ngayTao = thongBao.NgayTao
            };

            var donHangPayload = new
            {
                maDonHang = donHang.MaDonHang,
                maDonHangHienThi =
                    donHang.MaDonHangHienThi,
                tenNguoiNhan =
                    donHang.TenNguoiNhan,
                thoiGianDat =
                    donHang.ThoiGianDat,
                trangThai = "ChoXacNhan",
                thanhTien =
                    donHang.ThanhTien
            };

            try
            {
                await Task.WhenAll(
                    _realtime.GuiThongBaoAsync(
                        maTaiKhoanQuan,
                        thongBaoPayload
                    ),
                    _realtime.GuiDonHangMoiAsync(
                        maTaiKhoanQuan,
                        donHangPayload
                    )
                );
            }
            catch (Exception signalRException)
            {
                _logger.LogWarning(
                    signalRException,
                    "Đơn {MaDonHang} đã sẵn sàng nhưng không gửi được SignalR cho quán.",
                    donHang.MaDonHang
                );
            }
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

        private async Task<Khachhang?> GetCurrentKhachHang()
        {
            var maTaiKhoan = GetMaTaiKhoan();

            if (maTaiKhoan == null)
                return null;

            return await _context.Khachhangs
                .FirstOrDefaultAsync(x =>
                    x.MaTaiKhoan == maTaiKhoan.Value
                );
        }

        private async Task<Phuongthucthanhtoan?>
            LayPhuongThucDangBat(
                int maPhuongThuc)
        {
            return await _context.Phuongthucthanhtoans
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.MaPhuongThuc == maPhuongThuc &&
                    x.TrangThai == true
                );
        }

        private async Task<bool?>
            KiemTraQuyenXemDonHang(
                string? role,
                int maTaiKhoan,
                Donhang donHang)
        {
            if (role == "KhachHang")
            {
                var khachHang = await _context.Khachhangs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x =>
                        x.MaTaiKhoan == maTaiKhoan
                    );

                if (khachHang == null)
                    return null;

                return donHang.MaKhachHang ==
                       khachHang.MaKhachHang;
            }

            if (role == "Quan")
            {
                var nhaHang = await _context.Nhahangs
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x =>
                        x.MaTaiKhoan == maTaiKhoan
                    );

                if (nhaHang == null)
                    return null;

                return donHang.MaNhaHang ==
                       nhaHang.MaNhaHang;
            }

            return false;
        }
    }
}
