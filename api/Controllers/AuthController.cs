using System.Security.Claims;
using EphemeralCryptexChat.Api.DTOs;
using EphemeralCryptexChat.Api.Services;
using EphemeralCryptexChat.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EphemeralCryptexChat.Api.Controllers;

public class AuthController : ApiControllerBase
{
    public const string ExternalScheme = "External";
    public const string GitHubScheme = "GitHub";

    private readonly IUserService _userService;
    private readonly ITokenService _tokenService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IUserService userService,
        ITokenService tokenService,
        IConfiguration configuration,
        ILogger<AuthController> logger)
    {
        _userService = userService;
        _tokenService = tokenService;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>Begins the GitHub OAuth flow by challenging the GitHub handler.</summary>
    [HttpGet("login")]
    [AllowAnonymous]
    public IActionResult Login()
    {
        var properties = new AuthenticationProperties
        {
            RedirectUri = Url.Action(nameof(Callback)) ?? "/api/auth/callback"
        };
        return Challenge(properties, GitHubScheme);
    }

    /// <summary>
    /// OAuth return point. Reads the external identity, upserts the user,
    /// issues a JWT, and bounces back to the SPA with the token.
    /// </summary>
    [HttpGet("callback")]
    [AllowAnonymous]
    public async Task<IActionResult> Callback()
    {
        var result = await HttpContext.AuthenticateAsync(ExternalScheme);
        if (!result.Succeeded || result.Principal is null)
        {
            return RedirectToClient(error: "authentication_failed");
        }

        var principal = result.Principal;
        var gitHubId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        var login = principal.FindFirstValue("github:login")
                    ?? principal.FindFirstValue(ClaimTypes.Name);
        var avatar = principal.FindFirstValue("github:avatar") ?? string.Empty;

        if (string.IsNullOrEmpty(gitHubId) || string.IsNullOrEmpty(login))
        {
            return RedirectToClient(error: "missing_profile");
        }

        var user = await _userService.FindOrCreateUserAsync(gitHubId, login, avatar);
        var token = _tokenService.CreateToken(user);

        // Discard the transient external cookie; the SPA lives on the JWT henceforth.
        await HttpContext.SignOutAsync(ExternalScheme);

        _logger.LogInformation("User {Login} ({UserId}) authenticated via GitHub.", user.GitHubLogin, user.Id);
        return RedirectToClient(token: token);
    }

    /// <summary>Returns the currently authenticated user.</summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> Me()
    {
        var user = await _userService.GetByIdAsync(CurrentUserId);
        if (user is null)
        {
            return Unauthorized();
        }

        return user.ToDto();
    }

    private IActionResult RedirectToClient(string? token = null, string? error = null)
    {
        var clientUrl = _configuration["ClientAppUrl"] ?? "http://localhost:4200";
        var callbackPath = _configuration["ClientCallbackPath"] ?? "/auth/callback";
        var query = token is not null
            ? $"?token={Uri.EscapeDataString(token)}"
            : $"?error={Uri.EscapeDataString(error ?? "unknown")}";

        return Redirect($"{clientUrl.TrimEnd('/')}{callbackPath}{query}");
    }
}
