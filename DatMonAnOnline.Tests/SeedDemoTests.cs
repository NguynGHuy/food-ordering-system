using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;
using Xunit;

namespace DatMonAnOnline.Tests;

[CollectionDefinition("Full demo install", DisableParallelization = true)]
public class FullDemoInstallCollection { }

[Collection("Full demo install")]
public class SeedDemoTests
{
    [MySqlFact]
    public async Task FreshInstallSeedsValidCartAndRejectsRepeatWithoutChangingCounts()
    {
        var fixture = await IsolatedMySql.CreateAsync(installSchema: false);
        await using var db = fixture.Open();
        db.Database.SetCommandTimeout(120);
        await db.Database.OpenConnectionAsync();
        var database = db.Database.GetDbConnection().Database;
        var schema = await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "Database.sql"));
        schema = Regex.Replace(schema, @"CREATE DATABASE `DatMonAnOnline`[\s\S]*?;", "", RegexOptions.None, TimeSpan.FromSeconds(1));
        schema = schema.Replace("USE `DatMonAnOnline`;", $"USE `{database}`;", StringComparison.Ordinal);
        await db.Database.ExecuteSqlRawAsync(schema);
        var seed = (await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "SeedDemo.sql")))
            .Replace("USE `DatMonAnOnline`;", $"USE `{database}`;", StringComparison.Ordinal);
        await db.Database.ExecuteSqlRawAsync(seed);

        Assert.Equal(10, await db.Nhahangs.CountAsync());
        Assert.Equal(124, await db.Monans.CountAsync());
        var cart = await db.Chitietgiohangs.Include(x => x.MaGioHangNavigation)
            .Include(x => x.MaMonAnNavigation).Include(x => x.ChitietgiohangToppings).SingleAsync();
        Assert.Equal(cart.MaMonAnNavigation.MaNhaHang, cart.MaGioHangNavigation.MaNhaHang);
        var topping = Assert.Single(cart.ChitietgiohangToppings);
        Assert.True(await db.Monans.Where(x => x.MaMonAn == cart.MaMonAn)
            .AnyAsync(x => x.MaNhomToppings.Any(g => g.Toppings.Any(t => t.MaTopping == topping.MaTopping))));

        var orderCount = await db.Donhangs.CountAsync();
        var paymentCount = await db.Thanhtoans.CountAsync();
        var ledgerCount = await db.Giaodichvis.CountAsync();
        var exception = await Assert.ThrowsAsync<MySqlException>(() => db.Database.ExecuteSqlRawAsync(seed));
        Assert.Equal(1062, exception.Number);
        await db.Database.ExecuteSqlRawAsync("ROLLBACK");
        Assert.Equal(10, await db.Nhahangs.CountAsync());
        Assert.Equal(124, await db.Monans.CountAsync());
        Assert.Equal(orderCount, await db.Donhangs.CountAsync());
        Assert.Equal(paymentCount, await db.Thanhtoans.CountAsync());
        Assert.Equal(ledgerCount, await db.Giaodichvis.CountAsync());
    }
}
