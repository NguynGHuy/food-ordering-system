namespace DatMonAnOnline.API.Models;

public partial class Lichsudoisoat
{
    public long MaLichSuDoiSoat { get; set; }

    public int MaDoiSoat { get; set; }

    public int MaTaiKhoan { get; set; }

    public string HanhDong { get; set; } = null!;

    public string? TrangThaiTruoc { get; set; }

    public string TrangThaiSau { get; set; } = null!;

    public string? MaGiaoDich { get; set; }

    public string? GhiChu { get; set; }

    public DateTime ThoiGian { get; set; }

    public virtual Doisoatnhahang MaDoiSoatNavigation { get; set; } = null!;

    public virtual Taikhoan MaTaiKhoanNavigation { get; set; } = null!;
}
