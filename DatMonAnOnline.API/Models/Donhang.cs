using System;
using System.Collections.Generic;

namespace DatMonAnOnline.API.Models;

public partial class Donhang
{
    public int MaDonHang { get; set; }

    public string MaDonHangHienThi { get; set; } = null!;

    public int MaKhachHang { get; set; }

    public int MaNhaHang { get; set; }

    public string? TenNhaHangLucDat { get; set; }

    public int? MaDiaChi { get; set; }

    public int MaTrangThai { get; set; }

    public int? MaKhuyenMai { get; set; }

    public DateTime ThoiGianDat { get; set; }

    public DateTime? ThoiGianGiaoDuKien { get; set; }

    public DateTime? ThoiGianGiaoThucTe { get; set; }

    public string TenNguoiNhan { get; set; } = null!;

    public string SoDienThoaiNhan { get; set; } = null!;

    public string DiaChiGiaoHang { get; set; } = null!;

    public decimal TongTienHang { get; set; }

    public decimal PhiShip { get; set; }

    public decimal SoTienGiam { get; set; }

    public decimal ThanhTien { get; set; }

    public string? GhiChu { get; set; }

    public string? LyDoHuy { get; set; }

    public int? MaHopDong { get; set; }

    public decimal TyLePhiNenTang { get; set; }

    public decimal GiamGiaNhaHang { get; set; }

    public decimal GiamGiaHeThong { get; set; }

    public decimal PhiNenTang { get; set; }

    public decimal SoTienNhaHangNhan { get; set; }

    public virtual ICollection<Chitietdoisoat> Chitietdoisoats { get; set; } = new List<Chitietdoisoat>();

    public virtual ICollection<Chitietdonhang> Chitietdonhangs { get; set; } = new List<Chitietdonhang>();

    public virtual ICollection<Danhgiamonan> Danhgiamonans { get; set; } = new List<Danhgiamonan>();

    public virtual ICollection<Danhgianhahang> Danhgianhahangs { get; set; } = new List<Danhgianhahang>();

    public virtual Hopdongnhahang? Hopdongnhahang { get; set; }

    public virtual ICollection<Lichsutrangthaidonhang> Lichsutrangthaidonhangs { get; set; } = new List<Lichsutrangthaidonhang>();

    public virtual Diachi? MaDiaChiNavigation { get; set; }

    public virtual Khachhang MaKhachHangNavigation { get; set; } = null!;

    public virtual Khuyenmai? MaKhuyenMaiNavigation { get; set; }

    public virtual Nhahang MaNhaHangNavigation { get; set; } = null!;

    public virtual Trangthaidonhang MaTrangThaiNavigation { get; set; } = null!;

    public virtual ICollection<Thanhtoan> Thanhtoans { get; set; } = new List<Thanhtoan>();

    public virtual ICollection<Giaodichvi> Giaodichvis { get; set; } = new List<Giaodichvi>();
}
