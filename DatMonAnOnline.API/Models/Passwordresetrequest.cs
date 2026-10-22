namespace DatMonAnOnline.API.Models;

public sealed class Passwordresetrequest
{
    public string EmailHash { get; set; } = null!;
    public string MaYeuCau { get; set; } = null!;
    public int? MaTaiKhoan { get; set; }
    public string MaXacNhanHash { get; set; } = null!;
    public string MatKhauLucTaoYeuCau { get; set; } = null!;
    public int SoLanThuSai { get; set; }
    public DateTime HetHanUtc { get; set; }
    public DateTime NgayTaoUtc { get; set; }
}
