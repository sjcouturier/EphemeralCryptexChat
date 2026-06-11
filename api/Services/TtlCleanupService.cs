using EphemeralCryptexChat.Api.Data;
using EphemeralCryptexChat.Api.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EphemeralCryptexChat.Api.Services;

/// <summary>
/// Hosted background service that purges expired ciphertext blobs every 5 minutes.
/// </summary>
public class TtlCleanupService : BackgroundService, ITtlCleanupService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(5);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TtlCleanupService> _logger;

    public TtlCleanupService(IServiceScopeFactory scopeFactory, ILogger<TtlCleanupService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval);

        // Sweep once on startup, then on every tick.
        do
        {
            try
            {
                var removed = await CleanupExpiredMessagesAsync(stoppingToken);
                if (removed > 0)
                {
                    _logger.LogInformation("TTL cleanup removed {Count} expired message(s).", removed);
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "TTL cleanup sweep failed.");
            }
        }
        while (await SafeWaitAsync(timer, stoppingToken));
    }

    public async Task<int> CleanupExpiredMessagesAsync(CancellationToken cancellationToken = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = DateTime.UtcNow;

        return await db.Messages
            .Where(m => m.ExpiresAt < now)
            .ExecuteDeleteAsync(cancellationToken);
    }

    private static async Task<bool> SafeWaitAsync(PeriodicTimer timer, CancellationToken token)
    {
        try
        {
            return await timer.WaitForNextTickAsync(token);
        }
        catch (OperationCanceledException)
        {
            return false;
        }
    }
}
