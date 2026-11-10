using System.Security.Claims;
using System.Text.Json;
using DatMonAnOnline.API.Controllers;
using DatMonAnOnline.API.Models;
using DatMonAnOnline.API.Options;
using DatMonAnOnline.API.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace DatMonAnOnline.Tests;

public class ExcelRegressionTests
{
    private static JsonElement Json(object? value) => JsonSerializer.SerializeToElement(value);

    [Fact]
    public void MandatoryGroupWithoutAvailableOptionsIsBlockedWithRecoveryMessage()
    {
        var food = new Monan { MaNhaHang = 1 };
        var group = new Nhomtopping { MaNhaHang = 1, TenNhom = "Ice", BatBuocChon = true, ChonToiDa = 1 };
        group.Toppings.Add(new Topping { MaTopping = 1, TrangThai = false }); food.MaNhomToppings.Add(group);
        Assert.Contains("chưa đủ tùy chọn", ToppingValidator.KiemTra(food, []));
        Assert.NotNull(ToppingValidator.KiemTra(food, [1]));
        group.Toppings.First().TrangThai = true;
        Assert.Null(ToppingValidator.KiemTra(food, [1]));
    }

    [Fact]
    public void IntegerPriceInputPreservesDecimalStoragePrecision()
    {
        foreach (var amount in new[] { "0", "12599", "999999999999999999" })
        {
            var request = JsonSerializer.Deserialize<MonAnController.TaoMonAnRequest>("{\"Gia\":\"" + amount + "\"}")!;
            Assert.Equal(decimal.Parse(amount, System.Globalization.CultureInfo.InvariantCulture), request.Gia);
            Assert.True(DatMonAnOnline.API.Common.VndAmountAttribute.IsSupported(request.Gia));
        }
        Assert.False(DatMonAnOnline.API.Common.VndAmountAttribute.IsSupported(1000000000000000000m));
        Assert.False(DatMonAnOnline.API.Common.VndAmountAttribute.IsSupported(0.5m));
    }

    [MySqlFact]
    public async Task ManagedPriceTextPreservesAllEighteenDigitsWhenEditing()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await using (var seed = fixture.Open())
        {
            (await seed.Monans.SingleAsync()).Gia = 999999999999999999m;
            await seed.SaveChangesAsync();
        }
        await using var db = fixture.Open();
        var api = IsolatedMySql.AsCustomer(new MonAnController(db));
        api.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity([
            new Claim(ClaimTypes.NameIdentifier, "2"), new Claim(ClaimTypes.Role, "Quan")], "Test"));
        var list = Json(Assert.IsType<OkObjectResult>(await api.GetMonAnsCuaQuan(new(), null, null, null)).Value);
        Assert.Equal("999999999999999999", list.GetProperty("Items")[0].GetProperty("GiaNhap").GetString());
        var detail = Json(Assert.IsType<OkObjectResult>(await api.GetMonAnCuaQuan(1)).Value);
        Assert.Equal("999999999999999999", detail.GetProperty("GiaNhap").GetString());
    }

    [MySqlFact]
    public async Task PriceIncreaseAndDecreaseUseServerLinesAndRejectStaleReviewWithoutConsumingCart()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        int cartId;
        await using (var seed = fixture.Open())
        {
            var food = await seed.Monans.SingleAsync();
            food.Gia = 10005;
            var group = new Nhomtopping { MaNhaHang = 1, TenNhom = "Required", BatBuocChon = true, ChonToiDa = 1 };
            group.Toppings.Add(new Topping { TenTopping = "Option", GiaThem = 2000, TrangThai = true });
            food.MaNhomToppings.Add(group);
            await seed.SaveChangesAsync();
            var toppingId = (await seed.Toppings.SingleAsync()).MaTopping;
            Assert.IsType<OkObjectResult>(await IsolatedMySql.Cart(seed).ThemMonVaoGio(new()
                { MaMonAn = 1, SoLuong = 2, GhiChu = "Keep note", DanhSachMaTopping = [toppingId] }));
            cartId = (await seed.Giohangs.SingleAsync()).MaGioHang;
        }
        async Task<JsonElement> Review()
        {
            await using var db = fixture.Open();
            return Json(Assert.IsType<OkObjectResult>(await IsolatedMySql.Orders(db).KiemTraCheckout(new() { MaGioHang = cartId })).Value);
        }
        var old = await Review();
        foreach (var price in new[] { 7000m, 500m })
        {
            await using (var edit = fixture.Open())
            {
                (await edit.Toppings.SingleAsync()).GiaThem = price;
                await edit.SaveChangesAsync();
            }
            var current = await Review();
            var line = current.GetProperty("ChiTiet")[0];
            Assert.Equal((10005 + price) * 2, current.GetProperty("TongTienHang").GetDecimal());
            Assert.Equal(current.GetProperty("TongTienHang").GetDecimal(), line.GetProperty("ThanhTien").GetDecimal());
            Assert.Equal("Keep note", line.GetProperty("GhiChu").GetString());
            Assert.Equal(price, line.GetProperty("Toppings")[0].GetProperty("GiaThem").GetDecimal());
            await using var rejectDb = fixture.Open();
            var rejected = Assert.IsType<ConflictObjectResult>(await IsolatedMySql.Orders(rejectDb).DatHang(new()
                { MaGioHang = cartId, MaDiaChi = 1, MaPhuongThuc = 1, MaXacNhanGia = old.GetProperty("MaXacNhanGia").GetString() }));
            Assert.True(Json(rejected.Value).GetProperty("OrderNotCreated").GetBoolean());
            await using var check = fixture.Open();
            Assert.Empty(await check.Donhangs.ToListAsync());
            Assert.Single(await check.Chitietgiohangs.ToListAsync());
        }
        var finalReview = await Review();
        var key = Guid.NewGuid().ToString();
        var request = new DatHangYeuCau { MaGioHang = cartId, MaDiaChi = 1, MaPhuongThuc = 1,
            MaXacNhanGia = finalReview.GetProperty("MaXacNhanGia").GetString() };
        string? response;
        await using (var db = fixture.Open())
            response = Assert.IsType<ContentResult>(await IsolatedMySql.Orders(db, key).DatHang(request)).Content;
        await using (var edit = fixture.Open())
        {
            (await edit.Toppings.SingleAsync()).GiaThem = 9999;
            (await edit.Monans.SingleAsync()).Gia = 99999;
            await edit.SaveChangesAsync();
        }
        await using (var retry = fixture.Open())
            Assert.Equal(response, Assert.IsType<ContentResult>(await IsolatedMySql.Orders(retry, key).DatHang(request)).Content);
        await using var snapshot = fixture.Open();
        Assert.Equal(10005, (await snapshot.Chitietdonhangs.SingleAsync()).DonGia);
        Assert.Equal(500, (await snapshot.ChitietdonhangToppings.SingleAsync()).GiaThemLucDat);
        Assert.Equal(21010, (await snapshot.Donhangs.SingleAsync()).TongTienHang);
    }

    [MySqlFact]
    public async Task VoucherReviewIncludesToppingAndKeepsCapMinimumAndFundingRules()
    {
        foreach (var restaurantFunded in new[] { true, false })
        {
            var fixture = await IsolatedMySql.CreateAsync();
            int cartId;
            await using (var seed = fixture.Open())
            {
                var food = await seed.Monans.SingleAsync(); food.Gia = 9005;
                var group = new Nhomtopping { MaNhaHang = 1, TenNhom = "Optional", ChonToiDa = 1 };
                group.Toppings.Add(new Topping { TenTopping = "Extra", GiaThem = 1000, TrangThai = true });
                food.MaNhomToppings.Add(group);
                seed.Khuyenmais.Add(new Khuyenmai { MaKhuyenMai = 1, MaNhaHang = restaurantFunded ? 1 : null,
                    MaCode = "EXCEL10", LoaiGiam = "PhanTram", GiaTriGiam = 10, DonHangToiThieu = 10000,
                    SoLuong = 10, SoLuotToiDaMoiKhach = 1, TrangThai = true,
                    NgayBatDau = DateTime.Now.AddDays(-1), NgayKetThuc = DateTime.Now.AddDays(1) });
                await seed.SaveChangesAsync();
                await IsolatedMySql.Cart(seed).ThemMonVaoGio(new() { MaMonAn = 1, SoLuong = 1,
                    DanhSachMaTopping = [(await seed.Toppings.SingleAsync()).MaTopping] });
                cartId = (await seed.Giohangs.SingleAsync()).MaGioHang;
            }
            await using (var db = fixture.Open())
            {
                var review = Json(Assert.IsType<OkObjectResult>(await IsolatedMySql.Orders(db).KiemTraCheckout(new()
                    { MaGioHang = cartId, MaKhuyenMai = 1 })).Value);
                Assert.Equal(10005, review.GetProperty("TongTienHang").GetDecimal());
                Assert.Equal(1001, review.GetProperty("SoTienGiam").GetDecimal());
            }
            await using (var edit = fixture.Open())
            {
                var promotion = await edit.Khuyenmais.SingleAsync(); promotion.DonHangToiThieu = 10006;
                await edit.SaveChangesAsync();
            }
            await using (var db = fixture.Open())
                Assert.IsType<BadRequestObjectResult>(await IsolatedMySql.Orders(db).KiemTraCheckout(new()
                    { MaGioHang = cartId, MaKhuyenMai = 1 }));
            await using (var edit = fixture.Open())
            {
                var promotion = await edit.Khuyenmais.SingleAsync(); promotion.DonHangToiThieu = 10000; promotion.GiamToiDa = 1000;
                await edit.SaveChangesAsync();
            }
            string? token;
            await using (var db = fixture.Open())
            {
                var review = Json(Assert.IsType<OkObjectResult>(await IsolatedMySql.Orders(db).KiemTraCheckout(new()
                    { MaGioHang = cartId, MaKhuyenMai = 1 })).Value);
                Assert.Equal(1000, review.GetProperty("SoTienGiam").GetDecimal());
                token = review.GetProperty("MaXacNhanGia").GetString();
            }
            await using (var db = fixture.Open())
                Assert.Equal(201, Assert.IsType<ContentResult>(await IsolatedMySql.Orders(db).DatHang(new()
                    { MaGioHang = cartId, MaDiaChi = 1, MaPhuongThuc = 1, MaKhuyenMai = 1, MaXacNhanGia = token })).StatusCode);
            await using var check = fixture.Open();
            var order = await check.Donhangs.SingleAsync();
            Assert.Equal(24005, order.ThanhTien);
            Assert.Equal(restaurantFunded ? 1000 : 0, order.GiamGiaNhaHang);
            Assert.Equal(restaurantFunded ? 0 : 1000, order.GiamGiaHeThong);
            Assert.Equal(restaurantFunded ? 450 : 500, order.PhiNenTang);
        }
    }

    [MySqlFact]
    public async Task WalletOnlineAndCodCreditsMatchEntitlementAndReplayOnce()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await using (var opening = fixture.Open())
        {
            opening.Vis.Add(new Vi { MaTaiKhoan = 2, SoDu = 0, DonViTienTe = "VND", TrangThai = "HoatDong" });
            await opening.SaveChangesAsync();
        }
        var figures = new[] { (method: 2, paid: 10000m, entitlement: 9500m, credit: 9500m),
            (method: 1, paid: 10000m, entitlement: 9500m, credit: 0m),
            (method: 1, paid: 10000m, entitlement: 12000m, credit: 2000m) };
        int orderId = 100;
        foreach (var figure in figures)
        {
            ++orderId;
            await using (var db = fixture.Open())
            {
                db.Donhangs.Add(new Donhang { MaDonHang = orderId, MaDonHangHienThi = "EXCEL-" + orderId,
                    MaKhachHang = 1, MaNhaHang = 1, MaDiaChi = 1, MaTrangThai = 5, MaHopDong = 1,
                    ThoiGianDat = DateTime.Now, ThoiGianGiaoThucTe = DateTime.Now,
                    DiaChiGiaoHang = "Isolated test address", TenNguoiNhan = "Test recipient", SoDienThoaiNhan = "0000000001",
                    ThanhTien = figure.paid, SoTienNhaHangNhan = figure.entitlement });
                db.Thanhtoans.Add(new Thanhtoan { MaDonHang = orderId, MaPhuongThuc = figure.method,
                    SoTien = figure.paid, TrangThaiThanhToan = "ThanhCong" });
                await db.SaveChangesAsync();
            }
            for (var attempt = 0; attempt < 2; attempt++)
            {
                await using var db = fixture.Open();
                await using var tx = await db.Database.BeginTransactionAsync();
                var order = (await db.Donhangs.FromSqlInterpolated($"SELECT * FROM donhang WHERE MaDonHang={orderId} FOR UPDATE").ToListAsync()).Single();
                var payment = await db.Thanhtoans.Include(x => x.MaPhuongThucNavigation).SingleAsync(x => x.MaDonHang == orderId);
                var service = new OrderIncomeSettlementService(db, new WalletService(db),
                    Options.Create(new DoiSoatOptions { BatDauApDung = new DateTime(2020, 1, 1) }));
                var settled = await service.SettleAsync(order, payment, 2);
                Assert.True(settled.Succeeded, settled.Error);
                await db.SaveChangesAsync();
                await tx.CommitAsync();
            }
            await using var check = fixture.Open();
            var ledger = await check.Giaodichvis.Where(x => x.MaDonHang == orderId).ToListAsync();
            Assert.Equal(figure.credit == 0 ? 0 : 1, ledger.Count);
            if (figure.credit > 0) Assert.Equal(figure.credit, ledger.Single().SoTien);
        }
        await using var final = fixture.Open();
        Assert.Equal(11500, (await final.Vis.SingleAsync(x => x.MaTaiKhoan == 2)).SoDu);
    }

    [MySqlFact]
    public async Task LegalDraftMayBeIncompleteButPreviewSignAndSubmitRejectIt()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        var env = new LegalEnvironment();
        await using (var seed = fixture.Open())
        {
            (await seed.Hopdongnhahangs.SingleAsync()).TrangThai = "HetHan";
            (await seed.Nhahangs.SingleAsync()).TrangThaiDuyet = "ChuaHoanTat";
            await seed.SaveChangesAsync();
        }
        T Owner<T>(T controller) where T : ControllerBase
        {
            IsolatedMySql.AsCustomer(controller);
            controller.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity([
                new Claim(ClaimTypes.NameIdentifier, "2"), new Claim(ClaimTypes.Role, "Quan")], "Test"));
            return controller;
        }
        await using (var db = fixture.Open())
            Assert.IsType<OkObjectResult>(await Owner(new HoSoPhapLyController(db, env,
                NullLogger<HoSoPhapLyController>.Instance)).LuuHoSo(new()));
        await using (var db = fixture.Open())
            Assert.IsType<BadRequestObjectResult>(await Owner(new HopDongController(db, env, new IsolatedMySql.NoopRealtime())).XemTruoc());
        await using (var db = fixture.Open())
            Assert.IsType<BadRequestObjectResult>(await Owner(new HopDongController(db, env, new IsolatedMySql.NoopRealtime()))
                .KyHopDong(new() { DongYDieuKhoan = true, XacNhanKy = true, MaXacNhanNoiDung = "test-only" }));
        await using (var db = fixture.Open())
        {
            var result = await Owner(new HopDongController(db, env, new IsolatedMySql.NoopRealtime())).GuiXetDuyet(new());
            Assert.True(result is BadRequestObjectResult or ConflictObjectResult);
        }
        await using var check = fixture.Open();
        Assert.Empty(await check.Hopdongnhahangs.Where(x => x.TrangThai == "DaKy" || x.TrangThai == "ChoDuyet").ToListAsync());
    }

    private sealed class LegalEnvironment : IWebHostEnvironment
    {
        public string ContentRootPath { get; set; } = Path.Combine(Path.GetTempPath(), "foodie-excel-legal-" + Guid.NewGuid().ToString("N"));
        public string WebRootPath { get; set; } = "";
        public string EnvironmentName { get; set; } = "Test";
        public string ApplicationName { get; set; } = "ExcelRegression";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
    }
}
