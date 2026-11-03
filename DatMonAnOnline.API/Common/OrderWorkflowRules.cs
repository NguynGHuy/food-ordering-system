using DatMonAnOnline.API.Models;

namespace DatMonAnOnline.API.Common;

public static class OrderWorkflowRules
{
    public static TimeSpan AcceptanceReminder => TimeSpan.FromMinutes(5);
    public static TimeSpan AcceptanceLifetime => TimeSpan.FromMinutes(10);
    public static (int Reminder, int Escalation)? Thresholds(int state) => state switch
    { 2 => (10, 20), 3 => (30, 45), 4 => (45, 60), _ => null };
    public static DateTime? AcceptanceDeadline(OrderWorkflow? workflow) => workflow?.ReadyAt?.Add(AcceptanceLifetime);
    public static bool AcceptanceExpired(OrderWorkflow? workflow, DateTime now) =>
        workflow?.StateCode == 1 && AcceptanceDeadline(workflow) is DateTime deadline && now >= deadline;
    public static DateTimeOffset? WithOffset(DateTime? value) => value.HasValue
        ? new DateTimeOffset(DateTime.SpecifyKind(value.Value, DateTimeKind.Unspecified), TimeSpan.FromHours(7)) : null;
}
