using System;
using System.Collections.Generic;

namespace DatMonAnOnline.API.Models;

public partial class Khuyenmai
{
    public int MaKhuyenMai { get; set; }

    public int? MaNhaHang { get; set; }

    public string MaCode { get; set; } = null!;

    public string? MoTa { get; set; }

    public string LoaiGiam { get; set; } = null!;

    public decimal GiaTriGiam { get; set; }

    public decimal? GiamToiDa { get; set; }

    public decimal DonHangToiThieu { get; set; }

    public int SoLuong { get; set; }

    public int SoLuongDaDung { get; set; }

    public int SoLuotToiDaMoiKhach { get; set; }

    public DateTime NgayBatDau { get; set; }

    public DateTime NgayKetThuc { get; set; }

    public bool? TrangThai { get; set; }

    public virtual ICollection<Donhang> Donhangs { get; set; } = new List<Donhang>();

    public virtual ICollection<KhachhangKhuyenmai> KhachhangKhuyenmais { get; set; } = new List<KhachhangKhuyenmai>();

    public virtual Nhahang? MaNhaHangNavigation { get; set; }
}
