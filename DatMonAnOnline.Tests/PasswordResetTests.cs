using System.Reflection;
using System.Text.Json;
using DatMonAnOnline.API.Controllers;
using DatMonAnOnline.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace DatMonAnOnline.Tests;

public class PasswordResetTests
{
    [Fact]
    public void ResetResponseCannotCarryAnOtp()
    {
        var referenceType = typeof(AuthController).GetNestedType("PasswordResetReference", BindingFlags.NonPublic)!;
        Assert.Null(referenceType.GetProperty("MaXacNhanThuNghiem"));
        var reference = Activator.CreateInstance(referenceType, nonPublic: true)!;
        referenceType.GetProperty("MaYeuCau")!.SetValue(reference, "test-request");
        referenceType.GetProperty("HetHanUtc")!.SetValue(reference, DateTime.UtcNow.AddMinutes(10));
        var controller = new AuthController(null!, null!, null!, null!);
        var method = typeof(AuthController).GetMethod("PasswordResetRequested", BindingFlags.Instance | BindingFlags.NonPublic)!;
        var response = Assert.IsType<OkObjectResult>(method.Invoke(controller, [reference]));
        var json = JsonSerializer.SerializeToElement(response.Value);
        Assert.Equal(JsonValueKind.Null, json.GetProperty("maXacNhanThuNghiem").ValueKind);
        Assert.Equal("test-request", json.GetProperty("maYeuCau").GetString());
    }

    [Fact]
    public void UnconfiguredSmtpDoesNotAcceptRequests()
    {
        using var queue = new PasswordResetEmailQueue(new NoopSender(),
            NullLogger<PasswordResetEmailQueue>.Instance, Options.Create(new SmtpEmailOptions()));
        Assert.False(queue.IsAvailable);
        Assert.False(queue.TryQueue(new PasswordResetEmail("demo@example.invalid", "000000", 10)));
    }

    private sealed class NoopSender : IPasswordResetEmailSender
    {
        public Task SendAsync(string recipientEmail, string confirmationCode, int expiresAfterMinutes,
            CancellationToken cancellationToken = default) => Task.CompletedTask;
    }
}
