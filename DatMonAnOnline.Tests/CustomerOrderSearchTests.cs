using System.Text.Json;
using DatMonAnOnline.API.Models;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace DatMonAnOnline.Tests;

public class CustomerOrderSearchTests
{
    private static JsonElement Json(IActionResult result) => JsonSerializer.SerializeToElement(
        Assert.IsType<OkObjectResult>(result).Value, new JsonSerializerOptions(JsonSerializerDefaults.Web));

    [MySqlFact]
    public async Task RestaurantSearchUsesTheSameHistoricalNameAsTheDisplayedRow()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await using var db = fixture.Open();
        db.Donhangs.Add(new() { MaDonHangHienThi = "FALLBACK", MaKhachHang = 1, MaNhaHang = 1,
            MaTrangThai = 1, ThoiGianDat = DateTime.Now, TenNguoiNhan = "Test", SoDienThoaiNhan = "0", DiaChiGiaoHang = "Test" });
        await db.SaveChangesAsync();
        var controller = IsolatedMySql.Orders(db);
        Assert.Equal(1, Json(await controller.DonHangCuaToi(new(), search: "Test restaurant")).GetProperty("totalItems").GetInt32());
        db.Donhangs.Local.Single().TenNhaHangLucDat = "Original name";
        await db.SaveChangesAsync();
        Assert.Equal(0, Json(await controller.DonHangCuaToi(new(), search: "Test restaurant")).GetProperty("totalItems").GetInt32());
        Assert.Equal(1, Json(await controller.DonHangCuaToi(new(), search: "Original name")).GetProperty("totalItems").GetInt32());
    }

    [MySqlFact]
    public async Task SearchIsOwnerScopedAndCombinesWithCountsFiltersAndPagination()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await using var db = fixture.Open();
        db.Taikhoans.Add(new() { MaTaiKhoan = 4, MaRole = 3, Email = "other@example.invalid", MatKhau = "test", TrangThai = true });
        db.Khachhangs.Add(new() { MaKhachHang = 2, MaTaiKhoan = 4, HoTen = "Other" });
        for (var i = 1; i <= 4; i++)
            db.Donhangs.Add(new Donhang {
                MaDonHang = i, MaDonHangHienThi = $"SEARCH-{i}", MaKhachHang = i == 4 ? 2 : 1,
                MaNhaHang = 1, MaHopDong = 1, MaTrangThai = i == 2 ? 5 : 1,
                TenNhaHangLucDat = "Historic restaurant", ThoiGianDat = new DateTime(2026, 1, 1),
                TenNguoiNhan = "Test", SoDienThoaiNhan = "0000000001", DiaChiGiaoHang = "Test"
            });
        await db.SaveChangesAsync();
        var controller = IsolatedMySql.Orders(db);
        var first = Json(await controller.DonHangCuaToi(new() { PageSize = 1 }, search: "  Historic  "));
        var second = Json(await controller.DonHangCuaToi(new() { PageSize = 1, PageNumber = 2 }, search: "Historic"));
        Assert.Equal(3, first.GetProperty("totalItems").GetInt32());
        Assert.Equal(3, first.GetProperty("counts").GetProperty("all").GetInt32());
        Assert.Equal(3, first.GetProperty("items")[0].GetProperty("maDonHang").GetInt32());
        Assert.Equal(2, second.GetProperty("items")[0].GetProperty("maDonHang").GetInt32());
        var completed = Json(await controller.DonHangCuaToi(new(), "completed", "Historic"));
        Assert.Equal(1, completed.GetProperty("totalItems").GetInt32());
        Assert.Equal(3, completed.GetProperty("counts").GetProperty("all").GetInt32());
        Assert.Equal(0, Json(await controller.DonHangCuaToi(new(), search: "SEARCH-4")).GetProperty("totalItems").GetInt32());
        Assert.Equal(1, Json(await controller.DonHangCuaToi(new(), search: "SEARCH-2")).GetProperty("totalItems").GetInt32());
        Assert.Equal(1, Json(await controller.DonHangCuaToi(new(), search: "2")).GetProperty("totalItems").GetInt32());
        Assert.Equal(0, Json(await controller.DonHangCuaToi(new(), search: "%_")).GetProperty("totalItems").GetInt32());
        Assert.Equal(3, Json(await controller.DonHangCuaToi(new(), search: "   ")).GetProperty("totalItems").GetInt32());
        Assert.IsType<BadRequestObjectResult>(await controller.DonHangCuaToi(new(), search: new string('a', 151)));
    }
}
