using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;

namespace EphemeralCryptexChat.Api.Hubs;

/// <summary>
/// Maps SignalR's logical user id to the JWT "sub" claim so the server can
/// target a specific user across all of their active connections.
/// </summary>
public class SubClaimUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
    {
        return connection.User?.FindFirst("sub")?.Value
               ?? connection.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    }
}
