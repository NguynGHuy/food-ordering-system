using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace DatMonAnOnline.API.Hubs
{
    [Authorize]
    public class NotificationHub : Hub
    {
        private static readonly HashSet<string> SupportedRoles =
            new(StringComparer.Ordinal)
            {
                "Admin",
                "Quan",
                "KhachHang"
            };

        public static string GetRoleGroupName(string role)
            => $"role:{role}";

        public override async Task OnConnectedAsync()
        {
            var role = Context.User?.FindFirstValue(ClaimTypes.Role);

            // Role comes from the validated JWT. Only known application roles are
            // allowed to become group names so clients cannot choose arbitrary groups.
            if (role != null && SupportedRoles.Contains(role))
            {
                await Groups.AddToGroupAsync(
                    Context.ConnectionId,
                    GetRoleGroupName(role));
            }

            await base.OnConnectedAsync();
        }
    }
}
