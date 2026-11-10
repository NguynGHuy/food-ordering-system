using DatMonAnOnline.API.Common;
using DatMonAnOnline.API.Models;
using Xunit;

namespace DatMonAnOnline.Tests;

public class VndDiscountTests
{
    [Theory]
    [InlineData(10001, 1000)]
    [InlineData(10004, 1000)]
    [InlineData(10005, 1001)]
    [InlineData(10006, 1001)]
    [InlineData(10015, 1002)]
    public void PercentageRoundsMidpointUp(int total, int expected)
    {
        var discount = PromotionWriteHelper.CalculateDiscount(new Khuyenmai { LoaiGiam = "PhanTram", GiaTriGiam = 10 }, total);
        Assert.Equal(expected, discount);
        var payable = total + 15000m - discount;
        Assert.Equal(decimal.Truncate(payable), payable);
        Assert.Equal(total + 15000m, payable + discount);
    }

    [Fact]
    public void CapsAndFixedDiscountsCannotExceedItemTotal()
    {
        var voucher = new Khuyenmai { LoaiGiam = "PhanTram", GiaTriGiam = 99, GiamToiDa = 5000 };
        Assert.Equal(5000m, PromotionWriteHelper.CalculateDiscount(voucher, 10005));
        voucher.LoaiGiam = "SoTien"; voucher.GiaTriGiam = 20000; voucher.GiamToiDa = null;
        Assert.Equal(10005m, PromotionWriteHelper.CalculateDiscount(voucher, 10005));
        Assert.Equal(0m, PromotionWriteHelper.CalculateDiscount(voucher, 0));
    }

    [Fact]
    public async Task InspectOrderAndWallet()
    {
        using var conn = new MySqlConnector.MySqlConnection("Server=localhost;Port=3306;Database=datmonanonline;User=root;Password=123456;");
        await conn.OpenAsync();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT MaDonHang, MaDonHangHienThi, TongTienHang, PhiShip, SoTienGiam, ThanhTien, GiamGiaNhaHang, GiamGiaHeThong, PhiNenTang, SoTienNhaHangNhan, TyLePhiNenTang FROM donhang ORDER BY MaDonHang DESC LIMIT 10;";
        using var reader = await cmd.ExecuteReaderAsync();
        var sb = new System.Text.StringBuilder();
        while (await reader.ReadAsync())
        {
            sb.AppendLine($"Don {reader[0]}: Code={reader[1]}, Mon={reader[2]}, Ship={reader[3]}, Giam={reader[4]}, ThanhTien={reader[5]}, GiamNH={reader[6]}, GiamHT={reader[7]}, PhiNT={reader[8]}, NHNhan={reader[9]}, TyLe={reader[10]}");
        }
        await reader.CloseAsync();

        cmd.CommandText = "SELECT MaGiaoDich, MaVi, SoTien, LoaiGiaoDich, MoTa, SoDuTruoc, SoDuSau, MaDonHang FROM giaodichvi ORDER BY MaGiaoDich DESC LIMIT 10;";
        using var r2 = await cmd.ExecuteReaderAsync();
        sb.AppendLine("--- GIAO DICH VI ---");
        while (await r2.ReadAsync())
        {
            sb.AppendLine($"GD {r2[0]}: Vi={r2[1]}, SoTien={r2[2]}, Loai={r2[3]}, Don={r2[7]}, MoTa={r2[4]}, SoDu={r2[5]}->{r2[6]}");
        }

        throw new System.Exception("DB OUTPUT:\n" + sb.ToString());
    }
}
