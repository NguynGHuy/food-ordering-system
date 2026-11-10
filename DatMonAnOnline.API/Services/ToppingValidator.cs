using DatMonAnOnline.API.Models;

namespace DatMonAnOnline.API.Services;

public static class ToppingValidator
{
    // MonAn phải được tải kèm MaNhomToppings và Toppings của từng nhóm.
    public static string? KiemTra(Monan monAn, IReadOnlyCollection<int> danhSachMaTopping)
    {
        if (danhSachMaTopping.Any(id => id <= 0))
            return "Mã topping không hợp lệ.";

        var maToppingDaChon = danhSachMaTopping.ToHashSet();
        if (maToppingDaChon.Count != danhSachMaTopping.Count)
            return "Mỗi topping chỉ được chọn một lần cho một phần món ăn.";

        var nhomToppings = monAn.MaNhomToppings;
        if (nhomToppings.Any(nhom => nhom.MaNhaHang != monAn.MaNhaHang))
            return "Nhóm topping của món ăn không thuộc đúng nhà hàng. Vui lòng liên hệ quán.";

        var toppingCuaMon = nhomToppings
            .SelectMany(nhom => nhom.Toppings)
            .ToDictionary(topping => topping.MaTopping);

        foreach (var maTopping in maToppingDaChon)
        {
            if (!toppingCuaMon.TryGetValue(maTopping, out var topping))
                return "Topping không tồn tại hoặc không được phép chọn cho món ăn này.";

            if (topping.TrangThai != true)
                return $"Topping \"{topping.TenTopping}\" đã ngừng bán. Vui lòng chọn lại.";
        }

        foreach (var nhom in nhomToppings)
        {
            if (nhom.BatBuocChon && !nhom.Toppings.Any(topping => topping.TrangThai == true))
                return $"Món hiện chưa đủ tùy chọn để đặt: nhóm \"{nhom.TenNhom}\" đã hết lựa chọn. Vui lòng chọn món khác hoặc liên hệ quán.";
            var soLuongDaChon = nhom.Toppings.Count(topping =>
                maToppingDaChon.Contains(topping.MaTopping));

            if (nhom.BatBuocChon && soLuongDaChon == 0)
                return $"Vui lòng chọn ít nhất một topping trong nhóm \"{nhom.TenNhom}\".";

            if (nhom.ChonToiDa.HasValue && soLuongDaChon > nhom.ChonToiDa.Value)
                return $"Nhóm \"{nhom.TenNhom}\" chỉ được chọn tối đa {nhom.ChonToiDa.Value} topping.";
        }

        return null;
    }
}
