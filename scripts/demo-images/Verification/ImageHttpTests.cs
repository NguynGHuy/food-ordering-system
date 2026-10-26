using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using DatMonAnOnline.API.Controllers;
using DatMonAnOnline.API.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SkiaSharp;
using Xunit;

namespace DemoImages.Verification;

// Isolated Kestrel + real controllers/static-file middleware. No source MySQL connection.
public sealed class ImageHttpTests : IAsyncLifetime
{
    private WebApplication app = null!;
    private HttpClient client = null!;
    private string temp = null!;
    private string root = null!;
    private string webroot = null!;

    public async Task InitializeAsync()
    {
        var cursor = new DirectoryInfo(AppContext.BaseDirectory);
        while (cursor != null && !File.Exists(Path.Combine(cursor.FullName, "DatMonAnOnline.API/Database/SeedDemo.sql"))) cursor = cursor.Parent;
        root = cursor?.FullName ?? throw new InvalidOperationException("Repository root missing");
        temp = Path.Combine(root, ".build-check", "images-http-" + Guid.NewGuid().ToString("N"));
        webroot = Path.Combine(temp, "wwwroot");
        Directory.CreateDirectory(webroot);
        Directory.CreateDirectory(Path.Combine(temp, "App_Data"));
        await File.WriteAllTextAsync(Path.Combine(temp, "App_Data/private.txt"), "private fixture");
        foreach (var kind in new[] { "foods", "restaurants" })
        {
            var source = Path.Combine(root, "DatMonAnOnline.API/wwwroot/uploads", kind);
            var destination = Path.Combine(webroot, "uploads", kind);
            Directory.CreateDirectory(destination);
            if (Directory.Exists(source)) foreach (var file in Directory.GetFiles(source, "demo-v1-*.webp"))
                File.Copy(file, Path.Combine(destination, Path.GetFileName(file)));
        }
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { ContentRootPath = temp, WebRootPath = webroot });
        builder.Logging.ClearProviders();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        // Use one database name across request scopes.
        var database = "images-" + Guid.NewGuid().ToString("N");
        builder.Services.AddDbContext<DatMonAnOnlineContext>(o => o.UseInMemoryDatabase(database));
        builder.Services.AddControllers().AddApplicationPart(typeof(NhaHangController).Assembly);
        builder.Services.AddAuthentication("Fixture").AddScheme<AuthenticationSchemeOptions, FixtureAuth>("Fixture", _ => { });
        builder.Services.AddAuthorization();
        builder.Services.AddCors(o => o.AddPolicy("AllowFrontend", p => p.WithOrigins("http://localhost:5173").AllowAnyMethod().AllowAnyHeader()));
        app = builder.Build();
        app.UseCors("AllowFrontend");
        app.UseStaticFiles();
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DatMonAnOnlineContext>();
            for (var id = 1; id <= 3; id++)
            {
                db.Taikhoans.Add(new Taikhoan { MaTaiKhoan = id, Email = $"owner{id}@example.invalid", MatKhau = "unused-test-fixture", MaRole = 2, TrangThai = id != 3 });
                db.Nhahangs.Add(new Nhahang { MaNhaHang = id, MaTaiKhoan = id, TenNhaHang = "Fixture " + id, DiaChiQuan = "Demo", TrangThaiDuyet = "DaDuyet", TrangThaiHoatDong = "MoCua", CheDoHoatDong = "MoThuCong", AnhBia = "/uploads/restaurants/original.webp" });
                db.Hopdongnhahangs.Add(new Hopdongnhahang { MaHopDong = id, MaNhaHang = id, SoHopDong = "TEST-" + id, NguoiDaiDien = "Demo", PhienBanDieuKhoan = "1.0", TrangThai = "HieuLuc", NgayBatDau = new DateOnly(2000, 1, 1), NgayKetThuc = new DateOnly(2099, 1, 1) });
            }
            db.Danhmucs.Add(new Danhmuc { MaDanhMuc = 1, MaNhaHang = 1, TenDanhMuc = "Menu" });
            db.Monans.Add(new Monan { MaMonAn = 1, MaNhaHang = 1, MaDanhMuc = 1, TenMonAn = "Tea", Gia = 30000, TrangThai = true, HinhAnh = "/uploads/foods/fixture.webp" });
            await db.SaveChangesAsync();
        }
        await File.WriteAllBytesAsync(Path.Combine(webroot, "uploads/restaurants/original.webp"), ImageBytes(SKEncodedImageFormat.Webp));
        await File.WriteAllBytesAsync(Path.Combine(webroot, "uploads/foods/fixture.webp"), ImageBytes(SKEncodedImageFormat.Webp));
        await app.StartAsync();
        client = new HttpClient { BaseAddress = new Uri(app.Urls.Single()) };
    }

    public async Task DisposeAsync()
    {
        client?.Dispose();
        if (app != null) await app.DisposeAsync();
        // Keep the test-owned artifacts under ignored .build-check for review.
    }

    private static byte[] ImageBytes(SKEncodedImageFormat format, int width = 64)
    {
        using var bitmap = new SKBitmap(width, 48);
        bitmap.Erase(SKColors.Orange);
        using var image = SKImage.FromBitmap(bitmap);
        using var data = image.Encode(format, 85);
        return data.ToArray();
    }

    private async Task<HttpResponseMessage> Upload(byte[] bytes, string mime = "image/png", string? identity = "Quan:1")
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/nha-hang/anh-bia");
        if (identity != null) request.Headers.Add("X-Fixture-Identity", identity);
        using var form = new MultipartFormDataContent();
        var content = new ByteArrayContent(bytes);
        content.Headers.ContentType = new MediaTypeHeaderValue(mime);
        form.Add(content, "file", "../../private/should-not-be-used.png");
        // The endpoint must ignore any client-supplied ownership.
        form.Add(new StringContent("2"), "maNhaHang");
        request.Content = form;
        return await client.SendAsync(request);
    }

    [Theory]
    [InlineData(SKEncodedImageFormat.Png, "image/png")]
    [InlineData(SKEncodedImageFormat.Jpeg, "image/jpeg")]
    [InlineData(SKEncodedImageFormat.Webp, "image/webp")]
    public async Task Valid_upload_is_webp_owned_by_jwt_and_does_not_replace_current_cover(SKEncodedImageFormat format, string mime)
    {
        var old = await File.ReadAllBytesAsync(Path.Combine(webroot, "uploads/restaurants/original.webp"));
        using var response = await Upload(ImageBytes(format), mime);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var path = json.GetProperty("anhBia").GetString()!;
        Assert.StartsWith("/uploads/restaurants/owner-1-", path);
        Assert.EndsWith(".webp", path);
        using var image = await client.GetAsync(path);
        Assert.Equal(HttpStatusCode.OK, image.StatusCode);
        Assert.Equal("image/webp", image.Content.Headers.ContentType?.MediaType);
        using var codec = SKCodec.Create(new SKMemoryStream(await image.Content.ReadAsByteArrayAsync()));
        Assert.Equal(SKEncodedImageFormat.Webp, codec.EncodedFormat);
        Assert.Equal(old, await File.ReadAllBytesAsync(Path.Combine(webroot, "uploads/restaurants/original.webp")));
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<DatMonAnOnlineContext>();
        Assert.All(await db.Nhahangs.ToListAsync(), r => Assert.Equal("/uploads/restaurants/original.webp", r.AnhBia));
    }

    [Theory]
    [InlineData(null, HttpStatusCode.Unauthorized)]
    [InlineData("KhachHang:1", HttpStatusCode.Forbidden)]
    [InlineData("Admin:1", HttpStatusCode.Forbidden)]
    [InlineData("Quan:3", HttpStatusCode.NotFound)]
    [InlineData("Quan:99", HttpStatusCode.NotFound)]
    public async Task Upload_enforces_role_active_account_and_ownership(string? identity, HttpStatusCode status)
    {
        using var response = await Upload(ImageBytes(SKEncodedImageFormat.Png), identity: identity);
        Assert.Equal(status, response.StatusCode);
        Assert.Empty(Directory.GetFiles(Path.Combine(webroot, "uploads/restaurants"), "owner-*.webp"));
    }

    [Fact]
    public async Task Bad_uploads_are_rejected_without_files()
    {
        var invalid = new[] {
            (Array.Empty<byte>(), "image/png"), (new byte[5 * 1024 * 1024 + 1], "image/png"),
            ("<svg onload='alert(1)'/>"u8.ToArray(), "image/png"),
            (ImageBytes(SKEncodedImageFormat.Png), "text/plain"),
            (ImageBytes(SKEncodedImageFormat.Png), "image/jpeg"),
            (ImageBytes(SKEncodedImageFormat.Png, 6001), "image/png")
        };
        foreach (var (bytes, mime) in invalid)
        {
            using var response = await Upload(bytes, mime);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
        Assert.Empty(Directory.GetFiles(Path.Combine(webroot, "uploads/restaurants"), "owner-*.webp"));
    }

    [Fact]
    public async Task Concurrent_upload_and_retry_create_unique_files_without_overwriting()
    {
        var results = await Task.WhenAll(Enumerable.Range(0, 4).Select(_ => Upload(ImageBytes(SKEncodedImageFormat.Png))));
        var paths = new HashSet<string>();
        foreach (var response in results)
        {
            using (response)
            {
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                paths.Add((await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("anhBia").GetString()!);
            }
        }
        Assert.Equal(4, paths.Count);
        foreach (var path in paths) Assert.True(File.Exists(Path.Combine(webroot, path.TrimStart('/'))));
    }

    [Fact]
    public async Task Static_images_cors_404_and_private_documents()
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/uploads/restaurants/original.webp");
        request.Headers.Add("Origin", "http://localhost:5173");
        using var response = await client.SendAsync(request);
        Assert.Equal("http://localhost:5173", response.Headers.GetValues("Access-Control-Allow-Origin").Single());
        using var untrusted = new HttpRequestMessage(HttpMethod.Get, request.RequestUri);
        untrusted.Headers.Add("Origin", "https://untrusted.invalid");
        using var denied = await client.SendAsync(untrusted);
        Assert.False(denied.Headers.Contains("Access-Control-Allow-Origin"));
        foreach (var path in new[] { "/uploads/foods/not-found.webp", "/App_Data/private.txt", "/uploads/../App_Data/private.txt" })
            Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync(path)).StatusCode);
        var program = await File.ReadAllTextAsync(Path.Combine(root, "DatMonAnOnline.API/Program.cs"));
        Assert.True(program.IndexOf("app.UseCors(\"AllowFrontend\")", StringComparison.Ordinal) < program.IndexOf("app.UseStaticFiles()", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Api_list_and_detail_paths_are_served()
    {
        foreach (var endpoint in new[] { "/api/nha-hang/1", "/api/mon-an/1" })
        {
            using var response = await client.GetAsync(endpoint);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var body = await response.Content.ReadFromJsonAsync<JsonElement>();
            var path = body.GetProperty(endpoint.Contains("mon-an") ? "hinhAnh" : "anhBia").GetString();
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync(path)).StatusCode);
        }
        foreach (var endpoint in new[] { "/api/nha-hang", "/api/mon-an?maNhaHang=1" })
        {
            using var response = await client.GetAsync(endpoint);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var body = await response.Content.ReadFromJsonAsync<JsonElement>();
            var items = body.GetProperty("items").EnumerateArray().ToArray();
            Assert.NotEmpty(items);
            foreach (var item in items)
                Assert.Equal(HttpStatusCode.OK, (await client.GetAsync(item.GetProperty(endpoint.Contains("mon-an") ? "hinhAnh" : "anhBia").GetString())).StatusCode);
        }
    }

    [Fact]
    public async Task All_134_demo_images_are_decodable_and_served_by_http()
    {
        var assets = Directory.GetFiles(Path.Combine(webroot, "uploads"), "demo-v1-*.webp", SearchOption.AllDirectories);
        Assert.Equal(134, assets.Length);
        foreach (var file in assets)
        {
            var url = "/" + Path.GetRelativePath(webroot, file).Replace('\\', '/');
            using var response = await client.GetAsync(url);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("image/webp", response.Content.Headers.ContentType?.MediaType);
            using var bitmap = SKBitmap.Decode(await response.Content.ReadAsByteArrayAsync());
            Assert.NotNull(bitmap);
            Assert.Equal(url.Contains("/foods/") ? 800 : 1280, bitmap.Width);
        }
    }

    private sealed class FixtureAuth(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
        : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
    {
        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var parts = Request.Headers["X-Fixture-Identity"].ToString().Split(':');
            if (parts.Length != 2) return Task.FromResult(AuthenticateResult.NoResult());
            var identity = new ClaimsIdentity(new[] { new Claim(ClaimTypes.Role, parts[0]), new Claim(ClaimTypes.NameIdentifier, parts[1]) }, Scheme.Name);
            return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name)));
        }
    }
}
