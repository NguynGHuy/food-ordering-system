namespace DatMonAnOnline.API.Models;

public sealed class Authratelimit
{
    public string PartitionHash { get; set; } = null!;
    public string Policy { get; set; } = null!;
    public DateTime WindowStartUtc { get; set; }
    public int RequestCount { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
}
