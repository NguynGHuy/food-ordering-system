using System;
using System.Collections.Generic;

namespace DatMonAnOnline.API.Models;

public partial class Hoantien
{
    public int MaHoanTien { get; set; }

    public int MaThanhToan { get; set; }

    public int MaDonHang { get; set; }

    public int? MaTaiKhoanYeuCau { get; set; }

    public int? MaTaiKhoanXuLy { get; set; }

    public decimal SoTienHoan { get; set; }

    public string LyDoHoan { get; set; } = null!;

    public string KenhHoanTien { get; set; } = null!;

    public string TrangThai { get; set; } = null!;

    public string MaYeuCauHoan { get; set; } = null!;

    public string? MaGiaoDichHoan { get; set; }

    public string? NoiDungLoi { get; set; }

    public DateTime ThoiGianYeuCau { get; set; }

    public DateTime? ThoiGianXuLy { get; set; }

    public DateTime? ThoiGianHoanThanh { get; set; }

    public DateTime NgayCapNhat { get; set; }

    public virtual Taikhoan? MaTaiKhoanXuLyNavigation { get; set; }

    public virtual Taikhoan? MaTaiKhoanYeuCauNavigation { get; set; }

    public virtual Thanhtoan Thanhtoan { get; set; } = null!;

    public virtual ICollection<Giaodichvi> Giaodichvis { get; set; } = new List<Giaodichvi>();
}
