using DatMonAnOnline.API.Models;
using DatMonAnOnline.API.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DatMonAnOnline.API.Services;

public sealed record OrderIncomeSettlementResult(
    bool Succeeded,
    string? Error,
    decimal WalletCredit = 0,
    OrderSettlementAmounts? Amounts = null);

public interface IOrderIncomeSettlementService
{
    Task<OrderIncomeSettlementResult> SettleAsync(
        Donhang order,
        Thanhtoan latestPayment,
        int restaurantAccountId,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Settles the immutable financial snapshot of one completed order into the
/// restaurant wallet. The caller must lock the order and own an active DB
/// transaction before calling this service.
/// </summary>
public sealed class OrderIncomeSettlementService : IOrderIncomeSettlementService
{
    private readonly DatMonAnOnlineContext _context;
    private readonly IWalletService _walletService;
    private readonly DateTime _effectiveFrom;

    public OrderIncomeSettlementService(
        DatMonAnOnlineContext context,
        IWalletService walletService,
        IOptions<DoiSoatOptions> options)
    {
        _context = context;
        _walletService = walletService;
        _effectiveFrom = options.Value.BatDauApDung;
    }

    public async Task<OrderIncomeSettlementResult> SettleAsync(
        Donhang order,
        Thanhtoan latestPayment,
        int restaurantAccountId,
        CancellationToken cancellationToken = default)
    {
        if (_context.Database.CurrentTransaction == null)
        {
            return Failed(
                "Quyết toán thu nhập đơn hàng phải chạy trong giao dịch cơ sở dữ liệu.");
        }

        if (order.MaTrangThai != 5 || !order.ThoiGianGiaoThucTe.HasValue)
            return Failed("Đơn hàng chưa hoàn thành nên chưa thể cộng thu nhập.");

        // Orders before the financial rollout remain completable, but are not
        // silently pulled into the new wallet/reconciliation regime.
        if (order.ThoiGianDat < _effectiveFrom)
            return new OrderIncomeSettlementResult(true, null);

        if (!order.MaHopDong.HasValue)
            return Failed("Đơn hàng thiếu hợp đồng đã chốt phí nền tảng.");

        if (latestPayment.MaDonHang != order.MaDonHang)
            return Failed("Giao dịch thanh toán không thuộc đơn hàng cần quyết toán.");

        if (latestPayment.SoTien != order.ThanhTien)
            return Failed("Số tiền thanh toán không khớp tổng tiền đơn hàng.");

        if (!string.Equals(
                latestPayment.TrangThaiThanhToan,
                "ThanhCong",
                StringComparison.Ordinal))
        {
            return Failed("Thanh toán chưa thành công nên chưa thể cộng thu nhập.");
        }

        OrderSettlementAmounts amounts;
        try
        {
            amounts = OrderSettlementRules.Calculate(
                order.SoTienNhaHangNhan,
                order.ThanhTien,
                OrderPaymentRules.IsCod(latestPayment));
        }
        catch (ArgumentOutOfRangeException)
        {
            return Failed("Số liệu tài chính của đơn hàng không hợp lệ.");
        }

        if (amounts.WalletCredit == 0)
            return new OrderIncomeSettlementResult(true, null, 0, amounts);

        var walletResult = await _walletService.CreditAsync(
            restaurantAccountId,
            amounts.WalletCredit,
            WalletTransactionTypes.ThuNhapDonHang,
            $"ORDER-EARNING:{order.MaDonHang}",
            $"Thu nhập đơn {order.MaDonHangHienThi}",
            maDonHang: order.MaDonHang,
            cancellationToken: cancellationToken);

        return walletResult.Succeeded
            ? new OrderIncomeSettlementResult(
                true,
                null,
                amounts.WalletCredit,
                amounts)
            : Failed(
                walletResult.Error ??
                "Không thể cộng thu nhập đơn hàng vào ví nhà hàng.");
    }

    private static OrderIncomeSettlementResult Failed(string error)
        => new(false, error);
}
