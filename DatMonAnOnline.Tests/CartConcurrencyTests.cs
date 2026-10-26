using DatMonAnOnline.API.Controllers;
using DatMonAnOnline.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace DatMonAnOnline.Tests;

public class CartConcurrencyTests
{
    [MySqlFact]
    public async Task ConcurrentAddsCreateOneCartAndLoseNoQuantity()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await Task.WhenAll(Enumerable.Range(0, 12).Select(async _ =>
        {
            await using var db = fixture.Open();
            Assert.IsType<OkObjectResult>(await IsolatedMySql.Cart(db).ThemMonVaoGio(new() { MaMonAn = 1, SoLuong = 1 }));
        }));
        await using var check = fixture.Open();
        Assert.Equal(1, await check.Giohangs.CountAsync());
        Assert.Equal(12, (await check.Chitietgiohangs.SingleAsync()).SoLuong);
    }

    [MySqlFact]
    public async Task FailedBatchRollsBackEarlierItems()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await using (var db = fixture.Open())
            Assert.IsType<NotFoundObjectResult>(await IsolatedMySql.Cart(db).DongBoGioKhach(new() { CacMon = [new() { MaMonAn = 1, SoLuong = 1 }, new() { MaMonAn = 999, SoLuong = 1 }] }));
        await using var check = fixture.Open();
        Assert.Empty(await check.Giohangs.ToListAsync());
        Assert.Empty(await check.Chitietgiohangs.ToListAsync());
    }

    [MySqlFact]
    public async Task DatabaseFailureRollsBackNewCartAndDetails()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await using (var db = fixture.Open())
        {
            await db.Database.ExecuteSqlRawAsync("CREATE TRIGGER audit_fail_cart BEFORE INSERT ON chitietgiohang FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Injected test failure'");
            await Assert.ThrowsAsync<DbUpdateException>(() => IsolatedMySql.Cart(db).ThemMonVaoGio(new() { MaMonAn = 1, SoLuong = 1 }));
        }
        await using var check = fixture.Open();
        Assert.Empty(await check.Giohangs.ToListAsync());
        Assert.Empty(await check.Chitietgiohangs.ToListAsync());
    }

    [MySqlFact]
    public async Task GetDoesNotRewriteLegacyDuplicateLines()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await using (var db = fixture.Open())
        {
            var cart = new Giohang { MaKhachHang = 1, MaNhaHang = 1 };
            cart.Chitietgiohangs.Add(new() { MaMonAn = 1, SoLuong = 1 });
            cart.Chitietgiohangs.Add(new() { MaMonAn = 1, SoLuong = 2 });
            db.Giohangs.Add(cart);
            await db.SaveChangesAsync();
        }
        await using (var db = fixture.Open()) Assert.IsType<OkObjectResult>(await IsolatedMySql.Cart(db).XemGioHangTheoNhaHang(1));
        await using var check = fixture.Open();
        Assert.Equal(2, await check.Chitietgiohangs.CountAsync());
        Assert.Equal(3, await check.Chitietgiohangs.SumAsync(i => i.SoLuong));
    }

    [MySqlFact]
    public async Task CheckoutAndAddHaveOneConsistentOrdering()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        int cartId;
        await using (var db = fixture.Open())
        {
            await IsolatedMySql.Cart(db).ThemMonVaoGio(new() { MaMonAn = 1, SoLuong = 1 });
            cartId = (await db.Giohangs.SingleAsync()).MaGioHang;
        }
        await using var checkoutDb = fixture.Open();
        await using var addDb = fixture.Open();
        var results = await Task.WhenAll(
            IsolatedMySql.Orders(checkoutDb).DatHang(new() { MaGioHang = cartId, MaDiaChi = 1, MaPhuongThuc = 1 }),
            IsolatedMySql.Cart(addDb).ThemMonVaoGio(new() { MaMonAn = 1, SoLuong = 1 }));
        Assert.Equal(201, Assert.IsType<ContentResult>(results[0]).StatusCode);
        Assert.IsType<OkObjectResult>(results[1]);
        await using var check = fixture.Open();
        var order = await check.Donhangs.SingleAsync();
        var ordered = await check.Chitietdonhangs.SumAsync(i => i.SoLuong);
        var remaining = await check.Chitietgiohangs.SumAsync(i => i.SoLuong);
        Assert.Equal(2, ordered + remaining);
        Assert.Equal(ordered * 10010m, order.TongTienHang);
        Assert.Equal(order.TongTienHang, await check.Chitietdonhangs.SumAsync(i => i.ThanhTien));
        Assert.Equal(order.ThanhTien, (await check.Thanhtoans.SingleAsync()).SoTien);
    }

    [MySqlFact]
    public async Task ConcurrentQuantityLimitIsCheckedAfterLock()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        var results = await Task.WhenAll(new[] { 90, 20 }.Select(async quantity =>
        {
            await using var db = fixture.Open();
            return await IsolatedMySql.Cart(db).ThemMonVaoGio(new() { MaMonAn = 1, SoLuong = quantity });
        }));
        Assert.Single(results.OfType<OkObjectResult>());
        Assert.Single(results.OfType<BadRequestObjectResult>());
        await using var check = fixture.Open();
        Assert.Contains((await check.Chitietgiohangs.SingleAsync()).SoLuong, new[] { 20, 90 });
    }
}
