namespace EphemeralCryptexChat.Api.Services.Interfaces;

public interface ITtlCleanupService
{
    /// <summary>Deletes all messages whose ExpiresAt is in the past. Returns the number removed.</summary>
    Task<int> CleanupExpiredMessagesAsync(CancellationToken cancellationToken = default);
}
