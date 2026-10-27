using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using DatMonAnOnline.API.Controllers;
using Xunit;

namespace DatMonAnOnline.Tests;

public class FoodImageReferenceTests
{
    public static IEnumerable<object?[]> Cases()
    {
        using var document = JsonDocument.Parse(File.ReadAllText(
            Path.Combine(AppContext.BaseDirectory, "Fixtures", "food-image-references.json")));
        foreach (var item in document.RootElement.EnumerateArray())
            yield return [item.GetProperty("value").GetString(), item.GetProperty("valid").GetBoolean()];
    }

    [Theory]
    [MemberData(nameof(Cases))]
    public void BothWriteRequestsValidateImageReference(string? value, bool valid)
    {
        object[] requests = [
            new MonAnController.TaoMonAnRequest { HinhAnh = value },
            new MonAnController.CapNhatMonAnRequest { HinhAnh = value }
        ];
        foreach (var request in requests)
        {
            var errors = new List<ValidationResult>();
            var context = new ValidationContext(request) { MemberName = "HinhAnh" };
            Assert.Equal(valid, Validator.TryValidateProperty(value, context, errors));
        }
    }

    [Fact]
    public void ImageReferenceKeepsExistingDatabaseLengthLimit()
    {
        var request = new MonAnController.CapNhatMonAnRequest { HinhAnh = "https://example.invalid/" + new string('a', 255) };
        Assert.False(Validator.TryValidateProperty(request.HinhAnh,
            new ValidationContext(request) { MemberName = "HinhAnh" }, []));
    }
}
