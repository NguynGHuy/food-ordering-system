using DatMonAnOnline.API.Models;

namespace DatMonAnOnline.API.Services;

public interface ICheckoutCartReservationService
{
    DateTime Reserve(Giohang cart, DateTime utcNow);
    void Release(Giohang cart);
}

public sealed class CheckoutCartReservationService : ICheckoutCartReservationService
{
    private static readonly TimeSpan ReservationLifetime = TimeSpan.FromMinutes(30);

    public DateTime Reserve(Giohang cart, DateTime utcNow)
    {
        if (IsReserved(cart, utcNow))
            return cart.GiuCheckoutDenUtc!.Value;

        var expiresAtUtc = utcNow.Add(ReservationLifetime);
        cart.GiuCheckoutDenUtc = expiresAtUtc;
        return expiresAtUtc;
    }

    private static bool IsReserved(Giohang cart, DateTime utcNow)
        => cart.GiuCheckoutDenUtc.HasValue &&
           cart.GiuCheckoutDenUtc.Value > utcNow;

    public void Release(Giohang cart)
        => cart.GiuCheckoutDenUtc = null;
}
