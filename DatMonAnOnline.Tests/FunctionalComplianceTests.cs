using System.Security.Claims;
using System.Text.Json;
using DatMonAnOnline.API.Common;
using DatMonAnOnline.API.Controllers;
using DatMonAnOnline.API.Models;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace DatMonAnOnline.Tests;

public class FunctionalComplianceTests
{
    [MySqlFact]
    public async Task OrderSearchCombinesStatusAndPaginationAndNeverReturnsAnotherRestaurant()
    {
        var fixture = await Seed(); await using var db = fixture.Open();
        var api = Merchant(IsolatedMySql.Orders(db));
        var first = Json(await api.DanhSachDonHangCuaQuan(new() { PageNumber = 1, PageSize = 10 }, 1, "Needle"));
        var second = Json(await api.DanhSachDonHangCuaQuan(new() { PageNumber = 2, PageSize = 10 }, 1, "Needle"));
        Assert.Equal(12, first.GetProperty("totalItems").GetInt32());
        Assert.Equal(10, first.GetProperty("items").GetArrayLength()); Assert.Equal(2, second.GetProperty("items").GetArrayLength());
        Assert.All(first.GetProperty("items").EnumerateArray(), x => Assert.NotEqual(99, x.GetProperty("maDonHang").GetInt32()));
        Assert.Equal(0, Json(await api.DanhSachDonHangCuaQuan(new(), 3, "Needle")).GetProperty("totalItems").GetInt32());
        Assert.Equal(0, Json(await api.DanhSachDonHangCuaQuan(new(), null, "FOREIGN-ONLY")).GetProperty("totalItems").GetInt32());
    }

    [MySqlFact]
    public async Task OrderSearchMatchesRecipientNamePhoneAndLiteralSpecialCharacters()
    {
        var fixture = await Seed(); await using var db = fixture.Open(); var api = Merchant(IsolatedMySql.Orders(db));
        foreach (var term in new[] { "  Receiver twelve  ", "0900123456", "%_" })
        {
            var result = Json(await api.DanhSachDonHangCuaQuan(new(), null, term));
            Assert.Equal(1, result.GetProperty("totalItems").GetInt32());
            Assert.Equal(12, result.GetProperty("items")[0].GetProperty("maDonHang").GetInt32());
        }
    }

    [MySqlFact]
    public async Task ItemNoteRemainsSeparateFromOrderAndHistoryAndOwnershipIsEnforced()
    {
        var fixture = await Seed(); await using var db = fixture.Open(); var api = Merchant(IsolatedMySql.Orders(db));
        var detail = Json(await api.ChiTietDonHang(12));
        Assert.Equal("Order delivery note", detail.GetProperty("ghiChu").GetString());
        Assert.Equal("Less salt\nNo onion <tag>", detail.GetProperty("chiTiet")[0].GetProperty("ghiChu").GetString());
        Assert.Equal(10010, detail.GetProperty("chiTiet")[0].GetProperty("donGia").GetDecimal());
        Assert.Equal(10010, detail.GetProperty("chiTiet")[0].GetProperty("thanhTien").GetDecimal());
        Assert.Equal(403, Assert.IsType<ObjectResult>(await api.ChiTietDonHang(99)).StatusCode);
    }

    [MySqlFact]
    public async Task PromotionSearchRemainsServerScopedAndCombinesFilterAndPagination()
    {
        var fixture = await Seed(); await using var db = fixture.Open();
        var api = Merchant(IsolatedMySql.AsCustomer(new KhuyenMaiController(db)));
        var result = Json(await api.LayDanhSachKhuyenMaiCuaQuan(new() { PageNumber = 2, PageSize = 8 }, "Needle", "active"));
        Assert.Equal(10, result.GetProperty("totalItems").GetInt32()); Assert.Equal(2, result.GetProperty("items").GetArrayLength());
        Assert.Equal(0, Json(await api.LayDanhSachKhuyenMaiCuaQuan(new(), "FOREIGN-ONLY", "active")).GetProperty("totalItems").GetInt32());
        Assert.Equal(0, Json(await api.LayDanhSachKhuyenMaiCuaQuan(new(), "Needle", "upcoming")).GetProperty("totalItems").GetInt32());
    }

    private static JsonElement Json(IActionResult result) => JsonSerializer.SerializeToElement(Assert.IsType<OkObjectResult>(result).Value, new JsonSerializerOptions(JsonSerializerDefaults.Web));
    private static T Merchant<T>(T api) where T : ControllerBase
    {
        api.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity([new(ClaimTypes.NameIdentifier, "2"), new(ClaimTypes.Role, "Quan")], "Test")); return api;
    }
    private static async Task<IsolatedMySql> Seed()
    {
        var fixture = await IsolatedMySql.CreateAsync(); await using var db = fixture.Open(); var now = VietnamBusinessTime.Now();
        db.Taikhoans.Add(new Taikhoan { MaTaiKhoan = 4, MaRole = 2, Email = "other@example.invalid", MatKhau = "test-only", TrangThai = true });
        db.Nhahangs.Add(new Nhahang { MaNhaHang = 2, MaTaiKhoan = 4, TenNhaHang = "Other restaurant", DiaChiQuan = "Other" });
        await db.SaveChangesAsync();
        for (var i = 1; i <= 25; i++)
            db.Donhangs.Add(new Donhang { MaDonHang = i, MaDonHangHienThi = i == 12 ? "Needle-%_literal" : "Needle-" + i,
                MaKhachHang = 1, MaNhaHang = 1, MaTrangThai = i <= 12 ? 1 : 2, ThoiGianDat = now.AddMinutes(-i),
                TenNguoiNhan = i == 12 ? "Receiver twelve" : "Receiver", SoDienThoaiNhan = i == 12 ? "0900123456" : "0000000000", DiaChiGiaoHang = "Fixture", GhiChu = "Order delivery note" });
        db.Donhangs.Add(new Donhang { MaDonHang = 99, MaDonHangHienThi = "Needle-FOREIGN-ONLY", MaKhachHang = 1, MaNhaHang = 2, MaTrangThai = 1,
            ThoiGianDat = now, TenNguoiNhan = "Receiver twelve", SoDienThoaiNhan = "0900123456", DiaChiGiaoHang = "Other" });
        await db.SaveChangesAsync();
        db.Chitietdonhangs.Add(new Chitietdonhang { MaDonHang = 12, MaMonAn = 1, SoLuong = 1, DonGia = 10010, ThanhTien = 10010, GhiChu = "Less salt\nNo onion <tag>" });
        for (var i = 1; i <= 11; i++) db.Khuyenmais.Add(new Khuyenmai { MaKhuyenMai = i, MaNhaHang = i == 11 ? 2 : 1,
            MaCode = i == 11 ? "FOREIGN-ONLY" : "TEST" + i, MoTa = "Needle promotion", LoaiGiam = "SoTien", GiaTriGiam = 1000,
            SoLuong = 10, SoLuotToiDaMoiKhach = 1, NgayBatDau = now.AddDays(-1), NgayKetThuc = now.AddDays(1), TrangThai = true });
        await db.SaveChangesAsync(); return fixture;
    }
}
