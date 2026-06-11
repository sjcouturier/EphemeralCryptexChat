using EphemeralCryptexChat.Api.Data;
using EphemeralCryptexChat.Api.Models;
using EphemeralCryptexChat.Api.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EphemeralCryptexChat.Api.Services;

public class UserService : IUserService
{
    private readonly AppDbContext _db;

    public UserService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<User> FindOrCreateUserAsync(string gitHubId, string gitHubLogin, string avatarUrl)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.GitHubId == gitHubId);
        if (user is null)
        {
            user = new User
            {
                GitHubId = gitHubId,
                GitHubLogin = gitHubLogin,
                AvatarUrl = avatarUrl,
                CreatedAt = DateTime.UtcNow
            };
            _db.Users.Add(user);
        }
        else
        {
            // Keep profile details fresh on each login.
            user.GitHubLogin = gitHubLogin;
            user.AvatarUrl = avatarUrl;
        }

        await _db.SaveChangesAsync();
        return user;
    }

    public Task<User?> GetByIdAsync(int userId) =>
        _db.Users.FirstOrDefaultAsync(u => u.Id == userId);

    public Task<User?> GetByLoginAsync(string gitHubLogin) =>
        _db.Users.FirstOrDefaultAsync(u => u.GitHubLogin.ToLower() == gitHubLogin.ToLower());

    public async Task<CryptoKeyRecord> RegisterDeviceKeyAsync(int userId, string deviceId, string publicKeyJwk)
    {
        var record = await _db.CryptoKeys
            .FirstOrDefaultAsync(k => k.UserId == userId && k.DeviceId == deviceId);

        if (record is null)
        {
            record = new CryptoKeyRecord
            {
                UserId = userId,
                DeviceId = deviceId,
                PublicKeyJwk = publicKeyJwk,
                RegisteredAt = DateTime.UtcNow,
                LastSeenAt = DateTime.UtcNow
            };
            _db.CryptoKeys.Add(record);
        }
        else
        {
            record.PublicKeyJwk = publicKeyJwk;
            record.LastSeenAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return record;
    }

    public Task<CryptoKeyRecord?> GetDeviceKeyAsync(int userId, string deviceId) =>
        _db.CryptoKeys.FirstOrDefaultAsync(k => k.UserId == userId && k.DeviceId == deviceId);

    public Task<List<CryptoKeyRecord>> GetUserKeysAsync(int userId) =>
        _db.CryptoKeys
            .Where(k => k.UserId == userId)
            .OrderByDescending(k => k.LastSeenAt)
            .ToListAsync();
}
