namespace DatMonAnOnline.API.Models;

public sealed class Loginattempt
{
    public string EmailHash { get; set; } = null!;
    public int SoLanThatBai { get; set; }
    public DateTime CuaSoBatDauUtc { get; set; }
    public DateTime? KhoaDenUtc { get; set; }
    public DateTime NgayCapNhatUtc { get; set; }
}
