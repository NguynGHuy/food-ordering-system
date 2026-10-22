using DatMonAnOnline.API.Models;
using DatMonAnOnline.API.Options;
using DatMonAnOnline.API.Security;
using DatMonAnOnline.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Data;
using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace DatMonAnOnline.API.Controllers
{
    [Route("api/auth")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly DatMonAnOnlineContext _context;
        private readonly IWebHostEnvironment _environment;
        private readonly IPasswordResetEmailQueue _passwordResetEmailQueue;
        private readonly SharedAuthRateLimiter _sharedRateLimiter;
        private readonly JwtOptions _jwtOptions;
        private static readonly TimeSpan PasswordResetLifetime = TimeSpan.FromMinutes(10);
        private static readonly TimeSpan LoginLockLifetime = TimeSpan.FromMinutes(15);
        private const int MaxFailedLoginAttempts = 5;

        public AuthController(
            DatMonAnOnlineContext context,
            IWebHostEnvironment environment,
            IPasswordResetEmailQueue passwordResetEmailQueue,
            SharedAuthRateLimiter sharedRateLimiter,
            JwtOptions jwtOptions)
        {
            _context = context;
            _environment = environment;
            _passwordResetEmailQueue = passwordResetEmailQueue;
            _sharedRateLimiter = sharedRateLimiter;
            _jwtOptions = jwtOptions;
        }

        public class RegisterKhachHangDto
        {
            [Required, EmailAddress, MaxLength(100)] public string Email { get; set; } = string.Empty;
            [Required, MinLength(6), MaxLength(100)] public string MatKhau { get; set; } = string.Empty;
            [MaxLength(15)] public string? SoDienThoai { get; set; }
            [Required, MaxLength(100)] public string HoTen { get; set; } = string.Empty;
            public DateOnly? NgaySinh { get; set; }
            [MaxLength(10)] public string? GioiTinh { get; set; }
        }

        public class RegisterNhaHangDto
        {
            [Required, EmailAddress, MaxLength(100)] public string Email { get; set; } = string.Empty;
            [Required, MinLength(6), MaxLength(100)] public string MatKhau { get; set; } = string.Empty;
            [MaxLength(15)] public string? SoDienThoai { get; set; }
            [Required, MaxLength(150)] public string TenNhaHang { get; set; } = string.Empty;
            [MaxLength(500)] public string? MoTa { get; set; }
            [Required, MaxLength(255)] public string DiaChiQuan { get; set; } = string.Empty;
            [MaxLength(255)] public string? AnhBia { get; set; }
            public TimeOnly? GioMoCua { get; set; }
            public TimeOnly? GioDongCua { get; set; }
            public decimal PhiShipMacDinh { get; set; } = 15000;
        }

        public class LoginDto
        {
            [Required, EmailAddress] public string Email { get; set; } = string.Empty;
            [Required] public string MatKhau { get; set; } = string.Empty;
        }

        public class DoiMatKhauDto
        {
            [Required] public string MatKhauCu { get; set; } = string.Empty;
            [Required, MinLength(6), MaxLength(100)] public string MatKhauMoi { get; set; } = string.Empty;
        }

        public class QuenMatKhauDto
        {
            [Required, EmailAddress, MaxLength(100)] public string Email { get; set; } = string.Empty;
        }

        public class DatLaiMatKhauDto
        {
            [Required] public string MaYeuCau { get; set; } = string.Empty;
            [Required, RegularExpression("^[0-9]{6}$")] public string MaXacNhan { get; set; } = string.Empty;
            [Required, MinLength(6), MaxLength(100)] public string MatKhauMoi { get; set; } = string.Empty;
        }

        private sealed class PasswordResetReference
        {
            public string MaYeuCau { get; init; } = string.Empty;
            public string? MaXacNhanThuNghiem { get; init; }
            public DateTime HetHanUtc { get; init; }
        }

        [HttpPost("register")]
        [AllowAnonymous]
        [EnableRateLimiting(AuthRateLimitPolicies.RegisterNhaHang)]
        public async Task<IActionResult> RegisterKhachHang(RegisterKhachHangDto request)
        {
            var rateLimited = await EnforceSharedRateLimitAsync(
                AuthRateLimitPolicies.RegisterNhaHang,
                5,
                TimeSpan.FromMinutes(15));
            if (rateLimited != null) return rateLimited;

            var email = request.Email.Trim().ToLowerInvariant();
            var phone = Normalize(request.SoDienThoai);

            if (await _context.Taikhoans.AnyAsync(x => x.Email == email))
                return Conflict(new { message = "Email đã được sử dụng." });

            if (phone != null && await _context.Taikhoans.AnyAsync(x => x.SoDienThoai == phone))
                return Conflict(new { message = "Số điện thoại đã được sử dụng." });

            var role = await _context.Roles.FirstOrDefaultAsync(x => x.TenRole == "KhachHang");
            if (role == null)
                return StatusCode(500, new { message = "Chưa có Role KhachHang trong database." });

            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var taiKhoan = new Taikhoan
                {
                    Email = email,
                    MatKhau = HashPassword(request.MatKhau),
                    SoDienThoai = phone,
                    MaRole = role.MaRole,
                    TrangThai = true,
                    DaXacThucEmail = true,
                    AnhDaiDien = null
                };

                _context.Taikhoans.Add(taiKhoan);
                await _context.SaveChangesAsync();

                var khachHang = new Khachhang
                {
                    MaTaiKhoan = taiKhoan.MaTaiKhoan,
                    HoTen = request.HoTen.Trim(),
                    NgaySinh = request.NgaySinh,
                    GioiTinh = Normalize(request.GioiTinh)
                };

                _context.Khachhangs.Add(khachHang);
                _context.Vis.Add(new Vi
                {
                    MaTaiKhoan = taiKhoan.MaTaiKhoan,
                    SoDu = 0,
                    DonViTienTe = "VND",
                    TrangThai = "HoatDong",
                    NgayTao = DateTime.Now,
                    NgayCapNhat = DateTime.Now
                });
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Created("/api/auth/me", new
                {
                    message = "Đăng ký khách hàng thành công.",
                    maTaiKhoan = taiKhoan.MaTaiKhoan
                });
            }
            catch (DbUpdateException)
            {
                await transaction.RollbackAsync();
                return Conflict(new { message = "Email hoặc số điện thoại đã tồn tại." });
            }
        }

        [HttpPost("register-nha-hang")]
        [AllowAnonymous]
        [EnableRateLimiting(AuthRateLimitPolicies.RegisterNhaHang)]
        public async Task<IActionResult> RegisterNhaHang(RegisterNhaHangDto request)
        {
            var rateLimited = await EnforceSharedRateLimitAsync(
                AuthRateLimitPolicies.RegisterNhaHang,
                5,
                TimeSpan.FromMinutes(15));
            if (rateLimited != null) return rateLimited;

            var email = request.Email.Trim().ToLowerInvariant();
            var phone = Normalize(request.SoDienThoai);

            if (request.PhiShipMacDinh < 0)
                return BadRequest(new { message = "PhiShipMacDinh không được âm." });

            if (request.GioMoCua.HasValue && request.GioDongCua.HasValue && request.GioMoCua == request.GioDongCua)
                return BadRequest(new { message = "Giờ mở cửa và giờ đóng cửa không được giống nhau." });

            if (await _context.Taikhoans.AnyAsync(x => x.Email == email))
                return Conflict(new { message = "Email đã được sử dụng." });

            if (phone != null && await _context.Taikhoans.AnyAsync(x => x.SoDienThoai == phone))
                return Conflict(new { message = "Số điện thoại đã được sử dụng." });

            var role = await _context.Roles.FirstOrDefaultAsync(x => x.TenRole == "Quan");
            if (role == null)
                return StatusCode(500, new { message = "Chưa có Role Quan trong database." });

            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var taiKhoan = new Taikhoan
                {
                    Email = email,
                    MatKhau = HashPassword(request.MatKhau),
                    SoDienThoai = phone,
                    MaRole = role.MaRole,
                    TrangThai = true,
                    DaXacThucEmail = true
                };

                _context.Taikhoans.Add(taiKhoan);
                await _context.SaveChangesAsync();

                var nhaHang = new Nhahang
                {
                    MaTaiKhoan = taiKhoan.MaTaiKhoan,
                    TenNhaHang = request.TenNhaHang.Trim(),
                    MoTa = Normalize(request.MoTa),
                    DiaChiQuan = request.DiaChiQuan.Trim(),
                    AnhBia = Normalize(request.AnhBia),
                    GioMoCua = request.GioMoCua,
                    GioDongCua = request.GioDongCua,
                    TrangThaiDuyet = "ChuaHoanTat",
                    TrangThaiHoatDong = "MoCua",
                    CheDoHoatDong = "TuDong",
                    DanhGiaTrungBinh = 0,
                    PhiShipMacDinh = request.PhiShipMacDinh
                };

                _context.Nhahangs.Add(nhaHang);
                _context.Vis.Add(new Vi
                {
                    MaTaiKhoan = taiKhoan.MaTaiKhoan,
                    SoDu = 0,
                    DonViTienTe = "VND",
                    TrangThai = "HoatDong",
                    NgayTao = DateTime.Now,
                    NgayCapNhat = DateTime.Now
                });
                await _context.SaveChangesAsync();

                _context.Hosophaplynhahangs.Add(new Hosophaplynhahang
                {
                    MaNhaHang = nhaHang.MaNhaHang,
                    NgayTao = DateTime.Now
                });

                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                return Created("/api/auth/me", new
                {
                    message = "Đăng ký quán thành công. Vui lòng đăng nhập để hoàn thiện hồ sơ và ký hợp đồng.",
                    trangThaiDuyet = nhaHang.TrangThaiDuyet,
                    maTaiKhoan = taiKhoan.MaTaiKhoan,
                    maNhaHang = nhaHang.MaNhaHang
                });
            }
            catch (DbUpdateException)
            {
                await transaction.RollbackAsync();
                return Conflict(new { message = "Email hoặc số điện thoại đã tồn tại." });
            }
        }

        [HttpPost("login")]
        [AllowAnonymous]
        [EnableRateLimiting(AuthRateLimitPolicies.Login)]
        public async Task<IActionResult> Login(LoginDto request)
        {
            var rateLimited = await EnforceSharedRateLimitAsync(
                AuthRateLimitPolicies.Login,
                10,
                TimeSpan.FromMinutes(1));
            if (rateLimited != null) return rateLimited;

            var email = request.Email.Trim().ToLowerInvariant();

            var (isLocked, retryAfter) = await TryGetLoginLockAsync(email);
            if (isLocked)
                return LoginLocked(retryAfter);

            var taiKhoan = await _context.Taikhoans
                .Include(x => x.MaRoleNavigation)
                .FirstOrDefaultAsync(x => x.Email == email);

            if (taiKhoan == null || !VerifyPassword(request.MatKhau, taiKhoan.MatKhau))
            {
                (isLocked, retryAfter) = await RegisterFailedLoginAsync(email);
                if (isLocked)
                    return LoginLocked(retryAfter);

                return Unauthorized(new { message = "Email hoặc mật khẩu không đúng." });
            }

            if (taiKhoan.TrangThai != true)
                return Unauthorized(new { message = "Tài khoản đã bị khóa." });

            await ClearFailedLoginsAsync(email);

            var role = taiKhoan.MaRoleNavigation?.TenRole;
            if (string.IsNullOrWhiteSpace(role))
                return StatusCode(500, new { message = "Tài khoản chưa được gán Role hợp lệ." });

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, taiKhoan.MaTaiKhoan.ToString()),
                new Claim(ClaimTypes.Name, taiKhoan.Email),
                new Claim(ClaimTypes.Role, role),
                new Claim(PasswordTokenVersion.ClaimType, PasswordTokenVersion.Create(taiKhoan.MatKhau))
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.Secret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var token = new JwtSecurityToken(
                issuer: _jwtOptions.Issuer,
                audience: _jwtOptions.Audience,
                claims: claims,
                expires: DateTime.UtcNow.AddDays(1),
                signingCredentials: creds);

            return Ok(new
            {
                token = new JwtSecurityTokenHandler().WriteToken(token),
                expiresAt = token.ValidTo,
                maTaiKhoan = taiKhoan.MaTaiKhoan,
                role
            });
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetMe()
        {
            var maTaiKhoan = GetMaTaiKhoan();
            if (maTaiKhoan == null)
                return Unauthorized(new { message = "Token không chứa MaTaiKhoan hợp lệ." });

            var taiKhoan = await _context.Taikhoans
                .AsNoTracking()
                .Include(x => x.MaRoleNavigation)
                .Include(x => x.Khachhang)
                .Include(x => x.Nhahang)
                .Include(x => x.Vi)
                .FirstOrDefaultAsync(x => x.MaTaiKhoan == maTaiKhoan.Value);

            if (taiKhoan == null)
                return NotFound(new { message = "Không tìm thấy tài khoản." });

            return Ok(new
            {
                maTaiKhoan = taiKhoan.MaTaiKhoan,
                email = taiKhoan.Email,
                soDienThoai = taiKhoan.SoDienThoai,
                anhDaiDien = taiKhoan.AnhDaiDien,
                trangThai = taiKhoan.TrangThai,
                daXacThucEmail = taiKhoan.DaXacThucEmail,
                ngayTao = taiKhoan.NgayTao,
                role = taiKhoan.MaRoleNavigation?.TenRole,
                khachHang = taiKhoan.Khachhang == null ? null : new
                {
                    maKhachHang = taiKhoan.Khachhang.MaKhachHang,
                    hoTen = taiKhoan.Khachhang.HoTen,
                    ngaySinh = taiKhoan.Khachhang.NgaySinh,
                    gioiTinh = taiKhoan.Khachhang.GioiTinh
                },
                vi = taiKhoan.Vi == null ? null : new
                {
                    maVi = taiKhoan.Vi.MaVi,
                    soDu = taiKhoan.Vi.SoDu,
                    donViTienTe = taiKhoan.Vi.DonViTienTe,
                    trangThai = taiKhoan.Vi.TrangThai
                },
                nhaHang = taiKhoan.Nhahang == null ? null : new
                {
                    maNhaHang = taiKhoan.Nhahang.MaNhaHang,
                    tenNhaHang = taiKhoan.Nhahang.TenNhaHang,
                    trangThaiDuyet =
                        taiKhoan.Nhahang.TrangThaiDuyet,

                    trangThaiHoatDong =
                        taiKhoan.Nhahang.TrangThaiHoatDong,

                    cheDoHoatDong =
                        taiKhoan.Nhahang.CheDoHoatDong
                }
            });
        }

        [HttpPut("doi-mat-khau")]
        [Authorize]
        public async Task<IActionResult> DoiMatKhau(DoiMatKhauDto request)
        {
            var maTaiKhoan = GetMaTaiKhoan();
            if (maTaiKhoan == null)
                return Unauthorized(new { message = "Token không hợp lệ." });

            var taiKhoan = await _context.Taikhoans.FirstOrDefaultAsync(x => x.MaTaiKhoan == maTaiKhoan.Value);
            if (taiKhoan == null)
                return NotFound(new { message = "Không tìm thấy tài khoản." });

            if (!VerifyPassword(request.MatKhauCu, taiKhoan.MatKhau))
                return BadRequest(new { message = "Mật khẩu cũ không đúng." });

            if (request.MatKhauCu == request.MatKhauMoi)
                return BadRequest(new { message = "Mật khẩu mới phải khác mật khẩu cũ." });

            taiKhoan.MatKhau = HashPassword(request.MatKhauMoi);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Đổi mật khẩu thành công. Tất cả phiên đăng nhập cũ đã được đăng xuất."
            });
        }

        [HttpPost("quen-mat-khau")]
        [AllowAnonymous]
        [EnableRateLimiting(AuthRateLimitPolicies.RequestPasswordReset)]
        public async Task<IActionResult> QuenMatKhau(QuenMatKhauDto request)
        {
            var rateLimited = await EnforceSharedRateLimitAsync(
                AuthRateLimitPolicies.RequestPasswordReset,
                3,
                TimeSpan.FromMinutes(15));
            if (rateLimited != null) return rateLimited;

            var email = request.Email.Trim().ToLowerInvariant();
            var emailHash = HashCacheKey(email);
            var now = DateTime.UtcNow;

            var taiKhoan = await _context.Taikhoans
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x => x.Email == email && x.TrangThai == true,
                    HttpContext.RequestAborted);

            // Luôn tạo dữ liệu ứng viên, kể cả email không tồn tại, để tránh lộ tài khoản.
            var maYeuCau = Guid.NewGuid().ToString("N");
            var maXacNhan = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
            var hetHanUtc = now.Add(PasswordResetLifetime);
            var maXacNhanHash = HashResetCode(maYeuCau, maXacNhan);
            var matKhauLucTaoYeuCau = taiKhoan?.MatKhau ?? string.Empty;
            int? maTaiKhoanDatLai = taiKhoan?.MaTaiKhoan;

            await using var transaction = await _context.Database.BeginTransactionAsync(
                IsolationLevel.ReadCommitted,
                HttpContext.RequestAborted);

            // INSERT IGNORE tạo đúng một dòng cho mỗi email. Hai API instance chạy đồng thời
            // sẽ cùng khóa dòng này, thay vì cùng thấy "chưa có" rồi tạo trùng.
            await _context.Database.ExecuteSqlInterpolatedAsync(
                $@"INSERT IGNORE INTO passwordresetrequest
                   (EmailHash, MaYeuCau, MaTaiKhoan, MaXacNhanHash,
                    MatKhauLucTaoYeuCau, SoLanThuSai, HetHanUtc, NgayTaoUtc)
                   VALUES
                   ({emailHash}, {maYeuCau}, {maTaiKhoanDatLai},
                    {maXacNhanHash}, {matKhauLucTaoYeuCau}, 0, {hetHanUtc}, {now})",
                HttpContext.RequestAborted);

            var existingRequest = await _context.Passwordresetrequests
                .FromSqlInterpolated(
                    $@"SELECT * FROM passwordresetrequest
                       WHERE EmailHash = {emailHash}
                       FOR UPDATE")
                .SingleOrDefaultAsync(HttpContext.RequestAborted);

            if (existingRequest == null)
                throw new InvalidOperationException("Không thể tạo yêu cầu đặt lại mật khẩu.");

            if (existingRequest.MaYeuCau != maYeuCau && existingRequest.HetHanUtc > now)
            {
                await transaction.CommitAsync(HttpContext.RequestAborted);
                return PasswordResetRequested(new PasswordResetReference
                {
                    MaYeuCau = existingRequest.MaYeuCau,
                    HetHanUtc = existingRequest.HetHanUtc
                });
            }

            if (existingRequest.MaYeuCau != maYeuCau)
            {
                existingRequest.MaYeuCau = maYeuCau;
                existingRequest.MaTaiKhoan = taiKhoan?.MaTaiKhoan;
                existingRequest.MaXacNhanHash = maXacNhanHash;
                existingRequest.MatKhauLucTaoYeuCau = matKhauLucTaoYeuCau;
                existingRequest.SoLanThuSai = 0;
                existingRequest.HetHanUtc = hetHanUtc;
                existingRequest.NgayTaoUtc = now;
            }

            await _context.SaveChangesAsync(HttpContext.RequestAborted);
            await transaction.CommitAsync(HttpContext.RequestAborted);

            var requestReference = new PasswordResetReference
            {
                MaYeuCau = maYeuCau,
                MaXacNhanThuNghiem = _environment.IsDevelopment() ? maXacNhan : null,
                HetHanUtc = hetHanUtc
            };

            if (taiKhoan != null && !_environment.IsDevelopment())
            {
                var queued = _passwordResetEmailQueue.TryQueue(new PasswordResetEmail(
                    taiKhoan.Email,
                    maXacNhan,
                    (int)PasswordResetLifetime.TotalMinutes));

                if (!queued)
                {
                    await _context.Passwordresetrequests
                        .Where(x => x.MaYeuCau == maYeuCau)
                        .ExecuteDeleteAsync(HttpContext.RequestAborted);
                    return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                    {
                        message = "Dịch vụ gửi email đang tạm thời bận. Vui lòng thử lại sau."
                    });
                }
            }

            return PasswordResetRequested(requestReference);
        }

        [HttpPost("dat-lai-mat-khau")]
        [AllowAnonymous]
        [EnableRateLimiting(AuthRateLimitPolicies.ConfirmPasswordReset)]
        public async Task<IActionResult> DatLaiMatKhau(DatLaiMatKhauDto request)
        {
            var rateLimited = await EnforceSharedRateLimitAsync(
                AuthRateLimitPolicies.ConfirmPasswordReset,
                10,
                TimeSpan.FromMinutes(10));
            if (rateLimited != null) return rateLimited;

            await using var transaction = await _context.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                HttpContext.RequestAborted);

            var entry = await _context.Passwordresetrequests
                .FromSqlInterpolated(
                    $@"SELECT * FROM passwordresetrequest
                       WHERE MaYeuCau = {request.MaYeuCau}
                       FOR UPDATE")
                .SingleOrDefaultAsync(HttpContext.RequestAborted);

            if (entry == null)
                return BadRequest(new { message = "Yêu cầu đặt lại mật khẩu đã hết hạn hoặc không hợp lệ." });

            if (entry.HetHanUtc <= DateTime.UtcNow)
            {
                _context.Passwordresetrequests.Remove(entry);
                await _context.SaveChangesAsync(HttpContext.RequestAborted);
                await transaction.CommitAsync(HttpContext.RequestAborted);
                return BadRequest(new { message = "Mã xác nhận đã hết hạn. Vui lòng yêu cầu mã mới." });
            }

            if (!VerifyResetCode(request.MaYeuCau, request.MaXacNhan, entry.MaXacNhanHash))
            {
                entry.SoLanThuSai++;

                if (entry.SoLanThuSai >= 5)
                {
                    _context.Passwordresetrequests.Remove(entry);
                    await _context.SaveChangesAsync(HttpContext.RequestAborted);
                    await transaction.CommitAsync(HttpContext.RequestAborted);
                    return BadRequest(new { message = "Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới." });
                }

                await _context.SaveChangesAsync(HttpContext.RequestAborted);
                await transaction.CommitAsync(HttpContext.RequestAborted);

                return BadRequest(new
                {
                    message = $"Mã xác nhận không đúng. Bạn còn {5 - entry.SoLanThuSai} lần thử."
                });
            }

            var taiKhoan = entry.MaTaiKhoan.HasValue
                ? await _context.Taikhoans.FirstOrDefaultAsync(
                    x => x.MaTaiKhoan == entry.MaTaiKhoan.Value,
                    HttpContext.RequestAborted)
                : null;

            if (taiKhoan == null || taiKhoan.MatKhau != entry.MatKhauLucTaoYeuCau)
            {
                _context.Passwordresetrequests.Remove(entry);
                await _context.SaveChangesAsync(HttpContext.RequestAborted);
                await transaction.CommitAsync(HttpContext.RequestAborted);
                return BadRequest(new { message = "Yêu cầu đặt lại mật khẩu không còn hợp lệ." });
            }

            if (VerifyPassword(request.MatKhauMoi, taiKhoan.MatKhau))
                return BadRequest(new { message = "Mật khẩu mới phải khác mật khẩu hiện tại." });

            taiKhoan.MatKhau = HashPassword(request.MatKhauMoi);
            _context.Passwordresetrequests.Remove(entry);
            await _context.SaveChangesAsync(HttpContext.RequestAborted);
            await transaction.CommitAsync(HttpContext.RequestAborted);

            return Ok(new
            {
                message = "Đặt lại mật khẩu thành công. Tất cả phiên đăng nhập cũ đã được đăng xuất."
            });
        }

        private int? GetMaTaiKhoan()
        {
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(value, out var id) ? id : null;
        }

        private IActionResult PasswordResetRequested(PasswordResetReference request)
        {
            var remainingMinutes = Math.Max(
                1,
                (int)Math.Ceiling((request.HetHanUtc - DateTime.UtcNow).TotalMinutes));

            return Ok(new
            {
                message = "Nếu email tồn tại, mã xác nhận đã được gửi.",
                maYeuCau = request.MaYeuCau,
                hetHanSauPhut = remainingMinutes,
                // Chỉ trả mã trực tiếp khi chạy local Development.
                maXacNhanThuNghiem = request.MaXacNhanThuNghiem
            });
        }

        private IActionResult LoginLocked(TimeSpan retryAfter)
        {
            var retryAfterSeconds = Math.Max(1, (int)Math.Ceiling(retryAfter.TotalSeconds));
            Response.Headers.RetryAfter = retryAfterSeconds.ToString();

            return StatusCode(StatusCodes.Status429TooManyRequests, new
            {
                message = "Đăng nhập đã bị khóa tạm thời do sai quá nhiều lần. Vui lòng thử lại sau.",
                retryAfterSeconds
            });
        }

        private async Task<(bool IsLocked, TimeSpan RetryAfter)> TryGetLoginLockAsync(string email)
        {
            var entry = await _context.Loginattempts
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x => x.EmailHash == HashCacheKey(email),
                    HttpContext.RequestAborted);

            var now = DateTime.UtcNow;
            if (entry?.KhoaDenUtc is DateTime lockedUntil && lockedUntil > now)
                return (true, lockedUntil - now);

            return (false, TimeSpan.Zero);
        }

        private async Task<(bool IsLocked, TimeSpan RetryAfter)> RegisterFailedLoginAsync(string email)
        {
            var emailHash = HashCacheKey(email);
            var now = DateTime.UtcNow;

            await using var transaction = await _context.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                HttpContext.RequestAborted);

            await _context.Database.ExecuteSqlInterpolatedAsync(
                $@"INSERT IGNORE INTO loginattempt
                   (EmailHash, SoLanThatBai, CuaSoBatDauUtc, KhoaDenUtc, NgayCapNhatUtc)
                   VALUES ({emailHash}, 0, {now}, NULL, {now})",
                HttpContext.RequestAborted);

            var entry = await _context.Loginattempts
                .FromSqlInterpolated(
                    $@"SELECT * FROM loginattempt
                       WHERE EmailHash = {emailHash}
                       FOR UPDATE")
                .SingleAsync(HttpContext.RequestAborted);

            if (entry.KhoaDenUtc is DateTime existingLock && existingLock > now)
            {
                await transaction.CommitAsync(HttpContext.RequestAborted);
                return (true, existingLock - now);
            }

            if (entry.CuaSoBatDauUtc.Add(LoginLockLifetime) <= now)
            {
                entry.CuaSoBatDauUtc = now;
                entry.SoLanThatBai = 0;
                entry.KhoaDenUtc = null;
            }

            entry.SoLanThatBai++;
            entry.NgayCapNhatUtc = now;

            if (entry.SoLanThatBai >= MaxFailedLoginAttempts)
                entry.KhoaDenUtc = now.Add(LoginLockLifetime);

            await _context.SaveChangesAsync(HttpContext.RequestAborted);
            await transaction.CommitAsync(HttpContext.RequestAborted);

            if (entry.KhoaDenUtc is DateTime lockedUntil && lockedUntil > now)
                return (true, lockedUntil - now);

            return (false, TimeSpan.Zero);
        }

        private Task ClearFailedLoginsAsync(string email)
            => _context.Loginattempts
                .Where(x => x.EmailHash == HashCacheKey(email))
                .ExecuteDeleteAsync(HttpContext.RequestAborted);

        private async Task<IActionResult?> EnforceSharedRateLimitAsync(
            string policy,
            int permitLimit,
            TimeSpan window)
        {
            var clientKey = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown-client";
            var result = await _sharedRateLimiter.TryAcquireAsync(
                policy,
                clientKey,
                permitLimit,
                window,
                HttpContext.RequestAborted);

            if (result.Allowed)
                return null;

            var retryAfterSeconds = Math.Max(1, (int)Math.Ceiling(result.RetryAfter.TotalSeconds));
            Response.Headers.RetryAfter = retryAfterSeconds.ToString();
            return StatusCode(StatusCodes.Status429TooManyRequests, new
            {
                message = "Bạn thao tác quá nhiều lần. Vui lòng chờ một lúc rồi thử lại.",
                retryAfterSeconds
            });
        }

        private static string? Normalize(string? value)
            => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        private static string HashCacheKey(string value)
            => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

        private string HashResetCode(string requestId, string code)
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_jwtOptions.Secret));
            var bytes = hmac.ComputeHash(
                Encoding.UTF8.GetBytes($"password-reset|{requestId}|{code}"));
            return Convert.ToBase64String(bytes);
        }

        private bool VerifyResetCode(string requestId, string code, string storedHash)
        {
            try
            {
                var actual = Convert.FromBase64String(HashResetCode(requestId, code));
                var expected = Convert.FromBase64String(storedHash);
                return CryptographicOperations.FixedTimeEquals(actual, expected);
            }
            catch
            {
                return false;
            }
        }

        private static string HashPassword(string password)
        {
            const int iterations = 100_000;
            byte[] salt = RandomNumberGenerator.GetBytes(16);
            byte[] hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, 32);
            return $"PBKDF2${iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
        }

        private static bool VerifyPassword(string password, string storedHash)
        {
            try
            {
                var parts = storedHash.Split('$');
                if (parts.Length != 4 || parts[0] != "PBKDF2") return false;

                int iterations = int.Parse(parts[1]);
                byte[] salt = Convert.FromBase64String(parts[2]);
                byte[] expected = Convert.FromBase64String(parts[3]);
                byte[] actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, expected.Length);

                return CryptographicOperations.FixedTimeEquals(actual, expected);
            }
            catch
            {
                return false;
            }
        }
    }
}
