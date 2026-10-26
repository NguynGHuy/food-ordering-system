using System.Text.RegularExpressions;
using DatMonAnOnline.API.Models;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;
using Xunit;

namespace DatMonAnOnline.Tests;

public class PromotionMigrationTests
{
    [MySqlFact]
    public async Task LegacyUpgradePreservesCountsAndReruns()
    {
        var fixture = await Legacy(2, 1);
        await using var db = fixture.Open();
        await Run(db);
        await Run(db);
        Assert.Equal(1, await Scalar(db, "SELECT SoLuongDaDung FROM khuyenmai"));
        Assert.Equal(1, await Scalar(db, "SELECT SoLuotToiDaMoiKhach FROM khuyenmai"));
        await Assert.ThrowsAsync<MySqlException>(() => db.Database.ExecuteSqlRawAsync("UPDATE khuyenmai SET SoLuong=0"));
        Assert.Equal(2, await Scalar(db, "SELECT SoLuong FROM khuyenmai"));
    }

    [MySqlFact]
    public async Task InvalidLegacyCountsStopBeforeAddingColumn()
    {
        var fixture = await Legacy(0, 0);
        await using var db = fixture.Open();
        var exception = await Assert.ThrowsAsync<MySqlException>(() => Run(db));
        Assert.Equal("45000", exception.SqlState);
        Assert.Equal(0, await Scalar(db, "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='khuyenmai' AND column_name='SoLuotToiDaMoiKhach'"));
        Assert.Equal(0, await Scalar(db, "SELECT SoLuong FROM khuyenmai"));
    }

    [MySqlFact]
    public async Task AlreadyCurrentSchemaCanRunMigrationAgain()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await using var db = fixture.Open();
        await Run(db);
        Assert.Equal(1, await Scalar(db, "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema=DATABASE() AND table_name='khuyenmai' AND constraint_name='CK_KhuyenMai_GioiHan'"));
    }

    private static async Task<IsolatedMySql> Legacy(int total, int used)
    {
        var fixture = await IsolatedMySql.CreateAsync(installSchema: false);
        await using var db = fixture.Open();
        await db.Database.ExecuteSqlRawAsync("CREATE TABLE khuyenmai (MaKhuyenMai INT PRIMARY KEY, SoLuong INT NOT NULL, SoLuongDaDung INT NOT NULL)");
        await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO khuyenmai VALUES (1, {total}, {used})");
        return fixture;
    }

    private static async Task Run(DatMonAnOnlineContext db)
    {
        var script = await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "PromotionMigration.sql"));
        await db.Database.ExecuteSqlRawAsync(script[..script.IndexOf("DELIMITER $$", StringComparison.Ordinal)]);
        var procedure = Regex.Match(script, @"CREATE PROCEDURE[\s\S]*?END\$\$", RegexOptions.None, TimeSpan.FromSeconds(1)).Value;
        Assert.NotEmpty(procedure);
        await db.Database.ExecuteSqlRawAsync(procedure[..^2]);
        await db.Database.ExecuteSqlRawAsync(script[(script.IndexOf("DELIMITER ;", StringComparison.Ordinal) + "DELIMITER ;".Length)..]);
    }

    private static async Task<int> Scalar(DatMonAnOnlineContext db, string sql)
    {
        await db.Database.OpenConnectionAsync();
        await using var command = db.Database.GetDbConnection().CreateCommand();
        command.CommandText = sql;
        return Convert.ToInt32(await command.ExecuteScalarAsync());
    }
}
