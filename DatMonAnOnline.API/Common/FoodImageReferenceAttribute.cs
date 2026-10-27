using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace DatMonAnOnline.API.Common;

// Same rules/fixtures as FE/src/utils/foodImageReference.ts. This validates a
// reference only; it never fetches a remote URL or exposes private App_Data.
[AttributeUsage(AttributeTargets.Property)]
public sealed class FoodImageReferenceAttribute : ValidationAttribute
{
    public FoodImageReferenceAttribute() : base(
        "Ảnh món phải là đường dẫn /uploads/foods/ hợp lệ hoặc URL HTTP/HTTPS, tối đa 255 ký tự.") { }

    public override bool IsValid(object? value)
    {
        if (value is null) return true;
        if (value is not string raw || raw.Length > 255 ||
            Regex.IsMatch(raw, @"[\x00-\x1f\x7f\\]")) return false;
        var reference = raw.Trim();
        if (reference.Length == 0) return true;
        if (Regex.IsMatch(reference, @"\s")) return false;
        if (reference.StartsWith("/uploads/foods/", StringComparison.Ordinal))
            return Regex.IsMatch(reference,
                @"^/uploads/foods/(?:[a-z0-9_-]+/)*[a-z0-9_-]+(?:\.[a-z0-9_-]+)*\.(?:webp|png|jpe?g|gif)$",
                RegexOptions.IgnoreCase);

        var match = Regex.Match(reference, @"^https?://([^/?#]+)([^?#]*)", RegexOptions.IgnoreCase);
        if (!match.Success || match.Groups[1].Value.Contains('@')) return false;
        var path = match.Groups[2].Value;
        if (Regex.IsMatch(path, @"%(?![0-9a-f]{2})", RegexOptions.IgnoreCase)) return false;
        var decodedPath = Uri.UnescapeDataString(path);
        if (decodedPath.Contains('\\') || Regex.IsMatch(decodedPath, @"[\x00-\x1f\x7f]|%[0-9a-f]{2}", RegexOptions.IgnoreCase) ||
            decodedPath.Split('/').Any(segment => segment is "." or "..")) return false;
        return Uri.TryCreate(reference, UriKind.Absolute, out var uri) &&
            uri.Scheme is "http" or "https" && uri.Host.Length > 0 && uri.UserInfo.Length == 0;
    }
}
