using DatMonAnOnline.API.Common;
using SkiaSharp;
using Xunit;

namespace DatMonAnOnline.Tests;

public class SafeImageTests
{
    [Theory]
    [InlineData(SKEncodedImageFormat.Png, ".png")]
    [InlineData(SKEncodedImageFormat.Jpeg, ".jpg")]
    [InlineData(SKEncodedImageFormat.Webp, ".webp")]
    public void StaticImageIsDecodedAndReencoded(SKEncodedImageFormat format, string extension)
    {
        using var bitmap = new SKBitmap(2, 2);
        bitmap.Erase(SKColors.White);
        using var image = SKImage.FromBitmap(bitmap);
        using var data = image.Encode(format, 90);
        var (sanitized, error) = SafeImageProcessor.DecodeAndSanitize(data.ToArray(), extension, default);
        Assert.Null(error);
        Assert.NotNull(sanitized);
        using var decoded = SKBitmap.Decode(sanitized.Content);
        Assert.Equal(2, decoded.Width);
    }

    [Fact]
    public void AnimationRemainsRejected()
    {
        // Two-frame 1x1 GIF: exercise animation rejection before the format check.
        byte[] header = [71,73,70,56,57,97,1,0,1,0,128,0,0,0,0,0,255,255,255];
        byte[] frame = [33,249,4,0,10,0,0,0,44,0,0,0,0,1,0,1,0,0,2,2,68,1,0];
        byte[] bytes = [..header, ..frame, ..frame, 59];
        using var data = SKData.CreateCopy(bytes);
        using var codec = SKCodec.Create(data);
        Assert.Equal(2, codec.FrameCount);
        var (image, error) = SafeImageProcessor.DecodeAndSanitize(bytes, ".png", default);
        Assert.Null(image);
        Assert.Equal("Ảnh động không được hỗ trợ.", error);
    }

    [Fact]
    public void InvalidImageRemainsRejected()
    {
        var (image, error) = SafeImageProcessor.DecodeAndSanitize([137,80,78,71], ".png", default);
        Assert.Null(image);
        Assert.NotNull(error);
    }
}
