using System.Data.Common;
using System.Security.Claims;
using DatMonAnOnline.API.Common;
using DatMonAnOnline.API.Controllers;
using DatMonAnOnline.API.Models;
using DatMonAnOnline.API.Options;
using DatMonAnOnline.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace DatMonAnOnline.Tests;

public class OrderWorkflowTests
{
    [Fact]
    public void DeadlinesHaveExactVietnamBoundariesAndDoNotDependOnInputOffset()
    {
        var utc = new DateTimeOffset(2026, 11, 2, 16, 58, 0, TimeSpan.Zero);
        Assert.Equal(VietnamBusinessTime.Now(new Clock(utc)), VietnamBusinessTime.Now(new Clock(utc.ToOffset(TimeSpan.FromHours(7)))));
        var ready = VietnamBusinessTime.Now(new Clock(utc));
        var tracking = new OrderWorkflow { ReadyAt = ready, StateCode = 1 };
        Assert.False(OrderWorkflowRules.AcceptanceExpired(tracking, ready.AddMinutes(10).AddTicks(-1)));
        Assert.True(OrderWorkflowRules.AcceptanceExpired(tracking, ready.AddMinutes(10)));
        Assert.Equal(TimeSpan.FromHours(7), OrderWorkflowRules.WithOffset(ready)!.Value.Offset);
        Assert.Equal(3, OrderWorkflowRules.AcceptanceDeadline(tracking)!.Value.Day);
        Assert.Equal((10, 20), OrderWorkflowRules.Thresholds(2));
        Assert.Equal((30, 45), OrderWorkflowRules.Thresholds(3));
        Assert.Equal((45, 60), OrderWorkflowRules.Thresholds(4));
        Assert.Null(OrderWorkflowRules.AcceptanceDeadline(null));
    }

    [MySqlFact]
    public async Task NewOnlineStartsAcceptanceOnlyAfterSuccessfulPaymentAndRetryDoesNotResetIt()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        var id = await Create(fixture, 2);
        await using (var read = fixture.Open()) Assert.Null((await read.OrderWorkflows.SingleAsync()).ReadyAt);
        DateTime? ready;
        int payment;
        await using (var db = fixture.Open())
        {
            payment = await db.Thanhtoans.Select(x => x.MaThanhToan).SingleAsync();
            var controller = IsolatedMySql.AsCustomer(new ThanhToanController(db, new IsolatedMySql.NoopRealtime(), NullLogger<ThanhToanController>.Instance, new WalletService(db)));
            Assert.IsType<ContentResult>(await controller.MoPhongKetQuaThanhToan(payment, new() { KetQua = "ThanhCong" }));
        }
        await using (var read = fixture.Open()) ready = (await read.OrderWorkflows.SingleAsync()).ReadyAt;
        Assert.NotNull(ready);
        await using (var db = fixture.Open())
        {
            await using var tx = await db.Database.BeginTransactionAsync();
            await OrderWorkflowTracking.ReadyAsync(db, id, ready!.Value.AddHours(1));
            await db.SaveChangesAsync(); await tx.CommitAsync();
        }
        await using var verify = fixture.Open();
        Assert.Equal(ready, (await verify.OrderWorkflows.SingleAsync()).ReadyAt);
    }

    [MySqlFact]
    public async Task TwoAcceptanceWorkersWaitOnRealLockThenRefundPaidOnce()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        var id = await Create(fixture, 5);
        await Age(fixture, id, 1, 11);
        await using var blocker = fixture.Open();
        await using var tx = await blocker.Database.BeginTransactionAsync();
        await blocker.Nhahangs.FromSqlRaw("SELECT * FROM nhahang WHERE MaNhaHang=1 FOR UPDATE").ToListAsync();
        var first = Process(fixture, id); var second = Process(fixture, id);
        await WaitLocks(blocker, 2); await tx.CommitAsync(); await Task.WhenAll(first, second);
        await using var read = fixture.Open();
        Assert.Equal(6, (await read.Donhangs.SingleAsync()).MaTrangThai);
        Assert.Equal(1, await read.Hoantiens.CountAsync());
        Assert.Equal(1, await read.Giaodichvis.CountAsync(x => x.LoaiGiaoDich == "HoanTien"));
        Assert.Equal(100000, (await read.Vis.SingleAsync(x => x.MaTaiKhoan == 1)).SoDu);
        Assert.Equal(1, await read.Lichsutrangthaidonhangs.CountAsync(x => x.MaTrangThai == 6));
    }

    [MySqlFact]
    public async Task FiveMinuteReminderAndCodCancellationAreDurablyDeduplicated()
    {
        var fixture = await IsolatedMySql.CreateAsync(); var id = await Create(fixture, 1);
        await Age(fixture, id, 1, 6); await Process(fixture, id); await Process(fixture, id);
        await using (var db = fixture.Open())
        {
            Assert.Equal(1, await db.Thongbaos.CountAsync(x => x.TieuDe == "Đơn đang chờ Quán nhận"));
            Assert.Equal(1, (await db.Donhangs.SingleAsync()).MaTrangThai);
        }
        await Age(fixture, id, 1, 11); await Process(fixture, id); await Process(fixture, id);
        await using var read = fixture.Open();
        Assert.Equal(6, (await read.Donhangs.SingleAsync()).MaTrangThai);
        Assert.Empty(await read.Hoantiens.ToListAsync()); Assert.Empty(await read.Giaodichvis.ToListAsync());
    }

    [MySqlFact]
    public async Task SlaEscalatesOncePerStateWithoutCancellingOrCrediting()
    {
        var fixture = await IsolatedMySql.CreateAsync(); var id = await Create(fixture, 1);
        foreach (var state in new[] { 2, 3, 4 })
        {
            await Age(fixture, id, state, OrderWorkflowRules.Thresholds(state)!.Value.Reminder + 1);
            await Process(fixture, id); await Process(fixture, id);
            await Age(fixture, id, state, OrderWorkflowRules.Thresholds(state)!.Value.Escalation + 1);
            await Process(fixture, id); await Process(fixture, id);
        }
        await using var read = fixture.Open();
        Assert.Equal(4, (await read.Donhangs.SingleAsync()).MaTrangThai);
        Assert.Equal(3, await read.OrderSupports.CountAsync(x => x.Kind == "SLA"));
        Assert.Equal(3, await read.OrderSupportAudits.CountAsync());
        Assert.Empty(await read.Hoantiens.ToListAsync()); Assert.Empty(await read.Giaodichvis.ToListAsync());
    }

    [MySqlFact]
    public async Task LegacyOrderWithoutMetadataIsNeverAssignedAcceptanceDeadline()
    {
        var fixture = await IsolatedMySql.CreateAsync(); var id = await Create(fixture, 1);
        await using (var db = fixture.Open()) await db.OrderWorkflows.ExecuteDeleteAsync();
        await Process(fixture, id);
        await using var read = fixture.Open();
        Assert.Empty(await read.OrderWorkflows.ToListAsync()); Assert.Equal(1, (await read.Donhangs.SingleAsync()).MaTrangThai);
    }

    [MySqlFact]
    public async Task AdminCancelsSupportedPreparingOrderOnceAndAuditsDecision()
    {
        var fixture = await IsolatedMySql.CreateAsync(); var id = await Create(fixture, 5); await Age(fixture, id, 3, 1);
        var supportId = await Support(fixture, id);
        var key = Guid.NewGuid().ToString();
        async Task<string?> Decide()
        {
            await using var db = fixture.Open(); var controller = Api(db, "Admin", 3, $"/api/admin/order-support/{supportId}/decision", key);
            var result = Assert.IsType<ContentResult>(await controller.Decide(supportId, Decision(3), default));
            return result.Content;
        }
        Assert.Equal(await Decide(), await Decide());
        await using var read = fixture.Open();
        Assert.Equal("Cancelled", (await read.OrderSupports.SingleAsync()).Status);
        Assert.Equal(2, await read.OrderSupportAudits.CountAsync());
        Assert.Equal(1, await read.Hoantiens.CountAsync());
        Assert.Equal(100000, (await read.Vis.SingleAsync(x => x.MaTaiKhoan == 1)).SoDu);
    }

    [MySqlFact]
    public async Task CostDisputeAndIncomeSendToSeparateReviewWithoutReversingMoney()
    {
        var fixture = await IsolatedMySql.CreateAsync(); var id = await Create(fixture, 5); await Age(fixture, id, 4, 1);
        var supportId = await Support(fixture, id);
        await using (var db = fixture.Open())
        {
            var decision = Decision(4); decision.NoCostDispute = false;
            Assert.IsType<ContentResult>(await Api(db, "Admin", 3, $"/api/admin/order-support/{supportId}/decision").Decide(supportId, decision, default));
        }
        await using var read = fixture.Open();
        Assert.Equal("NeedsReview", (await read.OrderSupports.SingleAsync()).Status);
        Assert.Equal(4, (await read.Donhangs.SingleAsync()).MaTrangThai);
        Assert.Empty(await read.Hoantiens.ToListAsync());
        Assert.Equal(74990, (await read.Vis.SingleAsync(x => x.MaTaiKhoan == 1)).SoDu);
    }

    [MySqlFact]
    public async Task ChangedStateRejectsStaleDecisionAndCrossCustomerCannotRequestSupport()
    {
        var fixture = await IsolatedMySql.CreateAsync(); var id = await Create(fixture, 1); await Age(fixture, id, 3, 1);
        var supportId = await Support(fixture, id); await Age(fixture, id, 4, 1);
        await using var db = fixture.Open();
        Assert.IsType<ConflictObjectResult>(await Api(db, "Admin", 3, $"/api/admin/order-support/{supportId}/decision").Decide(supportId, Decision(3), default));
        Assert.IsType<NotFoundResult>(await Api(db, "KhachHang", 999, $"/api/don-hang/{id}/support").RequestSupport(id, new() { Reason = "Not my order" }, default));
        Assert.IsType<NotFoundResult>(await Api(db, "Quan", 999, $"/api/don-hang/{id}/workflow").Read(id, default));
    }

    [MySqlFact]
    public async Task ValidConfirmationCommittedBeforeWorkerLockPreventsAcceptanceCancellation()
    {
        var fixture = await IsolatedMySql.CreateAsync(); var id = await Create(fixture, 1);
        await Age(fixture, id, 1, 9);
        var now = VietnamBusinessTime.Now();
        var clock = new Clock(new DateTimeOffset(now, TimeSpan.FromHours(7)));
        await using var blocker = fixture.Open(); await using var tx = await blocker.Database.BeginTransactionAsync();
        await blocker.Nhahangs.FromSqlRaw("SELECT * FROM nhahang WHERE MaNhaHang=1 FOR UPDATE").ToListAsync();
        var worker = Process(fixture, id, clock); await WaitLocks(blocker, 1);
        await using (var confirm = fixture.Open())
        {
            var controller = Merchant(confirm, id);
            Assert.IsType<OkObjectResult>(await controller.CapNhatTrangThaiDonHang(id, new() { MaTrangThai = 2 }));
        }
        clock.Instant = clock.Instant.AddMinutes(2);
        await tx.CommitAsync(); await worker;
        await using var read = fixture.Open(); Assert.Equal(2, (await read.Donhangs.SingleAsync()).MaTrangThai);
        Assert.Empty(await read.Hoantiens.ToListAsync());
    }

    [MySqlFact]
    public async Task AdditiveMigrationAndFailClosedRollbackPreserveLegacyOrder()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        var installer = await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "Database.sql"));
        var tables = System.Text.RegularExpressions.Regex.Matches(installer,
            @"CREATE TABLE `(?:orderworkflow|ordersupport|ordersupportaudit)` \([\s\S]*?\) ENGINE=[^;]+;");
        Assert.Equal(3, tables.Count);
        var up = string.Join("\n", tables.Select(t => t.Value.Replace("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS ")));
        // Test-only teardown: deliberately excluded from the fresh-install SQL.
        var down = """
            CREATE TEMPORARY TABLE workflow_rollback_guard (ok int NOT NULL CHECK (ok = 1));
            INSERT INTO workflow_rollback_guard SELECT IF(
             (SELECT COUNT(*) FROM orderworkflow) + (SELECT COUNT(*) FROM ordersupport) + (SELECT COUNT(*) FROM ordersupportaudit) = 0, 1, 0);
            DROP TEMPORARY TABLE workflow_rollback_guard;
            DROP TABLE ordersupportaudit;
            DROP TABLE ordersupport;
            DROP TABLE orderworkflow;
            """;
        await using var db = fixture.Open();
        await db.Database.ExecuteSqlRawAsync(down);
        db.Donhangs.Add(new Donhang { MaDonHang = 1, MaDonHangHienThi = "LEGACY", MaKhachHang = 1, MaNhaHang = 1,
            MaTrangThai = 1, ThoiGianDat = VietnamBusinessTime.Now().AddDays(-1), TenNguoiNhan = "Test", SoDienThoaiNhan = "0000000000", DiaChiGiaoHang = "Test" });
        await db.SaveChangesAsync();
        await db.Database.ExecuteSqlRawAsync(up); await db.Database.ExecuteSqlRawAsync(up);
        Assert.Equal(1, await db.Donhangs.CountAsync()); Assert.Empty(await db.OrderWorkflows.ToListAsync());
        db.OrderWorkflows.Add(new() { OrderId = 1, StateCode = 1, StateEnteredAt = VietnamBusinessTime.Now() }); await db.SaveChangesAsync();
        await Assert.ThrowsAnyAsync<Exception>(() => db.Database.ExecuteSqlRawAsync(down));
        Assert.Equal(1, await db.OrderWorkflows.CountAsync()); Assert.Equal(1, await db.Donhangs.CountAsync());
    }

    [MySqlFact]
    public async Task WorkerWinsBeforeConfirmationAndLateConfirmationCannotResurrectOrder()
    {
        var fixture = await IsolatedMySql.CreateAsync(); var id = await Create(fixture, 1);
        await Age(fixture, id, 1, 11);
        await using var db = fixture.Open();
        Assert.IsType<ConflictObjectResult>(await Merchant(db, id).CapNhatTrangThaiDonHang(id, new() { MaTrangThai = 2 }));
        await Process(fixture, id);
        await using var confirm = fixture.Open();
        var result = await Merchant(confirm, id).CapNhatTrangThaiDonHang(id, new() { MaTrangThai = 2 });
        Assert.False(result is OkObjectResult);
        Assert.Equal(6, (await confirm.Donhangs.AsNoTracking().SingleAsync()).MaTrangThai);
    }

    [MySqlFact]
    public async Task TwoAdminDecisionsWaitOnLockAndOnlyOneRefundAndDecisionCommits()
    {
        var fixture = await IsolatedMySql.CreateAsync(); var id = await Create(fixture, 5); await Age(fixture, id, 3, 1);
        var support = await Support(fixture, id);
        await using var blocker = fixture.Open(); await using var tx = await blocker.Database.BeginTransactionAsync();
        await blocker.Nhahangs.FromSqlRaw("SELECT * FROM nhahang WHERE MaNhaHang=1 FOR UPDATE").ToListAsync();
        async Task<IActionResult> Decide()
        {
            await using var db = fixture.Open();
            return await Api(db, "Admin", 3, $"/api/admin/order-support/{support}/decision").Decide(support, Decision(3), default);
        }
        var first = Decide(); var second = Decide(); await WaitLocks(blocker, 2); await tx.CommitAsync();
        var results = await Task.WhenAll(first, second);
        Assert.Single(results.OfType<ContentResult>()); Assert.Single(results.OfType<ConflictObjectResult>());
        await using var read = fixture.Open();
        Assert.Equal(1, await read.Hoantiens.CountAsync()); Assert.Equal(2, await read.OrderSupportAudits.CountAsync());
        Assert.Equal(100000, (await read.Vis.SingleAsync()).SoDu);
    }

    [MySqlFact]
    public async Task RefundLedgerFaultRollsBackEntireWorkflowAndRetryCreditsOnce()
    {
        var fixture = await IsolatedMySql.CreateAsync(); var id = await Create(fixture, 5); await Age(fixture, id, 1, 11);
        int notificationsBefore;
        await using (var baseline = fixture.Open()) notificationsBefore = await baseline.Thongbaos.CountAsync();
        await using (var db = fixture.Open(new RefundFailure()))
            await Assert.ThrowsAsync<IOException>(() => Service(db).ProcessAsync(id));
        await using (var read = fixture.Open())
        {
            Assert.Equal(1, (await read.Donhangs.SingleAsync()).MaTrangThai);
            Assert.Equal(0, (await read.OrderWorkflows.SingleAsync()).EscalationMask);
            Assert.Empty(await read.Hoantiens.ToListAsync()); Assert.Equal(notificationsBefore, await read.Thongbaos.CountAsync());
            Assert.Equal(74990, (await read.Vis.SingleAsync()).SoDu);
        }
        await Process(fixture, id); await Process(fixture, id);
        await using var verify = fixture.Open();
        Assert.Equal(1, await verify.Giaodichvis.CountAsync(x => x.LoaiGiaoDich == "HoanTien"));
        Assert.Equal(100000, (await verify.Vis.SingleAsync()).SoDu);
    }

    [MySqlFact]
    public async Task ExistingIncomeBlocksExceptionAndNoLedgerIsReversed()
    {
        var fixture = await IsolatedMySql.CreateAsync(); var id = await Create(fixture, 5); await Age(fixture, id, 4, 1);
        var support = await Support(fixture, id);
        await using (var db = fixture.Open())
        {
            await using var tx = await db.Database.BeginTransactionAsync();
            await new WalletService(db).CreditAsync(1, 1, WalletTransactionTypes.ThuNhapDonHang, "GUARD-INCOME", maDonHang: id);
            await db.SaveChangesAsync(); await tx.CommitAsync();
        }
        await using (var db = fixture.Open())
            Assert.IsType<ContentResult>(await Api(db, "Admin", 3, $"/api/admin/order-support/{support}/decision").Decide(support, Decision(4), default));
        await using var read = fixture.Open();
        Assert.Equal("NeedsReview", (await read.OrderSupports.SingleAsync()).Status);
        Assert.Equal(4, (await read.Donhangs.SingleAsync()).MaTrangThai); Assert.Empty(await read.Hoantiens.ToListAsync());
        Assert.Equal(74991, (await read.Vis.SingleAsync()).SoDu);
        Assert.Equal(1, await read.Giaodichvis.CountAsync(x => x.MaThamChieu == "GUARD-INCOME"));
    }

    [MySqlFact]
    public async Task CompletionCommittedWhileAdminWaitsPreventsExceptionRefund()
    {
        var fixture = await IsolatedMySql.CreateAsync(); var id = await Create(fixture, 5); await Age(fixture, id, 4, 1);
        var support = await Support(fixture, id);
        await using var blocker = fixture.Open(); await using var tx = await blocker.Database.BeginTransactionAsync();
        await blocker.Donhangs.FromSqlRaw("SELECT * FROM donhang FOR UPDATE").ToListAsync();
        async Task<IActionResult> Decide()
        {
            await using var db = fixture.Open();
            return await Api(db, "Admin", 3, $"/api/admin/order-support/{support}/decision").Decide(support, Decision(4), default);
        }
        var decision = Decide(); await WaitLocks(blocker, 1);
        await blocker.Donhangs.ExecuteUpdateAsync(s => s.SetProperty(x => x.MaTrangThai, 5));
        await tx.CommitAsync(); Assert.IsType<ConflictObjectResult>(await decision);
        await using var read = fixture.Open();
        Assert.Equal(5, (await read.Donhangs.SingleAsync()).MaTrangThai); Assert.Empty(await read.Hoantiens.ToListAsync());
    }

    private sealed class RefundFailure : SaveChangesInterceptor
    {
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData data, InterceptionResult<int> result, CancellationToken ct = default)
        {
            if (data.Context!.ChangeTracker.Entries<Giaodichvi>().Any(x => x.State == EntityState.Added && x.Entity.LoaiGiaoDich == "HoanTien"))
                throw new IOException("Controlled refund ledger fault");
            return base.SavingChangesAsync(data, result, ct);
        }
    }

    [MySqlFact]
    public async Task RealWorkerScanRetriesAndSlaDoesNotSuppressManualIncident()
    {
        var fixture = await IsolatedMySql.CreateAsync(); var id = await Create(fixture, 1); await Age(fixture, id, 3, 46);
        var services = new ServiceCollection();
        services.AddScoped(_ => fixture.Open()); services.AddScoped<IWalletService, WalletService>();
        services.AddScoped<IRealtimeNotificationService, IsolatedMySql.NoopRealtime>(); services.AddLogging();
        services.AddScoped<OrderWorkflowService>();
        await using var provider = services.BuildServiceProvider();
        using var worker = new OrderWorkflowWorker(provider.GetRequiredService<IServiceScopeFactory>(), NullLogger<OrderWorkflowWorker>.Instance);
        await worker.ScanAsync(default); await worker.ScanAsync(default);
        await using (var db = fixture.Open())
        {
            Assert.Equal(1, await db.OrderSupports.CountAsync(x => x.Kind == "SLA"));
            Assert.IsType<ContentResult>(await Api(db, "KhachHang", 1, $"/api/don-hang/{id}/support").RequestSupport(id, new() { Reason = "Real incident after automatic SLA" }, default));
        }
        await using var read = fixture.Open();
        Assert.Equal(1, await read.OrderSupports.CountAsync(x => x.Kind == "Manual"));
        Assert.Equal(3, (await read.Donhangs.SingleAsync()).MaTrangThai);
    }

    [MySqlFact]
    public async Task DeliveryFailureAfterCommitCannotRollbackOrRepeatRefund()
    {
        var fixture = await IsolatedMySql.CreateAsync(); var id = await Create(fixture, 5); await Age(fixture, id, 1, 11);
        var publisher = new FailingPublisher(fixture);
        await using (var db = fixture.Open())
            await new OrderWorkflowService(db, new WalletService(db), publisher, NullLogger<OrderWorkflowService>.Instance).ProcessAsync(id);
        await Process(fixture, id);
        Assert.True(publisher.VerifiedCommit);
        await using var read = fixture.Open();
        Assert.Equal(1, await read.Hoantiens.CountAsync());
        Assert.Equal(1, await read.Giaodichvis.CountAsync(x => x.LoaiGiaoDich == "HoanTien"));
        Assert.Equal(100000, (await read.Vis.SingleAsync()).SoDu);
    }

    private sealed class FailingPublisher(IsolatedMySql fixture) : IRealtimeNotificationService
    {
        public bool VerifiedCommit;
        public async Task GuiThongBaoAsync(int id, object data)
        {
            await using var read = fixture.Open(); Assert.Equal(6, (await read.Donhangs.SingleAsync()).MaTrangThai);
            Assert.Equal(1, await read.Hoantiens.CountAsync()); VerifiedCommit = true;
            throw new IOException("Controlled delivery failure after verified commit");
        }
        public Task GuiDonHangMoiAsync(int id, object data) => Task.CompletedTask;
        public Task GuiDonHangCapNhatAsync(int id, object data) => Task.CompletedTask;
        public Task GuiDonHangDaHuyAsync(int id, object data) => Task.CompletedTask;
        public Task GuiDuLieuThayDoiAsync(int id, IEnumerable<string> scopes, object? data = null) => Task.CompletedTask;
        public Task GuiDuLieuThayDoiTheoVaiTroAsync(string role, IEnumerable<string> scopes, object? data = null) => Task.FromException(new IOException("Controlled role delivery failure"));
    }

    [MySqlFact]
    public async Task ActualCompletionAndExceptionCompeteBehindPartitionLockWithoutIncomeAndRefundTogether()
    {
        var fixture = await IsolatedMySql.CreateAsync(); var id = await Create(fixture, 5); await Age(fixture, id, 4, 1);
        var support = await Support(fixture, id);
        await using (var db = fixture.Open())
        { db.Vis.Add(new Vi { MaTaiKhoan = 2, SoDu = 0, DonViTienTe = "VND", TrangThai = "HoatDong" }); await db.SaveChangesAsync(); }
        await using var blocker = fixture.Open(); await using var tx = await blocker.Database.BeginTransactionAsync();
        await blocker.Nhahangs.FromSqlRaw("SELECT * FROM nhahang WHERE MaNhaHang=1 FOR UPDATE").ToListAsync();
        async Task<IActionResult> Decide()
        {
            await using var db = fixture.Open();
            return await Api(db, "Admin", 3, $"/api/admin/order-support/{support}/decision").Decide(support, Decision(4), default);
        }
        async Task<IActionResult> Complete()
        {
            await using var db = fixture.Open();
            return await Merchant(db, id).CapNhatTrangThaiDonHang(id, new() { MaTrangThai = 5 });
        }
        var decision = Decide(); var completion = Complete(); await WaitLocks(blocker, 2); await tx.CommitAsync();
        await Task.WhenAll(decision, completion);
        await using var read = fixture.Open(); var state = (await read.Donhangs.SingleAsync()).MaTrangThai;
        Assert.Contains(state, new[] { 5, 6 });
        var refunds = await read.Hoantiens.CountAsync(); var incomes = await read.Giaodichvis.CountAsync(x => x.LoaiGiaoDich == "ThuNhapDonHang");
        Assert.Equal(state == 6 ? 1 : 0, refunds); Assert.Equal(state == 5 ? 1 : 0, incomes);
        Assert.Equal(state == 6 ? 100000 : 74990, (await read.Vis.SingleAsync(x => x.MaTaiKhoan == 1)).SoDu);
    }

    private static async Task<int> Create(IsolatedMySql fixture, int method)
    {
        await using var db = fixture.Open();
        if (method == 5)
        {
            db.Vis.Add(new Vi { MaTaiKhoan = 1, SoDu = 0, DonViTienTe = "VND", TrangThai = "HoatDong" }); await db.SaveChangesAsync();
            await using var tx = await db.Database.BeginTransactionAsync();
            await new WalletService(db).CreditAsync(1, 100000, WalletTransactionTypes.KhoiTao, "OPEN"); await db.SaveChangesAsync(); await tx.CommitAsync();
        }
        await IsolatedMySql.Cart(db).ThemMonVaoGio(new() { MaMonAn = 1, SoLuong = 1 });
        var cart = await db.Giohangs.Select(x => x.MaGioHang).SingleAsync();
        Assert.Equal(201, Assert.IsType<ContentResult>(await IsolatedMySql.Orders(db).DatHang(new() { MaGioHang = cart, MaDiaChi = 1, MaPhuongThuc = method })).StatusCode);
        return await db.Donhangs.MaxAsync(x => x.MaDonHang);
    }
    private static async Task Age(IsolatedMySql fixture, int id, int state, int minutes)
    {
        await using var db = fixture.Open(); var now = VietnamBusinessTime.Now().AddMinutes(-minutes);
        await db.Donhangs.Where(x => x.MaDonHang == id).ExecuteUpdateAsync(s => s.SetProperty(x => x.MaTrangThai, state));
        await db.OrderWorkflows.Where(x => x.OrderId == id).ExecuteUpdateAsync(s => s.SetProperty(x => x.StateCode, state).SetProperty(x => x.StateEnteredAt, now).SetProperty(x => x.ReadyAt, now));
    }
    private static OrderWorkflowService Service(DatMonAnOnlineContext db, TimeProvider? clock = null) => new(db, new WalletService(db), new IsolatedMySql.NoopRealtime(), NullLogger<OrderWorkflowService>.Instance, clock);
    private static async Task Process(IsolatedMySql fixture, int id, TimeProvider? clock = null)
    { await using var db = fixture.Open(); await Service(db, clock).ProcessAsync(id); }
    private static OrderWorkflowController Api(DatMonAnOnlineContext db, string role, int account, string path, string? key = null)
    {
        var controller = IsolatedMySql.AsCustomer(new OrderWorkflowController(db, Service(db), new WalletService(db)), key);
        controller.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, account.ToString()), new Claim(ClaimTypes.Role, role)], "Test"));
        controller.Request.Path = path; return controller;
    }
    private static DonHangController Merchant(DatMonAnOnlineContext db, int id)
    {
        var controller = IsolatedMySql.Orders(db);
        controller.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, "2"), new Claim(ClaimTypes.Role, "Quan")], "Test"));
        controller.Request.Path = $"/api/don-hang/{id}/trang-thai"; return controller;
    }
    private static async Task<long> Support(IsolatedMySql fixture, int id)
    {
        await using var db = fixture.Open();
        Assert.IsType<ContentResult>(await Api(db, "KhachHang", 1, $"/api/don-hang/{id}/support").RequestSupport(id, new() { Reason = "Cannot receive order, please verify" }, default));
        return await db.OrderSupports.Select(x => x.Id).SingleAsync();
    }
    private static OrderWorkflowController.Decision Decision(int state) => new()
    { Action = "ApproveCancel", Reason = "Verified restaurant cannot continue", ExpectedState = state, VerifiedUnableToServe = true, NoCostDispute = true };
    private static async Task WaitLocks(DatMonAnOnlineContext db, int count)
    {
        var schema = db.Database.GetDbConnection().Database;
        for (var attempt = 0; attempt < 200; attempt++)
        {
            var actual = await db.Database.SqlQuery<long>($"SELECT COUNT(DISTINCT w.REQUESTING_THREAD_ID) AS Value FROM performance_schema.data_lock_waits w JOIN performance_schema.data_locks l ON l.ENGINE_LOCK_ID=w.REQUESTING_ENGINE_LOCK_ID WHERE l.OBJECT_SCHEMA={schema}").SingleAsync();
            if (actual >= count) return; await Task.Delay(50);
        }
        Assert.Fail("Deterministic MySQL lock wait was not established.");
    }
    private sealed class Clock(DateTimeOffset instant) : TimeProvider
    { public DateTimeOffset Instant = instant; public override DateTimeOffset GetUtcNow() => Instant.ToUniversalTime(); }
}
