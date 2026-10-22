using DatMonAnOnline.API.Models;
using Microsoft.EntityFrameworkCore;

namespace DatMonAnOnline.API.Services;

public sealed class IdempotencyCleanupService : BackgroundService
{
    private const int BatchSize = 1_000;
    private static readonly TimeSpan CleanupInterval = TimeSpan.FromHours(1);
    private static readonly TimeSpan LoginAttemptRetention = TimeSpan.FromDays(7);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<IdempotencyCleanupService> _logger;

    public IdempotencyCleanupService(
        IServiceScopeFactory scopeFactory,
        ILogger<IdempotencyCleanupService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await CleanupExpiredRequestsAsync(stoppingToken);

        using var timer = new PeriodicTimer(CleanupInterval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await CleanupExpiredRequestsAsync(stoppingToken);
        }
    }

    private async Task CleanupExpiredRequestsAsync(CancellationToken cancellationToken)
    {
        try
        {
            var now = DateTime.UtcNow;
            int deleted;
            do
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var context = scope.ServiceProvider
                    .GetRequiredService<DatMonAnOnlineContext>();

                deleted = await context.Database.ExecuteSqlInterpolatedAsync(
                    $@"DELETE FROM idempotencyrequest
                       WHERE ExpiresAt <= {now}
                       ORDER BY ExpiresAt
                       LIMIT {BatchSize}",
                    cancellationToken);
            }
            while (deleted == BatchSize && !cancellationToken.IsCancellationRequested);

            await using var securityScope = _scopeFactory.CreateAsyncScope();
            var securityContext = securityScope.ServiceProvider
                .GetRequiredService<DatMonAnOnlineContext>();

            do
            {
                deleted = await securityContext.Database.ExecuteSqlInterpolatedAsync(
                    $@"DELETE FROM passwordresetrequest
                       WHERE HetHanUtc <= {now}
                       ORDER BY HetHanUtc
                       LIMIT {BatchSize}",
                    cancellationToken);
            }
            while (deleted == BatchSize && !cancellationToken.IsCancellationRequested);

            do
            {
                deleted = await securityContext.Database.ExecuteSqlInterpolatedAsync(
                    $@"DELETE FROM authratelimit
                       WHERE ExpiresAtUtc <= {now}
                       ORDER BY ExpiresAtUtc
                       LIMIT {BatchSize}",
                    cancellationToken);
            }
            while (deleted == BatchSize && !cancellationToken.IsCancellationRequested);

            var staleLoginThreshold = now.Subtract(LoginAttemptRetention);
            do
            {
                deleted = await securityContext.Database.ExecuteSqlInterpolatedAsync(
                    $@"DELETE FROM loginattempt
                       WHERE NgayCapNhatUtc <= {staleLoginThreshold}
                         AND (KhoaDenUtc IS NULL OR KhoaDenUtc <= {now})
                       ORDER BY NgayCapNhatUtc
                       LIMIT {BatchSize}",
                    cancellationToken);
            }
            while (deleted == BatchSize && !cancellationToken.IsCancellationRequested);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Ứng dụng đang dừng.
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Không thể dọn các idempotency key đã hết hạn.");
        }
    }
}
