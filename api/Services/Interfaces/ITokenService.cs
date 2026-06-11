using EphemeralCryptexChat.Api.Models;

namespace EphemeralCryptexChat.Api.Services.Interfaces;

public interface ITokenService
{
    /// <summary>Issues a signed JWT for the given user. Claims: sub = userId, login = gitHubLogin.</summary>
    string CreateToken(User user);
}
