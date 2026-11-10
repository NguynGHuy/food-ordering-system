using System.Security.Cryptography;
using System.Text.Json;
using DatMonAnOnline.API.Models;

namespace DatMonAnOnline.API.Services;

// A read-only price review; it does not reserve a price or change pricing rules.
public static class CheckoutPriceReview
{
    public static object[] Lines(Giohang cart) => cart.Chitietgiohangs
        .OrderBy(line => line.MaChiTietGioHang)
        .Select(line =>
        {
            var available = line.MaMonAnNavigation.MaNhomToppings.SelectMany(group => group.Toppings)
                .ToDictionary(topping => topping.MaTopping);
            var toppings = line.ChitietgiohangToppings.OrderBy(topping => topping.MaTopping).Select(topping => new
            {
                topping.MaTopping,
                available[topping.MaTopping].TenTopping,
                GiaThem = available[topping.MaTopping].GiaThem,
                topping.SoLuong
            }).ToArray();
            return (object)new
            {
                line.MaChiTietGioHang, line.MaMonAn, line.MaMonAnNavigation.TenMonAn,
                line.MaMonAnNavigation.HinhAnh, line.GhiChu, line.SoLuong,
                DonGia = line.MaMonAnNavigation.Gia,
                Toppings = toppings,
                ThanhTien = (line.MaMonAnNavigation.Gia + toppings.Sum(t => t.GiaThem * t.SoLuong)) * line.SoLuong
            };
        }).ToArray();

    public static string Fingerprint(Giohang cart, int? promotion, decimal items, decimal delivery, decimal discount)
        => Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(new
        {
            cart.MaGioHang, Promotion = promotion, Items = items, Delivery = delivery,
            Discount = discount, Lines = Lines(cart)
        })));
}
