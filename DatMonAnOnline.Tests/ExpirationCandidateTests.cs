using DatMonAnOnline.API.Models;
using DatMonAnOnline.API.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace DatMonAnOnline.Tests;

public class ExpirationCandidateTests
{
    [Fact]
    public void OldPaidAndCodOrdersCannotStarveTheBatch()
    {
        var orders = Enumerable.Range(1, 150).Select(i => Order(i, "COD", "ChoThanhToan"))
            .Concat(Enumerable.Range(151, 150).Select(i => Order(i, "MoMo", "ThanhCong")))
            .Append(Order(301, "MoMo", "ChoThanhToan"))
            .Append(Order(302, "VNPay", "ThatBai")).AsQueryable();
        var ids = OrderPaymentRules.ExpiredUnpaidOnlineOrders(orders, DateTime.Now.AddMinutes(-15))
            .OrderBy(o => o.MaDonHang).Take(100).Select(o => o.MaDonHang).ToArray();
        Assert.Equal(new[] { 301, 302 }, ids);
    }

    [Fact]
    public void CompletedFreshAndAnySuccessfulAttemptAreExcluded()
    {
        var fresh = Order(1, "MoMo", "ChoThanhToan"); fresh.ThoiGianDat = DateTime.Now;
        var completed = Order(2, "MoMo", "ChoThanhToan"); completed.MaTrangThai = 5;
        var paid = Order(3, "MoMo", "ThanhCong");
        paid.Thanhtoans.Add(new Thanhtoan { MaThanhToan = 10, TrangThaiThanhToan = "ThatBai", MaPhuongThucNavigation = new() { TenPhuongThuc = "MoMo" } });
        Assert.Empty(OrderPaymentRules.ExpiredUnpaidOnlineOrders(new[] { fresh, completed, paid, new Donhang { MaTrangThai = 1 } }.AsQueryable(), DateTime.Now.AddMinutes(-15)));
    }

    [Fact]
    public void CandidateQueryTranslatesUsingTheActualMySqlProvider()
    {
        using var db = new DatMonAnOnlineContext(new DbContextOptionsBuilder<DatMonAnOnlineContext>()
            .UseMySql("Server=127.0.0.1;Database=translation_only;User ID=unused", new MySqlServerVersion(new Version(8, 0, 45))).Options);
        var sql = OrderPaymentRules.ExpiredUnpaidOnlineOrders(db.Donhangs, DateTime.Now.AddMinutes(-15))
            .OrderBy(o => o.MaDonHang).Select(o => o.MaDonHang).Take(100).ToQueryString();
        Assert.Contains("NOT EXISTS", sql);
        Assert.Contains("COD", sql);
        Assert.Contains("LIMIT", sql);
    }

    private static Donhang Order(int id, string method, string status) => new()
    {
        MaDonHang = id, MaTrangThai = 1, ThoiGianDat = DateTime.Now.AddHours(-1),
        Thanhtoans = new List<Thanhtoan> { new() { MaThanhToan = 1, TrangThaiThanhToan = status, MaPhuongThucNavigation = new() { TenPhuongThuc = method } } }
    };
}
