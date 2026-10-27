using System.Security.Claims;
using System.Text.Json;
using DatMonAnOnline.API.Common;
using DatMonAnOnline.API.Controllers;
using DatMonAnOnline.API.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace DatMonAnOnline.Tests;

public class DashboardAnalyticsTests
{
    [MySqlFact]
    public async Task RevenueUsesCompletionDateAndMerchantIsScopedFromJwt()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        var now = VietnamBusinessTime.Now();

        await using (var seed = fixture.Open())
        {
            seed.Donhangs.AddRange(
                CreateOrder(
                    "DASH-COMPLETED-TODAY",
                    now.AddDays(-2),
                    now.AddMinutes(-10),
                    12345,
                    617,
                    11728),
                CreateOrder(
                    "DASH-COMPLETED-YESTERDAY",
                    now.AddMinutes(-20),
                    now.AddDays(-1),
                    50000,
                    2500,
                    47500));
            await seed.SaveChangesAsync();
        }

        await using var db = fixture.Open();
        var admin = new AdminController(db, null!, new IsolatedMySql.NoopRealtime());
        var adminResult = JsonSerializer.SerializeToElement(
            Assert.IsType<OkObjectResult>(await admin.ThongKeAnalytics(1)).Value);
        Assert.Equal(12345, adminResult.GetProperty("tongDoanhThuKyNay").GetDecimal());
        Assert.Equal(617, adminResult.GetProperty("tongDoanhThuNenTangKyNay").GetDecimal());
        Assert.Equal(1, adminResult.GetProperty("doanhThuTheoNgay")[0].GetProperty("soDonHoanThanh").GetInt32());

        var merchant = new NhaHangController(db)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(
                        [new Claim(ClaimTypes.NameIdentifier, "2"), new Claim(ClaimTypes.Role, "Quan")],
                        "Test"))
                }
            }
        };
        var merchantResult = JsonSerializer.SerializeToElement(
            Assert.IsType<OkObjectResult>(await merchant.ThongKeAnalyticsQuan(1)).Value);
        Assert.Equal(12345, merchantResult.GetProperty("tongGiaTriDonKyNay").GetDecimal());
        Assert.Equal(11728, merchantResult.GetProperty("tongThuNhapKyNay").GetDecimal());
        Assert.Equal(1, merchantResult.GetProperty("tongDonKyNay").GetInt32());

        var orders = IsolatedMySql.Orders(db);
        orders.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                    [new Claim(ClaimTypes.NameIdentifier, "2"), new Claim(ClaimTypes.Role, "Quan")],
                    "Test"))
            }
        };
        var orderListResult = JsonSerializer.SerializeToElement(
            Assert.IsType<OkObjectResult>(await orders.DanhSachDonHangCuaQuan(
                new PaginationQuery { PageNumber = 1, PageSize = 10 },
                null)).Value);
        Assert.Equal(1, orderListResult.GetProperty("summary").GetProperty("completedToday").GetInt32());
        Assert.Equal(12345, orderListResult.GetProperty("summary").GetProperty("revenueToday").GetDecimal());
    }

    private static Donhang CreateOrder(
        string code,
        DateTime orderedAt,
        DateTime completedAt,
        decimal total,
        decimal platformFee,
        decimal merchantIncome) => new()
    {
        MaDonHangHienThi = code,
        MaKhachHang = 1,
        MaNhaHang = 1,
        MaHopDong = 1,
        MaTrangThai = 5,
        ThoiGianDat = orderedAt,
        ThoiGianGiaoThucTe = completedAt,
        TenNguoiNhan = "Dashboard customer",
        SoDienThoaiNhan = "0000000001",
        DiaChiGiaoHang = "Dashboard test address",
        TongTienHang = total,
        ThanhTien = total,
        PhiNenTang = platformFee,
        SoTienNhaHangNhan = merchantIncome
    };
}
