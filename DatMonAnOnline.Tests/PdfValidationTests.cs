using System.IO.Compression;
using System.Text;
using DatMonAnOnline.API.Common;
using Xunit;

namespace DatMonAnOnline.Tests;

public class PdfValidationTests
{
    [Fact]
    public void StaticPdfWithRealPageTreeIsAccepted()
        => Assert.True(LegalDocumentValidator.TryValidate(PlainPdf(), ".pdf", out var error), error);

    [Theory]
    [InlineData("%PDF-1.7\nthis is not a document\n%%EOF")]
    [InlineData("%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF")]
    public void FakePdfIsRejected(string data)
        => Assert.False(LegalDocumentValidator.TryValidate(Encoding.ASCII.GetBytes(data), ".pdf", out _));

    [Theory]
    [InlineData("/OpenAction << /S /JavaScript /JS (test) >>")]
    [InlineData("/Open#41ction << /S /Java#53cript /J#53 (test) >>")]
    [InlineData("/Names << /Embedded#46iles << /Names [] >> >>")]
    public void ActiveNamesIncludingHexEscapesAreRejected(string extra)
        => Assert.False(LegalDocumentValidator.TryValidate(PlainPdf(extra), ".pdf", out _));

    [Fact]
    public void CompressedObjectIsInspectedNotJustRawBytes()
    {
        Assert.True(LegalDocumentValidator.TryValidate(CompressedPdf("<< /Type /Example >>"), ".pdf", out var error), error);
        Assert.False(LegalDocumentValidator.TryValidate(CompressedPdf("<< /S /Java#53cript /J#53 (test) >>"), ".pdf", out error));
        Assert.Contains("chủ động", error);
    }

    [Fact]
    public void ExcessiveCompressedStructureIsRejected()
    {
        var bytes = CompressedPdf("<< /Type /Example >>" + new string(' ', 17 * 1024 * 1024));
        Assert.True(bytes.Length < 5 * 1024 * 1024);
        Assert.False(LegalDocumentValidator.TryValidate(bytes, ".pdf", out _));
    }

    private static byte[] PlainPdf(string extra = "")
    {
        using var file = new MemoryStream();
        Write(file, "%PDF-1.7\n");
        var objects = new[] { $"<< /Type /Catalog /Pages 2 0 R {extra} >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] /Resources << >> >>" };
        var offsets = new List<long>();
        for (var i = 0; i < objects.Length; i++) { offsets.Add(file.Position); Write(file, $"{i + 1} 0 obj\n{objects[i]}\nendobj\n"); }
        var xref = file.Position;
        Write(file, "xref\n0 4\n0000000000 65535 f \n");
        foreach (var offset in offsets) Write(file, $"{offset:D10} 00000 n \n");
        Write(file, $"trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n");
        return file.ToArray();
    }

    private static byte[] CompressedPdf(string objectBody)
    {
        using var file = new MemoryStream();
        Write(file, "%PDF-1.7\n");
        var offsets = new long[7];
        void Object(int id, string body) { offsets[id] = file.Position; Write(file, $"{id} 0 obj\n{body}\nendobj\n"); }
        Object(1, "<< /Type /Catalog /Pages 2 0 R /Custom 4 0 R >>");
        Object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
        Object(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] /Resources << >> >>");
        using var compressed = new MemoryStream();
        using (var compressor = new ZLibStream(compressed, CompressionLevel.SmallestSize, leaveOpen: true)) Write(compressor, "4 0 " + objectBody);
        offsets[5] = file.Position;
        Write(file, $"5 0 obj\n<< /Type /ObjStm /N 1 /First 4 /Length {compressed.Length} /Filter /FlateDecode >>\nstream\n");
        file.Write(compressed.ToArray());
        Write(file, "\nendstream\nendobj\n");
        offsets[6] = file.Position;
        using var xref = new MemoryStream();
        for (var i = 0; i < 7; i++)
        {
            xref.WriteByte((byte)(i == 0 ? 0 : i == 4 ? 2 : 1));
            var field = i == 4 ? 5 : offsets[i];
            for (var shift = 24; shift >= 0; shift -= 8) xref.WriteByte((byte)(field >> shift));
            xref.WriteByte(i == 0 ? (byte)255 : (byte)0);
            xref.WriteByte(i == 0 ? (byte)255 : (byte)0);
        }
        Write(file, $"6 0 obj\n<< /Type /XRef /Size 7 /Root 1 0 R /W [1 4 2] /Length {xref.Length} >>\nstream\n");
        file.Write(xref.ToArray());
        Write(file, $"\nendstream\nendobj\nstartxref\n{offsets[6]}\n%%EOF\n");
        return file.ToArray();
    }
    private static void Write(Stream stream, string text) => stream.Write(Encoding.ASCII.GetBytes(text));
}
