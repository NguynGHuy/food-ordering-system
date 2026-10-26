using System.Net;
using DatMonAnOnline.API.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace DatMonAnOnline.Tests;

public class TrustedProxyTests
{
    [Theory]
    [InlineData(true, "10.0.0.8", "203.0.113.5", "https")]
    [InlineData(true, "198.51.100.7", "198.51.100.7", "http")]
    [InlineData(false, "10.0.0.8", "10.0.0.8", "http")]
    public async Task OnlyExplicitProxyCanSupplyClientAddressAndScheme(bool configured, string peer, string expectedIp, string expectedScheme)
    {
        var options = new ForwardedHeadersOptions();
        TrustedProxyHeaders.Configure(options, configured ? ["10.0.0.8"] : []);
        var middleware = new ForwardedHeadersMiddleware(_ => Task.CompletedTask,
            NullLoggerFactory.Instance, Options.Create(options));
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse(peer);
        context.Request.Scheme = "http";
        context.Request.Headers["X-Forwarded-For"] = "192.0.2.99, 203.0.113.5";
        context.Request.Headers["X-Forwarded-Proto"] = "http, https";
        context.Request.Headers["X-Forwarded-Host"] = "untrusted.invalid";
        context.Request.Host = new HostString("demo.example.invalid");
        await middleware.Invoke(context);
        Assert.Equal(expectedIp, context.Connection.RemoteIpAddress!.ToString());
        Assert.Equal(expectedScheme, context.Request.Scheme);
        Assert.Equal("demo.example.invalid", context.Request.Host.Host);
    }

    [Theory]
    [InlineData("*")]
    [InlineData("0.0.0.0")]
    [InlineData("::")]
    [InlineData("10.0.0.0/8")]
    public void InvalidOrWildcardTrustIsRejected(string address)
        => Assert.Throws<InvalidOperationException>(() => TrustedProxyHeaders.Configure(new(), [address]));
}
