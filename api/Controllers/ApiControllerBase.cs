using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace EphemeralCryptexChat.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public abstract class ApiControllerBase : ControllerBase
{
    /// <summary>The authenticated user's id, parsed from the JWT "sub" claim.</summary>
    protected int CurrentUserId
    {
        get
        {
            var sub = User.FindFirst("sub")?.Value
                      ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(sub, out var id) ? id : 0;
        }
    }

    protected string? CurrentUserLogin =>
        User.FindFirst("login")?.Value;
}
