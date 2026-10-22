using DatMonAnOnline.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Security.Cryptography;
using System.Text;

namespace DatMonAnOnline.API.Services;

public sealed record SharedRateLimitResult(bool Allowed, TimeSpan RetryAfter);

public sealed class SharedAuthRateLimiter
{
    private readonly DatMonAnOnlineContext _context;

    public SharedAuthRateLimiter(DatMonAnOnlineContext context)
    {
        _context = context;
    }

    public async Task<SharedRateLimitResult> TryAcquireAsync(
        string policy,
        string clientKey,
        int permitLimit,
        TimeSpan window,
        CancellationToken cancellationToken)
    {
        if (permitLimit <= 0 || window <= TimeSpan.Zero)
            throw new ArgumentOutOfRangeException(nameof(permitLimit));

        var partitionHash = Hash($"{policy}|{clientKey}");
        var now = DateTime.UtcNow;

        await using var transaction = await _context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        await _context.Database.ExecuteSqlInterpolatedAsync(
            $@"INSERT IGNORE INTO authratelimit
               (PartitionHash, Policy, WindowStartUtc, RequestCount, ExpiresAtUtc)
               VALUES ({partitionHash}, {policy}, {now}, 0, {now.Add(window)})",
            cancellationToken);

        var entry = await _context.Authratelimits
            .FromSqlInterpolated(
                $@"SELECT * FROM authratelimit
                   WHERE PartitionHash = {partitionHash}
                   FOR UPDATE")
            .SingleAsync(cancellationToken);

        if (entry.WindowStartUtc.Add(window) <= now)
        {
            entry.WindowStartUtc = now;
            entry.RequestCount = 0;
        }

        var windowEnd = entry.WindowStartUtc.Add(window);
        entry.ExpiresAtUtc = windowEnd;

        if (entry.RequestCount >= permitLimit)
        {
            await _context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return new SharedRateLimitResult(false, windowEnd - now);
        }

        entry.RequestCount++;
        await _context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new SharedRateLimitResult(true, TimeSpan.Zero);
    }

    private static string Hash(string value)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}
