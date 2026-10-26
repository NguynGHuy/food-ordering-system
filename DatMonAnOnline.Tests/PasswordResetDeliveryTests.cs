using System.Collections.Concurrent;
using System.Net;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text.Json;
using DatMonAnOnline.API.Controllers;
using DatMonAnOnline.API.Options;
using DatMonAnOnline.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace DatMonAnOnline.Tests;

public class PasswordResetDeliveryTests
{
    [Fact]
    public void QueueCapacityIsBounded()
    {
        using var queue = Queue(new RecordingSender());
        for (var i = 0; i < 100; i++) Assert.True(queue.TryQueue(new("test@example.invalid", "000000", 10)));
        Assert.False(queue.TryQueue(new("test@example.invalid", "000000", 10)));
    }

    [Fact]
    public async Task TransientDeliveryFailureRetriesAndExpiredOrUnknownMessagesAreNotSent()
    {
        var sender = new RecordingSender();
        using var queue = Queue(sender);
        queue.TryQueue(new("", "000000", 10));
        queue.TryQueue(new("expired@example.invalid", "000000", 10) { ExpiresAtUtc = DateTime.UtcNow.AddSeconds(-1) });
        queue.TryQueue(new("test@example.invalid", "000000", 10));
        await queue.StartAsync(default);
        try { await sender.Delivered.Task.WaitAsync(TimeSpan.FromSeconds(15)); }
        finally { await queue.StopAsync(default); }
        Assert.Equal(3, sender.Calls);
    }

    [MySqlFact]
    public async Task ResendAfterLostEmailRotatesCodeOnceUnderConcurrentRequests()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        var queue = new CaptureQueue();
        var secret = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
        async Task<string> Request()
        {
            await using var db = fixture.Open();
            var controller = new AuthController(db, queue, new SharedAuthRateLimiter(db), new JwtOptions { Secret = secret });
            IsolatedMySql.AsCustomer(controller);
            controller.HttpContext.Connection.RemoteIpAddress = IPAddress.Loopback;
            var result = Assert.IsType<OkObjectResult>(await controller.QuenMatKhau(new() { Email = "customer@example.invalid" }));
            var json = JsonSerializer.SerializeToElement(result.Value);
            Assert.Equal(JsonValueKind.Null, json.GetProperty("maXacNhanThuNghiem").ValueKind);
            return json.GetProperty("maYeuCau").GetString()!;
        }
        var first = await Request();
        string oldHash;
        await using (var db = fixture.Open())
        {
            var pending = await db.Passwordresetrequests.SingleAsync();
            oldHash = pending.MaXacNhanHash;
            pending.NgayTaoUtc = DateTime.UtcNow.AddMinutes(-2); // simulate queue loss/restart + cooldown
            await db.SaveChangesAsync();
        }
        var resend = await Task.WhenAll(Request(), Request());
        Assert.Equal(resend[0], resend[1]);
        Assert.NotEqual(first, resend[0]);
        Assert.Equal(2, queue.Messages.Count);
        await using var check = fixture.Open();
        Assert.NotEqual(oldHash, (await check.Passwordresetrequests.SingleAsync()).MaXacNhanHash);
    }

    [MySqlFact]
    public async Task QueueFailureIsSameForKnownAndUnknownAccountsAndRemovesPendingRequest()
    {
        var fixture = await IsolatedMySql.CreateAsync();
        foreach (var email in new[] { "customer@example.invalid", "unknown@example.invalid" })
        {
            await using var db = fixture.Open();
            var controller = new AuthController(db, new CaptureQueue { Accept = false }, new SharedAuthRateLimiter(db),
                new JwtOptions { Secret = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48)) });
            IsolatedMySql.AsCustomer(controller);
            var response = await controller.QuenMatKhau(new() { Email = email });
            Assert.Equal(503, Assert.IsType<ObjectResult>(response).StatusCode);
            Assert.Empty(await db.Passwordresetrequests.AsNoTracking().ToListAsync());
        }
    }

    private static PasswordResetEmailQueue Queue(IPasswordResetEmailSender sender) => new(sender,
        NullLogger<PasswordResetEmailQueue>.Instance, Microsoft.Extensions.Options.Options.Create(new SmtpEmailOptions { Host = "test.invalid", FromAddress = "test@example.invalid" }));

    private sealed class RecordingSender : IPasswordResetEmailSender
    {
        public int Calls;
        public TaskCompletionSource Delivered { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public Task SendAsync(string recipientEmail, string confirmationCode, int expiresAfterMinutes, CancellationToken cancellationToken = default)
        {
            Assert.Equal("test@example.invalid", recipientEmail);
            if (Interlocked.Increment(ref Calls) < 3) throw new SmtpException("Synthetic temporary failure");
            Delivered.TrySetResult();
            return Task.CompletedTask;
        }
    }
    private sealed class CaptureQueue : IPasswordResetEmailQueue
    {
        public bool IsAvailable => true;
        public bool Accept { get; init; } = true;
        public ConcurrentQueue<PasswordResetEmail> Messages { get; } = new();
        public bool TryQueue(PasswordResetEmail email) { if (!Accept) return false; Messages.Enqueue(email); return true; }
    }
}
