using System.Security.Claims;
using DatMonAnOnline.API.Controllers;
using DatMonAnOnline.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace DatMonAnOnline.Tests;

public class PromotionConcurrencyTests
{
    [MySqlFact]
    public async Task ConcurrentSaveAndRetryUseExistingUniqueKey()
    {
        var fixture = await Setup();
        async Task Save()
        {
            await using var db = fixture.Open();
            Assert.IsType<OkObjectResult>(await Controller(db).LuuVoucher(1));
        }
        await Task.WhenAll(Enumerable.Range(0, 10).Select(_ => Save()));
        await Save();
        await using var check = fixture.Open();
        Assert.Equal(1, await check.KhachhangKhuyenmais.CountAsync());
    }

    [MySqlFact]
    public async Task ConcurrentUnsaveReturnsOkOrNotFoundNot500()
    {
        var fixture = await Setup();
        await using (var db = fixture.Open()) await Controller(db).LuuVoucher(1);
        async Task<IActionResult> Remove()
        {
            await using var db = fixture.Open();
            return await Controller(db).BoLuuVoucher(1);
        }
        var results = await Task.WhenAll(Remove(), Remove());
        Assert.Single(results.OfType<OkObjectResult>());
        Assert.Single(results.OfType<NotFoundObjectResult>());
    }

    [MySqlFact]
    public async Task LimitEditWaitsForUsageAndValidatesLatestCount()
    {
        var fixture = await Setup();
        await using var checkout = fixture.Open();
        await using var tx = await checkout.Database.BeginTransactionAsync();
        var voucher = (await checkout.Khuyenmais.FromSqlRaw("SELECT * FROM khuyenmai WHERE MaKhuyenMai=1 FOR UPDATE").ToListAsync()).Single();
        await using var editing = fixture.Open();
        var edit = Controller(editing, "Admin", "3").CapNhatKhuyenMai(1, new() { SoLuong = 1, NgayBatDau = DateTime.Now.AddDays(-1), NgayKetThuc = DateTime.Now.AddDays(1) });
        Assert.NotSame(edit, await Task.WhenAny(edit, Task.Delay(150)));
        voucher.SoLuongDaDung = 2;
        await checkout.SaveChangesAsync();
        await tx.CommitAsync();
        Assert.IsType<BadRequestObjectResult>(await edit.WaitAsync(TimeSpan.FromSeconds(10)));
        await using var check = fixture.Open();
        Assert.Equal(2, (await check.Khuyenmais.SingleAsync()).SoLuong);
    }

    [MySqlFact]
    public async Task OtherRestaurantCannotEditVoucher()
    {
        var fixture = await Setup();
        await using var db = fixture.Open();
        var result = await Controller(db, "Quan", "99").CapNhatKhuyenMai(1, new());
        Assert.Equal(403, Assert.IsType<ObjectResult>(result).StatusCode);
    }

    private static KhuyenMaiController Controller(DatMonAnOnlineContext db, string role = "KhachHang", string id = "1")
    {
        var controller = new KhuyenMaiController(db);
        IsolatedMySql.AsCustomer(controller);
        controller.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, id), new Claim(ClaimTypes.Role, role)], "Test"));
        return controller;
    }

    private static async Task<IsolatedMySql> Setup()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await using var db = fixture.Open();
        db.Khuyenmais.Add(new Khuyenmai { MaKhuyenMai = 1, MaNhaHang = 1, MaCode = "TEST", LoaiGiam = "SoTien", GiaTriGiam = 1000, SoLuong = 2, SoLuotToiDaMoiKhach = 1, TrangThai = true, NgayBatDau = DateTime.Now.AddDays(-1), NgayKetThuc = DateTime.Now.AddDays(1) });
        await db.SaveChangesAsync();
        return fixture;
    }
}
