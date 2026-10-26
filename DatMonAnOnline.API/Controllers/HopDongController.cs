using DatMonAnOnline.API.Models;
using DatMonAnOnline.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace DatMonAnOnline.API.Controllers;

[ApiController]
[Route("api/nha-hang/hop-dong")]
[Authorize(Roles = "Quan")]
public class HopDongController : ControllerBase
{
    private readonly DatMonAnOnlineContext _context;
    private readonly IWebHostEnvironment _environment;
    private readonly IRealtimeNotificationService _realtime;

    public HopDongController(
        DatMonAnOnlineContext context,
        IWebHostEnvironment environment,
        IRealtimeNotificationService realtime)
    {
        _context = context;
        _environment = environment;
        _realtime = realtime;
    }

    public sealed class GuiXetDuyetRequest
    {
        [Range(1, int.MaxValue)]
        public int MaHopDong { get; set; }
    }

    private bool TepTonTai(int maNhaHang, string? thamChieu)
    {
        if (string.IsNullOrWhiteSpace(thamChieu))
            return false;

        var tenTep = Path.GetFileName(thamChieu);

        if (thamChieu != $"{maNhaHang}/{tenTep}")
            return false;

        var duongDan = Path.Combine(
            _environment.ContentRootPath,
            "App_Data",
            "HoSoPhapLy",
            maNhaHang.ToString(),
            tenTep
        );

        return System.IO.File.Exists(duongDan);
    }

    [HttpGet("xem-truoc")]
    public async Task<IActionResult> XemTruoc()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!int.TryParse(claim, out var maTaiKhoan) || maTaiKhoan <= 0)
            return Unauthorized();

        var nhaHang = await _context.Nhahangs
            .AsNoTracking()
            .Include(x => x.MaTaiKhoanNavigation)
            .FirstOrDefaultAsync(x => x.MaTaiKhoan == maTaiKhoan);

        if (nhaHang == null)
            return NotFound(new
            {
                message = "Không tìm thấy nhà hàng."
            });

        if (nhaHang.TrangThaiDuyet != "ChuaHoanTat" &&
            nhaHang.TrangThaiDuyet != "TuChoi")
        {
            return Conflict(new
            {
                message = "Nhà hàng không ở trạng thái hoàn thiện hồ sơ."
            });
        }

        var daCoHopDong = await _context.Hopdongnhahangs
            .AnyAsync(x =>
                x.MaNhaHang == nhaHang.MaNhaHang &&
                (x.TrangThai == "DaKy" ||
                 x.TrangThai == "ChoDuyet" ||
                 x.TrangThai == "HieuLuc"));

        if (daCoHopDong)
            return Conflict(new
            {
                message = "Nhà hàng đã có hợp đồng đã ký hoặc đang được xử lý."
            });

        var hoSo = await _context.Hosophaplynhahangs
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.MaNhaHang == nhaHang.MaNhaHang);

        var thieu = new List<string>();

        void KiemTra(string? value, string label)
        {
            if (string.IsNullOrWhiteSpace(value))
                thieu.Add(label);
        }

        KiemTra(nhaHang.TenNhaHang, "Tên nhà hàng");
        KiemTra(nhaHang.DiaChiQuan, "Địa chỉ quán");
        KiemTra(nhaHang.MoTa, "Mô tả nhà hàng");
        KiemTra(nhaHang.AnhBia, "Ảnh bìa");
        KiemTra(nhaHang.MaTaiKhoanNavigation.SoDienThoai, "Số điện thoại");

        if (!nhaHang.GioMoCua.HasValue)
            thieu.Add("Giờ mở cửa");

        if (!nhaHang.GioDongCua.HasValue)
            thieu.Add("Giờ đóng cửa");

        if (nhaHang.GioMoCua.HasValue &&
            nhaHang.GioDongCua.HasValue &&
            nhaHang.GioMoCua == nhaHang.GioDongCua)
        {
            thieu.Add("Giờ mở cửa và đóng cửa phải khác nhau");
        }

        KiemTra(hoSo?.NguoiDaiDien, "Người đại diện");
        KiemTra(hoSo?.SoGiayToNguoiDaiDien, "Số giấy tờ đại diện");
        KiemTra(hoSo?.TenPhapLy, "Tên pháp lý");
        KiemTra(hoSo?.MaSoThue, "Mã số thuế");
        KiemTra(hoSo?.DiaChiPhapLy, "Địa chỉ pháp lý");
        KiemTra(hoSo?.SoGiayPhepKinhDoanh, "Số giấy phép kinh doanh");

        if (!TepTonTai(nhaHang.MaNhaHang, hoSo?.FileGiayPhepKinhDoanh))
            thieu.Add("Tệp giấy phép kinh doanh hợp lệ");

        if (!TepTonTai(nhaHang.MaNhaHang, hoSo?.FileGiayToNguoiDaiDien))
            thieu.Add("Tệp giấy tờ đại diện hợp lệ");

        if (thieu.Count > 0)
            return BadRequest(new
            {
                message = "Vui lòng hoàn thiện: " + string.Join("; ", thieu),
                thieu
            });

        const string phienBan = "1.0";
        const decimal tyLePhi = 5m;

        var ngayBatDau = DateOnly.FromDateTime(DateTime.Now);
        var ngayKetThuc = ngayBatDau.AddYears(1);

        var chinhSachDoiSoat =
            "Đơn hàng được tổng hợp theo từng kỳ đối soát. " +
            "Nhà hàng được xem tiền hàng, giảm giá, phí nền tảng, " +
            "hoàn tiền và số tiền cần đối soát. " +
            "Việc thanh toán đối soát được thực hiện sau khi kỳ được xác nhận.";

        var noiDung = $"""
            HỢP ĐỒNG HỢP TÁC NHÀ HÀNG — FOODIE
            Phiên bản điều khoản: {phienBan}

            1. THÔNG TIN NHÀ HÀNG
            Tên nhà hàng: {nhaHang.TenNhaHang}
            Địa chỉ quán: {nhaHang.DiaChiQuan}

            2. THÔNG TIN ĐẠI DIỆN VÀ PHÁP LÝ
            Tên pháp lý: {hoSo!.TenPhapLy}
            Người đại diện: {hoSo.NguoiDaiDien}
            Chức vụ: {hoSo.ChucVuNguoiDaiDien ?? "Không khai báo"}
            Số giấy tờ đại diện: {hoSo.SoGiayToNguoiDaiDien}
            Mã số thuế: {hoSo.MaSoThue}
            Địa chỉ pháp lý: {hoSo.DiaChiPhapLy}
            Số giấy phép kinh doanh: {hoSo.SoGiayPhepKinhDoanh}

            3. PHẠM VI HỢP TÁC
            Nhà hàng cung cấp thông tin món ăn và thực hiện đơn hàng.
            Nền tảng cung cấp chức năng giới thiệu quán, đặt món,
            thông báo và quản lý giao dịch.

            4. PHÍ NỀN TẢNG
            Tỷ lệ phí nền tảng: {tyLePhi}%.
            Cách tính và số tiền được thể hiện trong kỳ đối soát.

            5. CHÍNH SÁCH ĐỐI SOÁT
            {chinhSachDoiSoat}

            6. THỜI HẠN DỰ KIẾN
            Từ ngày {ngayBatDau:dd/MM/yyyy} đến ngày {ngayKetThuc:dd/MM/yyyy}.
            Nhà hàng chỉ được hoạt động sau khi Admin chấp thuận hồ sơ
            và hợp đồng đáp ứng điều kiện hiệu lực.

            7. XÁC NHẬN
            Người đăng ký xác nhận thông tin đã cung cấp là chính xác,
            đã đọc nội dung và đồng ý điều khoản hợp tác.
            """;

        // Bao gồm giấy tờ để phát hiện thay đổi sau khi xem trước.
        var duLieuXacNhan = string.Join("\n",
            noiDung,
            hoSo!.FileGiayPhepKinhDoanh,
            hoSo.FileGiayToNguoiDaiDien
        );

        var maXacNhan = Convert.ToHexString(
            SHA256.HashData(Encoding.UTF8.GetBytes(duLieuXacNhan))
        );

        return Ok(new HopDongXemTruocResponse
        {
            MaNhaHang = nhaHang.MaNhaHang,
            PhienBanDieuKhoan = phienBan,
            TyLePhiNenTang = tyLePhi,
            NgayBatDau = ngayBatDau,
            NgayKetThuc = ngayKetThuc,
            ChinhSachDoiSoat = chinhSachDoiSoat,
            NoiDungHopDong = noiDung,
            MaXacNhanNoiDung = maXacNhan
        });
    }

    [HttpPost("ky")]
    public async Task<IActionResult> KyHopDong(
    [FromBody] KyHopDongRequest request)
    {
        if (!request.DongYDieuKhoan || !request.XacNhanKy)
            return BadRequest(new
            {
                message = "Bạn cần đồng ý điều khoản và xác nhận ký hợp đồng."
            });

        if (string.IsNullOrWhiteSpace(request.MaXacNhanNoiDung))
            return BadRequest(new
            {
                message = "Vui lòng xem nội dung hợp đồng trước khi ký."
            });

        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!int.TryParse(claim, out var maTaiKhoan) || maTaiKhoan <= 0)
            return Unauthorized();

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        string? duongDanTepMoi = null;
        var commitAttempted = false;

        try
        {
            // Khóa nhà hàng trong giao dịch để tránh hai lần ký đồng thời.
            var nhaHangs = await _context.Nhahangs
                .FromSqlInterpolated(
                    $"SELECT * FROM nhahang WHERE MaTaiKhoan = {maTaiKhoan} FOR UPDATE")
                .ToListAsync();

            var nhaHang = nhaHangs.SingleOrDefault();

            if (nhaHang == null)
                return NotFound(new
                {
                    message = "Không tìm thấy nhà hàng."
                });

            // Hợp đồng - trả lại kết quả ký nếu request đã thành công
            var idem = await IdempotencyStore.CheckAsync(
                _context,
                Request,
                maTaiKhoan,
                request);

            if (idem.Result != null)
                return idem.Result;

            // Dùng lại toàn bộ kiểm tra hồ sơ trong API xem trước.
            var previewResult = await XemTruoc();

            if (previewResult is not OkObjectResult ok ||
                ok.Value is not HopDongXemTruocResponse preview)
            {
                return previewResult;
            }

            if (!string.Equals(
                request.MaXacNhanNoiDung,
                preview.MaXacNhanNoiDung,
                StringComparison.Ordinal))
            {
                return Conflict(new
                {
                    message = "Hồ sơ hoặc nội dung hợp đồng đã thay đổi. Vui lòng xem lại trước khi ký."
                });
            }

            var hoSo = await _context.Hosophaplynhahangs
                .AsNoTracking()
                .FirstAsync(x => x.MaNhaHang == nhaHang.MaNhaHang);

            var thoiGianKy = DateTime.Now;
            var maNgauNhien = Guid.NewGuid().ToString("N");
            var soHopDong = $"HD-{maNgauNhien}";
            var tenTep = $"{maNgauNhien}.txt";

            var thuMuc = Path.Combine(
                _environment.ContentRootPath,
                "App_Data",
                "HopDong",
                nhaHang.MaNhaHang.ToString()
            );

            Directory.CreateDirectory(thuMuc);
            duongDanTepMoi = Path.Combine(thuMuc, tenTep);

            var noiDungDaKy =
                $"Số hợp đồng: {soHopDong}\n" +
                $"Tài khoản xác nhận: {maTaiKhoan}\n" +
                $"Thời gian xác nhận: {thoiGianKy:yyyy-MM-dd HH:mm:ss}\n\n" +
                preview.NoiDungHopDong;

            await System.IO.File.WriteAllTextAsync(
                duongDanTepMoi,
                noiDungDaKy,
                Encoding.UTF8,
                HttpContext.RequestAborted
            );

            var hopDong = new Hopdongnhahang
            {
                MaNhaHang = nhaHang.MaNhaHang,
                SoHopDong = soHopDong,

                NguoiDaiDien = hoSo.NguoiDaiDien!,
                ChucVuNguoiDaiDien = hoSo.ChucVuNguoiDaiDien,
                SoGiayToNguoiDaiDien = hoSo.SoGiayToNguoiDaiDien,
                TenPhapLy = hoSo.TenPhapLy,
                MaSoThue = hoSo.MaSoThue,
                DiaChiPhapLy = hoSo.DiaChiPhapLy,
                SoGiayPhepKinhDoanh = hoSo.SoGiayPhepKinhDoanh,
                FileGiayPhepKinhDoanh = hoSo.FileGiayPhepKinhDoanh,
                FileGiayToNguoiDaiDien = hoSo.FileGiayToNguoiDaiDien,

                FileHopDong = $"{nhaHang.MaNhaHang}/{tenTep}",
                NoiDungHopDong = noiDungDaKy,
                PhienBanDieuKhoan = preview.PhienBanDieuKhoan,
                TyLePhiNenTang = preview.TyLePhiNenTang,
                NgayBatDau = preview.NgayBatDau,
                NgayKetThuc = preview.NgayKetThuc,

                ThoiGianDongYDieuKhoan = thoiGianKy,
                ThoiGianKy = thoiGianKy,
                TrangThai = "DaKy",
                NgayTao = thoiGianKy
            };

            _context.Hopdongnhahangs.Add(hopDong);

            await _context.SaveChangesAsync();

            var response = new
            {
                message = "Đã xác nhận ký hợp đồng. Bạn có thể gửi hồ sơ xét duyệt.",
                hopDong.MaHopDong,
                hopDong.SoHopDong,
                hopDong.TrangThai,
                hopDong.ThoiGianKy
            };

            var result = await IdempotencyStore.SaveSuccessAsync(
                _context,
                idem,
                response,
                StatusCodes.Status201Created);

            commitAttempted = true;
            await transaction.CommitAsync();

            await _realtime.GuiDuLieuThayDoiAsync(
                maTaiKhoan,
                new[] { "hopDong" },
                new { hopDong.MaHopDong, hanhDong = "Ky" });

            return result;
        }
        catch
        {
            if (!commitAttempted) await transaction.RollbackAsync();

            if (!commitAttempted && duongDanTepMoi != null &&
                System.IO.File.Exists(duongDanTepMoi))
            {
                System.IO.File.Delete(duongDanTepMoi);
            }

            throw;
        }
    }

    [HttpPost("gui-xet-duyet")]
    public async Task<IActionResult> GuiXetDuyet(
    [FromBody] GuiXetDuyetRequest request)
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!int.TryParse(claim, out var maTaiKhoan) || maTaiKhoan <= 0)
            return Unauthorized();

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        var nhaHangs = await _context.Nhahangs
            .FromSqlInterpolated(
                $"SELECT * FROM nhahang WHERE MaTaiKhoan = {maTaiKhoan} FOR UPDATE")
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
            maTaiKhoan,
            request);

        if (idem.Result != null)
            return idem.Result;

        var hopDong = await _context.Hopdongnhahangs
            .Where(x => x.MaNhaHang == nhaHang.MaNhaHang)
            .OrderByDescending(x => x.MaHopDong)
            .FirstOrDefaultAsync();

        if (hopDong == null)
            return BadRequest(new
            {
                message = "Bạn cần ký hợp đồng trước khi gửi xét duyệt."
            });

        if (hopDong.MaHopDong != request.MaHopDong)
        {
            return Conflict(new
            {
                message = "Hợp đồng đã thay đổi. Vui lòng tải lại trang."
            });
        }

        // Gửi lại không tạo thêm yêu cầu hoặc đổi thời gian gửi.
        if (nhaHang.TrangThaiDuyet == "ChoDuyet" &&
            hopDong.TrangThai == "ChoDuyet")
        {
            var existingResult = await IdempotencyStore.SaveSuccessAsync(
                _context,
                idem,
                new
                {
                    message = "Hồ sơ đã được gửi và đang chờ Admin xét duyệt.",
                    nhaHang.MaNhaHang,
                    hopDong.MaHopDong,
                    hopDong.ThoiGianGuiDuyet
                });

            await transaction.CommitAsync();
            return existingResult;
        }

        if (nhaHang.TrangThaiDuyet != "ChuaHoanTat" &&
            nhaHang.TrangThaiDuyet != "TuChoi")
        {
            return Conflict(new
            {
                message = "Nhà hàng không ở trạng thái được gửi xét duyệt."
            });
        }

        if (hopDong.TrangThai != "DaKy" ||
            hopDong.ThoiGianKy == null ||
            hopDong.ThoiGianDongYDieuKhoan == null)
        {
            return BadRequest(new
            {
                message = "Hợp đồng chưa được xác nhận ký đầy đủ."
            });
        }

        if (DateOnly.FromDateTime(DateTime.Now) > hopDong.NgayKetThuc)
            return BadRequest(new
            {
                message = "Hợp đồng đã quá thời hạn. Không thể gửi xét duyệt."
            });

        if (string.IsNullOrWhiteSpace(hopDong.NguoiDaiDien) ||
            string.IsNullOrWhiteSpace(hopDong.SoGiayToNguoiDaiDien) ||
            string.IsNullOrWhiteSpace(hopDong.TenPhapLy) ||
            string.IsNullOrWhiteSpace(hopDong.MaSoThue) ||
            string.IsNullOrWhiteSpace(hopDong.DiaChiPhapLy) ||
            string.IsNullOrWhiteSpace(hopDong.SoGiayPhepKinhDoanh) ||
            string.IsNullOrWhiteSpace(hopDong.NoiDungHopDong))
        {
            return BadRequest(new
            {
                message = "Bản hợp đồng thiếu thông tin pháp lý bắt buộc."
            });
        }

        if (!TepTonTai(nhaHang.MaNhaHang, hopDong.FileGiayPhepKinhDoanh) ||
            !TepTonTai(nhaHang.MaNhaHang, hopDong.FileGiayToNguoiDaiDien))
        {
            return BadRequest(new
            {
                message = "Không tìm thấy đầy đủ giấy tờ của hợp đồng."
            });
        }

        var thamChieu = hopDong.FileHopDong;
        var tenTep = Path.GetFileName(thamChieu);

        if (string.IsNullOrWhiteSpace(thamChieu) ||
            string.IsNullOrWhiteSpace(tenTep) ||
            thamChieu != $"{nhaHang.MaNhaHang}/{tenTep}")
        {
            return BadRequest(new
            {
                message = "Tham chiếu tệp hợp đồng không hợp lệ."
            });
        }

        var duongDan = Path.Combine(
            _environment.ContentRootPath,
            "App_Data",
            "HopDong",
            nhaHang.MaNhaHang.ToString(),
            tenTep
        );

        if (!System.IO.File.Exists(duongDan))
            return BadRequest(new
            {
                message = "Không tìm thấy tệp hợp đồng đã ký."
            });

        nhaHang.TrangThaiDuyet = "ChoDuyet";
        hopDong.TrangThai = "ChoDuyet";
        hopDong.ThoiGianGuiDuyet = DateTime.Now;

        await _context.SaveChangesAsync();

        var result = await IdempotencyStore.SaveSuccessAsync(
            _context,
            idem,
            new
            {
                message = "Đã gửi hồ sơ. Vui lòng chờ Admin xét duyệt.",
                nhaHang.MaNhaHang,
                hopDong.MaHopDong,
                hopDong.ThoiGianGuiDuyet
            });

        await transaction.CommitAsync();

        await Task.WhenAll(
            _realtime.GuiDuLieuThayDoiAsync(
                maTaiKhoan,
                new[] { "hopDong", "nhaHang" },
                new { hopDong.MaHopDong, hanhDong = "GuiXetDuyet" }),
            _realtime.GuiDuLieuThayDoiTheoVaiTroAsync(
                "Admin",
                new[] { "hopDong", "nhaHang", "tongQuan" },
                new { hopDong.MaHopDong, nhaHang.MaNhaHang, hanhDong = "GuiXetDuyet" }));

        return result;
    }

    [HttpGet("cua-toi")]
    public async Task<IActionResult> LayHopDongCuaToi()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!int.TryParse(claim, out var maTaiKhoan) || maTaiKhoan <= 0)
            return Unauthorized();

        var maNhaHang = await _context.Nhahangs
            .AsNoTracking()
            .Where(x => x.MaTaiKhoan == maTaiKhoan)
            .Select(x => (int?)x.MaNhaHang)
            .FirstOrDefaultAsync();

        if (maNhaHang == null)
            return NotFound(new
            {
                message = "Không tìm thấy nhà hàng."
            });

        var hopDong = await _context.Hopdongnhahangs
            .AsNoTracking()
            .Where(x => x.MaNhaHang == maNhaHang.Value)
            .OrderByDescending(x => x.MaHopDong)
            .Select(x => new
            {
                x.MaHopDong,
                x.MaNhaHang,
                x.SoHopDong,
                x.TrangThai,
                x.ThoiGianKy,
                x.ThoiGianGuiDuyet,
                x.ThoiGianDuyet,
                x.LyDoTuChoi,
                x.LyDoChamDut,
                x.MaTaiKhoanChamDut,
                x.ThoiGianChamDut,
                x.PhienBanDieuKhoan,
                x.TyLePhiNenTang,
                x.NgayBatDau,
                x.NgayKetThuc,
                x.NoiDungHopDong,
                chinhSachDoiSoat =
                    "Chính sách đã ký được lưu tại mục 5 trong nội dung hợp đồng."
            })
            .FirstOrDefaultAsync();

        return Ok(new { hopDong });
    }

    // Hợp đồng - bắt đầu hoàn thiện hồ sơ sau khi hết hạn
    [HttpPost("bat-dau-ky-moi")]
    public async Task<IActionResult> BatDauKyMoi()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!int.TryParse(claim, out var maTaiKhoan) || maTaiKhoan <= 0)
            return Unauthorized();

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        var nhaHangs = await _context.Nhahangs
            .FromSqlInterpolated(
                $"SELECT * FROM nhahang WHERE MaTaiKhoan = {maTaiKhoan} FOR UPDATE")
            .ToListAsync();

        var nhaHang = nhaHangs.SingleOrDefault();

        if (nhaHang == null)
            return NotFound(new
            {
                message = "Không tìm thấy nhà hàng."
            });

        var hopDongCu = await _context.Hopdongnhahangs
            .Where(x => x.MaNhaHang == nhaHang.MaNhaHang)
            .OrderByDescending(x => x.MaHopDong)
            .FirstOrDefaultAsync();

        if (hopDongCu == null || hopDongCu.TrangThai != "HetHan")
            return Conflict(new
            {
                message = "Chỉ có thể bắt đầu ký mới khi hợp đồng gần nhất đã hết hạn."
            });

        var coHopDongDangXuLy = await _context.Hopdongnhahangs
            .AnyAsync(x =>
                x.MaNhaHang == nhaHang.MaNhaHang &&
                (x.TrangThai == "DaKy" ||
                 x.TrangThai == "ChoDuyet" ||
                 x.TrangThai == "HieuLuc"));

        if (coHopDongDangXuLy)
            return Conflict(new
            {
                message = "Nhà hàng đang có hợp đồng đã ký hoặc đang được xử lý."
            });

        if (nhaHang.TrangThaiDuyet != "DaDuyet" &&
            nhaHang.TrangThaiDuyet != "ChuaHoanTat")
            return Conflict(new
            {
                message = "Nhà hàng không ở trạng thái được bắt đầu ký mới."
            });

        nhaHang.TrangThaiDuyet = "ChuaHoanTat";

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        await Task.WhenAll(
            _realtime.GuiDuLieuThayDoiAsync(
                maTaiKhoan,
                new[] { "hopDong", "nhaHang" },
                new { nhaHang.MaNhaHang, hanhDong = "BatDauKyMoi" }),
            _realtime.GuiDuLieuThayDoiTheoVaiTroAsync(
                "Admin",
                new[] { "hopDong", "nhaHang", "tongQuan" },
                new { nhaHang.MaNhaHang, hanhDong = "BatDauKyMoi" }));

        return Ok(new
        {
            message = "Bạn có thể cập nhật hồ sơ và ký hợp đồng mới.",
            trangThaiDuyet = nhaHang.TrangThaiDuyet
        });
    }


}
public class HopDongXemTruocResponse
{
    public int MaNhaHang { get; set; }
    public string PhienBanDieuKhoan { get; set; } = "";
    public decimal TyLePhiNenTang { get; set; }
    public DateOnly NgayBatDau { get; set; }
    public DateOnly NgayKetThuc { get; set; }
    public string ChinhSachDoiSoat { get; set; } = "";
    public string NoiDungHopDong { get; set; } = "";
    public string MaXacNhanNoiDung { get; set; } = "";
}

public class KyHopDongRequest
{
    public bool DongYDieuKhoan { get; set; }
    public bool XacNhanKy { get; set; }
    public string MaXacNhanNoiDung { get; set; } = "";
}
