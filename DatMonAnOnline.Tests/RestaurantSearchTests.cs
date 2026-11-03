using System.Text;
using System.Text.Json;
using DatMonAnOnline.API.Controllers;
using DatMonAnOnline.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace DatMonAnOnline.Tests;

public class RestaurantSearchTests
{
    private static JsonElement Json(IActionResult result) => JsonSerializer.SerializeToElement(
        Assert.IsType<OkObjectResult>(result).Value, new JsonSerializerOptions(JsonSerializerDefaults.Web));

    [MySqlFact]
    public async Task AccentedSearchDoesNotMatchPhongOrPhoMaiAndStillPagesOnServer()
    {
        var fixture = await Seed();
        await using var db = fixture.Open();
        var controller = new NhaHangController(db);
        foreach (var keyword in new[] { "Phở", "  PHỞ  ", "phở".Normalize(NormalizationForm.FormD) })
        {
            var result = Json(await controller.GetDanhSachNhaHang(new() { PageSize = 100 }, keyword));
            var ids = result.GetProperty("items").EnumerateArray().Select(x => x.GetProperty("maNhaHang").GetInt32()).Order().ToArray();
            Assert.Equal(new[] { 1, 4, 7, 8 }, ids);
        }
        var first = Json(await controller.GetDanhSachNhaHang(new() { PageSize = 2 }, "Phở", "rating"));
        var second = Json(await controller.GetDanhSachNhaHang(new() { PageSize = 2, PageNumber = 2 }, "Phở", "rating"));
        Assert.Equal(4, first.GetProperty("totalItems").GetInt32());
        Assert.Equal(2, second.GetProperty("items").GetArrayLength());
        Assert.Empty(first.GetProperty("items").EnumerateArray().Select(x => x.GetProperty("maNhaHang").GetInt32())
            .Intersect(second.GetProperty("items").EnumerateArray().Select(x => x.GetProperty("maNhaHang").GetInt32())));
        var open = Json(await controller.GetDanhSachNhaHang(new() { PageSize = 100 }, "Phở", "rating", true));
        Assert.Equal(3, open.GetProperty("totalItems").GetInt32());
        Assert.DoesNotContain(open.GetProperty("items").EnumerateArray(), x => x.GetProperty("maNhaHang").GetInt32() == 4);
        Assert.Equal(0, Json(await controller.GetDanhSachNhaHang(new(), "Không tồn tại %_" )).GetProperty("totalItems").GetInt32());
    }

    [MySqlFact]
    public async Task ExistingUnaccentedNameAddressAndDescriptionLookupIsPreserved()
    {
        var fixture = await Seed();
        await using var db = fixture.Open();
        var api = new NhaHangController(db);
        foreach (var keyword in new[] { "pho", "hem", "CA PHE" })
            Assert.True(Json(await api.GetDanhSachNhaHang(new(), keyword)).GetProperty("totalItems").GetInt32() > 0);
        Assert.Equal(1, Json(await api.GetDanhSachNhaHang(new(), "Bún")).GetProperty("totalItems").GetInt32());
        Assert.Equal(0, Json(await api.GetDanhSachNhaHang(new(), "Bún / Phở")).GetProperty("totalItems").GetInt32());
    }

    private static async Task<IsolatedMySql> Seed()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await using var db = fixture.Open();
        var first = await db.Nhahangs.SingleAsync();
        first.TenNhaHang = "Phở Hà Nội Gia Truyền";
        first.MoTa = "Bánh phở tươi";
        first.DanhGiaTrungBinh = 4.5f;
        var today = DateOnly.FromDateTime(DateTime.Now);
        for (var id = 2; id <= 9; id++)
        {
            db.Taikhoans.Add(new() { MaTaiKhoan = id + 10, MaRole = 2, Email = $"search{id}@example.invalid", MatKhau = "test", TrangThai = true });
            db.Nhahangs.Add(new()
            {
                MaNhaHang = id, MaTaiKhoan = id + 10,
                TenNhaHang = id switch { 2 => "Cà Phê Hẻm Xưa", 3 => "Mì Cay Seoul", 4 => "Phở tạm nghỉ", 5 => "Phở chưa duyệt", 6 => "Phở hết hợp đồng", 9 => "Bún Bò Huế", _ => $"Quán {id}" },
                MoTa = id switch { 2 => "Cà phê phong cách hoài cổ", 3 => "Tokbokki phô mai", 7 => "Phục vụ phở bò", _ => null },
                DiaChiQuan = id == 8 ? "Hẻm Phở, quận 1" : "Test address",
                TrangThaiDuyet = id == 5 ? "ChoDuyet" : "DaDuyet",
                CheDoHoatDong = id == 4 ? "TamNgung" : "MoThuCong", DanhGiaTrungBinh = id / 2f
            });
            db.Hopdongnhahangs.Add(new()
            {
                MaNhaHang = id, SoHopDong = $"SEARCH-{id}", NguoiDaiDien = "Test", PhienBanDieuKhoan = "1.0",
                TyLePhiNenTang = 5, TrangThai = "HieuLuc", NgayBatDau = today.AddDays(-10),
                NgayKetThuc = id == 6 ? today.AddDays(-1) : today.AddDays(10), FileHopDong = "test.txt",
                ThoiGianKy = DateTime.Now, ThoiGianDuyet = DateTime.Now, MaTaiKhoanDuyet = 3
            });
        }
        await db.SaveChangesAsync();
        return fixture;
    }
}
