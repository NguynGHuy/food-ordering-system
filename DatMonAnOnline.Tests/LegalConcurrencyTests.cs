using System.Data.Common;
using System.Security.Claims;
using DatMonAnOnline.API.Controllers;
using DatMonAnOnline.API.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using SkiaSharp;
using Xunit;

namespace DatMonAnOnline.Tests;

public class LegalConcurrencyTests
{
    [MySqlFact]
    public async Task ProfileWriteWaitsForSignerAndRechecksContractState()
    {
        var (fixture, env) = await Setup();
        await using var signing = fixture.Open();
        await using var transaction = await signing.Database.BeginTransactionAsync();
        await signing.Nhahangs.FromSqlRaw("SELECT * FROM nhahang WHERE MaNhaHang=1 FOR UPDATE").ToListAsync();
        await using var updating = fixture.Open();
        var update = Profile(updating, env).LuuHoSo(new() { NguoiDaiDien = "Changed" });
        Assert.NotSame(update, await Task.WhenAny(update, Task.Delay(150)));
        (await signing.Hopdongnhahangs.SingleAsync()).TrangThai = "DaKy";
        await signing.SaveChangesAsync();
        await transaction.CommitAsync();
        Assert.IsType<ConflictObjectResult>(await update.WaitAsync(TimeSpan.FromSeconds(10)));
        await using var check = fixture.Open();
        Assert.Equal("Test representative", (await check.Hosophaplynhahangs.SingleAsync()).NguoiDaiDien);
    }

    [MySqlFact]
    public async Task UploadThatStartedBeforeSigningCannotReplaceSignedDocuments()
    {
        var (fixture, env) = await Setup();
        await using var uploadDb = fixture.Open();
        await using var signingDb = fixture.Open();
        var signer = Signer(signingDb, env);
        var preview = Assert.IsType<HopDongXemTruocResponse>(Assert.IsType<OkObjectResult>(await signer.XemTruoc()).Value);
        using var stream = new GatedStream(Png());
        var file = new FormFile(stream, 0, stream.Length, "file", "test.png") { Headers = new HeaderDictionary(), ContentType = "image/png" };
        var upload = Profile(uploadDb, env).TaiGiayTo("giay-phep", file);
        await stream.Entered.Task.WaitAsync(TimeSpan.FromSeconds(10));
        try
        {
            var signed = await signer.KyHopDong(new() { DongYDieuKhoan = true, XacNhanKy = true, MaXacNhanNoiDung = preview.MaXacNhanNoiDung });
            Assert.Equal(201, Assert.IsType<ContentResult>(signed).StatusCode);
        }
        finally { stream.Release.TrySetResult(); }
        var uploadResult = await upload.WaitAsync(TimeSpan.FromSeconds(10));
        Assert.True(uploadResult is ConflictObjectResult, System.Text.Json.JsonSerializer.Serialize((uploadResult as ObjectResult)?.Value));
        await using var check = fixture.Open();
        var contract = await check.Hopdongnhahangs.SingleAsync(c => c.TrangThai == "DaKy");
        Assert.Equal("1/permit.png", contract.FileGiayPhepKinhDoanh);
        Assert.True(File.Exists(Path.Combine(env.ContentRootPath, "App_Data", "HoSoPhapLy", "1", "permit.png")));
    }

    [MySqlFact]
    public async Task ReplacementPreservesDocumentReferencedByHistoricalContract()
    {
        var (fixture, env) = await Setup();
        await using (var seed = fixture.Open())
        {
            (await seed.Hopdongnhahangs.SingleAsync()).FileGiayPhepKinhDoanh = "1/permit.png";
            await seed.SaveChangesAsync();
        }
        await using var db = fixture.Open();
        using var stream = new MemoryStream(Png());
        var file = new FormFile(stream, 0, stream.Length, "file", "new.png") { Headers = new HeaderDictionary(), ContentType = "image/png" };
        var result = await Profile(db, env).TaiGiayTo("giay-phep", file);
        Assert.True(result is OkObjectResult, System.Text.Json.JsonSerializer.Serialize((result as ObjectResult)?.Value));
        await using var check = fixture.Open();
        Assert.NotEqual("1/permit.png", (await check.Hosophaplynhahangs.SingleAsync()).FileGiayPhepKinhDoanh);
        Assert.True(File.Exists(Path.Combine(env.ContentRootPath, "App_Data", "HoSoPhapLy", "1", "permit.png")));
    }

    [MySqlFact]
    public async Task TimeoutAfterSuccessfulCommitDoesNotDeleteSignedContract()
    {
        var (fixture, env) = await Setup();
        await using var db = fixture.Open(new TimeoutAfterCommit());
        var signer = Signer(db, env);
        var preview = Assert.IsType<HopDongXemTruocResponse>(Assert.IsType<OkObjectResult>(await signer.XemTruoc()).Value);
        await Assert.ThrowsAsync<TimeoutException>(() => signer.KyHopDong(new() { DongYDieuKhoan = true, XacNhanKy = true, MaXacNhanNoiDung = preview.MaXacNhanNoiDung }));
        await using var check = fixture.Open();
        var saved = await check.Hopdongnhahangs.SingleAsync(c => c.TrangThai == "DaKy");
        Assert.True(File.Exists(Path.Combine(env.ContentRootPath, "App_Data", "HopDong", saved.FileHopDong!)));
    }

    private static async Task<(IsolatedMySql, TestEnvironment)> Setup()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        var env = new TestEnvironment();
        var directory = Path.Combine(env.ContentRootPath, "App_Data", "HoSoPhapLy", "1");
        Directory.CreateDirectory(directory);
        await File.WriteAllBytesAsync(Path.Combine(directory, "permit.png"), Png());
        await File.WriteAllBytesAsync(Path.Combine(directory, "identity.png"), Png());
        await using var db = fixture.Open();
        var restaurant = await db.Nhahangs.SingleAsync();
        restaurant.TrangThaiDuyet = "ChuaHoanTat";
        restaurant.MoTa = "Test description"; restaurant.AnhBia = "test-cover.png";
        restaurant.GioMoCua = new TimeOnly(8, 0); restaurant.GioDongCua = new TimeOnly(22, 0);
        (await db.Taikhoans.SingleAsync(a => a.MaTaiKhoan == 2)).SoDienThoai = "0000000002";
        (await db.Hopdongnhahangs.SingleAsync()).TrangThai = "HetHan";
        db.Hosophaplynhahangs.Add(new Hosophaplynhahang { MaNhaHang = 1, NguoiDaiDien = "Test representative", SoGiayToNguoiDaiDien = "TEST-ID", TenPhapLy = "Test legal name", MaSoThue = "TEST-TAX", DiaChiPhapLy = "Test address", SoGiayPhepKinhDoanh = "TEST-PERMIT", FileGiayPhepKinhDoanh = "1/permit.png", FileGiayToNguoiDaiDien = "1/identity.png" });
        await db.SaveChangesAsync();
        return (fixture, env);
    }

    private static HoSoPhapLyController Profile(DatMonAnOnlineContext db, TestEnvironment env)
        => AsRestaurant(new HoSoPhapLyController(db, env, NullLogger<HoSoPhapLyController>.Instance));
    private static HopDongController Signer(DatMonAnOnlineContext db, TestEnvironment env)
        => AsRestaurant(new HopDongController(db, env, new IsolatedMySql.NoopRealtime()));
    private static T AsRestaurant<T>(T controller) where T : ControllerBase
    {
        IsolatedMySql.AsCustomer(controller);
        controller.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, "2"), new Claim(ClaimTypes.Role, "Quan")], "Test"));
        controller.Request.Path = "/api/nha-hang/hop-dong/ky";
        return controller;
    }

    private static byte[] Png()
    {
        using var bitmap = new SKBitmap(2, 2);
        bitmap.Erase(SKColors.White);
        using var image = SKImage.FromBitmap(bitmap);
        using var data = image.Encode(SKEncodedImageFormat.Png, 100);
        return data.ToArray();
    }

    private sealed class TestEnvironment : IWebHostEnvironment
    {
        public string ContentRootPath { get; set; } = Path.Combine(Path.GetTempPath(), "foodie-audit-legal-" + Guid.NewGuid().ToString("N"));
        public string WebRootPath { get; set; } = "";
        public string EnvironmentName { get; set; } = "Test";
        public string ApplicationName { get; set; } = "AuditTests";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
    }

    private sealed class TimeoutAfterCommit : DbTransactionInterceptor
    {
        public override Task TransactionCommittedAsync(DbTransaction transaction, TransactionEndEventData eventData, CancellationToken cancellationToken = default)
            => Task.FromException(new TimeoutException("Injected post-commit timeout."));
    }

    private sealed class GatedStream(byte[] bytes) : MemoryStream(bytes)
    {
        public TaskCompletionSource Entered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Release { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken token = default)
        {
            Entered.TrySetResult();
            await Release.Task.WaitAsync(token);
            return await base.ReadAsync(buffer, token);
        }
        public override async Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken token)
        {
            Entered.TrySetResult();
            await Release.Task.WaitAsync(token);
            return await base.ReadAsync(buffer, offset, count, token);
        }
    }
}
