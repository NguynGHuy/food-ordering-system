using Microsoft.IdentityModel.Tokens;
using System.Security.Cryptography;
using System.Text;
using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;

namespace DatMonAnOnline.API.Security;

public static class TrustedProxyHeaders
{
    public static void Configure(ForwardedHeadersOptions options, IEnumerable<string> proxies)
    {
        var addresses = proxies.Select(value =>
        {
            if (!IPAddress.TryParse(value, out var address) ||
                address.Equals(IPAddress.Any) || address.Equals(IPAddress.IPv6Any))
                throw new InvalidOperationException("ReverseProxy:KnownProxies chỉ nhận địa chỉ IP cụ thể.");
            return address;
        }).Distinct().ToArray();

        options.KnownProxies.Clear();
        options.KnownIPNetworks.Clear();
        foreach (var address in addresses) options.KnownProxies.Add(address);
        // Empty trust list must NOT mean trusting every client.
        options.ForwardedHeaders = addresses.Length == 0 ? ForwardedHeaders.None :
            ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        options.ForwardLimit = 1;
        options.RequireHeaderSymmetry = true;
    }
}

public static class AuthRateLimitPolicies
{
    public const string RegisterNhaHang = "auth-register-nha-hang";
    public const string Login = "auth-login";
    public const string RequestPasswordReset = "auth-password-reset-request";
    public const string ConfirmPasswordReset = "auth-password-reset-confirm";
}

public static class PasswordTokenVersion
{
    public const string ClaimType = "pwd_ver";

    public static string Create(string storedPasswordHash)
    {
        var digest = SHA256.HashData(Encoding.UTF8.GetBytes(storedPasswordHash));
        return Base64UrlEncoder.Encode(digest);
    }

    public static bool Matches(string? tokenVersion, string storedPasswordHash)
    {
        if (string.IsNullOrWhiteSpace(tokenVersion))
            return false;

        var expected = Encoding.ASCII.GetBytes(Create(storedPasswordHash));
        var actual = Encoding.ASCII.GetBytes(tokenVersion);

        return actual.Length == expected.Length &&
               CryptographicOperations.FixedTimeEquals(actual, expected);
    }
}
