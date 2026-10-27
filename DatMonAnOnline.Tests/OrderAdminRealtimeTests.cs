using DatMonAnOnline.API.Controllers;
using DatMonAnOnline.API.Models;
using DatMonAnOnline.API.Options;
using DatMonAnOnline.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace DatMonAnOnline.Tests;

public class OrderAdminRealtimeTests
{
    [MySqlFact]
    public async Task CreatedOrderNotifiesAdminAfterCommitAndRetryDoesNotResend()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await using var db = fixture.Open();
        await IsolatedMySql.Cart(db).ThemMonVaoGio(new() { MaMonAn = 1, SoLuong = 1 });
        var cartId = await db.Giohangs.Select(x => x.MaGioHang).SingleAsync();
        var publisher = new RecordingRealtime(async () =>
        {
            await using var read = fixture.Open();
            return await read.Donhangs.CountAsync() == 1 && await read.Thanhtoans.CountAsync() == 1;
        });
        var key = Guid.NewGuid().ToString();
        var request = new DatHangYeuCau { MaGioHang = cartId, MaDiaChi = 1, MaPhuongThuc = 1 };
        async Task<ContentResult> Checkout()
        {
            await using var context = fixture.Open();
            var wallet = new WalletService(context);
            var settlement = new OrderIncomeSettlementService(context, wallet, Options.Create(new DoiSoatOptions { BatDauApDung = new DateTime(2020, 1, 1) }));
            var controller = IsolatedMySql.AsCustomer(new DonHangController(context, publisher,
                NullLogger<DonHangController>.Instance, new CheckoutCartReservationService(), wallet, settlement), key);
            return Assert.IsType<ContentResult>(await controller.DatHang(request));
        }
        var created = await Checkout();
        var retried = await Checkout();
        Assert.Equal(201, created.StatusCode);
        Assert.Equal(created.Content, retried.Content);
        Assert.Equal(1, publisher.AdminEvents);
        Assert.True(publisher.ObservedCommittedOrder);
        Assert.Equal(1, publisher.MerchantNotifications);
        Assert.Equal(1, publisher.MerchantOrders);
    }

    [MySqlFact]
    public async Task FailedAdminDeliveryDoesNotUndoOrFailTheCommittedOrder()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await using var db = fixture.Open();
        await IsolatedMySql.Cart(db).ThemMonVaoGio(new() { MaMonAn = 1, SoLuong = 1 });
        var wallet = new WalletService(db);
        var publisher = new RecordingRealtime(() => Task.FromException<bool>(new IOException("Test delivery failure")));
        var settlement = new OrderIncomeSettlementService(db, wallet, Options.Create(new DoiSoatOptions { BatDauApDung = new DateTime(2020, 1, 1) }));
        var controller = IsolatedMySql.AsCustomer(new DonHangController(db, publisher,
            NullLogger<DonHangController>.Instance, new CheckoutCartReservationService(), wallet, settlement));
        var result = Assert.IsType<ContentResult>(await controller.DatHang(new()
        {
            MaGioHang = await db.Giohangs.Select(x => x.MaGioHang).SingleAsync(), MaDiaChi = 1, MaPhuongThuc = 1
        }));
        Assert.Equal(201, result.StatusCode);
        await using var read = fixture.Open();
        Assert.Equal(1, await read.Donhangs.CountAsync());
        Assert.Equal(1, await read.Thanhtoans.CountAsync());
        Assert.Equal(1, publisher.MerchantNotifications);
        Assert.Equal(1, publisher.MerchantOrders);
    }

    private sealed class RecordingRealtime(Func<Task<bool>> onAdminSend) : IRealtimeNotificationService
    {
        public int AdminEvents { get; private set; }
        public int MerchantNotifications { get; private set; }
        public int MerchantOrders { get; private set; }
        public bool ObservedCommittedOrder { get; private set; }
        public Task GuiThongBaoAsync(int id, object payload) { MerchantNotifications++; return Task.CompletedTask; }
        public Task GuiDonHangMoiAsync(int id, object payload) { MerchantOrders++; return Task.CompletedTask; }
        public Task GuiDonHangCapNhatAsync(int id, object payload) => Task.CompletedTask;
        public Task GuiDonHangDaHuyAsync(int id, object payload) => Task.CompletedTask;
        public Task GuiDuLieuThayDoiAsync(int id, IEnumerable<string> scopes, object? payload = null) => Task.CompletedTask;
        public async Task GuiDuLieuThayDoiTheoVaiTroAsync(string role, IEnumerable<string> scopes, object? payload = null)
        {
            Assert.Equal("Admin", role);
            Assert.Contains("donHang", scopes);
            Assert.Contains("tongQuan", scopes);
            AdminEvents++;
            ObservedCommittedOrder = await onAdminSend();
        }
    }
}
