using System.Security.Claims;
using System.Text.Json;
using DatMonAnOnline.API.Common;
using DatMonAnOnline.API.Controllers;
using DatMonAnOnline.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace DatMonAnOnline.Tests;

public class ManagementPaginationTests
{
    private static JsonElement Json(IActionResult result) => JsonSerializer.SerializeToElement(
        Assert.IsType<OkObjectResult>(result).Value, new JsonSerializerOptions(JsonSerializerDefaults.Web));

    private static T Merchant<T>(T api, string account = "2") where T : ControllerBase
    {
        IsolatedMySql.AsCustomer(api);
        api.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity([
            new(ClaimTypes.NameIdentifier, account), new(ClaimTypes.Role, "Quan")], "Test"));
        return api;
    }

    [Theory]
    [InlineData(0, 10)]
    [InlineData(1, 101)]
    [InlineData(1, 0)]
    public async Task InvalidPagingFailsBeforeDatabaseAccess(int page, int size)
    {
        Assert.IsType<BadRequestObjectResult>(await new NhomToppingController(null!).GetNhomToppings(1, page, size));
        Assert.IsType<BadRequestObjectResult>(await new ToppingController(null!).GetToppingsCuaQuan(1, new() { PageNumber = page, PageSize = size }));
        Assert.IsType<BadRequestObjectResult>(await new KhachHangController(null!, null!).GetHoanTien(page, size));
        Assert.IsType<BadRequestObjectResult>(await new DanhMucController(null!).GetDanhMucsCuaQuan(new() { PageNumber = page, PageSize = size }));
    }

    [MySqlFact]
    public async Task CategoryCrudKeepsGlobalOrderingCompleteSelectorsAndDeletionGuards()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await using var db = fixture.Open();
        var api = Merchant(new DanhMucController(db));
        for (var i = 0; i < 12; i++)
            Assert.IsType<CreatedResult>(await api.CreateDanhMuc(new() { TenDanhMuc = $"Category {i}", ThuTuHienThi = i + 1 }));
        var page = Json(await api.GetDanhMucsCuaQuan(new() { PageNumber = 2, PageSize = 5 }));
        Assert.Equal(13, page.GetProperty("totalItems").GetInt32());
        Assert.Equal(5, page.GetProperty("items").GetArrayLength());
        Assert.Equal(6, page.GetProperty("items")[0].GetProperty("thuTuHienThi").GetInt32());
        Assert.Equal(13, Json(await api.GetDanhMucs(1)).GetArrayLength());
        var id = page.GetProperty("items")[0].GetProperty("maDanhMuc").GetInt32();
        Assert.IsType<OkObjectResult>(await api.UpdateDanhMuc(id, new() { TenDanhMuc = "First renamed", ThuTuHienThi = 0 }));
        Assert.Equal(id, Json(await api.GetDanhMucsCuaQuan(new())).GetProperty("items")[0].GetProperty("maDanhMuc").GetInt32());
        // The seeded category is referenced by a dish and must remain protected.
        Assert.IsType<ConflictObjectResult>(await api.DeleteDanhMuc(1));
        foreach (var category in await db.Danhmucs.Where(x => x.MaDanhMuc != 1).Select(x => x.MaDanhMuc).ToListAsync())
            Assert.IsType<OkObjectResult>(await api.DeleteDanhMuc(category));
        var clamped = Json(await api.GetDanhMucsCuaQuan(new() { PageNumber = 3, PageSize = 5 }));
        Assert.Equal(1, clamped.GetProperty("pageNumber").GetInt32());
        Assert.Equal(1, clamped.GetProperty("totalItems").GetInt32());
    }

    [MySqlFact]
    public async Task GroupAndToppingCrudPagesClampAfterDeletionAndKeepPublicSelectorsComplete()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await using var db = fixture.Open();
        var groups = Merchant(new NhomToppingController(db));
        var toppings = Merchant(new ToppingController(db));
        for (var i = 0; i < 13; i++)
            Assert.IsType<CreatedResult>(await groups.CreateNhomTopping(new() { TenNhom = $"Group {i}", ChonToiDa = 1 }));
        var first = Json(await groups.GetNhomToppings(1, 1, 12));
        var last = Json(await groups.GetNhomToppings(1, 2, 12));
        Assert.Equal(13, first.GetProperty("totalItems").GetInt32());
        Assert.Equal(12, first.GetProperty("items").GetArrayLength());
        Assert.Equal(1, last.GetProperty("items").GetArrayLength());
        Assert.Equal(13, Json(await groups.GetNhomToppings(1)).GetArrayLength());
        var groupId = last.GetProperty("items")[0].GetProperty("maNhomTopping").GetInt32();
        Assert.IsType<OkObjectResult>(await groups.UpdateNhomTopping(groupId, new() { TenNhom = "Renamed group", ChonToiDa = 1 }));
        Assert.Equal("Renamed group", Json(await groups.GetNhomToppings(1, 2, 12)).GetProperty("items")[0].GetProperty("tenNhom").GetString());
        for (var i = 0; i < 11; i++)
            Assert.IsType<CreatedResult>(await toppings.CreateTopping(new() { MaNhomTopping = groupId, TenTopping = $"Option {i}", GiaThem = 1000 }));
        var second = Json(await toppings.GetToppingsCuaQuan(groupId, new() { PageNumber = 2, PageSize = 10 }));
        Assert.Equal(11, second.GetProperty("activeTotal").GetInt32());
        Assert.Equal(11, Json(await toppings.GetToppings(groupId)).GetArrayLength());
        var optionId = second.GetProperty("items")[0].GetProperty("maTopping").GetInt32();
        Assert.IsType<OkObjectResult>(await toppings.UpdateTopping(optionId, new() { TenTopping = "Updated option", GiaThem = 2000 }));
        Assert.IsType<OkObjectResult>(await toppings.UpdateTrangThai(optionId, new() { TrangThai = false }));
        var updated = Json(await toppings.GetToppingsCuaQuan(groupId, new() { PageNumber = 2, PageSize = 10 }));
        Assert.Equal(10, updated.GetProperty("activeTotal").GetInt32());
        Assert.Equal(2000, updated.GetProperty("items")[0].GetProperty("giaThem").GetDecimal());
        Assert.False(updated.GetProperty("items")[0].GetProperty("trangThai").GetBoolean());
        Assert.IsType<OkObjectResult>(await toppings.DeleteTopping(optionId));
        var clamped = Json(await toppings.GetToppingsCuaQuan(groupId, new() { PageNumber = 2, PageSize = 10 }));
        Assert.Equal(1, clamped.GetProperty("pageNumber").GetInt32());
        Assert.Equal(10, clamped.GetProperty("items").GetArrayLength());
        Assert.IsType<ConflictObjectResult>(await groups.DeleteNhomTopping(groupId));
        foreach (var item in await db.Toppings.Where(x => x.MaNhomTopping == groupId).Select(x => x.MaTopping).ToListAsync())
            Assert.IsType<OkObjectResult>(await toppings.DeleteTopping(item));
        Assert.IsType<OkObjectResult>(await groups.DeleteNhomTopping(groupId));
        Assert.Equal(1, Json(await groups.GetNhomToppings(1, 2, 12)).GetProperty("pageNumber").GetInt32());
    }

    [MySqlFact]
    public async Task ManagementReadsAndWritesCannotUseAnotherRestaurantsGroups()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await using var db = fixture.Open();
        db.Taikhoans.Add(new() { MaTaiKhoan = 4, MaRole = 2, Email = "foreign@example.invalid", MatKhau = "test", TrangThai = true });
        db.Nhahangs.Add(new() { MaNhaHang = 2, MaTaiKhoan = 4, TenNhaHang = "Foreign", DiaChiQuan = "Test", TrangThaiDuyet = "DaDuyet" });
        db.Nhomtoppings.Add(new() { MaNhomTopping = 99, MaNhaHang = 2, TenNhom = "Foreign" });
        db.Toppings.Add(new() { MaTopping = 99, MaNhomTopping = 99, TenTopping = "Foreign", TrangThai = true });
        await db.SaveChangesAsync();
        var groups = Merchant(new NhomToppingController(db));
        var toppings = Merchant(new ToppingController(db));
        Assert.IsType<ForbidResult>(await groups.GetNhomToppings(2, 1, 10));
        Assert.IsType<ForbidResult>(await toppings.GetToppingsCuaQuan(99, new()));
        Assert.IsType<ForbidResult>(await toppings.UpdateTopping(99, new() { TenTopping = "Hacked", GiaThem = 0 }));
        Assert.IsType<ForbidResult>(await toppings.DeleteTopping(99));
        Assert.IsType<ForbidResult>(await groups.DeleteNhomTopping(99));
        Assert.Equal(0, Json(await groups.GetNhomToppings(1, 1, 10)).GetProperty("totalItems").GetInt32());
    }

    [MySqlFact]
    public async Task RefundPagingIsOwnerScopedStableAndBackwardCompatible()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await using var db = fixture.Open();
        db.Taikhoans.Add(new() { MaTaiKhoan = 4, MaRole = 3, Email = "foreign@example.invalid", MatKhau = "test", TrangThai = true });
        db.Khachhangs.Add(new() { MaKhachHang = 2, MaTaiKhoan = 4, HoTen = "Foreign" });
        var now = VietnamBusinessTime.Now();
        for (var i = 1; i <= 12; i++)
        {
            var order = new Donhang { MaDonHangHienThi = $"REFUND-{i}", MaKhachHang = i == 12 ? 2 : 1,
                MaNhaHang = 1, MaTrangThai = 6, TongTienHang = 1000, ThanhTien = 1000,
                TenNguoiNhan = "Test", SoDienThoaiNhan = "0000000000", DiaChiGiaoHang = "Test" };
            var payment = new Thanhtoan { MaPhuongThuc = 5, SoTien = 1000, TrangThaiThanhToan = "ThanhCong" };
            order.Thanhtoans.Add(payment); db.Donhangs.Add(order); await db.SaveChangesAsync();
            db.Hoantiens.Add(new() { MaDonHang = order.MaDonHang, MaThanhToan = payment.MaThanhToan,
                SoTienHoan = 1000, LyDoHoan = "Test", KenhHoanTien = "FoodPay", TrangThai = "ThanhCong", MaYeuCauHoan = $"REFUND:{i}",
                ThoiGianYeuCau = now, ThoiGianHoanThanh = now, NgayCapNhat = now });
        }
        await db.SaveChangesAsync();
        var controller = IsolatedMySql.AsCustomer(new KhachHangController(db, null!));
        var first = Json(await controller.GetHoanTien(1, 5));
        var last = Json(await controller.GetHoanTien(int.MaxValue, 5));
        Assert.Equal(11, first.GetProperty("totalItems").GetInt32());
        Assert.Equal("REFUND-11", first.GetProperty("items")[0].GetProperty("maDonHangHienThi").GetString());
        Assert.Equal(3, last.GetProperty("pageNumber").GetInt32());
        Assert.Equal(1, last.GetProperty("items").GetArrayLength());
        Assert.Equal(11, Json(await controller.GetHoanTien()).GetArrayLength());
    }
}
