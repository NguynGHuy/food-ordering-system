using System;
using System.Collections.Generic;

namespace DatMonAnOnline.API.Models;

public partial class Doisoatnhahang
{
    public int MaDoiSoat { get; set; }

    public int MaNhaHang { get; set; }

    public int? MaTaiKhoanDuyet { get; set; }

    public DateOnly TuNgay { get; set; }

    public DateOnly DenNgay { get; set; }

    public int TongSoDon { get; set; }

    public decimal TongTienHang { get; set; }

    public decimal TongGiamGiaNhaHang { get; set; }

    public decimal TongGiamGiaHeThong { get; set; }

    public decimal TongPhiShip { get; set; }

    public decimal TongPhiNenTang { get; set; }

    public decimal TongTienHoan { get; set; }

    public decimal TongTienNhaHangNhan { get; set; }

    public decimal TongTienNhaHangDaThu { get; set; }

    public decimal? SoTienCanDoiSoat { get; set; }

    public string TrangThai { get; set; } = null!;

    public string? MaGiaoDichDoiSoat { get; set; }

    public string? GhiChu { get; set; }

    public DateTime NgayTao { get; set; }

    public DateTime? NgayXacNhan { get; set; }

    public DateTime? NgayThanhToan { get; set; }

    public virtual ICollection<Chitietdoisoat> Chitietdoisoats { get; set; } = new List<Chitietdoisoat>();

    public virtual ICollection<Giaodichvi> Giaodichvis { get; set; } = new List<Giaodichvi>();

    public virtual Nhahang MaNhaHangNavigation { get; set; } = null!;

    public virtual Taikhoan? MaTaiKhoanDuyetNavigation { get; set; }
}
