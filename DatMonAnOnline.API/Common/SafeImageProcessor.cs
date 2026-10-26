using SkiaSharp;

namespace DatMonAnOnline.API.Common;

public sealed record SafeImageResult(
    byte[] Content,
    string Extension,
    string ContentType,
    int Width,
    int Height);

public static class SafeImageProcessor
{
    private const int MaxDimension = 6_000;
    private const long MaxPixels = 16_000_000;

    public static (SafeImageResult? Image, string? Error) DecodeAndSanitize(
        byte[] content,
        string requestedExtension,
        CancellationToken cancellationToken)
    {
        var extension = requestedExtension.ToLowerInvariant() switch
        {
            ".jpeg" => ".jpg",
            ".jpg" or ".png" or ".webp" => requestedExtension.ToLowerInvariant(),
            _ => null
        };

        if (extension == null)
            return (null, "Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.");

        try
        {
            cancellationToken.ThrowIfCancellationRequested();
            using var input = SKData.CreateCopy(content);
            using var codec = SKCodec.Create(input);
            if (codec == null || codec.Info.Width <= 0 || codec.Info.Height <= 0)
                return (null, "Không thể đọc nội dung ảnh.");

            var information = codec.Info;
            var pixels = (long)information.Width * information.Height;
            if (information.Width > MaxDimension ||
                information.Height > MaxDimension ||
                pixels > MaxPixels)
            {
                return (null,
                    $"Ảnh vượt giới hạn {MaxDimension:N0}px mỗi chiều hoặc {MaxPixels:N0} pixel.");
            }

            // Static codecs may report zero (SkiaSharp SKCodec.FrameCount).
            // Still require a complete successful decode below; reject animations.
            if (codec.FrameCount > 1)
            {
                return (null, "Ảnh động không được hỗ trợ.");
            }

            var expectedFormat = extension switch
            {
                ".jpg" => SKEncodedImageFormat.Jpeg,
                ".png" => SKEncodedImageFormat.Png,
                _ => SKEncodedImageFormat.Webp
            };

            if (codec.EncodedFormat != expectedFormat)
                return (null, "Nội dung ảnh không khớp với định dạng đã khai báo.");

            var bitmapInfo = new SKImageInfo(
                information.Width,
                information.Height,
                SKColorType.Rgba8888,
                SKAlphaType.Premul);

            using var bitmap = new SKBitmap(bitmapInfo);
            var decodeResult = codec.GetPixels(bitmapInfo, bitmap.GetPixels());
            if (decodeResult is not SKCodecResult.Success)
                return (null, "Tệp ảnh bị hỏng hoặc không thể giải mã hoàn chỉnh.");

            using var image = SKImage.FromBitmap(bitmap);
            cancellationToken.ThrowIfCancellationRequested();
            using var sanitized = image.Encode(
                expectedFormat,
                expectedFormat == SKEncodedImageFormat.Png ? 100 : 85);

            if (sanitized == null || sanitized.Size <= 0)
                return (null, "Không thể làm sạch và lưu lại ảnh.");

            var contentType = extension switch
            {
                ".jpg" => "image/jpeg",
                ".png" => "image/png",
                _ => "image/webp"
            };

            return (new SafeImageResult(
                sanitized.ToArray(),
                extension,
                contentType,
                information.Width,
                information.Height), null);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception) when (
            exception is ArgumentException or InvalidOperationException or OutOfMemoryException)
        {
            return (null, "Tệp ảnh bị hỏng hoặc không đúng định dạng.");
        }
    }
}
