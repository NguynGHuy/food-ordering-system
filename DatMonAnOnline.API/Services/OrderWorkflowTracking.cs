using DatMonAnOnline.API.Common;
using DatMonAnOnline.API.Models;
using Microsoft.EntityFrameworkCore;

namespace DatMonAnOnline.API.Services;

public static class OrderWorkflowTracking
{
    public static void Created(DatMonAnOnlineContext db, Donhang order, bool ready, DateTime now)
    {
        if (db.Database.CurrentTransaction == null) throw new InvalidOperationException("Workflow must join checkout transaction.");
        db.OrderWorkflows.Add(new OrderWorkflow
        { OrderId = order.MaDonHang, StateCode = 1, StateEnteredAt = now, ReadyAt = ready ? now : null });
    }

    // Called under the existing order/payment locks. Never invent readiness for legacy rows.
    public static async Task ReadyAsync(DatMonAnOnlineContext db, int orderId, DateTime now)
    {
        if (db.Database.CurrentTransaction == null) throw new InvalidOperationException("Workflow requires transaction.");
        var workflow = await db.OrderWorkflows.SingleOrDefaultAsync(x => x.OrderId == orderId);
        if (workflow != null && workflow.ReadyAt == null && workflow.StateCode == 1) workflow.ReadyAt = now;
    }

    public static async Task StateChangedAsync(DatMonAnOnlineContext db, int orderId, int state, DateTime now)
    {
        if (db.Database.CurrentTransaction == null) throw new InvalidOperationException("Workflow requires transaction.");
        var workflow = await db.OrderWorkflows.SingleOrDefaultAsync(x => x.OrderId == orderId);
        // A real transition after rollout is trustworthy even for a legacy order.
        // It does not infer/backdate the previous state's entry time or readiness.
        if (workflow == null && state is >= 2 and <= 4)
        {
            db.OrderWorkflows.Add(new OrderWorkflow { OrderId = orderId, StateCode = state, StateEnteredAt = now });
            return;
        }
        if (workflow != null && workflow.StateCode != state)
        { workflow.StateCode = state; workflow.StateEnteredAt = now; }
    }
}
