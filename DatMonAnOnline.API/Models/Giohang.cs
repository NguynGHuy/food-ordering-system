using System;
using System.Collections.Generic;

namespace DatMonAnOnline.API.Models;

public partial class Giohang
{
    public int MaGioHang { get; set; }

    public int MaKhachHang { get; set; }

    public DateTime NgayCapNhat { get; set; }

    public DateTime? GiuCheckoutDenUtc { get; set; }

    public int MaNhaHang { get; set; }

    public virtual ICollection<Chitietgiohang> Chitietgiohangs { get; set; } = new List<Chitietgiohang>();

    public virtual Khachhang MaKhachHangNavigation { get; set; } = null!;

    public virtual Nhahang MaNhaHangNavigation { get; set; } = null!;
}
