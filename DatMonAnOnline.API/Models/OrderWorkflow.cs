using Microsoft.EntityFrameworkCore;

namespace DatMonAnOnline.API.Models;

// Only orders created after the workflow rollout get this record. No inferred backfill.
public sealed class OrderWorkflow
{
    public int OrderId { get; set; }
    public DateTime? ReadyAt { get; set; }
    public DateTime StateEnteredAt { get; set; }
    public int StateCode { get; set; }
    public int ReminderMask { get; set; }
    public int EscalationMask { get; set; }
}

public sealed class OrderSupport
{
    public long Id { get; set; }
    public int OrderId { get; set; }
    public int? RequesterId { get; set; }
    public string Kind { get; set; } = "Manual";
    public string Reason { get; set; } = "";
    public string Status { get; set; } = "Pending";
    public int StateWhenRequested { get; set; }
    public DateTime? StateEnteredAtWhenRequested { get; set; }
    public int? DecisionAdminId { get; set; }
    public string? DecisionReason { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public sealed class OrderSupportAudit
{
    public long Id { get; set; }
    public long SupportId { get; set; }
    public int? ActorId { get; set; }
    public string Action { get; set; } = "";
    public string Reason { get; set; } = "";
    public DateTime CreatedAt { get; set; }
}

public partial class DatMonAnOnlineContext
{
    public DbSet<OrderWorkflow> OrderWorkflows => Set<OrderWorkflow>();
    public DbSet<OrderSupport> OrderSupports => Set<OrderSupport>();
    public DbSet<OrderSupportAudit> OrderSupportAudits => Set<OrderSupportAudit>();

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<OrderWorkflow>(e =>
        {
            e.ToTable("orderworkflow"); e.HasKey(x => x.OrderId);
            e.Property(x => x.OrderId).ValueGeneratedNever();
            e.Property(x => x.ReadyAt).HasColumnType("datetime(6)");
            e.Property(x => x.StateEnteredAt).HasColumnType("datetime(6)");
            e.HasOne<Donhang>().WithMany().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<OrderSupport>(e =>
        {
            e.ToTable("ordersupport"); e.HasKey(x => x.Id);
            e.Property(x => x.Kind).HasMaxLength(20); e.Property(x => x.Reason).HasMaxLength(1000);
            e.Property(x => x.Status).HasMaxLength(20); e.Property(x => x.DecisionReason).HasMaxLength(1000);
            e.Property(x => x.CreatedAt).HasColumnType("datetime(6)"); e.Property(x => x.UpdatedAt).HasColumnType("datetime(6)");
            e.Property(x => x.StateEnteredAtWhenRequested).HasColumnType("datetime(6)");
            e.HasOne<Donhang>().WithMany().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Taikhoan>().WithMany().HasForeignKey(x => x.RequesterId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Taikhoan>().WithMany().HasForeignKey(x => x.DecisionAdminId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.Status, x.CreatedAt }); e.HasIndex(x => x.OrderId);
        });
        modelBuilder.Entity<OrderSupportAudit>(e =>
        {
            e.ToTable("ordersupportaudit"); e.HasKey(x => x.Id);
            e.Property(x => x.Action).HasMaxLength(30); e.Property(x => x.Reason).HasMaxLength(1000);
            e.Property(x => x.CreatedAt).HasColumnType("datetime(6)");
            e.HasOne<OrderSupport>().WithMany().HasForeignKey(x => x.SupportId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Taikhoan>().WithMany().HasForeignKey(x => x.ActorId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
