using DatMonAnOnline.API.Common;
using DatMonAnOnline.API.Models;
using Microsoft.EntityFrameworkCore;

namespace DatMonAnOnline.API.Services;

public sealed class OrderWorkflowWorker(IServiceScopeFactory scopes, ILogger<OrderWorkflowWorker> logger) : BackgroundService
{
    public async Task ScanAsync(CancellationToken ct)
    {
        await using var read = scopes.CreateAsyncScope();
        var db = read.ServiceProvider.GetRequiredService<DatMonAnOnlineContext>();
        var now = VietnamBusinessTime.Now();
        // Filter handled markers BEFORE Take so old completed work cannot starve the batch.
        var ids = await db.OrderWorkflows.AsNoTracking().Join(db.Donhangs, w => w.OrderId, o => o.MaDonHang, (w, o) => new { w, o })
            .Where(x => x.w.StateCode == x.o.MaTrangThai && (
                (x.w.StateCode == 1 && ((x.w.ReadyAt <= now.AddMinutes(-5) && (x.w.ReminderMask & 2) == 0) || (x.w.ReadyAt <= now.AddMinutes(-10) && (x.w.EscalationMask & 2) == 0))) ||
                (x.w.StateCode == 2 && ((x.w.StateEnteredAt <= now.AddMinutes(-10) && (x.w.ReminderMask & 4) == 0) || (x.w.StateEnteredAt <= now.AddMinutes(-20) && (x.w.EscalationMask & 4) == 0))) ||
                (x.w.StateCode == 3 && ((x.w.StateEnteredAt <= now.AddMinutes(-30) && (x.w.ReminderMask & 8) == 0) || (x.w.StateEnteredAt <= now.AddMinutes(-45) && (x.w.EscalationMask & 8) == 0))) ||
                (x.w.StateCode == 4 && ((x.w.StateEnteredAt <= now.AddMinutes(-45) && (x.w.ReminderMask & 16) == 0) || (x.w.StateEnteredAt <= now.AddMinutes(-60) && (x.w.EscalationMask & 16) == 0)))))
            .OrderBy(x => x.w.OrderId).Take(100).Select(x => x.w.OrderId).ToListAsync(ct);
        foreach (var id in ids)
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                await scope.ServiceProvider.GetRequiredService<OrderWorkflowService>().ProcessAsync(id, ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
            catch (Exception e) { logger.LogError(e, "Workflow order {OrderId} failed; next scan will retry.", id); }
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(30));
        try
        {
            do
            {
                try { await ScanAsync(stoppingToken); }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
                catch (Exception e) { logger.LogError(e, "Workflow scan failed; retry on next interval."); }
            } while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
    }
}
