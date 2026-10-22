using System;
using System.Collections.Generic;

namespace DatMonAnOnline.API.Models;

public partial class Vi
{
    public int MaVi { get; set; }

    public int MaTaiKhoan { get; set; }

    public decimal SoDu { get; set; }

    public string DonViTienTe { get; set; } = "VND";

    public string TrangThai { get; set; } = "HoatDong";

    public DateTime NgayTao { get; set; }

    public DateTime NgayCapNhat { get; set; }

    public virtual ICollection<Giaodichvi> Giaodichvis { get; set; } = new List<Giaodichvi>();

    public virtual Taikhoan MaTaiKhoanNavigation { get; set; } = null!;
}
