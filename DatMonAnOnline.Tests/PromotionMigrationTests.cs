using DatMonAnOnline.API.Models;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;
using Xunit;

namespace DatMonAnOnline.Tests;

public class PromotionSchemaTests
{
    [MySqlFact]
    public async Task FreshSchemaContainsPerCustomerLimitAndCountConstraint()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await using var db = fixture.Open();
        Assert.Equal(1, await Scalar(db, "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='khuyenmai' AND column_name='SoLuotToiDaMoiKhach'"));
        Assert.Equal(1, await Scalar(db, "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND table_name='khuyenmai' AND constraint_name='CK_KhuyenMai_GioiHan'"));
    }

    [MySqlFact]
    public async Task CountConstraintRejectsInvalidPromotionLimits()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await using var db = fixture.Open();
        var exception = await Assert.ThrowsAsync<MySqlException>(() =>
            db.Database.ExecuteSqlRawAsync(
                "INSERT INTO khuyenmai (MaCode, LoaiGiam, GiaTriGiam, SoLuong, SoLuongDaDung, SoLuotToiDaMoiKhach, NgayBatDau, NgayKetThuc) VALUES ('INVALID-LIMIT', 'SoTien', 1000, 1, 2, 0, NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY))"));
        Assert.Equal(3819, exception.Number);
    }

    private static async Task<int> Scalar(DatMonAnOnlineContext db, string sql)
    {
        await db.Database.OpenConnectionAsync();
        await using var command = db.Database.GetDbConnection().CreateCommand();
        command.CommandText = sql;
        return Convert.ToInt32(await command.ExecuteScalarAsync());
    }
}
