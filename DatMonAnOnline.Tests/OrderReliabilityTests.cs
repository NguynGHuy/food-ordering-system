using System.Data.Common;
using System.Reflection;
using DatMonAnOnline.API.Controllers;
using DatMonAnOnline.API.Models;
using DatMonAnOnline.API.Options;
using DatMonAnOnline.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace DatMonAnOnline.Tests;

public class OrderReliabilityTests
{
    private static readonly IOptions<DoiSoatOptions> OptionsValue =
        Options.Create(new DoiSoatOptions { BatDauApDung = new DateTime(2020, 1, 1) });

    [MySqlFact]
    public async Task ExpiryCommitsOnceAndRefreshesAdminWithoutRefundingCodOrPaidOrders()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        var unpaid = await CreateOrder(fixture, 2);
        var cod = await CreateOrder(fixture, 1);
        var paid = await CreateOrder(fixture, 5);
        await using (var db = fixture.Open())
        {
            await db.Donhangs.ExecuteUpdateAsync(x => x.SetProperty(o => o.ThoiGianDat, DateTime.Now.AddHours(-1)));
        }
        var publisher = new Publisher(async () =>
        {
            await using var read = fixture.Open();
            Assert.Equal(6, (await read.Donhangs.FindAsync(unpaid))!.MaTrangThai);
            Assert.Equal(1, await read.Lichsutrangthaidonhangs.CountAsync(x => x.MaDonHang == unpaid && x.MaTrangThai == 6));
        });
        await using var services = Services(fixture, publisher);
        var job = Expiry(services);
        await RunExpiry(job);
        await RunExpiry(job);
        Assert.Equal(1, publisher.AdminOrderEvents);
        await using var verify = fixture.Open();
        Assert.Equal(1, (await verify.Donhangs.FindAsync(cod))!.MaTrangThai);
        Assert.Equal(1, (await verify.Donhangs.FindAsync(paid))!.MaTrangThai);
        Assert.Empty(await verify.Hoantiens.ToListAsync());
        Assert.Empty(await verify.Giaodichvis.Where(x => x.LoaiGiaoDich == "HoanTien").ToListAsync());
    }

    [MySqlFact]
    public async Task ApiExpiryRefreshesAdminEvenWhenCustomerDeliveryFails()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        var id = await CreateOrder(fixture, 2);
        await using var db = fixture.Open();
        await db.Donhangs.Where(x => x.MaDonHang == id).ExecuteUpdateAsync(x => x.SetProperty(o => o.ThoiGianDat, DateTime.Now.AddHours(-1)));
        var paymentId = await db.Thanhtoans.Select(x => x.MaThanhToan).SingleAsync();
        var publisher = new Publisher { FailDelivery = true };
        var controller = IsolatedMySql.AsCustomer(new ThanhToanController(db, publisher,
            NullLogger<ThanhToanController>.Instance, new WalletService(db)));
        var response = await controller.MoPhongKetQuaThanhToan(paymentId, new() { KetQua = "ThanhCong" });
        Assert.Equal(410, Assert.IsType<ObjectResult>(response).StatusCode);
        Assert.Equal(1, publisher.AdminOrderEvents);
        await using var read = fixture.Open();
        Assert.Equal(6, (await read.Donhangs.SingleAsync()).MaTrangThai);
        Assert.Equal("ThatBai", (await read.Thanhtoans.SingleAsync()).TrangThaiThanhToan);
        Assert.Empty(await read.Giaodichvis.ToListAsync());
    }

    [MySqlFact]
    public async Task TwoExpiryWorkersAndExpiredPaymentWaitForSameLockThenCancelOnce()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        var id = await CreateOrder(fixture, 2);
        await using var blocker = fixture.Open();
        await blocker.Donhangs.Where(x => x.MaDonHang == id).ExecuteUpdateAsync(x => x.SetProperty(o => o.ThoiGianDat, DateTime.Now.AddHours(-1)));
        var paymentId = await blocker.Thanhtoans.Select(x => x.MaThanhToan).SingleAsync();
        await using var transaction = await blocker.Database.BeginTransactionAsync();
        await blocker.Donhangs.FromSqlInterpolated($"SELECT * FROM donhang WHERE MaDonHang={id} FOR UPDATE").ToListAsync();
        await using var services = Services(fixture, new Publisher());
        var first = RunExpiry(Expiry(services));
        var second = RunExpiry(Expiry(services));
        var payment = Task.Run(async () =>
        {
            await using var db = fixture.Open();
            var controller = IsolatedMySql.AsCustomer(new ThanhToanController(db, new Publisher(),
                NullLogger<ThanhToanController>.Instance, new WalletService(db)));
            return await controller.MoPhongKetQuaThanhToan(paymentId, new() { KetQua = "ThanhCong" });
        });
        await WaitForLocks(blocker, 3);
        await transaction.CommitAsync();
        await Task.WhenAll(first, second, payment);
        await using var read = fixture.Open();
        Assert.Equal(6, (await read.Donhangs.SingleAsync()).MaTrangThai);
        Assert.Equal("ThatBai", (await read.Thanhtoans.SingleAsync()).TrangThaiThanhToan);
        Assert.Equal(1, await read.Lichsutrangthaidonhangs.CountAsync(x => x.MaTrangThai == 6));
        Assert.Equal(1, await read.Thongbaos.CountAsync(x => x.MaTaiKhoan == 1 && x.TieuDe == "Đơn hàng đã tự hủy"));
        Assert.Empty(await read.Giaodichvis.ToListAsync());
    }

    [MySqlFact]
    public async Task RecoveryRetriesFailedCandidateQueryWithoutRestart()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await CreateCompletedOrder(fixture);
        var fault = new FirstReadFailure();
        await using var services = Services(fixture, new Publisher(), fault);
        await RunRecovery(services);
        Assert.True(fault.Attempts > 1);
        await AssertIncome(fixture, 1);
    }

    [MySqlFact]
    public async Task RecoveryRollsBackFailedLedgerAndRetriesWithoutLosingOtherOrders()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await CreateCompletedOrder(fixture);
        await CreateCompletedOrder(fixture);
        var fault = new FirstLedgerFailure();
        await using var services = Services(fixture, new Publisher(), fault);
        await RunRecovery(services);
        Assert.Equal(1, fault.Failures);
        await AssertIncome(fixture, 2);
    }

    [MySqlFact]
    public async Task RecoveryDeliveryFailureCannotRollbackCreditOrReplayItAfterRestart()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await CreateCompletedOrder(fixture);
        var publisher = new Publisher { FailDelivery = true };
        await using var services = Services(fixture, publisher);
        await RunRecovery(services);
        await RunRecovery(services);
        Assert.Equal(1, publisher.WalletEvents);
        await AssertIncome(fixture, 1);
    }

    [MySqlFact]
    public async Task RecoveryRetriesAreBoundedForUnrecoverableWallet()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await CreateCompletedOrder(fixture);
        await using (var db = fixture.Open())
            await db.Vis.Where(x => x.MaTaiKhoan == 2).ExecuteUpdateAsync(x => x.SetProperty(w => w.TrangThai, "Dong"));
        var attempts = new CountSettlement();
        await using var services = Services(fixture, new Publisher(), attempts);
        await RunRecovery(services);
        Assert.Equal(3, attempts.Reads);
        await using var read = fixture.Open();
        Assert.Empty(await read.Giaodichvis.Where(x => x.LoaiGiaoDich == "ThuNhapDonHang").ToListAsync());
        Assert.Equal(0, (await read.Vis.SingleAsync(x => x.MaTaiKhoan == 2)).SoDu);
    }

    [MySqlFact]
    public async Task TwoRecoveryWorkersSerializeAndPublishOneCredit()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await CreateCompletedOrder(fixture);
        var publisher = new Publisher();
        await using var services = Services(fixture, publisher);
        await using var blocker = fixture.Open();
        await using var transaction = await blocker.Database.BeginTransactionAsync();
        await blocker.Nhahangs.FromSqlRaw("SELECT * FROM nhahang WHERE MaNhaHang=1 FOR UPDATE").ToListAsync();
        var first = RunRecovery(services);
        var second = RunRecovery(services);
        await WaitForLocks(blocker, 2);
        await transaction.CommitAsync();
        await Task.WhenAll(first, second);
        Assert.Equal(1, publisher.WalletEvents);
        await AssertIncome(fixture, 1);
    }

    [MySqlFact]
    public async Task DuplicatePaidCancellationRefundsAndReturnsVoucherExactlyOnce()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await SeedVoucher(fixture);
        var id = await CreateOrder(fixture, 5, 1);
        var key = Guid.NewGuid().ToString();
        async Task<ContentResult> Cancel()
        {
            await using var db = fixture.Open();
            var controller = IsolatedMySql.Orders(db, key);
            controller.Request.Path = $"/api/don-hang/{id}/huy";
            return Assert.IsType<ContentResult>(await controller.HuyDonHang(id, new() { LyDoHuy = "Controlled test cancellation" }));
        }
        await using var blocker = fixture.Open();
        await using var transaction = await blocker.Database.BeginTransactionAsync();
        await blocker.Donhangs.FromSqlInterpolated($"SELECT * FROM donhang WHERE MaDonHang={id} FOR UPDATE").ToListAsync();
        var first = Cancel();
        var second = Cancel();
        await WaitForLocks(blocker, 2);
        await transaction.CommitAsync();
        var results = await Task.WhenAll(first, second);
        Assert.Equal(results[0].Content, results[1].Content);
        Assert.Equal(results[0].Content, (await Cancel()).Content);
        await using var read = fixture.Open();
        Assert.Equal(6, (await read.Donhangs.SingleAsync()).MaTrangThai);
        Assert.Equal(1, await read.Hoantiens.CountAsync());
        Assert.Equal(1, await read.Giaodichvis.CountAsync(x => x.LoaiGiaoDich == "HoanTien"));
        Assert.Equal(1, await read.Giaodichvis.CountAsync(x => x.LoaiGiaoDich == "ThanhToan"));
        Assert.Equal(100000, (await read.Vis.SingleAsync()).SoDu);
        Assert.Equal(0, (await read.Khuyenmais.SingleAsync()).SoLuongDaDung);
        Assert.Equal(1, await read.Lichsutrangthaidonhangs.CountAsync(x => x.MaTrangThai == 6));
        Assert.Empty(await read.Giaodichvis.Where(x => x.LoaiGiaoDich == "ThuNhapDonHang").ToListAsync());
    }

    [MySqlFact]
    public async Task RefundLedgerFailureRollsBackCancellationVoucherAndRefundBeforeSafeRetry()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        await SeedVoucher(fixture);
        var id = await CreateOrder(fixture, 5, 1);
        decimal balance;
        await using (var db = fixture.Open()) balance = (await db.Vis.SingleAsync()).SoDu;
        await using (var failing = fixture.Open(new RefundLedgerFailure()))
            await Assert.ThrowsAsync<IOException>(() => IsolatedMySql.Orders(failing).HuyDonHang(id, new() { LyDoHuy = "Controlled fault" }));
        await using (var read = fixture.Open())
        {
            Assert.Equal(1, (await read.Donhangs.SingleAsync()).MaTrangThai);
            Assert.Empty(await read.Hoantiens.ToListAsync());
            Assert.Empty(await read.Giaodichvis.Where(x => x.LoaiGiaoDich == "HoanTien").ToListAsync());
            Assert.Equal(balance, (await read.Vis.SingleAsync()).SoDu);
            Assert.Equal(1, (await read.Khuyenmais.SingleAsync()).SoLuongDaDung);
            Assert.Empty(await read.Lichsutrangthaidonhangs.Where(x => x.MaTrangThai == 6).ToListAsync());
        }
        await using (var retry = fixture.Open())
            Assert.IsType<ContentResult>(await IsolatedMySql.Orders(retry).HuyDonHang(id, new() { LyDoHuy = "Controlled retry" }));
        await using var verify = fixture.Open();
        Assert.Equal(100000, (await verify.Vis.SingleAsync()).SoDu);
        Assert.Equal(1, await verify.Hoantiens.CountAsync());
        Assert.Equal(0, (await verify.Khuyenmais.SingleAsync()).SoLuongDaDung);
    }

    private static async Task SeedVoucher(IsolatedMySql fixture)
    {
        await using var db = fixture.Open();
        db.Khuyenmais.Add(new() { MaKhuyenMai = 1, MaNhaHang = 1, MaCode = "RELIABILITY", LoaiGiam = "SoTien",
            GiaTriGiam = 1000, SoLuong = 10, SoLuotToiDaMoiKhach = 1, TrangThai = true,
            NgayBatDau = DateTime.Now.AddDays(-1), NgayKetThuc = DateTime.Now.AddDays(1) });
        await db.SaveChangesAsync();
    }

    private static async Task<int> CreateOrder(IsolatedMySql fixture, int method, int? voucher = null)
    {
        await using var db = fixture.Open();
        if (method == 5 && !await db.Vis.AnyAsync(x => x.MaTaiKhoan == 1))
        {
            db.Vis.Add(new Vi { MaTaiKhoan = 1, SoDu = 0, DonViTienTe = "VND", TrangThai = "HoatDong" });
            await db.SaveChangesAsync();
            await using var transaction = await db.Database.BeginTransactionAsync();
            Assert.True((await new WalletService(db).CreditAsync(1, 100000, WalletTransactionTypes.KhoiTao, "TEST-OPENING")).Succeeded);
            await db.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        await IsolatedMySql.Cart(db).ThemMonVaoGio(new() { MaMonAn = 1, SoLuong = 1 });
        var cartId = await db.Giohangs.Select(x => x.MaGioHang).SingleAsync();
        var result = await IsolatedMySql.Orders(db).DatHang(new() { MaGioHang = cartId, MaDiaChi = 1, MaPhuongThuc = method, MaKhuyenMai = voucher });
        Assert.Equal(201, Assert.IsType<ContentResult>(result).StatusCode);
        return await db.Donhangs.MaxAsync(x => x.MaDonHang);
    }

    private static async Task CreateCompletedOrder(IsolatedMySql fixture)
    {
        var id = await CreateOrder(fixture, 5);
        await using var db = fixture.Open();
        var order = await db.Donhangs.FindAsync(id);
        order!.MaTrangThai = 5;
        order.ThoiGianGiaoThucTe = DateTime.Now;
        if (!await db.Vis.AnyAsync(x => x.MaTaiKhoan == 2))
            db.Vis.Add(new Vi { MaTaiKhoan = 2, SoDu = 0, DonViTienTe = "VND", TrangThai = "HoatDong" });
        await db.SaveChangesAsync();
    }

    private static ServiceProvider Services(IsolatedMySql fixture, Publisher publisher, params IInterceptor[] interceptors)
        => new ServiceCollection().AddScoped(_ => fixture.Open(interceptors))
            .AddScoped<IWalletService, WalletService>().AddSingleton(OptionsValue)
            .AddScoped<IOrderIncomeSettlementService, OrderIncomeSettlementService>()
            .AddSingleton<IRealtimeNotificationService>(publisher).BuildServiceProvider();

    private static PendingOnlineOrderExpirationService Expiry(ServiceProvider provider)
        => new(provider.GetRequiredService<IServiceScopeFactory>(), NullLogger<PendingOnlineOrderExpirationService>.Instance);

    private static Task RunExpiry(PendingOnlineOrderExpirationService service)
        => (Task)typeof(PendingOnlineOrderExpirationService).GetMethod("ExpirePendingOrders", BindingFlags.NonPublic | BindingFlags.Instance)!
            .Invoke(service, [CancellationToken.None])!;

    private static async Task RunRecovery(ServiceProvider provider)
    {
        using var service = new CompletedOrderWalletRecoveryService(provider.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<CompletedOrderWalletRecoveryService>.Instance, OptionsValue);
        await service.StartAsync(CancellationToken.None);
        await service.ExecuteTask!.WaitAsync(TimeSpan.FromSeconds(25));
    }

    private static async Task WaitForLocks(DatMonAnOnlineContext db, int expected)
    {
        var schema = db.Database.GetDbConnection().Database;
        var deadline = DateTime.UtcNow.AddSeconds(10);
        while (DateTime.UtcNow < deadline)
        {
            var waits = await db.Database.SqlQuery<long>($"""
                SELECT COUNT(DISTINCT w.REQUESTING_THREAD_ID) AS Value
                FROM performance_schema.data_lock_waits w
                JOIN performance_schema.data_locks l ON l.ENGINE_LOCK_ID=w.REQUESTING_ENGINE_LOCK_ID
                WHERE l.OBJECT_SCHEMA={schema}
                """).SingleAsync();
            if (waits >= expected) return;
            await Task.Delay(50);
        }
        Assert.Fail($"Expected {expected} actual MySQL lock waiters; deterministic interleaving was not established.");
    }

    private static async Task AssertIncome(IsolatedMySql fixture, int count)
    {
        await using var db = fixture.Open();
        var ledger = await db.Giaodichvis.Where(x => x.LoaiGiaoDich == "ThuNhapDonHang").ToListAsync();
        Assert.Equal(count, ledger.Count);
        Assert.Equal(count, ledger.Select(x => x.MaThamChieu).Distinct().Count());
        Assert.Equal(ledger.Sum(x => x.SoTien), (await db.Vis.SingleAsync(x => x.MaTaiKhoan == 2)).SoDu);
        Assert.All(ledger, x => Assert.Equal(x.SoDuTruoc + x.SoTien, x.SoDuSau));
        Assert.Empty(await db.Hoantiens.ToListAsync());
        Assert.Empty(await db.Chitietdoisoats.ToListAsync());
    }

    private sealed class FirstReadFailure : DbCommandInterceptor
    {
        public int Attempts;
        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command, CommandEventData eventData,
            InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            if (command.CommandText.Contains("FROM `donhang`") && Interlocked.Increment(ref Attempts) == 1)
                throw new IOException("Controlled candidate query failure");
            return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
        }
    }

    private sealed class FirstLedgerFailure : SaveChangesInterceptor
    {
        public int Failures;
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData,
            InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            if (eventData.Context!.ChangeTracker.Entries<Giaodichvi>().Any(x => x.State == EntityState.Added && x.Entity.LoaiGiaoDich == "ThuNhapDonHang") &&
                Interlocked.CompareExchange(ref Failures, 1, 0) == 0)
                throw new IOException("Controlled ledger insert failure");
            return base.SavingChangesAsync(eventData, result, cancellationToken);
        }
    }

    private sealed class CountSettlement : DbCommandInterceptor
    {
        public int Reads;
        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command, CommandEventData eventData,
            InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            if (command.CommandText.Contains("SELECT * FROM vi WHERE") && command.CommandText.Contains("FOR UPDATE")) Interlocked.Increment(ref Reads);
            return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
        }
    }

    private sealed class RefundLedgerFailure : SaveChangesInterceptor
    {
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData,
            InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            if (eventData.Context!.ChangeTracker.Entries<Giaodichvi>().Any(x => x.State == EntityState.Added && x.Entity.LoaiGiaoDich == "HoanTien"))
                throw new IOException("Controlled refund ledger failure");
            return base.SavingChangesAsync(eventData, result, cancellationToken);
        }
    }

    private sealed class Publisher(Func<Task>? verifyCommit = null) : IRealtimeNotificationService
    {
        public int AdminOrderEvents;
        public int WalletEvents;
        public bool FailDelivery;
        public Task GuiThongBaoAsync(int id, object data) => FailDelivery ? Task.FromException(new IOException("Controlled delivery failure")) : Task.CompletedTask;
        public Task GuiDonHangMoiAsync(int id, object data) => Task.CompletedTask;
        public Task GuiDonHangCapNhatAsync(int id, object data) => Task.CompletedTask;
        public Task GuiDonHangDaHuyAsync(int id, object data) => Task.CompletedTask;
        public Task GuiDuLieuThayDoiAsync(int id, IEnumerable<string> scopes, object? data = null)
        {
            if (scopes.Contains("vi")) Interlocked.Increment(ref WalletEvents);
            return FailDelivery ? Task.FromException(new IOException("Controlled delivery failure")) : Task.CompletedTask;
        }
        public async Task GuiDuLieuThayDoiTheoVaiTroAsync(string role, IEnumerable<string> scopes, object? data = null)
        {
            Assert.Equal("Admin", role);
            if (scopes.Contains("donHang"))
            {
                Assert.Contains("tongQuan", scopes);
                Interlocked.Increment(ref AdminOrderEvents);
            }
            if (verifyCommit != null) await verifyCommit();
        }
    }
}
