using DatMonAnOnline.API.Hubs;
using DatMonAnOnline.API.Models;
using DatMonAnOnline.API.Options;
using DatMonAnOnline.API.Security;
using DatMonAnOnline.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
var builder = WebApplication.CreateBuilder(args);
builder.Services.Configure<ForwardedHeadersOptions>(options => TrustedProxyHeaders.Configure(
    options, builder.Configuration.GetSection("ReverseProxy:KnownProxies").Get<string[]>() ?? []));
var frontendOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? (builder.Environment.IsDevelopment()
        ? ["http://localhost:5173", "http://localhost:5174"]
        : Array.Empty<string>());
foreach (var origin in frontendOrigins)
{
    if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri) ||
        (uri.Scheme != "https" && !(builder.Environment.IsDevelopment() && uri.Scheme == "http")) ||
        uri.GetLeftPart(UriPartial.Authority) != origin || origin.Contains('*'))
        throw new InvalidOperationException("Cors:AllowedOrigins phải chứa origin chính xác, HTTPS khi triển khai.");
}
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins(frontendOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, cancellationToken) =>
    {
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
            context.HttpContext.Response.Headers.RetryAfter = Math.Ceiling(retryAfter.TotalSeconds).ToString();

        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            message = "Bạn thao tác quá nhiều lần. Vui lòng chờ một lúc rồi thử lại."
        }, cancellationToken);
    };

    static string GetClientKey(HttpContext context)
        => context.Connection.RemoteIpAddress?.ToString() ?? "unknown-client";

    options.AddPolicy(AuthRateLimitPolicies.RegisterNhaHang, context =>
        RateLimitPartition.GetSlidingWindowLimiter(
            GetClientKey(context),
            _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(15),
                SegmentsPerWindow = 3,
                QueueLimit = 0,
                AutoReplenishment = true
            }));

    options.AddPolicy(AuthRateLimitPolicies.Login, context =>
        RateLimitPartition.GetSlidingWindowLimiter(
            GetClientKey(context),
            _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 6,
                QueueLimit = 0,
                AutoReplenishment = true
            }));

    options.AddPolicy(AuthRateLimitPolicies.RequestPasswordReset, context =>
        RateLimitPartition.GetSlidingWindowLimiter(
            GetClientKey(context),
            _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 3,
                Window = TimeSpan.FromMinutes(15),
                SegmentsPerWindow = 3,
                QueueLimit = 0,
                AutoReplenishment = true
            }));

    options.AddPolicy(AuthRateLimitPolicies.ConfirmPasswordReset, context =>
        RateLimitPartition.GetSlidingWindowLimiter(
            GetClientKey(context),
            _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(10),
                SegmentsPerWindow = 5,
                QueueLimit = 0,
                AutoReplenishment = true
            }));
});

// =========================
// DATABASE
// =========================

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "Thiếu ConnectionStrings:DefaultConnection. " +
        "Hãy cấu hình bằng user-secrets khi phát triển hoặc biến môi trường khi triển khai.");
}

builder.Services.AddDbContext<DatMonAnOnlineContext>(options =>
    options.UseMySql(
        connectionString,
        ServerVersion.AutoDetect(connectionString)
    )
);
builder.Services.AddScoped<IWalletService, WalletService>();
builder.Services.AddScoped<IOrderIncomeSettlementService, OrderIncomeSettlementService>();
builder.Services.AddScoped<SharedAuthRateLimiter>();
builder.Services.AddHostedService<IdempotencyCleanupService>();

// =========================
// JWT AUTHENTICATION
// =========================

var jwtOptions = builder.Configuration
    .GetSection(JwtOptions.SectionName)
    .Get<JwtOptions>() ?? new JwtOptions();

if (Encoding.UTF8.GetByteCount(jwtOptions.Secret) < 32)
{
    throw new InvalidOperationException(
        "Jwt:Secret phải được cấu hình ngoài source code và có ít nhất 32 byte.");
}

if (string.IsNullOrWhiteSpace(jwtOptions.Issuer) ||
    string.IsNullOrWhiteSpace(jwtOptions.Audience))
{
    throw new InvalidOperationException("Jwt:Issuer và Jwt:Audience không được để trống.");
}

builder.Services.AddSingleton(jwtOptions);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme =
        JwtBearerDefaults.AuthenticationScheme;

    options.DefaultChallengeScheme =
        JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = jwtOptions.Issuer,
        ValidateAudience = true,
        ValidAudience = jwtOptions.Audience,

        ValidateLifetime = true,

        ValidateIssuerSigningKey = true,

        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwtOptions.Secret)
        ),

        ClockSkew = TimeSpan.FromSeconds(30)
    };

    // SignalR gửi access token qua query string khi mở kết nối hub.
    // Không ghi token hoặc chi tiết lỗi xác thực ra log.
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
   {
       var accessToken =
           context.Request.Query["access_token"];

       var path =
           context.HttpContext.Request.Path;

       if (
           !string.IsNullOrEmpty(accessToken) &&
           path.StartsWithSegments("/hubs/thong-bao")
       )
       {
           context.Token = accessToken;
       }

       return Task.CompletedTask;
   },
        OnTokenValidated = async context =>
        {
            var id = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(id, out var maTaiKhoan) || maTaiKhoan <= 0)
            {
                context.Fail("Token không chứa tài khoản hợp lệ.");
                return;
            }

            // Kiểm tra DB ở mỗi request, không dùng trạng thái cũ trong JWT/cache.
            var db = context.HttpContext.RequestServices
                .GetRequiredService<DatMonAnOnlineContext>();
            var taiKhoan = await db.Taikhoans
                .AsNoTracking()
                .Where(t => t.MaTaiKhoan == maTaiKhoan && t.TrangThai == true)
                .Select(t => new
                {
                    t.MatKhau,
                    Role = t.MaRoleNavigation.TenRole
                })
                .FirstOrDefaultAsync(
                    context.HttpContext.RequestAborted);

            if (taiKhoan == null)
            {
                context.Fail("Tài khoản không tồn tại hoặc đã bị khóa.");
                return;
            }

            var tokenVersion = context.Principal?.FindFirstValue(PasswordTokenVersion.ClaimType);
            if (!PasswordTokenVersion.Matches(tokenVersion, taiKhoan.MatKhau))
            {
                context.Fail("Phiên đăng nhập đã bị thu hồi.");
                return;
            }

            var tokenRole = context.Principal?.FindFirstValue(ClaimTypes.Role);
            if (!string.Equals(tokenRole, taiKhoan.Role, StringComparison.Ordinal))
            {
                context.Fail("Quyền trong phiên đăng nhập không còn hợp lệ.");
            }
        },
        OnChallenge = async context =>
        {
            context.HandleResponse();
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.Headers["WWW-Authenticate"] = "Bearer";
            await context.Response.WriteAsJsonAsync(new
            {
                message = "Phiên đăng nhập không hợp lệ, đã hết hạn hoặc tài khoản đã bị khóa. Vui lòng đăng nhập lại."
            });
        },
        OnAuthenticationFailed = _ => Task.CompletedTask
    };
});

// =========================
// AUTHORIZATION
// =========================

builder.Services.AddAuthorization();
builder.Services
    .AddOptions<DoiSoatOptions>()
    .Bind(builder.Configuration.GetSection(DoiSoatOptions.SectionName))
    .Validate(
        options => options.BatDauApDung != default,
        "Cấu hình DoiSoat:BatDauApDung chưa được thiết lập hoặc không hợp lệ.")
    .ValidateOnStart();
builder.Services.AddSingleton<ICheckoutCartReservationService, CheckoutCartReservationService>();
var smtpOptions = builder.Services
    .AddOptions<SmtpEmailOptions>()
    .Bind(builder.Configuration.GetSection(SmtpEmailOptions.SectionName));

if (!builder.Environment.IsDevelopment())
{
    smtpOptions
        .Validate(options => options.IsValid(), "Cấu hình Email:Smtp chưa đầy đủ hoặc không hợp lệ.")
        .ValidateOnStart();
}

builder.Services.AddSingleton<IPasswordResetEmailSender, SmtpPasswordResetEmailSender>();
builder.Services.AddSingleton<PasswordResetEmailQueue>();
builder.Services.AddSingleton<IPasswordResetEmailQueue>(services =>
    services.GetRequiredService<PasswordResetEmailQueue>());
builder.Services.AddHostedService(services =>
    services.GetRequiredService<PasswordResetEmailQueue>());
builder.Services.AddHostedService<PendingOnlineOrderExpirationService>();
builder.Services.AddHostedService<CompletedOrderWalletRecoveryService>();
builder.Services.AddSignalR();
builder.Services.AddScoped<
    IRealtimeNotificationService,
    RealtimeNotificationService
>();
// =========================
// CONTROLLERS + JSON
// =========================

builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler =
            System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.MaxDepth = 64;
    });

// =========================
// OPENAPI
// =========================

builder.Services.AddOpenApi();

// Hợp đồng - tự cập nhật hết hạn
builder.Services.AddHostedService<ContractExpirationService>();

var app = builder.Build();

// =========================
// DEVELOPMENT
// =========================

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    app.MapScalarApiReference(options =>
    {
        options.WithTitle("DatMonAnOnline API");
        options.WithTheme(ScalarTheme.DeepSpace);
    });
}

// =========================
// HTTP PIPELINE
// =========================

app.UseForwardedHeaders();
if (!app.Environment.IsDevelopment()) app.UseHsts();
app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

app.UseStaticFiles();

app.UseRateLimiter();

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();

app.MapHub<NotificationHub>(
    "/hubs/thong-bao", options => options.CloseOnAuthenticationExpiration = true
);

app.Run();

// Cho phép kiểm thử API qua WebApplicationFactory.
public partial class Program { }
