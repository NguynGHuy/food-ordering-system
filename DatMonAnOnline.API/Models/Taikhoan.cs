using System;
using System.Collections.Generic;

namespace DatMonAnOnline.API.Models;

public partial class Taikhoan
{
    public int MaTaiKhoan { get; set; }

    public string Email { get; set; } = null!;

    public string MatKhau { get; set; } = null!;

    public string? SoDienThoai { get; set; }

    public int MaRole { get; set; }

    public bool? TrangThai { get; set; }

    public bool DaXacThucEmail { get; set; }

    public DateTime NgayTao { get; set; }

    public string? AnhDaiDien { get; set; }

    public virtual ICollection<Doisoatnhahang> Doisoatnhahangs { get; set; } = new List<Doisoatnhahang>();

    public virtual ICollection<Hoantien> HoantienMaTaiKhoanXuLyNavigations { get; set; } = new List<Hoantien>();

    public virtual ICollection<Hoantien> HoantienMaTaiKhoanYeuCauNavigations { get; set; } = new List<Hoantien>();

    public virtual ICollection<Hopdongnhahang> Hopdongnhahangs { get; set; } = new List<Hopdongnhahang>();

    public virtual Khachhang? Khachhang { get; set; }

    public virtual ICollection<Lichsutrangthaidonhang> Lichsutrangthaidonhangs { get; set; } = new List<Lichsutrangthaidonhang>();

    public virtual ICollection<Lichsudoisoat> Lichsudoisoats { get; set; } = new List<Lichsudoisoat>();

    public virtual Role MaRoleNavigation { get; set; } = null!;

    public virtual Nhahang? Nhahang { get; set; }

    public virtual ICollection<Thongbao> Thongbaos { get; set; } = new List<Thongbao>();

    public virtual Vi? Vi { get; set; }
}
