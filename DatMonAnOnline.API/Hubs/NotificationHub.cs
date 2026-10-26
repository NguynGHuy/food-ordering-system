using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using System.Collections.Concurrent;
using DatMonAnOnline.API.Security;

namespace DatMonAnOnline.API.Hubs
{
    [Authorize]
    public class NotificationHub : Hub
    {
        private static readonly ConcurrentDictionary<string, (int AccountId, Action Abort)> Sessions = new();
        private static readonly HashSet<string> SupportedRoles =
            new(StringComparer.Ordinal)
            {
                "Admin",
                "Quan",
                "KhachHang"
            };

        public static string GetSessionGroupName(int accountId, string role, string passwordVersion)
            => $"session:{accountId}:{role}:{passwordVersion}";

        public static void RevokeLocalSessions(int accountId)
        {
            foreach (var session in Sessions.Where(s => s.Value.AccountId == accountId))
                if (Sessions.TryRemove(session.Key, out var removed))
                {
                    try { removed.Abort(); }
                    catch (ObjectDisposedException) { /* Socket already disconnected. */ }
                }
        }

        public override async Task OnConnectedAsync()
        {
            var role = Context.User?.FindFirstValue(ClaimTypes.Role);
            var version = Context.User?.FindFirstValue(PasswordTokenVersion.ClaimType);
            var id = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);

            // Role comes from the validated JWT. Only known application roles are
            // allowed to become group names so clients cannot choose arbitrary groups.
            if (role != null && SupportedRoles.Contains(role) &&
                !string.IsNullOrEmpty(version) && int.TryParse(id, out var accountId))
            {
                Sessions[Context.ConnectionId] = (accountId, Context.Abort);
                try
                {
                    await Groups.AddToGroupAsync(
                        Context.ConnectionId,
                        GetSessionGroupName(accountId, role, version));
                }
                catch
                {
                    Sessions.TryRemove(Context.ConnectionId, out _);
                    Context.Abort();
                    throw;
                }
            }
            else { Context.Abort(); return; }

            await base.OnConnectedAsync();
        }

        public override Task OnDisconnectedAsync(Exception? exception)
        {
            Sessions.TryRemove(Context.ConnectionId, out _);
            return base.OnDisconnectedAsync(exception);
        }
    }
}
