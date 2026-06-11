using EphemeralCryptexChat.Api.DTOs;
using EphemeralCryptexChat.Api.Services;
using EphemeralCryptexChat.Api.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EphemeralCryptexChat.Api.Controllers;

[Authorize]
public class UsersController : ApiControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    /// <summary>The current authenticated user.</summary>
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me()
    {
        var user = await _userService.GetByIdAsync(CurrentUserId);
        return user is null ? Unauthorized() : user.ToDto();
    }

    /// <summary>Looks up a user by GitHub login (used to start a channel).</summary>
    [HttpGet("{login}")]
    public async Task<ActionResult<UserDto>> GetByLogin(string login)
    {
        var user = await _userService.GetByLoginAsync(login);
        return user is null ? NotFound() : user.ToDto();
    }

    /// <summary>Registers or refreshes this device's ECDH public key.</summary>
    [HttpPost("keys")]
    public async Task<ActionResult<DeviceKeyDto>> RegisterKey([FromBody] RegisterDeviceKeyDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.DeviceId) || string.IsNullOrWhiteSpace(dto.PublicKeyJwk))
        {
            return BadRequest("DeviceId and PublicKeyJwk are required.");
        }

        var record = await _userService.RegisterDeviceKeyAsync(CurrentUserId, dto.DeviceId, dto.PublicKeyJwk);
        return new DeviceKeyDto(record.DeviceId, record.PublicKeyJwk, record.RegisteredAt, record.LastSeenAt);
    }

    /// <summary>Returns the public keys for every device a user has registered.</summary>
    [HttpGet("{login}/keys")]
    public async Task<ActionResult<IEnumerable<DeviceKeyDto>>> GetKeys(string login)
    {
        var user = await _userService.GetByLoginAsync(login);
        if (user is null)
        {
            return NotFound();
        }

        var keys = await _userService.GetUserKeysAsync(user.Id);
        return Ok(keys.Select(k => new DeviceKeyDto(k.DeviceId, k.PublicKeyJwk, k.RegisteredAt, k.LastSeenAt)));
    }
}
