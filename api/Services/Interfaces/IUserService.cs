using EphemeralCryptexChat.Api.Models;

namespace EphemeralCryptexChat.Api.Services.Interfaces;

public interface IUserService
{
    Task<User> FindOrCreateUserAsync(string gitHubId, string gitHubLogin, string avatarUrl);
    Task<User?> GetByIdAsync(int userId);
    Task<User?> GetByLoginAsync(string gitHubLogin);

    /// <summary>Registers a new device public key or updates an existing one (refreshing LastSeenAt).</summary>
    Task<CryptoKeyRecord> RegisterDeviceKeyAsync(int userId, string deviceId, string publicKeyJwk);

    Task<CryptoKeyRecord?> GetDeviceKeyAsync(int userId, string deviceId);
    Task<List<CryptoKeyRecord>> GetUserKeysAsync(int userId);
}
