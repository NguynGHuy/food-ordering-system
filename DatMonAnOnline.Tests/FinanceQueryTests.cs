using System.Text.Json;
using System.Data.Common;
using DatMonAnOnline.API.Controllers;
using DatMonAnOnline.API.Models;
using DatMonAnOnline.API.Options;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Options;
using Xunit;

namespace DatMonAnOnline.Tests;

public class FinanceQueryTests
{
    [MySqlFact]
    public async Task SqlAggregatesMatchSnapshotsAndBoundRecentLists()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        var today = DateOnly.FromDateTime(DateTime.Now);
        await using (var seed = fixture.Open())
        {
            for (var i = 1; i <= 43; i++)
            {
                var order = new Donhang { MaDonHang = i, MaDonHangHienThi = $"AUDIT-{i}", MaKhachHang = 1, MaNhaHang = 1, MaHopDong = 1,
                    MaTrangThai = i == 43 ? 6 : 5, ThoiGianDat = DateTime.Now.AddHours(-2), ThoiGianGiaoThucTe = DateTime.Now.AddHours(-1),
                    TenNguoiNhan = "Test", SoDienThoaiNhan = "0000000001", DiaChiGiaoHang = "Test", TongTienHang = 10000, ThanhTien = 10000, PhiNenTang = 500, GiamGiaHeThong = 100 };
                order.Thanhtoans.Add(new Thanhtoan { MaPhuongThuc = 2, SoTien = i == 42 ? 9999 : 10000, TrangThaiThanhToan = i == 41 ? "ThatBai" : "ThanhCong" });
                seed.Donhangs.Add(order);
            }
            var amounts = new[] { 200m, -100m, 50m, -25m, 999m };
            for (var i = 0; i < amounts.Length; i++)
                seed.Doisoatnhahangs.Add(new Doisoatnhahang { MaDoiSoat = i + 1, MaNhaHang = 1, TuNgay = today.AddDays(-i - 1), DenNgay = today.AddDays(-i - 1),
                    TrangThai = i < 2 ? "DaThanhToan" : i == 4 ? "TranhChap" : "DaXacNhan", TongTienNhaHangNhan = Math.Max(0, amounts[i]), TongTienNhaHangDaThu = Math.Max(0, -amounts[i]) });
            await seed.SaveChangesAsync();
            seed.Chitietdoisoats.Add(new Chitietdoisoat { MaDoiSoat = 1, MaDonHang = 1, MaNhaHang = 1, TongTienHang = 10000, PhiNenTang = 500 });
            await seed.SaveChangesAsync();
        }
        var queries = new QueryCapture();
        await using var db = fixture.Open(queries);
        var controller = Controller(db);
        var response = JsonSerializer.SerializeToElement(Assert.IsType<OkObjectResult>(await controller.GetTongQuan(null, null, default)).Value);
        Assert.Equal(40, response.GetProperty("tongSoDon").GetInt32());
        Assert.Equal(2, response.GetProperty("soDonDuLieuKhongHopLe").GetInt32());
        Assert.Equal(20000, response.GetProperty("tongPhiNenTang").GetDecimal());
        Assert.Equal(4000, response.GetProperty("tongChiPhiKhuyenMaiHeThong").GetDecimal());
        Assert.Equal(16000, response.GetProperty("doanhThuThuan").GetDecimal());
        Assert.Equal(400, response.GetProperty("doanhThuDaDoiSoat").GetDecimal());
        Assert.True(response.GetProperty("doanhThuChoDoiSoat").GetDecimal() == 15600, queries.AggregateSql);
        Assert.Equal(39, response.GetProperty("soDonChoDoiSoat").GetInt32());
        Assert.Equal(4, response.GetProperty("tongSoKy").GetInt32());
        Assert.Equal(2, response.GetProperty("soKyDaThanhToan").GetInt32());
        Assert.Equal(200, response.GetProperty("daThanhToanChoNhaHang").GetDecimal());
        Assert.Equal(100, response.GetProperty("daThuTuNhaHang").GetDecimal());
        Assert.Equal(50, response.GetProperty("conPhaiTraNhaHang").GetDecimal());
        Assert.Equal(25, response.GetProperty("conPhaiThuNhaHang").GetDecimal());
        Assert.Equal(20, response.GetProperty("cacDonDoanhThuGanDay").GetArrayLength());
        Assert.Equal(4, response.GetProperty("cacKyGanDay").GetArrayLength());
        var empty = JsonSerializer.SerializeToElement(Assert.IsType<OkObjectResult>(await controller.GetTongQuan(today.AddDays(2), today.AddDays(3), default)).Value);
        Assert.Equal(0, empty.GetProperty("tongSoDon").GetInt32());
        Assert.Equal(0, empty.GetProperty("tongSoKy").GetInt32());
        Assert.Equal(0, empty.GetProperty("doanhThuThuan").GetDecimal());
    }

    [Fact]
    public async Task UnsupportedDateDoesNotOverflowBeforeDatabaseQuery()
    {
        Assert.IsType<BadRequestObjectResult>(await Controller(null!).GetTongQuan(null, DateOnly.MaxValue, default));
        Assert.IsType<BadRequestObjectResult>(await Controller(null!).GetTongQuan(DateOnly.MinValue, null, default));
    }

    [MySqlFact]
    public async Task ConcurrentCompletionDoesNotMixReportSnapshots()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        var completion = new AfterFirstRead(async () =>
        {
            await using var writer = fixture.Open();
            await using var transaction = await writer.Database.BeginTransactionAsync();
            var order = new Donhang
            {
                MaDonHangHienThi = "AUDIT-CONCURRENT", MaKhachHang = 1, MaNhaHang = 1, MaHopDong = 1,
                MaTrangThai = 5, ThoiGianDat = DateTime.Now.AddHours(-2), ThoiGianGiaoThucTe = DateTime.Now,
                TenNguoiNhan = "Test", SoDienThoaiNhan = "0000000001", DiaChiGiaoHang = "Test",
                TongTienHang = 10000, ThanhTien = 10000, PhiNenTang = 500
            };
            order.Thanhtoans.Add(new Thanhtoan { MaPhuongThuc = 2, SoTien = 10000, TrangThaiThanhToan = "ThanhCong" });
            writer.Donhangs.Add(order);
            await writer.SaveChangesAsync();
            var day = DateOnly.FromDateTime(DateTime.Now).AddDays(-1);
            var period = new Doisoatnhahang { MaNhaHang = 1, TuNgay = day, DenNgay = day,
                TrangThai = "DaThanhToan", TongSoDon = 1, TongPhiNenTang = 500,
                TongTienNhaHangNhan = 9500, MaGiaoDichDoiSoat = "TEST-SNAPSHOT", NgayThanhToan = DateTime.Now };
            writer.Doisoatnhahangs.Add(period);
            await writer.SaveChangesAsync();
            writer.Chitietdoisoats.Add(new() { MaDonHang = order.MaDonHang, MaDoiSoat = period.MaDoiSoat,
                MaNhaHang = 1, TongTienHang = 10000, PhiNenTang = 500, SoTienNhaHangNhan = 9500 });
            await writer.SaveChangesAsync();
            await transaction.CommitAsync();
        });
        await using var reader = fixture.Open(completion);
        var first = JsonSerializer.SerializeToElement(Assert.IsType<OkObjectResult>(
            await Controller(reader).GetTongQuan(null, null, default)).Value);
        Assert.True(completion.Executed);
        Assert.Equal(0, first.GetProperty("soDonDuLieuKhongHopLe").GetInt32());
        Assert.Equal(0, first.GetProperty("tongSoDon").GetInt32());
        Assert.Equal(0, first.GetProperty("cacDonDoanhThuGanDay").GetArrayLength());
        Assert.Equal(0, first.GetProperty("tongSoKy").GetInt32());
        Assert.Equal(0, first.GetProperty("cacKyGanDay").GetArrayLength());

        var refreshed = JsonSerializer.SerializeToElement(Assert.IsType<OkObjectResult>(
            await Controller(reader).GetTongQuan(null, null, default)).Value);
        Assert.Equal(1, refreshed.GetProperty("tongSoDon").GetInt32());
        Assert.Equal(500, refreshed.GetProperty("doanhThuThuan").GetDecimal());
        Assert.Equal(1, refreshed.GetProperty("cacDonDoanhThuGanDay").GetArrayLength());
        Assert.Equal(500, refreshed.GetProperty("doanhThuDaDoiSoat").GetDecimal());
        Assert.Equal(0, refreshed.GetProperty("doanhThuChoDoiSoat").GetDecimal());
        Assert.Equal(1, refreshed.GetProperty("tongSoKy").GetInt32());
        Assert.Equal(1, refreshed.GetProperty("soKyDaThanhToan").GetInt32());
        Assert.Equal(9500, refreshed.GetProperty("daThanhToanChoNhaHang").GetDecimal());
        Assert.Equal(1, refreshed.GetProperty("cacKyGanDay").GetArrayLength());
    }

    private static AdminTaiChinhController Controller(DatMonAnOnlineContext db) => new(db,
        Options.Create(new DoiSoatOptions { BatDauApDung = new DateTime(2020, 1, 1) }));

    private sealed class QueryCapture : DbCommandInterceptor
    {
        public string AggregateSql { get; private set; } = "";
        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command, CommandEventData eventData,
            InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            if (command.CommandText.Contains("PendingRevenue")) AggregateSql = command.CommandText;
            return ValueTask.FromResult(result);
        }
    }

    private sealed class AfterFirstRead(Func<Task> write) : DbCommandInterceptor
    {
        public bool Executed { get; private set; }
        public override async ValueTask<DbDataReader> ReaderExecutedAsync(DbCommand command, CommandExecutedEventData eventData,
            DbDataReader result, CancellationToken cancellationToken = default)
        {
            if (!Executed)
            {
                Executed = true;
                await write();
            }
            return result;
        }
    }
}
