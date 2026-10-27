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
    [ApiController]
    [Route("api/admin")]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly DatMonAnOnlineContext _context;
        private readonly IWebHostEnvironment _environment;
        private readonly IRealtimeNotificationService _realtime;

        public AdminController(
            DatMonAnOnlineContext context,
            IWebHostEnvironment environment,
            IRealtimeNotificationService realtime)
        {
            _context = context;
            _environment = environment;
            _realtime = realtime;
        }

        [HttpPost("khuyen-mai")]
        public async Task<IActionResult> TaoKhuyenMaiHeThong([FromBody] TaoKhuyenMaiAdminRequest req)
        {
            PromotionWriteHelper.Normalize(req);
            var khuyenMai = new Khuyenmai
            {
                MaCode = req.MaCode,
                MoTa = req.MoTa,
                LoaiGiam = req.LoaiGiam,
                GiaTriGiam = req.GiaTriGiam,
                GiamToiDa = req.GiamToiDa,
                DonHangToiThieu = req.DonHangToiThieu,
                SoLuong = req.SoLuong,
                SoLuotToiDaMoiKhach = req.SoLuotToiDaMoiKhach,
                NgayBatDau = req.NgayBatDau,
                NgayKetThuc = req.NgayKetThuc,
                MaNhaHang = null, // Khuyến mãi toàn hệ thống
                TrangThai = true,
                SoLuongDaDung = 0
            };

            _context.Khuyenmais.Add(khuyenMai);
            if (!await PromotionWriteHelper.SaveNewAsync(_context))
            {
                return Conflict(new
                {
                    message = "Mã khuyến mãi đã tồn tại."
                });
            }
            return Ok(new { message = "Tạo mã khuyến mãi hệ thống thành công" });
        }

        [HttpGet("khuyen-mai")]
        public async Task<IActionResult> LayKhuyenMaiHeThong(
            [FromQuery] PaginationQuery pagination,
            [FromQuery] string? search = null,
            [FromQuery] string? state = null)
        {
            var now = DateTime.Now;
            var query = _context.Khuyenmais
                .AsNoTracking()
                .Where(x => x.MaNhaHang == null);

            var counts = new
            {
                all = await query.CountAsync(),
                active = await query.CountAsync(x => x.TrangThai == true && x.NgayBatDau <= now && x.NgayKetThuc >= now),
                upcoming = await query.CountAsync(x => x.TrangThai == true && x.NgayBatDau > now),
                ended = await query.CountAsync(x => x.TrangThai != true || x.NgayKetThuc < now),
                inactive = await query.CountAsync(x => x.TrangThai != true),
                expired = await query.CountAsync(x => x.TrangThai == true && x.NgayKetThuc < now)
            };

            if (!string.IsNullOrWhiteSpace(search))
            {
                var keyword = search.Trim();
                query = query.Where(x =>
                    x.MaCode.Contains(keyword) ||
                    (x.MoTa != null && x.MoTa.Contains(keyword)));
            }

            query = state?.Trim().ToLowerInvariant() switch
            {
                "active" => query.Where(x => x.TrangThai == true && x.NgayBatDau <= now && x.NgayKetThuc >= now),
                "upcoming" => query.Where(x => x.TrangThai == true && x.NgayBatDau > now),
                "ended" => query.Where(x => x.TrangThai != true || x.NgayKetThuc < now),
                "inactive" => query.Where(x => x.TrangThai != true),
                "expired" => query.Where(x => x.TrangThai == true && x.NgayKetThuc < now),
                _ => query
            };

            var list = await query
                .OrderByDescending(x => x.MaKhuyenMai)
                .Select(x => new
                {
                    x.MaKhuyenMai,
                    x.MaCode,
                    x.MoTa,
                    x.LoaiGiam,
                    x.GiaTriGiam,
                    x.GiamToiDa,
                    x.DonHangToiThieu,
                    x.SoLuong,
                    x.SoLuongDaDung,
                    x.SoLuotToiDaMoiKhach,
                    x.NgayBatDau,
                    x.NgayKetThuc,
                    x.TrangThai
                })
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
                counts
            });
        }

        [HttpGet("nha-hang/cho-duyet")]
        public async Task<IActionResult> DanhSachNhaHangChoDuyet(
            [FromQuery] PaginationQuery pagination,
            [FromQuery] string? search = null)
        {
            var query = _context.Nhahangs
                .AsNoTracking()
                .Where(x => x.TrangThaiDuyet == "ChoDuyet");

            if (!string.IsNullOrWhiteSpace(search))
            {
                var keyword = search.Trim();
                var hasRestaurantId = int.TryParse(keyword, out var restaurantId);
                query = query.Where(x =>
                    x.TenNhaHang.Contains(keyword) ||
                    x.DiaChiQuan.Contains(keyword) ||
                    (hasRestaurantId && x.MaNhaHang == restaurantId));
            }

            var list = await query
                .OrderByDescending(x => x.MaNhaHang)
                .ToPagedResultAsync(pagination);
            return Ok(list);
        }

        [HttpPut("nha-hang/{id}/duyet")]
        public Task<IActionResult> DuyetNhaHang(
            int id,
            [FromBody] ThamDinhHoSoRequest request)
        {
            return XuLyXetDuyet(id, true, request, null);
        }

        public class ThamDinhHoSoRequest
        {
            [Required, MaxLength(20)]
            public string KetQuaGiayPhep { get; set; } = "";

            [Required, MaxLength(20)]
            public string KetQuaGiayToDaiDien { get; set; } = "";

            [Required, MaxLength(20)]
            public string KetQuaHopDong { get; set; } = "";

            [MaxLength(1000)]
            public string? GhiChu { get; set; }

            [Range(1, int.MaxValue)]
            public int MaHopDong { get; set; }
        }

        public class TuChoiHoSoRequest : ThamDinhHoSoRequest
        {
            [Required, MaxLength(500)]
            public string LyDo { get; set; } = "";
        }

        [HttpPut("nha-hang/{id}/tu-choi")]
        public Task<IActionResult> TuChoiNhaHang(
            int id,
            [FromBody] TuChoiHoSoRequest request)
        {
            return XuLyXetDuyet(id, false, request, request.LyDo);
        }

        private bool TepHoSoTonTai(
            int maNhaHang,
            string thuMuc,
            string? thamChieu)
        {
            if (string.IsNullOrWhiteSpace(thamChieu))
                return false;

            var tenTep = Path.GetFileName(thamChieu);

            if (thamChieu != $"{maNhaHang}/{tenTep}")
                return false;

            return System.IO.File.Exists(Path.Combine(
                _environment.ContentRootPath,
                "App_Data",
                thuMuc,
                maNhaHang.ToString(),
                tenTep
            ));
        }

        private async Task<IActionResult> XuLyXetDuyet(
            int id,
            bool duyet,
            ThamDinhHoSoRequest thamDinh,
            string? lyDo)
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!int.TryParse(claim, out var maAdmin) || maAdmin <= 0)
                return Unauthorized();

            lyDo = lyDo?.Trim();
            var ketQuaGiayPhep = thamDinh.KetQuaGiayPhep.Trim();
            var ketQuaGiayTo = thamDinh.KetQuaGiayToDaiDien.Trim();
            var ketQuaHopDong = thamDinh.KetQuaHopDong.Trim();
            var ghiChuThamDinh = thamDinh.GhiChu?.Trim();

            var ketQuaTaiLieu = new[]
            {
                ketQuaGiayPhep,
                ketQuaGiayTo,
                ketQuaHopDong
            };

            if (ketQuaTaiLieu.Any(x => x != "HopLe" && x != "CanBoSung"))
            {
                return BadRequest(new
                {
                    message = "Bạn phải kiểm tra và chọn kết quả cho từng tài liệu."
                });
            }

            if (duyet && ketQuaTaiLieu.Any(x => x != "HopLe"))
            {
                return BadRequest(new
                {
                    message = "Chỉ có thể duyệt khi tất cả tài liệu đều hợp lệ."
                });
            }

            if (!duyet && string.IsNullOrWhiteSpace(lyDo))
                return BadRequest(new
                {
                    message = "Vui lòng nhập lý do từ chối."
                });

            await using var transaction =
                await _context.Database.BeginTransactionAsync();

            var nhaHangs = await _context.Nhahangs
                .FromSqlInterpolated(
                    $"SELECT * FROM nhahang WHERE MaNhaHang = {id} FOR UPDATE")
                .ToListAsync();

            var nhaHang = nhaHangs.SingleOrDefault();

            if (nhaHang == null)
                return NotFound(new
                {
                    message = "Không tìm thấy nhà hàng."
                });

            // Admin - trả kết quả cũ trước khi kiểm tra trạng thái mới
            var idem = await IdempotencyStore.CheckAsync(
                _context,
                Request,
                maAdmin,
                new
                {
                    maHopDong = thamDinh.MaHopDong,
                    duyet,
                    ketQuaGiayPhep,
                    ketQuaGiayTo,
                    ketQuaHopDong,
                    ghiChuThamDinh,
                    lyDo
                });

            if (idem.Result != null)
                return idem.Result;

            var hopDong = await _context.Hopdongnhahangs
                .Where(x => x.MaNhaHang == id)
                .OrderByDescending(x => x.MaHopDong)
                .FirstOrDefaultAsync();

            if (hopDong != null &&
                hopDong.MaHopDong != thamDinh.MaHopDong)
            {
                return Conflict(new
                {
                    message = "Hợp đồng đã thay đổi. Vui lòng tải lại hồ sơ."
                });
            }

            if (nhaHang.TrangThaiDuyet != "ChoDuyet" ||
                hopDong == null ||
                hopDong.TrangThai != "ChoDuyet")
            {
                return Conflict(new
                {
                    message = "Nhà hàng và hợp đồng phải đang chờ xét duyệt."
                });
            }

            if (duyet)
            {
                if (hopDong.ThoiGianKy == null ||
                    hopDong.ThoiGianDongYDieuKhoan == null ||
                    hopDong.ThoiGianGuiDuyet == null ||
                    string.IsNullOrWhiteSpace(hopDong.NoiDungHopDong))
                {
                    return BadRequest(new
                    {
                        message = "Hợp đồng chưa có đầy đủ thông tin xác nhận."
                    });
                }

                var homNay = DateOnly.FromDateTime(DateTime.Now);

                if (homNay < hopDong.NgayBatDau ||
                    homNay > hopDong.NgayKetThuc)
                {
                    return BadRequest(new
                    {
                        message = "Hợp đồng chưa đến ngày bắt đầu hoặc đã hết hạn."
                    });
                }

                if (!TepHoSoTonTai(id, "HopDong", hopDong.FileHopDong) ||
                    !TepHoSoTonTai(id, "HoSoPhapLy", hopDong.FileGiayPhepKinhDoanh) ||
                    !TepHoSoTonTai(id, "HoSoPhapLy", hopDong.FileGiayToNguoiDaiDien))
                {
                    return BadRequest(new
                    {
                        message = "Không tìm thấy đầy đủ tệp hợp đồng và giấy tờ."
                    });
                }
            }

            var thoiGian = DateTime.Now;

            nhaHang.TrangThaiDuyet = duyet ? "DaDuyet" : "TuChoi";
            hopDong.TrangThai = duyet ? "HieuLuc" : "TuChoi";
            hopDong.MaTaiKhoanDuyet = maAdmin;
            hopDong.ThoiGianDuyet = thoiGian;
            hopDong.LyDoTuChoi = duyet ? null : lyDo;

            _context.Thamdinhhosonhahangs.Add(new Thamdinhhosonhahang
            {
                MaHopDong = hopDong.MaHopDong,
                MaTaiKhoanAdmin = maAdmin,
                KetQuaGiayPhep = ketQuaGiayPhep,
                KetQuaGiayToDaiDien = ketQuaGiayTo,
                KetQuaHopDong = ketQuaHopDong,
                KetQua = duyet ? "DaDuyet" : "TuChoi",
                GhiChu = string.IsNullOrWhiteSpace(ghiChuThamDinh)
                    ? lyDo
                    : ghiChuThamDinh,
                ThoiGian = thoiGian
            });

            var noiDung = duyet
                ? $"Hồ sơ nhà hàng {nhaHang.TenNhaHang} và hợp đồng {hopDong.SoHopDong} đã được duyệt."
                : $"Hồ sơ nhà hàng bị từ chối. Lý do: {lyDo}";

            var thongBao = new Thongbao
            {
                MaTaiKhoan = nhaHang.MaTaiKhoan,
                TieuDe = duyet ? "Hồ sơ đã được duyệt" : "Hồ sơ bị từ chối",
                NoiDung = noiDung.Length > 500 ? noiDung[..500] : noiDung,
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
                    message = duyet
                        ? "Đã duyệt nhà hàng và hợp đồng."
                        : "Đã từ chối hồ sơ.",
                    nhaHang.MaNhaHang,
                    hopDong.MaHopDong,
                    trangThaiHopDong = hopDong.TrangThai
                });

            await transaction.CommitAsync();

            await Task.WhenAll(
                _realtime.GuiThongBaoAsync(nhaHang.MaTaiKhoan, thongBao),
                _realtime.GuiDuLieuThayDoiAsync(
                    nhaHang.MaTaiKhoan,
                    new[] { "hopDong", "hoSoPhapLy", "nhaHang" },
                    new { nhaHang.MaNhaHang, hopDong.MaHopDong, hanhDong = duyet ? "Duyet" : "TuChoi" }),
                _realtime.GuiDuLieuThayDoiTheoVaiTroAsync(
                    "Admin",
                    new[] { "hopDong", "nhaHang", "tongQuan" },
                    new { nhaHang.MaNhaHang, hopDong.MaHopDong }));

            return result;
        }

        [HttpGet("thong-ke/tong-quan")]
        public async Task<IActionResult> ThongKeTongQuan()
        {
            var tongQuan = await _context.Nhahangs.CountAsync(x => x.TrangThaiDuyet == "DaDuyet");
            var tongDon = await _context.Donhangs.CountAsync();
            var tongDoanhThu = await _context.Donhangs
                .Where(x => x.MaTrangThai == 5) // 5 = HoanThanh
                .SumAsync(x => x.ThanhTien);

            return Ok(new { tongNhaHang = tongQuan, tongDonHang = tongDon, tongDoanhThu });
        }
        [HttpGet("thong-ke/analytics")]
        public async Task<IActionResult> ThongKeAnalytics([FromQuery] int days = 7)
        {
            if (days != 1 && days != 7 && days != 30)
            {
                days = 7;
            }

            var now = VietnamBusinessTime.Now();
            var today = now.Date;
            var startDate = days == 1 ? today : today.AddDays(-(days - 1));
            var endExclusive = today.AddDays(1);

            // Doanh thu được ghi nhận theo thời điểm hoàn thành thực tế, không phải
            // thời điểm khách đặt đơn. Aggregate tại database để không tải toàn bộ
            // đơn trong kỳ vào bộ nhớ.
            var completedByDay = await _context.Donhangs
                .AsNoTracking()
                .Where(x =>
                    x.MaTrangThaiNavigation.TenTrangThai == "HoanThanh" &&
                    x.ThoiGianGiaoThucTe.HasValue &&
                    x.ThoiGianGiaoThucTe.Value >= startDate &&
                    x.ThoiGianGiaoThucTe.Value < endExclusive)
                .GroupBy(x => x.ThoiGianGiaoThucTe!.Value.Date)
                .Select(group => new
                {
                    Ngay = group.Key,
                    TongGiaTriDon = group.Sum(x => x.ThanhTien),
                    DoanhThuNenTang = group.Sum(x => x.PhiNenTang),
                    SoDonHoanThanh = group.Count()
                })
                .ToListAsync();

            var completedByDate = completedByDay.ToDictionary(x => x.Ngay);

            var dailyData = new List<object>();
            int totalDays = days == 1 ? 1 : days;
            for (int i = 0; i < totalDays; i++)
            {
                var curDate = startDate.AddDays(i);
                completedByDate.TryGetValue(curDate, out var current);
                dailyData.Add(new
                {
                    ngay = curDate.ToString("dd/MM/yyyy"),
                    ngayNgan = curDate.ToString("dd/MM"),
                    isoDate = curDate.ToString("yyyy-MM-dd"),
                    tongGiaTriDon = current?.TongGiaTriDon ?? 0,
                    doanhThuNenTang = current?.DoanhThuNenTang ?? 0,
                    soDonHoanThanh = current?.SoDonHoanThanh ?? 0
                });
            }

            // 2. Phân bố trạng thái đơn hàng trong kỳ
            var statuses = await _context.Trangthaidonhangs
                .AsNoTracking()
                .OrderBy(s => s.ThuTu)
                .Select(s => new { s.MaTrangThai, s.TenTrangThai })
                .ToListAsync();

            var orderStatusCounts = await _context.Donhangs
                .AsNoTracking()
                .Where(x => x.ThoiGianDat >= startDate && x.ThoiGianDat < endExclusive)
                .GroupBy(x => x.MaTrangThai)
                .Select(g => new { MaTrangThai = g.Key, Count = g.Count() })
                .ToDictionaryAsync(g => g.MaTrangThai, g => g.Count);

            int totalPeriodOrders = orderStatusCounts.Values.Sum();

            var phanBoTrangThai = statuses.Select(s =>
            {
                int count = orderStatusCounts.GetValueOrDefault(s.MaTrangThai, 0);
                double tyLe = totalPeriodOrders > 0 ? Math.Round((double)count * 100 / totalPeriodOrders, 1) : 0;
                return new
                {
                    s.MaTrangThai,
                    s.TenTrangThai,
                    soLuong = count,
                    tyLe
                };
            }).ToList();

            // 3. Công việc cần xử lý
            var nhaHangChoDuyet = await _context.Nhahangs.CountAsync(x => x.TrangThaiDuyet == "ChoDuyet");

            var hopDongSapHetHan = await _context.Hopdongnhahangs
                .AsNoTracking()
                .Where(x =>
                    x.TrangThai == "HieuLuc" &&
                    x.NgayBatDau <= DateOnly.FromDateTime(today) &&
                    x.NgayKetThuc >= DateOnly.FromDateTime(today) &&
                    x.NgayKetThuc <= DateOnly.FromDateTime(today).AddDays(30))
                .Where(x => !_context.Hopdongnhahangs.Any(newer =>
                    newer.MaNhaHang == x.MaNhaHang &&
                    newer.TrangThai == "HieuLuc" &&
                    newer.NgayBatDau <= DateOnly.FromDateTime(today) &&
                    newer.NgayKetThuc >= DateOnly.FromDateTime(today) &&
                    newer.MaHopDong > x.MaHopDong))
                .CountAsync();

            var doiSoatTranhChap = await _context.Doisoatnhahangs.CountAsync(x => x.TrangThai == "TranhChap");
            var doiSoatChoXacNhan = await _context.Doisoatnhahangs.CountAsync(x => x.TrangThai == "ChoXacNhan");

            var rangeLabel = days == 1
                ? $"Hôm nay ({today:dd/MM/yyyy})"
                : $"{startDate:dd/MM/yyyy} – {today:dd/MM/yyyy} ({days} ngày)";

            return Ok(new
            {
                days,
                rangeLabel,
                doanhThuTheoNgay = dailyData,
                phanBoTrangThai,
                congViecCanXuLy = new
                {
                    nhaHangChoDuyet,
                    hopDongSapHetHan,
                    doiSoatTranhChap,
                    doiSoatChoXacNhan
                },
                tongDoanhThuKyNay = completedByDay.Sum(x => x.TongGiaTriDon),
                tongDoanhThuNenTangKyNay = completedByDay.Sum(x => x.DoanhThuNenTang),
                tongDonKyNay = totalPeriodOrders
            });
        }


        [HttpGet("thong-ke/top-nha-hang")]
        public async Task<IActionResult> ThongKeTopNhaHang()
        {
            var top = await _context.Nhahangs
                .Where(x => x.TrangThaiDuyet == "DaDuyet")
                .OrderByDescending(x => x.DanhGiaTrungBinh)
                .Take(10)
                .ToListAsync();
            return Ok(top);
        }

        [HttpGet("don-hang")]
        public async Task<IActionResult> XemToanBoDonHang(
            [FromQuery] PaginationQuery pagination,
            [FromQuery] int? maNhaHang,
            [FromQuery] int? trangThai,
            [FromQuery] DateTime? ngay)
        {
            var query = _context.Donhangs.AsQueryable();

            if (maNhaHang.HasValue) query = query.Where(x => x.MaNhaHang == maNhaHang);
            if (trangThai.HasValue) query = query.Where(x => x.MaTrangThai == trangThai);
            if (ngay.HasValue) query = query.Where(x => x.ThoiGianDat.Date == ngay.Value.Date);

            var list = await query
                .AsNoTracking()
                .OrderByDescending(x => x.ThoiGianDat)
                .ToPagedResultAsync(pagination);
            return Ok(list);
        }
        public class TaoKhuyenMaiAdminRequest : PromotionCreateRequest
        {
        }
    }
}
