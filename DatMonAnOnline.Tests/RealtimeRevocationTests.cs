using System.Collections.Concurrent;
using DatMonAnOnline.API.Hubs;
using DatMonAnOnline.API.Models;
using DatMonAnOnline.API.Security;
using DatMonAnOnline.API.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DatMonAnOnline.Tests;

public class RealtimeRevocationTests
{
    [Theory]
    [InlineData("password")]
    [InlineData("role")]
    [InlineData("locked")]
    public async Task MessagesOnlyTargetCurrentActiveSession(string change)
    {
        using var provider = CreateProvider();
        await Seed(provider);
        var hub = new RecordingHub();
        var service = CreateService(provider, hub);
        await service.GuiThongBaoAsync(1, new { message = "before" });
        var oldGroup = NotificationHub.GetSessionGroupName(1, "Quan", PasswordTokenVersion.Create("old-hash"));
        Assert.Equal(oldGroup, Assert.Single(hub.Sent));
        hub.Sent.Clear();
        await using (var scope = provider.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DatMonAnOnlineContext>();
            var account = await db.Taikhoans.SingleAsync();
            if (change == "password") account.MatKhau = "new-hash";
            if (change == "role") account.MaRole = 2;
            if (change == "locked") account.TrangThai = false;
            await db.SaveChangesAsync();
        }
        await service.GuiThongBaoAsync(1, new { message = "after" });
        Assert.DoesNotContain(oldGroup, hub.Sent);
        if (change == "locked") Assert.Empty(hub.Sent);
        else Assert.Equal(NotificationHub.GetSessionGroupName(1,
            change == "role" ? "KhachHang" : "Quan",
            PasswordTokenVersion.Create(change == "password" ? "new-hash" : "old-hash")), Assert.Single(hub.Sent));
    }

    [Fact]
    public async Task ConcurrentRoleSendsUseIndependentContextsAndExcludeUnknownRolesAndAccounts()
    {
        using var provider = CreateProvider();
        await Seed(provider);
        var hub = new RecordingHub();
        var service = CreateService(provider, hub);
        await Task.WhenAll(Enumerable.Range(0, 12).Select(_ =>
            service.GuiDuLieuThayDoiTheoVaiTroAsync("Quan", ["orders"])));
        Assert.Equal(12, hub.Sent.Count);
        hub.Sent.Clear();
        await service.GuiDuLieuThayDoiTheoVaiTroAsync("Admin", ["orders"]);
        await service.GuiThongBaoAsync(999, new { message = "unknown" });
        Assert.Empty(hub.Sent);
    }

    private static ServiceProvider CreateProvider()
    {
        var name = Guid.NewGuid().ToString();
        return new ServiceCollection().AddDbContext<DatMonAnOnlineContext>(o => o.UseInMemoryDatabase(name)).BuildServiceProvider();
    }

    private static async Task Seed(ServiceProvider provider)
    {
        await using var scope = provider.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<DatMonAnOnlineContext>();
        db.Roles.AddRange(new Role { MaRole = 1, TenRole = "Quan" }, new Role { MaRole = 2, TenRole = "KhachHang" });
        db.Taikhoans.Add(new Taikhoan { MaTaiKhoan = 1, Email = "test@example.invalid", MatKhau = "old-hash", MaRole = 1, TrangThai = true });
        await db.SaveChangesAsync();
    }

    private static RealtimeNotificationService CreateService(ServiceProvider provider, RecordingHub hub)
        => new(hub, NullLogger<RealtimeNotificationService>.Instance, provider.GetRequiredService<IServiceScopeFactory>());

    private sealed class RecordingHub : IHubContext<NotificationHub>, IHubClients
    {
        public ConcurrentBag<string> Sent { get; } = new();
        public IHubClients Clients => this;
        public IGroupManager Groups => throw new NotSupportedException();
        IClientProxy IHubClients<IClientProxy>.Groups(IReadOnlyList<string> groups) => new RecordingProxy(Sent, groups);
        public IClientProxy All => throw new NotSupportedException();
        public IClientProxy AllExcept(IReadOnlyList<string> ids) => throw new NotSupportedException();
        public IClientProxy Client(string id) => throw new NotSupportedException();
        IClientProxy IHubClients<IClientProxy>.Clients(IReadOnlyList<string> ids) => throw new NotSupportedException();
        public IClientProxy Group(string name) => throw new NotSupportedException();
        public IClientProxy GroupExcept(string name, IReadOnlyList<string> ids) => throw new NotSupportedException();
        public IClientProxy User(string id) => throw new NotSupportedException();
        public IClientProxy Users(IReadOnlyList<string> ids) => throw new NotSupportedException();
    }

    private sealed class RecordingProxy(ConcurrentBag<string> sent, IReadOnlyList<string> groups) : IClientProxy
    {
        public Task SendCoreAsync(string method, object?[] args, CancellationToken cancellationToken = default)
        {
            foreach (var group in groups) sent.Add(group);
            return Task.CompletedTask;
        }
    }
}
