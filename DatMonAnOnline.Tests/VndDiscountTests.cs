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
}
