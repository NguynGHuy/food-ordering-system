using DatMonAnOnline.API.Models;
using DatMonAnOnline.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace DatMonAnOnline.Tests;

public class CheckoutMoneyTests
{
    [MySqlFact]
    public async Task NewPlatformFeeRoundsHalfUpAndMatchesPersistedSnapshot()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await using var db = fixture.Open();
        await IsolatedMySql.Cart(db).ThemMonVaoGio(new() { MaMonAn = 1, SoLuong = 1 });
        var cart = await db.Giohangs.SingleAsync();
        await using var checkout = fixture.Open();
        var result = await IsolatedMySql.Orders(checkout).DatHang(new() { MaGioHang = cart.MaGioHang, MaDiaChi = 1, MaPhuongThuc = 1 });
        Assert.Equal(201, Assert.IsType<ContentResult>(result).StatusCode);
        await using var check = fixture.Open();
        var order = await check.Donhangs.SingleAsync();
        Assert.Equal(501m, order.PhiNenTang); // 10,010 * 5% = 500.5
        Assert.Equal(24509m, order.SoTienNhaHangNhan);
        Assert.Equal(25010m, order.ThanhTien);
    }

    [MySqlFact]
    public async Task ConcurrentFoodPayCheckoutAndRetryDebitOnceWithRoundedVoucher()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        int cartId;
        await using (var db = fixture.Open())
        {
            (await db.Monans.SingleAsync()).Gia = 10005;
            db.Vis.Add(new Vi { MaTaiKhoan = 1, SoDu = 0, DonViTienTe = "VND", TrangThai = "HoatDong" });
            db.Khuyenmais.Add(new Khuyenmai { MaKhuyenMai = 1, MaNhaHang = 1, MaCode = "TEST10", LoaiGiam = "PhanTram", GiaTriGiam = 10, SoLuong = 1, SoLuotToiDaMoiKhach = 1, TrangThai = true, NgayBatDau = DateTime.Now.AddDays(-1), NgayKetThuc = DateTime.Now.AddDays(1) });
            await db.SaveChangesAsync();
            await using (var transaction = await db.Database.BeginTransactionAsync())
            {
                Assert.True((await new WalletService(db).CreditAsync(1, 100000, WalletTransactionTypes.KhoiTao, "TEST-OPENING")).Succeeded);
                await transaction.CommitAsync();
            }
            await IsolatedMySql.Cart(db).ThemMonVaoGio(new() { MaMonAn = 1, SoLuong = 1 });
            cartId = (await db.Giohangs.SingleAsync()).MaGioHang;
        }
        var key = Guid.NewGuid().ToString();
        async Task<string?> Checkout()
        {
            await using var db = fixture.Open();
            var result = await IsolatedMySql.Orders(db, key).DatHang(new() { MaGioHang = cartId, MaDiaChi = 1, MaPhuongThuc = 5, MaKhuyenMai = 1 });
            var response = Assert.IsType<ContentResult>(result);
            Assert.Equal(201, response.StatusCode);
            return response.Content;
        }
        var responses = await Task.WhenAll(Checkout(), Checkout());
        Assert.Equal(responses[0], responses[1]);
        Assert.Equal(responses[0], await Checkout()); // timeout/retry after commit
        await using var check = fixture.Open();
        var order = await check.Donhangs.SingleAsync();
        Assert.Equal(1001m, order.SoTienGiam);
        Assert.Equal(24004m, order.ThanhTien);
        Assert.Equal(450m, order.PhiNenTang);
        Assert.Equal(24004m, (await check.Thanhtoans.SingleAsync()).SoTien);
        Assert.Equal(75996m, (await check.Vis.SingleAsync()).SoDu);
        Assert.Equal(1, await check.Giaodichvis.CountAsync(t => t.LoaiGiaoDich == "ThanhToan"));
        Assert.Equal(1, (await check.Khuyenmais.SingleAsync()).SoLuongDaDung);
    }
}
