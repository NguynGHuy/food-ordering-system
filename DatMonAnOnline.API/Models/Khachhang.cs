using System;
using System.Collections.Generic;

namespace DatMonAnOnline.API.Models;

public partial class Khachhang
{
    public int MaKhachHang { get; set; }

    public int MaTaiKhoan { get; set; }

    public string HoTen { get; set; } = null!;

    public DateOnly? NgaySinh { get; set; }

    public string? GioiTinh { get; set; }

    public virtual ICollection<Danhgiamonan> Danhgiamonans { get; set; } = new List<Danhgiamonan>();

    public virtual ICollection<Danhgianhahang> Danhgianhahangs { get; set; } = new List<Danhgianhahang>();

    public virtual ICollection<Diachi> Diachis { get; set; } = new List<Diachi>();

    public virtual ICollection<Donhang> Donhangs { get; set; } = new List<Donhang>();

    public virtual ICollection<Giohang> Giohangs { get; set; } = new List<Giohang>();

    public virtual ICollection<KhachhangKhuyenmai> KhachhangKhuyenmais { get; set; } = new List<KhachhangKhuyenmai>();

    public virtual Taikhoan MaTaiKhoanNavigation { get; set; } = null!;
}
