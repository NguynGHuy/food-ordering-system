using System.ComponentModel.DataAnnotations;
using DatMonAnOnline.API.Common;
using DatMonAnOnline.API.Controllers;
using DatMonAnOnline.API.Models;
using DatMonAnOnline.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace DatMonAnOnline.Tests;

public class MoneyBoundsTests
{
    [Theory]
    [InlineData("-1", false)]
    [InlineData("0.5", false)]
    [InlineData("1000000000000000000", false)]
    [InlineData("79228162514264337593543950335", false)]
    [InlineData("0", true)]
    [InlineData("999999999999999999", true)]
    public void EveryCatalogMoneyFieldValidatesWholeVndStorageBounds(string value, bool valid)
    {
        var amount = decimal.Parse(value, System.Globalization.CultureInfo.InvariantCulture);
        object[] requests = [
            new MonAnController.TaoMonAnRequest { MaDanhMuc = 1, TenMonAn = "Test", Gia = amount },
            new MonAnController.CapNhatMonAnRequest { MaDanhMuc = 1, TenMonAn = "Test", Gia = amount },
            new ToppingController.TaoToppingRequest { MaNhomTopping = 1, TenTopping = "Test", GiaThem = amount },
            new ToppingController.CapNhatToppingRequest { TenTopping = "Test", GiaThem = amount },
            new NhaHangController.UpdateNhaHangDto { TenNhaHang = "Test", DiaChiQuan = "Test", PhiShipMacDinh = amount },
            new AuthController.RegisterNhaHangDto { Email = "test@example.invalid", MatKhau = "test-password", TenNhaHang = "Test", DiaChiQuan = "Test", PhiShipMacDinh = amount }
        ];
        foreach (var request in requests)
            Assert.Equal(valid, Validator.TryValidateObject(request, new ValidationContext(request), [], true));
    }

    [MySqlFact]
    public async Task OversizedCartReturns400WithoutOrderOrPaymentAndCanRetry()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        int cartId;
        await using (var db = fixture.Open())
        {
            (await db.Monans.SingleAsync()).Gia = VndAmountAttribute.Maximum;
            await db.SaveChangesAsync();
            await IsolatedMySql.Cart(db).ThemMonVaoGio(new() { MaMonAn = 1, SoLuong = 2 });
            cartId = (await db.Giohangs.SingleAsync()).MaGioHang;
        }
        var key = Guid.NewGuid().ToString();
        await using (var db = fixture.Open())
            Assert.IsType<BadRequestObjectResult>(await IsolatedMySql.Orders(db, key).DatHang(new() { MaGioHang = cartId, MaDiaChi = 1, MaPhuongThuc = 1 }));
        await using (var check = fixture.Open())
        {
            Assert.Empty(await check.Donhangs.ToListAsync());
            Assert.Empty(await check.Thanhtoans.ToListAsync());
            Assert.Equal(2, (await check.Chitietgiohangs.SingleAsync()).SoLuong);
            (await check.Monans.SingleAsync()).Gia = 10000;
            await check.SaveChangesAsync();
        }
        await using var retry = fixture.Open();
        Assert.Equal(201, Assert.IsType<ContentResult>(await IsolatedMySql.Orders(retry, key).DatHang(new() { MaGioHang = cartId, MaDiaChi = 1, MaPhuongThuc = 1 })).StatusCode);
    }

    [MySqlFact]
    public async Task CreditAtStorageLimitRejectsOverflowWithoutChangingBalanceOrLedger()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await using var db = fixture.Open();
        db.Vis.Add(new Vi { MaTaiKhoan = 1, SoDu = 0, DonViTienTe = "VND", TrangThai = "HoatDong" });
        await db.SaveChangesAsync();
        await using var tx = await db.Database.BeginTransactionAsync();
        var wallet = new WalletService(db);
        Assert.True((await wallet.CreditAsync(1, VndAmountAttribute.Maximum, WalletTransactionTypes.KhoiTao, "LIMIT-OPENING")).Succeeded);
        Assert.False((await wallet.CreditAsync(1, 1, WalletTransactionTypes.NapTien, "OVERFLOW")).Succeeded);
        Assert.False((await wallet.CreditAsync(1, decimal.MaxValue, WalletTransactionTypes.NapTien, "OVERFLOW2")).Succeeded);
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        await using var check = fixture.Open();
        Assert.Equal(VndAmountAttribute.Maximum, (await check.Vis.SingleAsync()).SoDu);
        Assert.Single(await check.Giaodichvis.ToListAsync());
    }
}
