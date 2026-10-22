using System;

namespace DatMonAnOnline.API.Models;

public partial class Giaodichvi
{
    public long MaGiaoDichVi { get; set; }

    public int MaVi { get; set; }

    public int? MaDonHang { get; set; }

    public int? MaHoanTien { get; set; }

    public int? MaDoiSoat { get; set; }

    public string LoaiGiaoDich { get; set; } = null!;

    public string LoaiBienDong { get; set; } = null!;

    public decimal SoTien { get; set; }

    public decimal SoDuTruoc { get; set; }

    public decimal SoDuSau { get; set; }

    public string TrangThai { get; set; } = "ThanhCong";

    public string MaThamChieu { get; set; } = null!;

    public string? NoiDung { get; set; }

    public DateTime NgayTao { get; set; }

    public virtual Donhang? MaDonHangNavigation { get; set; }

    public virtual Hoantien? MaHoanTienNavigation { get; set; }

    public virtual Doisoatnhahang? MaDoiSoatNavigation { get; set; }

    public virtual Vi MaViNavigation { get; set; } = null!;
}
