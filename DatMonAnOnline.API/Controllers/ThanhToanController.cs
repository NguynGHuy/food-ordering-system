using DatMonAnOnline.API.Common;
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
        private readonly IWalletService _walletService;

        public ThanhToanController(
            DatMonAnOnlineContext context,
            IRealtimeNotificationService realtime,
            ILogger<ThanhToanController> logger,
            IWalletService walletService)
        {
            _context = context;
            _realtime = realtime;
            _logger = logger;
            _walletService = walletService;
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

            await using var transaction =
                await _context.Database.BeginTransactionAsync(HttpContext.RequestAborted);

            var (donHang, payments) = await LockOrderAndPayments(
                request.MaDonHang,
                HttpContext.RequestAborted);

            if (donHang == null)
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
                return NotFound(new { message = "Không tìm thấy đơn hàng." });
            }

            if (donHang.MaKhachHang != khachHang.MaKhachHang)
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
                return StatusCode(403, new
                {
                    message = "Bạn không có quyền thanh toán đơn hàng này."
                });
            }

            var idem = await IdempotencyStore.CheckAsync(
                _context, Request, khachHang.MaTaiKhoan, request);

            if (idem.Result != null)
                return idem.Result;

            if (LaDonTuHuyQuaHan(donHang))
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
                return StatusCode(StatusCodes.Status410Gone, new
                {
                    message = "Đơn hàng đã tự hủy vì quá hạn thanh toán online 15 phút."
                });
            }

            if (donHang.MaTrangThai != 1)
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
                return BadRequest(new
                {
                    message = "Đơn hàng không còn ở trạng thái chờ thanh toán/xác nhận."
                });
            }

            var expiration = await ExpireLockedOnlineOrderIfNeeded(
                donHang,
                payments,
                HttpContext.RequestAborted);
            if (expiration.Expired)
            {
                await _context.SaveChangesAsync(HttpContext.RequestAborted);
                await transaction.CommitAsync(HttpContext.RequestAborted);
                await GuiTuHuyRealtimeAnToan(expiration, donHang);
                return StatusCode(StatusCodes.Status410Gone, new
                {
                    message = "Đơn hàng đã tự hủy vì quá hạn thanh toán online 15 phút."
                });
            }

            var daThanhCong = payments.Any(x =>
                x.TrangThaiThanhToan == "ThanhCong");

            if (daThanhCong)
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
                return BadRequest(new
                {
                    message = "Đơn hàng đã thanh toán thành công."
                });
            }

            var dangCho = payments.Any(x =>
                x.TrangThaiThanhToan == "ChoThanhToan");

            if (dangCho)
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
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
                await transaction.RollbackAsync(HttpContext.RequestAborted);
                return BadRequest(new
                {
                    message = "Phương thức thanh toán không hợp lệ hoặc đã tắt."
                });
            }

            var tuChoiVi = await TruViFoodPayNeuCan(
                khachHang,
                phuongThuc.TenPhuongThuc,
                donHang.ThanhTien,
                donHang.MaDonHang,
                donHang.MaDonHangHienThi);

            if (tuChoiVi != null)
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
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
                    ? TaoMaGiaoDichFoodPay()
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

            await _context.SaveChangesAsync(HttpContext.RequestAborted);

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
                _context,
                idem,
                response,
                StatusCodes.Status201Created);

            await transaction.CommitAsync(HttpContext.RequestAborted);

            if (thongBaoDonMoi.HasValue)
            {
                await GuiDonMoiRealtimeAnToan(
                    thongBaoDonMoi.Value.MaTaiKhoan,
                    thongBaoDonMoi.Value.ThongBao,
                    donHang
                );
            }

            if (laFoodPay)
            {
                await _realtime.GuiDuLieuThayDoiAsync(
                    khachHang.MaTaiKhoan,
                    new[] { "vi" },
                    new { donHang.MaDonHang, hanhDong = "ThanhToanDonHang" });
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

            var orderId = await _context.Thanhtoans
                .AsNoTracking()
                .Where(x => x.MaThanhToan == id)
                .Select(x => (int?)x.MaDonHang)
                .SingleOrDefaultAsync(HttpContext.RequestAborted);

            if (!orderId.HasValue)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy giao dịch thanh toán."
                });
            }

            await using var transaction =
                await _context.Database.BeginTransactionAsync(HttpContext.RequestAborted);

            var (donHang, payments) = await LockOrderAndPayments(
                orderId.Value,
                HttpContext.RequestAborted);
            var thanhToan = payments.SingleOrDefault(x => x.MaThanhToan == id);

            if (donHang == null || thanhToan == null)
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
                return NotFound(new
                {
                    message = "Không tìm thấy giao dịch thanh toán."
                });
            }

            if (donHang.MaKhachHang != khachHang.MaKhachHang)
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
                return StatusCode(403, new
                {
                    message = "Bạn không có quyền xử lý giao dịch này."
                });
            }

            var idem = await IdempotencyStore.CheckAsync(
                _context, Request, khachHang.MaTaiKhoan, request);

            if (idem.Result != null)
                return idem.Result;

            if (LaDonTuHuyQuaHan(donHang))
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
                return StatusCode(StatusCodes.Status410Gone, new
                {
                    message = "Đơn hàng đã tự hủy vì quá hạn thanh toán online 15 phút."
                });
            }

            if (donHang.MaTrangThai != 1)
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
                return BadRequest(new
                {
                    message = "Đơn hàng không còn ở trạng thái chờ thanh toán/xác nhận."
                });
            }

            var expiration = await ExpireLockedOnlineOrderIfNeeded(
                donHang,
                payments,
                HttpContext.RequestAborted);
            if (expiration.Expired)
            {
                await _context.SaveChangesAsync(HttpContext.RequestAborted);
                await transaction.CommitAsync(HttpContext.RequestAborted);
                await GuiTuHuyRealtimeAnToan(expiration, donHang);
                return StatusCode(StatusCodes.Status410Gone, new
                {
                    message = "Đơn hàng đã tự hủy vì quá hạn thanh toán online 15 phút."
                });
            }

            if (thanhToan.SoTien != donHang.ThanhTien)
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
                return Conflict(new
                {
                    message = "Số tiền giao dịch không khớp tổng tiền đơn hàng."
                });
            }

            if (payments.Max(payment => payment.MaThanhToan) !=
                thanhToan.MaThanhToan)
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
                return Conflict(new
                {
                    message = "Giao dịch này không còn là lần thanh toán mới nhất của đơn hàng."
                });
            }

            if (thanhToan.TrangThaiThanhToan != "ChoThanhToan")
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
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
                await transaction.RollbackAsync(HttpContext.RequestAborted);
                return BadRequest(new
                {
                    message = "Thanh toán khi nhận hàng không mô phỏng. Giao dịch sẽ thành công khi quán hoàn thành đơn."
                });
            }

            if (LaFoodPay(thanhToan.MaPhuongThucNavigation.TenPhuongThuc))
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
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

            await _context.SaveChangesAsync(HttpContext.RequestAborted);

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
                _context,
                idem,
                response);

            await transaction.CommitAsync(HttpContext.RequestAborted);

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

            var orderId = await _context.Thanhtoans
                .AsNoTracking()
                .Where(x => x.MaThanhToan == id)
                .Select(x => (int?)x.MaDonHang)
                .SingleOrDefaultAsync(HttpContext.RequestAborted);

            if (!orderId.HasValue)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy giao dịch thanh toán."
                });
            }

            await using var transaction =
                await _context.Database.BeginTransactionAsync(HttpContext.RequestAborted);

            var (donHang, payments) = await LockOrderAndPayments(
                orderId.Value,
                HttpContext.RequestAborted);
            var thanhToanCu = payments.SingleOrDefault(x => x.MaThanhToan == id);

            if (donHang == null || thanhToanCu == null)
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
                return NotFound(new
                {
                    message = "Không tìm thấy giao dịch thanh toán."
                });
            }

            if (donHang.MaKhachHang != khachHang.MaKhachHang)
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
                return StatusCode(403, new
                {
                    message = "Bạn không có quyền đổi phương thức giao dịch này."
                });
            }

            var idem = await IdempotencyStore.CheckAsync(
                _context, Request, khachHang.MaTaiKhoan, request);

            if (idem.Result != null)
                return idem.Result;

            if (LaDonTuHuyQuaHan(donHang))
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
                return StatusCode(StatusCodes.Status410Gone, new
                {
                    message = "Đơn hàng đã tự hủy vì quá hạn thanh toán online 15 phút."
                });
            }

            if (donHang.MaTrangThai != 1)
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
                return BadRequest(new
                {
                    message = "Đơn hàng không còn chờ thanh toán."
                });
            }

            var expiration = await ExpireLockedOnlineOrderIfNeeded(
                donHang,
                payments,
                HttpContext.RequestAborted);
            if (expiration.Expired)
            {
                await _context.SaveChangesAsync(HttpContext.RequestAborted);
                await transaction.CommitAsync(HttpContext.RequestAborted);
                await GuiTuHuyRealtimeAnToan(expiration, donHang);
                return StatusCode(StatusCodes.Status410Gone, new
                {
                    message = "Đơn hàng đã tự hủy vì quá hạn thanh toán online 15 phút."
                });
            }

            if (thanhToanCu.SoTien != donHang.ThanhTien)
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
                return Conflict(new
                {
                    message = "Số tiền giao dịch không khớp tổng tiền đơn hàng."
                });
            }

            if (payments.Max(payment => payment.MaThanhToan) !=
                thanhToanCu.MaThanhToan)
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
                return Conflict(new
                {
                    message = "Chỉ được đổi phương thức từ giao dịch mới nhất của đơn hàng."
                });
            }

            if (thanhToanCu.TrangThaiThanhToan == "ThanhCong")
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
                return BadRequest(new
                {
                    message = "Đơn đã thanh toán thành công, không thể đổi phương thức."
                });
            }

            if (thanhToanCu.TrangThaiThanhToan != "ThatBai")
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
                return BadRequest(new
                {
                    message = "Chỉ đổi phương thức khi giao dịch thất bại."
                });
            }

            if (donHang.MaTrangThai == 6)
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
                return BadRequest(new
                {
                    message = "Đơn hàng đã huỷ, không thể đổi phương thức thanh toán."
                });
            }

            var daThanhCong = payments.Any(x =>
                x.TrangThaiThanhToan == "ThanhCong");

            if (daThanhCong)
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
                return BadRequest(new
                {
                    message = "Đơn hàng đã thanh toán thành công."
                });
            }

            var dangCho = payments.Any(x =>
                x.TrangThaiThanhToan == "ChoThanhToan");

            if (dangCho)
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
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
                await transaction.RollbackAsync(HttpContext.RequestAborted);
                return BadRequest(new
                {
                    message = "Phương thức thanh toán không hợp lệ hoặc đã tắt."
                });
            }

            var tuChoiVi = await TruViFoodPayNeuCan(
                khachHang,
                phuongThuc.TenPhuongThuc,
                donHang.ThanhTien,
                donHang.MaDonHang,
                donHang.MaDonHangHienThi);

            if (tuChoiVi != null)
            {
                await transaction.RollbackAsync(HttpContext.RequestAborted);
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
                    ? TaoMaGiaoDichFoodPay()
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

            await _context.SaveChangesAsync(HttpContext.RequestAborted);

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
                _context,
                idem,
                response,
                StatusCodes.Status201Created);

            await transaction.CommitAsync(HttpContext.RequestAborted);

            if (thongBaoDonMoi.HasValue)
            {
                await GuiDonMoiRealtimeAnToan(
                    thongBaoDonMoi.Value.MaTaiKhoan,
                    thongBaoDonMoi.Value.ThongBao,
                    donHang
                );
            }

            if (laFoodPay)
            {
                await _realtime.GuiDuLieuThayDoiAsync(
                    khachHang.MaTaiKhoan,
                    new[] { "vi" },
                    new { donHang.MaDonHang, hanhDong = "ThanhToanDonHang" });
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

        private static string TaoMaGiaoDichFoodPay()
            => $"FOODPAY_{Guid.NewGuid():N}";

        private async Task<IActionResult?> TruViFoodPayNeuCan(
            Khachhang khachHang,
            string tenPhuongThuc,
            decimal soTien,
            int maDonHang,
            string maDonHangHienThi)
        {
            if (!LaFoodPay(tenPhuongThuc))
                return null;

            var ketQua = await _walletService.DebitAsync(
                khachHang.MaTaiKhoan,
                soTien,
                WalletTransactionTypes.ThanhToan,
                $"WALLET-PAYMENT:{maDonHang}",
                $"Thanh toán đơn {maDonHangHienThi}",
                maDonHang: maDonHang,
                cancellationToken: HttpContext.RequestAborted);

            if (!ketQua.Succeeded)
            {
                return BadRequest(new
                {
                    message = ketQua.Error
                });
            }

            return null;
        }

        private async Task<(Donhang? Order, List<Thanhtoan> Payments)>
            LockOrderAndPayments(
                int orderId,
                CancellationToken cancellationToken)
        {
            if (_context.Database.CurrentTransaction == null)
            {
                throw new InvalidOperationException(
                    "Khóa đơn hàng phải chạy trong transaction.");
            }

            var order = await _context.Donhangs
                .FromSqlInterpolated(
                    $"SELECT * FROM donhang WHERE MaDonHang = {orderId} FOR UPDATE")
                .SingleOrDefaultAsync(cancellationToken);

            if (order == null)
                return (null, new List<Thanhtoan>());

            var payments = await _context.Thanhtoans
                .FromSqlInterpolated(
                    $"SELECT * FROM thanhtoan WHERE MaDonHang = {orderId} ORDER BY MaThanhToan FOR UPDATE")
                .ToListAsync(cancellationToken);

            var methodIds = payments
                .Select(payment => payment.MaPhuongThuc)
                .Distinct()
                .ToList();

            if (methodIds.Count > 0)
            {
                await _context.Phuongthucthanhtoans
                    .Where(method => methodIds.Contains(method.MaPhuongThuc))
                    .LoadAsync(cancellationToken);
            }

            return (order, payments);
        }

        private static bool LaDonTuHuyQuaHan(Donhang order)
            => order.MaTrangThai == 6 &&
               order.LyDoHuy?.Contains(
                   "thanh toán online quá hạn 15 phút",
                   StringComparison.OrdinalIgnoreCase) == true;

        private async Task<(
            bool Expired,
            int? AccountId,
            Thongbao? Notification)> ExpireLockedOnlineOrderIfNeeded(
                Donhang order,
                IReadOnlyCollection<Thanhtoan> payments,
                CancellationToken cancellationToken)
        {
            if (_context.Database.CurrentTransaction == null)
            {
                throw new InvalidOperationException(
                    "Tự hủy đơn phải chạy trong transaction đã khóa đơn.");
            }

            var latestPayment = payments
                .OrderByDescending(payment => payment.MaThanhToan)
                .FirstOrDefault();

            if (order.MaTrangThai != 1 ||
                latestPayment == null ||
                OrderPaymentRules.IsCod(latestPayment) ||
                payments.Any(payment => payment.TrangThaiThanhToan == "ThanhCong") ||
                !OrderPaymentRules.IsOnlinePaymentExpired(order))
            {
                return (false, null, null);
            }

            var now = DateTime.Now;
            order.MaTrangThai = 6;
            order.LyDoHuy =
                "Hệ thống tự hủy do thanh toán online quá hạn 15 phút.";

            foreach (var payment in payments.Where(payment =>
                         payment.TrangThaiThanhToan == "ChoThanhToan"))
            {
                payment.TrangThaiThanhToan = "ThatBai";
                payment.ThoiGianThanhToan = now;
            }

            await PromotionWriteHelper.ReturnUsageIfEligibleAsync(
                _context,
                order.MaKhuyenMai,
                now,
                cancellationToken);

            _context.Lichsutrangthaidonhangs.Add(new Lichsutrangthaidonhang
            {
                MaDonHang = order.MaDonHang,
                MaTrangThai = 6,
                MaTaiKhoan = null,
                ThoiGianTao = now,
                GhiChu = "Hệ thống tự hủy: thanh toán online quá hạn 15 phút."
            });

            var accountId = await _context.Khachhangs
                .Where(customer => customer.MaKhachHang == order.MaKhachHang)
                .Select(customer => (int?)customer.MaTaiKhoan)
                .SingleOrDefaultAsync(cancellationToken);

            if (!accountId.HasValue)
                return (true, null, null);

            var notification = new Thongbao
            {
                MaTaiKhoan = accountId.Value,
                TieuDe = "Đơn hàng đã tự hủy",
                NoiDung =
                    $"Đơn {order.MaDonHangHienThi} đã tự hủy vì chưa hoàn tất thanh toán trong 15 phút.",
                Loai = "DonHang",
                DuongDan = $"/don-hang/{order.MaDonHang}",
                DaDoc = false,
                NgayTao = now
            };
            _context.Thongbaos.Add(notification);

            return (true, accountId, notification);
        }

        private async Task GuiTuHuyRealtimeAnToan(
            (bool Expired, int? AccountId, Thongbao? Notification) expiration,
            Donhang order)
        {
            if (!expiration.AccountId.HasValue || expiration.Notification == null)
                return;

            try
            {
                await Task.WhenAll(
                    _realtime.GuiThongBaoAsync(
                        expiration.AccountId.Value,
                        expiration.Notification),
                    _realtime.GuiDonHangDaHuyAsync(
                        expiration.AccountId.Value,
                        new
                        {
                            order.MaDonHang,
                            order.MaDonHangHienThi,
                            trangThai = "DaHuy",
                            lyDoHuy = order.LyDoHuy
                        }));
            }
            catch (Exception exception)
            {
                _logger.LogWarning(
                    exception,
                    "Đơn {OrderId} đã tự hủy nhưng không phát được SignalR.",
                    order.MaDonHang);
            }
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
