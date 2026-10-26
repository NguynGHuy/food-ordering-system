using System.Security.Claims;
using System.Data.Common;
using DatMonAnOnline.API.Common;
using DatMonAnOnline.API.Controllers;
using DatMonAnOnline.API.Models;
using DatMonAnOnline.API.Options;
using DatMonAnOnline.API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using MySqlConnector;
using Xunit;

namespace DatMonAnOnline.Tests;

public class ReconciliationCutoffTests
{
    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(10)]
    public async Task OpenDayAndFutureAreRejectedBeforeDatabaseAccess(int offset)
    {
        var day = DateOnly.FromDateTime(VietnamBusinessTime.Now()).AddDays(offset);
        Assert.IsType<BadRequestObjectResult>(await Controller(null!).TaoKyDoiSoat(new() { MaNhaHang = 1, TuNgay = day, DenNgay = day }));
    }

    [MySqlFact]
    public async Task ClosedDayCreatesOnceUnderConcurrencyAndRetryAndKeepsNegativeDirection()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        var day = DateOnly.FromDateTime(VietnamBusinessTime.Now()).AddDays(-1);
        await using (var seed = fixture.Open())
        {
            var order = new Donhang
            {
                MaDonHangHienThi = "TEST-CLOSED-DAY", MaKhachHang = 1, MaNhaHang = 1, MaTrangThai = 5, MaHopDong = 1,
                ThoiGianDat = day.ToDateTime(new TimeOnly(10, 0)), ThoiGianGiaoThucTe = day.ToDateTime(new TimeOnly(11, 0)),
                TenNguoiNhan = "Test", SoDienThoaiNhan = "0000000001", DiaChiGiaoHang = "Test address",
                TongTienHang = 10010, PhiShip = 15000, ThanhTien = 25010, PhiNenTang = 501, TyLePhiNenTang = 5, SoTienNhaHangNhan = 24509
            };
            order.Thanhtoans.Add(new() { MaPhuongThuc = 1, SoTien = 25010, TrangThaiThanhToan = "ThanhCong", ThoiGianThanhToan = order.ThoiGianGiaoThucTe });
            seed.Donhangs.Add(order);
            await seed.SaveChangesAsync();
        }
        var key = Guid.NewGuid().ToString();
        async Task<IActionResult> Create(string requestKey)
        {
            await using var db = fixture.Open();
            return await Controller(db, requestKey).TaoKyDoiSoat(new() { MaNhaHang = 1, TuNgay = day, DenNgay = day });
        }
        var results = await Task.WhenAll(Create(key), Create(key));
        Assert.Equal(201, Assert.IsType<ContentResult>(results[0]).StatusCode);
        Assert.Equal(Assert.IsType<ContentResult>(results[0]).Content, Assert.IsType<ContentResult>(results[1]).Content);
        Assert.Equal(201, Assert.IsType<ContentResult>(await Create(key)).StatusCode);
        Assert.IsType<ConflictObjectResult>(await Create(Guid.NewGuid().ToString()));
        await using var check = fixture.Open();
        Assert.Equal(-501m, (await check.Doisoatnhahangs.SingleAsync()).SoTienCanDoiSoat);
        Assert.Equal(1, await check.Chitietdoisoats.CountAsync());
    }

    [MySqlFact]
    public async Task VietnamMidnightClosesExactlyOneDayAndPreservesHistoricalDates()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        var day = new DateOnly(2026, 10, 24);
        await using (var seed = fixture.Open())
        {
            foreach (var (id, completed) in new[] {
                (1, day.ToDateTime(TimeOnly.MinValue)),
                (2, day.ToDateTime(new TimeOnly(23, 59, 59))),
                (3, day.AddDays(1).ToDateTime(TimeOnly.MinValue)) })
            {
                var order = new Donhang {
                    MaDonHang = id, MaDonHangHienThi = $"HISTORICAL-{id}", MaKhachHang = 1, MaNhaHang = 1, MaTrangThai = 5, MaHopDong = 1,
                    ThoiGianDat = completed.AddHours(-1), ThoiGianGiaoThucTe = completed,
                    TenNguoiNhan = "Test", SoDienThoaiNhan = "0000000001", DiaChiGiaoHang = "Test",
                    TongTienHang = 10000, ThanhTien = 10000, PhiNenTang = 500, SoTienNhaHangNhan = 9500 };
                order.Thanhtoans.Add(new() { MaPhuongThuc = 1, SoTien = 10000, TrangThaiThanhToan = "ThanhCong" });
                seed.Donhangs.Add(order);
            }
            seed.Doisoatnhahangs.Add(new() { MaNhaHang = 1, TuNgay = day.AddDays(-2), DenNgay = day.AddDays(-2), TrangThai = "DaThanhToan" });
            await seed.SaveChangesAsync();
        }
        var request = new AdminDoiSoatController.TaoDoiSoatRequest { MaNhaHang = 1, TuNgay = day, DenNgay = day };
        var before = new FixedClock(DateTimeOffset.Parse("2026-10-24T16:59:59Z"));
        Assert.IsType<BadRequestObjectResult>(await Controller(null!, clock: before).TaoKyDoiSoat(request));
        var after = new FixedClock(DateTimeOffset.Parse("2026-10-24T17:00:00Z"));
        await using (var db = fixture.Open())
            Assert.Equal(201, Assert.IsType<ContentResult>(await Controller(db, clock: after).TaoKyDoiSoat(request)).StatusCode);
        await using var check = fixture.Open();
        Assert.Equal(new[] { 1, 2 }, await check.Chitietdoisoats.OrderBy(x => x.MaDonHang).Select(x => x.MaDonHang).ToArrayAsync());
        Assert.Equal(day.AddDays(1).ToDateTime(TimeOnly.MinValue), (await check.Donhangs.FindAsync(3))!.ThoiGianGiaoThucTe);
        var historical = await check.Doisoatnhahangs.SingleAsync(x => x.TrangThai == "DaThanhToan");
        Assert.Equal(day.AddDays(-2), historical.TuNgay);
        Assert.Equal(day.AddDays(-2), historical.DenNgay);
    }

    [Theory]
    [InlineData("2025-12-31T16:59:59Z", "2025-12-31T23:59:59")]
    [InlineData("2025-12-31T17:00:00Z", "2026-01-01T00:00:00")]
    [InlineData("2024-02-29T17:00:00Z", "2024-03-01T00:00:00")]
    public void BusinessClockIgnoresServerZoneAndPreservesWallTime(string utc, string expected)
    {
        var actual = VietnamBusinessTime.Now(new FixedClock(DateTimeOffset.Parse(utc)));
        Assert.Equal(DateTime.Parse(expected), actual);
        Assert.Equal(DateTimeKind.Unspecified, actual.Kind);
    }

    [MySqlFact]
    public async Task CompletionAndCodHistoryUseVietnamDayOnUtcServer()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        for (var id = 1; id <= 2; id++)
        {
            await using (var seed = fixture.Open())
            {
                var order = new Donhang { MaDonHang = id, MaDonHangHienThi = $"MIDNIGHT-{id}",
                    MaKhachHang = 1, MaNhaHang = 1, MaTrangThai = 4, MaHopDong = 1,
                    ThoiGianDat = new DateTime(2026, 10, 24, 22, 0, 0),
                    TenNguoiNhan = "Test", SoDienThoaiNhan = "0000000001", DiaChiGiaoHang = "Test",
                    TongTienHang = 10000, ThanhTien = 10000, PhiNenTang = 500, SoTienNhaHangNhan = 9500 };
                order.Thanhtoans.Add(new() { MaPhuongThuc = 1, SoTien = 10000, TrangThaiThanhToan = "ChoThanhToan" });
                seed.Donhangs.Add(order);
                await seed.SaveChangesAsync();
            }
            var clock = new FixedClock(DateTimeOffset.Parse(id == 1 ? "2026-10-24T16:59:59Z" : "2026-10-24T17:00:00Z"));
            await using var db = fixture.Open();
            var controller = IsolatedMySql.Orders(db, clock: clock);
            controller.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity([
                new Claim(ClaimTypes.NameIdentifier, "2"), new Claim(ClaimTypes.Role, "Quan")], "Test"));
            Assert.IsType<OkObjectResult>(await controller.CapNhatTrangThaiDonHang(id, new() { MaTrangThai = 5 }));
            await using var check = fixture.Open();
            var stored = await check.Donhangs.FindAsync(id);
            Assert.Equal(VietnamBusinessTime.Now(clock), stored!.ThoiGianGiaoThucTe);
            var payment = await check.Thanhtoans.SingleAsync(x => x.MaDonHang == id);
            Assert.Equal("ThanhCong", payment.TrangThaiThanhToan);
            Assert.Equal(stored.ThoiGianGiaoThucTe, payment.ThoiGianThanhToan);
            Assert.Equal(stored.ThoiGianGiaoThucTe, (await check.Lichsutrangthaidonhangs.SingleAsync(x => x.MaDonHang == id)).ThoiGianTao);
        }
        await using var periodDb = fixture.Open();
        var day = new DateOnly(2026, 10, 24);
        Assert.Equal(201, Assert.IsType<ContentResult>(await Controller(periodDb,
            clock: new FixedClock(DateTimeOffset.Parse("2026-10-24T17:00:01Z"))).TaoKyDoiSoat(
                new() { MaNhaHang = 1, TuNgay = day, DenNgay = day })).StatusCode);
        Assert.Equal(1, (await periodDb.Chitietdoisoats.SingleAsync()).MaDonHang);
    }

    [MySqlFact]
    public async Task PeriodCannotCloseWhilePriorDayCompletionIsUncommitted()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        var day = new DateOnly(2026, 10, 24);
        await using (var seed = fixture.Open())
        {
            var order = new Donhang { MaDonHang = 1, MaDonHangHienThi = "LATE-COMMIT", MaKhachHang = 1, MaNhaHang = 1,
                MaTrangThai = 4, MaHopDong = 1, ThoiGianDat = day.ToDateTime(new TimeOnly(22, 0)),
                TenNguoiNhan = "Test", SoDienThoaiNhan = "0000000001", DiaChiGiaoHang = "Test",
                TongTienHang = 10000, ThanhTien = 10000, PhiNenTang = 500, SoTienNhaHangNhan = 9500 };
            order.Thanhtoans.Add(new() { MaPhuongThuc = 1, SoTien = 10000, TrangThaiThanhToan = "ChoThanhToan" });
            seed.Donhangs.Add(order);
            await seed.SaveChangesAsync();
        }
        var gate = new CommitGate();
        await using var completionDb = fixture.Open(gate);
        var completionController = IsolatedMySql.Orders(completionDb,
            clock: new FixedClock(DateTimeOffset.Parse("2026-10-24T16:59:59Z")));
        completionController.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, "2"), new Claim(ClaimTypes.Role, "Quan")], "Test"));
        var completion = completionController.CapNhatTrangThaiDonHang(1, new() { MaTrangThai = 5 });
        var key = Guid.NewGuid().ToString();
        var request = new AdminDoiSoatController.TaoDoiSoatRequest { MaNhaHang = 1, TuNgay = day, DenNgay = day };
        var afterMidnight = new FixedClock(DateTimeOffset.Parse("2026-10-24T17:00:01Z"));
        try
        {
            await gate.Ready.Task.WaitAsync(TimeSpan.FromSeconds(15));
            await using var closing = fixture.Open();
            closing.Database.SetCommandTimeout(1); // test-only bound on waiting for the in-flight completion
            var timeout = await Assert.ThrowsAsync<MySqlException>(() => Controller(closing, key, afterMidnight).TaoKyDoiSoat(request));
            Assert.Contains("timeout", timeout.Message, StringComparison.OrdinalIgnoreCase);
        }
        finally
        {
            gate.Release.TrySetResult();
            Assert.IsType<OkObjectResult>(await completion);
        }
        // Retry after commit includes the finished order exactly once, with no historical date rewrite.
        await using var retry = fixture.Open();
        Assert.Equal(201, Assert.IsType<ContentResult>(await Controller(retry, key, afterMidnight).TaoKyDoiSoat(request)).StatusCode);
        Assert.Equal(1, (await retry.Chitietdoisoats.SingleAsync()).MaDonHang);
    }

    private sealed class CommitGate : DbTransactionInterceptor
    {
        public TaskCompletionSource Ready { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource Release { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public override async ValueTask<InterceptionResult> TransactionCommittingAsync(DbTransaction transaction,
            TransactionEventData eventData, InterceptionResult result, CancellationToken cancellationToken = default)
        {
            Ready.TrySetResult();
            await Release.Task.WaitAsync(TimeSpan.FromSeconds(20), cancellationToken);
            return result;
        }
    }

    private sealed class FixedClock(DateTimeOffset instant) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => instant;
        public override TimeZoneInfo LocalTimeZone => TimeZoneInfo.Utc;
    }

    private static AdminDoiSoatController Controller(DatMonAnOnlineContext db, string? key = null, TimeProvider? clock = null)
    {
        var controller = new AdminDoiSoatController(db, new WalletService(db), new IsolatedMySql.NoopRealtime(), NullLogger<AdminDoiSoatController>.Instance, Options.Create(new DoiSoatOptions { BatDauApDung = new DateTime(2020, 1, 1) }), clock);
        var http = new DefaultHttpContext();
        http.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, "3"), new Claim(ClaimTypes.Role, "Admin")], "Test"));
        http.Request.Method = "POST"; http.Request.Path = "/api/admin/doi-soat/tao-ky";
        http.Request.Headers["Idempotency-Key"] = key ?? Guid.NewGuid().ToString();
        controller.ControllerContext = new ControllerContext { HttpContext = http };
        return controller;
    }
}
