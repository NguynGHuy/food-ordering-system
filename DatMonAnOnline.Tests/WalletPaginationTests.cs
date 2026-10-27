using System.Text.Json;
using DatMonAnOnline.API.Controllers;
using DatMonAnOnline.API.Models;
using DatMonAnOnline.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace DatMonAnOnline.Tests;

public class WalletPaginationTests
{
    [Theory]
    [InlineData(0, 20)]
    [InlineData(-1, 20)]
    [InlineData(1, 0)]
    [InlineData(1, -1)]
    [InlineData(1, 101)]
    [InlineData(int.MaxValue, 100)]
    [InlineData(int.MaxValue, int.MaxValue)]
    public async Task InvalidPaginationReturns400BeforeAnyDatabaseQuery(int page, int size)
    {
        var controller = IsolatedMySql.AsCustomer(new ViController(null!));
        var result = await controller.GetMyTransactions(page, size);
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [MySqlFact]
    public async Task ValidAndBeyondLastPagesPreserveContractBalanceAndLedger()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await using var db = fixture.Open();
        db.Vis.Add(new Vi { MaTaiKhoan = 1, SoDu = 0, DonViTienTe = "VND", TrangThai = "HoatDong" });
        await db.SaveChangesAsync();
        await using (var transaction = await db.Database.BeginTransactionAsync())
        {
            Assert.True((await new WalletService(db).CreditAsync(1, 100000, WalletTransactionTypes.KhoiTao, "PAGE-OPENING")).Succeeded);
            await db.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        var walletBefore = await db.Vis.Select(x => x.SoDu).SingleAsync();
        var ledgerBefore = await db.Giaodichvis.CountAsync();
        var controller = IsolatedMySql.AsCustomer(new ViController(db));

        var first = JsonSerializer.SerializeToElement(Assert.IsType<OkObjectResult>(await controller.GetMyTransactions(1, 20)).Value);
        Assert.Equal(1, first.GetProperty("items").GetArrayLength());
        Assert.Equal(1, first.GetProperty("totalItems").GetInt32());
        var beyond = JsonSerializer.SerializeToElement(Assert.IsType<OkObjectResult>(await controller.GetMyTransactions(99, 20)).Value);
        Assert.Equal(99, beyond.GetProperty("pageNumber").GetInt32());
        Assert.Equal(0, beyond.GetProperty("items").GetArrayLength());
        Assert.False(beyond.GetProperty("hasNextPage").GetBoolean());
        Assert.IsType<BadRequestObjectResult>(await controller.GetMyTransactions(int.MaxValue, 100));
        Assert.Equal(walletBefore, await db.Vis.Select(x => x.SoDu).SingleAsync());
        Assert.Equal(ledgerBefore, await db.Giaodichvis.CountAsync());
    }
}
