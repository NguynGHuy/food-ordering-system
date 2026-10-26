using System.Data.Common;
using DatMonAnOnline.API.Common;
using DatMonAnOnline.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Xunit;

namespace DatMonAnOnline.Tests;

public class CheckoutEligibilityTests
{
    [MySqlFact]
    public Task PauseCommittedBeforeRestaurantLockRejectsCheckout() => CheckChange(async db =>
    {
        var restaurant = await db.Nhahangs.SingleAsync();
        restaurant.CheDoHoatDong = "TamNgung";
        restaurant.TrangThaiHoatDong = "TamNgung";
    });

    [MySqlFact]
    public Task AutomaticClosedHoursCommittedBeforeLockRejectCheckout() => CheckChange(async db =>
    {
        var restaurant = await db.Nhahangs.SingleAsync();
        restaurant.CheDoHoatDong = "TuDong";
        // A one-minute window safely outside both the initial and final check.
        restaurant.GioMoCua = TimeOnly.FromDateTime(VietnamBusinessTime.Now().AddHours(2));
        restaurant.GioDongCua = restaurant.GioMoCua.Value.AddMinutes(1);
        restaurant.TrangThaiHoatDong = "DongCua";
    });

    [MySqlFact]
    public Task ApprovalRevokedBeforeLockRejectsCheckout() => CheckChange(async db =>
        (await db.Nhahangs.SingleAsync()).TrangThaiDuyet = "ChuaHoanTat");

    [MySqlFact]
    public Task OwnerAccountLockedBeforeRestaurantLockRejectsCheckout() => CheckChange(async db =>
        (await db.Taikhoans.SingleAsync(x => x.MaTaiKhoan == 2)).TrangThai = false);

    [MySqlFact]
    public Task ContractTerminatedBeforeRestaurantLockRejectsCheckout() => CheckChange(async db =>
        (await db.Hopdongnhahangs.SingleAsync()).TrangThai = "ChamDut");

    [MySqlFact]
    public Task ContractDateExpiredBeforeRestaurantLockRejectsCheckout() => CheckChange(async db =>
        (await db.Hopdongnhahangs.SingleAsync()).NgayKetThuc = DateOnly.FromDateTime(VietnamBusinessTime.Now()).AddDays(-1));

    private static async Task CheckChange(Func<DatMonAnOnlineContext, Task> change)
    {
        var fixture = await IsolatedMySql.CreateAsync();
        int cartId;
        await using (var seed = fixture.Open())
        {
            seed.Khuyenmais.Add(new() { MaKhuyenMai = 1, MaNhaHang = 1, MaCode = "TEST-ELIGIBILITY", LoaiGiam = "PhanTram",
                GiaTriGiam = 10, SoLuong = 1, SoLuotToiDaMoiKhach = 1, TrangThai = true,
                NgayBatDau = DateTime.Now.AddDays(-1), NgayKetThuc = DateTime.Now.AddDays(1) });
            await seed.SaveChangesAsync();
            Assert.IsType<OkObjectResult>(await IsolatedMySql.Cart(seed).ThemMonVaoGio(new() { MaMonAn = 1, SoLuong = 1 }));
            cartId = (await seed.Giohangs.SingleAsync()).MaGioHang;
        }
        var changed = new BeforeRestaurantLock(async () =>
        {
            // Separate connection commits AFTER the pricing query populated the identity map,
            // but BEFORE the checkout's current locking read. No timing/sleep dependency.
            await using var writer = fixture.Open();
            await change(writer);
            await writer.SaveChangesAsync();
        });
        var key = Guid.NewGuid().ToString();
        var request = new API.Controllers.DatHangYeuCau { MaGioHang = cartId, MaDiaChi = 1, MaPhuongThuc = 1, MaKhuyenMai = 1 };
        await using (var checkout = fixture.Open(changed))
            Assert.IsType<ConflictObjectResult>(await IsolatedMySql.Orders(checkout, key).DatHang(request));
        Assert.True(changed.Executed);
        await using (var check = fixture.Open())
        {
            Assert.Empty(await check.Donhangs.ToListAsync());
            Assert.Empty(await check.Thanhtoans.ToListAsync());
            Assert.Empty(await check.Lichsutrangthaidonhangs.ToListAsync());
            Assert.Empty(await check.Thongbaos.ToListAsync());
            Assert.Empty(await check.Giaodichvis.ToListAsync());
            Assert.Equal(0, (await check.Khuyenmais.SingleAsync()).SoLuongDaDung);
            Assert.Equal(1, (await check.Chitietgiohangs.SingleAsync()).SoLuong);
            var restaurant = await check.Nhahangs.SingleAsync();
            restaurant.CheDoHoatDong = "MoThuCong";
            restaurant.TrangThaiHoatDong = "MoCua";
            restaurant.TrangThaiDuyet = "DaDuyet";
            (await check.Taikhoans.SingleAsync(x => x.MaTaiKhoan == 2)).TrangThai = true;
            var contract = await check.Hopdongnhahangs.SingleAsync();
            contract.TrangThai = "HieuLuc";
            contract.NgayKetThuc = DateOnly.FromDateTime(VietnamBusinessTime.Now()).AddDays(10);
            await check.SaveChangesAsync();
        }
        // A rejected attempt must not consume the key, cart, or voucher; a successful retry is replayable.
        for (var attempt = 0; attempt < 2; attempt++)
        {
            await using var retry = fixture.Open();
            Assert.Equal(201, Assert.IsType<ContentResult>(await IsolatedMySql.Orders(retry, key).DatHang(request)).StatusCode);
        }
        await using var final = fixture.Open();
        Assert.Equal(1, await final.Donhangs.CountAsync());
        Assert.Equal(1, await final.Thanhtoans.CountAsync());
        Assert.Equal(1, (await final.Khuyenmais.SingleAsync()).SoLuongDaDung);
    }

    [MySqlFact]
    public async Task ClosingHourOrContractMidnightWhileWaitingForVoucherRejectsWithoutConsumption()
    {
        foreach (var midnight in new[] { false, true })
        {
            var fixture = await IsolatedMySql.CreateAsync();
            var day = DateOnly.FromDateTime(VietnamBusinessTime.Now());
            var start = day.ToDateTime(midnight ? new TimeOnly(23, 59, 59) : new TimeOnly(17, 59, 59));
            var clock = new MovingClock(new DateTimeOffset(start, TimeSpan.FromHours(7)).ToUniversalTime());
            int cartId;
            await using (var seed = fixture.Open())
            {
                await IsolatedMySql.Cart(seed).ThemMonVaoGio(new() { MaMonAn = 1, SoLuong = 1 });
                cartId = (await seed.Giohangs.SingleAsync()).MaGioHang;
                var restaurant = await seed.Nhahangs.SingleAsync();
                restaurant.CheDoHoatDong = midnight ? "MoThuCong" : "TuDong";
                restaurant.GioMoCua = new TimeOnly(0, 0);
                restaurant.GioDongCua = new TimeOnly(18, 0);
                if (midnight) (await seed.Hopdongnhahangs.SingleAsync()).NgayKetThuc = day;
                seed.Khuyenmais.Add(new() { MaKhuyenMai = 1, MaNhaHang = 1, MaCode = "CLOCK", LoaiGiam = "PhanTram",
                    GiaTriGiam = 10, SoLuong = 1, SoLuotToiDaMoiKhach = 1, TrangThai = true,
                    NgayBatDau = DateTime.Now.AddDays(-2), NgayKetThuc = DateTime.Now.AddDays(2) });
                await seed.SaveChangesAsync();
            }
            var advance = new BeforeVoucherLock(() => clock.Instant = clock.Instant.AddSeconds(1));
            await using (var checkout = fixture.Open(advance))
                Assert.IsType<ConflictObjectResult>(await IsolatedMySql.Orders(checkout, clock: clock).DatHang(
                    new() { MaGioHang = cartId, MaDiaChi = 1, MaPhuongThuc = 1, MaKhuyenMai = 1 }));
            Assert.True(advance.Executed);
            await using var check = fixture.Open();
            Assert.Empty(await check.Donhangs.ToListAsync());
            Assert.Empty(await check.Thanhtoans.ToListAsync());
            Assert.Equal(0, (await check.Khuyenmais.SingleAsync()).SoLuongDaDung);
            Assert.Equal(1, (await check.Chitietgiohangs.SingleAsync()).SoLuong);
        }
    }

    private sealed class MovingClock(DateTimeOffset instant) : TimeProvider
    {
        public DateTimeOffset Instant { get; set; } = instant;
        public override DateTimeOffset GetUtcNow() => Instant;
        public override TimeZoneInfo LocalTimeZone => TimeZoneInfo.Utc;
    }

    private sealed class BeforeVoucherLock(Action advance) : DbCommandInterceptor
    {
        public bool Executed { get; private set; }
        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command, CommandEventData eventData,
            InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            if (!Executed && command.CommandText.Contains("FROM khuyenmai WHERE MaKhuyenMai", StringComparison.Ordinal) &&
                command.CommandText.Contains("FOR UPDATE", StringComparison.Ordinal))
            {
                Executed = true;
                advance();
            }
            return ValueTask.FromResult(result);
        }
    }

    private sealed class BeforeRestaurantLock(Func<Task> change) : DbCommandInterceptor
    {
        public bool Executed { get; private set; }
        public override async ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command, CommandEventData eventData,
            InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            if (!Executed && command.CommandText.Contains("FROM nhahang WHERE MaNhaHang", StringComparison.Ordinal) &&
                command.CommandText.Contains("FOR UPDATE", StringComparison.Ordinal))
            {
                Executed = true;
                await change();
            }
            return result;
        }
    }
}
