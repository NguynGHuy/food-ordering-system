using DatMonAnOnline.API.Models;
using Microsoft.EntityFrameworkCore;

namespace DatMonAnOnline.API.Services;

public static class WalletTransactionTypes
{
    public const string NapTien = "NapTien";
    public const string ThanhToan = "ThanhToan";
    public const string HoanTien = "HoanTien";
    public const string ThuNhapDonHang = "ThuNhapDonHang";
    public const string NhanDoiSoat = "NhanDoiSoat";
    public const string RutTien = "RutTien";
    public const string ChuyenTien = "ChuyenTien";
    public const string DieuChinh = "DieuChinh";
    public const string KhoiTao = "KhoiTao";

    private static readonly HashSet<string> Allowed = new(StringComparer.Ordinal)
    {
        NapTien,
        ThanhToan,
        HoanTien,
        ThuNhapDonHang,
        NhanDoiSoat,
        RutTien,
        ChuyenTien,
        DieuChinh,
        KhoiTao
    };

    public static bool IsValid(string value) => Allowed.Contains(value);
}

public sealed record OrderSettlementAmounts(
    decimal RestaurantEntitlement,
    decimal DirectlyCollected,
    decimal WalletCredit,
    decimal RemainingAfterWalletCredit);

public static class OrderSettlementRules
{
    public static OrderSettlementAmounts Calculate(
        decimal restaurantEntitlement,
        decimal customerPayment,
        bool isCod)
    {
        ValidateCurrencyAmount(restaurantEntitlement, nameof(restaurantEntitlement));
        ValidateCurrencyAmount(customerPayment, nameof(customerPayment));

        var directlyCollected = isCod ? customerPayment : 0m;
        var amountDueBeforeWallet = restaurantEntitlement - directlyCollected;
        var walletCredit = Math.Max(amountDueBeforeWallet, 0m);

        return new OrderSettlementAmounts(
            restaurantEntitlement,
            directlyCollected,
            walletCredit,
            amountDueBeforeWallet - walletCredit);
    }

    private static void ValidateCurrencyAmount(decimal amount, string parameterName)
    {
        if (amount < 0 || decimal.Truncate(amount) != amount)
        {
            throw new ArgumentOutOfRangeException(
                parameterName,
                "Monetary values must be non-negative whole VND amounts.");
        }
    }
}

public sealed record WalletOperationResult(
    bool Succeeded,
    string? Error,
    Vi? Wallet = null,
    Giaodichvi? Transaction = null);

public interface IWalletService
{
    Task<decimal?> GetBalanceAsync(
        int maTaiKhoan,
        CancellationToken cancellationToken = default);

    Task<WalletOperationResult> DebitAsync(
        int maTaiKhoan,
        decimal soTien,
        string loaiGiaoDich,
        string maThamChieu,
        string? noiDung = null,
        int? maDonHang = null,
        int? maHoanTien = null,
        int? maDoiSoat = null,
        CancellationToken cancellationToken = default);

    Task<WalletOperationResult> CreditAsync(
        int maTaiKhoan,
        decimal soTien,
        string loaiGiaoDich,
        string maThamChieu,
        string? noiDung = null,
        int? maDonHang = null,
        int? maHoanTien = null,
        int? maDoiSoat = null,
        CancellationToken cancellationToken = default);
}

public sealed class WalletService : IWalletService
{
    private readonly DatMonAnOnlineContext _context;

    public WalletService(DatMonAnOnlineContext context)
    {
        _context = context;
    }

    public Task<decimal?> GetBalanceAsync(
        int maTaiKhoan,
        CancellationToken cancellationToken = default)
    {
        return _context.Vis
            .AsNoTracking()
            .Where(wallet => wallet.MaTaiKhoan == maTaiKhoan)
            .Select(wallet => (decimal?)wallet.SoDu)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<WalletOperationResult> DebitAsync(
        int maTaiKhoan,
        decimal soTien,
        string loaiGiaoDich,
        string maThamChieu,
        string? noiDung = null,
        int? maDonHang = null,
        int? maHoanTien = null,
        int? maDoiSoat = null,
        CancellationToken cancellationToken = default)
    {
        return ChangeBalanceAsync(
            maTaiKhoan,
            soTien,
            loaiGiaoDich,
            "Tru",
            maThamChieu,
            noiDung,
            maDonHang,
            maHoanTien,
            maDoiSoat,
            cancellationToken);
    }

    public Task<WalletOperationResult> CreditAsync(
        int maTaiKhoan,
        decimal soTien,
        string loaiGiaoDich,
        string maThamChieu,
        string? noiDung = null,
        int? maDonHang = null,
        int? maHoanTien = null,
        int? maDoiSoat = null,
        CancellationToken cancellationToken = default)
    {
        return ChangeBalanceAsync(
            maTaiKhoan,
            soTien,
            loaiGiaoDich,
            "Cong",
            maThamChieu,
            noiDung,
            maDonHang,
            maHoanTien,
            maDoiSoat,
            cancellationToken);
    }

    private async Task<WalletOperationResult> ChangeBalanceAsync(
        int maTaiKhoan,
        decimal soTien,
        string loaiGiaoDich,
        string loaiBienDong,
        string maThamChieu,
        string? noiDung,
        int? maDonHang,
        int? maHoanTien,
        int? maDoiSoat,
        CancellationToken cancellationToken)
    {
        if (_context.Database.CurrentTransaction == null)
        {
            return new WalletOperationResult(
                false,
                "Thao tác ví phải được thực hiện trong một giao dịch cơ sở dữ liệu.");
        }

        if (soTien <= 0 || decimal.Truncate(soTien) != soTien)
            return new WalletOperationResult(false, "Số tiền ví không hợp lệ.");

        if (!WalletTransactionTypes.IsValid(loaiGiaoDich))
            return new WalletOperationResult(false, "Loại giao dịch ví không hợp lệ.");

        if (string.IsNullOrWhiteSpace(maThamChieu) || maThamChieu.Length > 100)
            return new WalletOperationResult(false, "Mã tham chiếu giao dịch ví không hợp lệ.");

        maThamChieu = maThamChieu.Trim();

        if (noiDung?.Trim().Length > 500)
            return new WalletOperationResult(false, "Nội dung giao dịch ví vượt quá 500 ký tự.");

        var wallets = await _context.Vis
            .FromSqlInterpolated(
                $"SELECT * FROM vi WHERE MaTaiKhoan = {maTaiKhoan} FOR UPDATE")
            .ToListAsync(cancellationToken);
        var wallet = wallets.SingleOrDefault();

        if (wallet == null)
            return new WalletOperationResult(false, "Tài khoản chưa có ví. Vui lòng chạy script cập nhật database.");

        if (!string.Equals(wallet.DonViTienTe, "VND", StringComparison.OrdinalIgnoreCase))
            return new WalletOperationResult(false, "Đơn vị tiền tệ của ví không được hỗ trợ.");

        if (string.Equals(wallet.TrangThai, "Dong", StringComparison.Ordinal) ||
            (loaiBienDong == "Tru" &&
             !string.Equals(wallet.TrangThai, "HoatDong", StringComparison.Ordinal)))
        {
            return new WalletOperationResult(
                false,
                loaiBienDong == "Cong"
                    ? "Ví đã đóng nên không thể nhận tiền."
                    : "Ví hiện không hoạt động.");
        }

        // Locking read sau khi khóa ví: nhiều API instance cùng retry vẫn chỉ có
        // đúng một biến động số dư. Retry giống hệt được xem là thành công;
        // cùng mã nhưng khác nội dung bị từ chối để không che giấu sai lệch tiền.
        var existingTransactions = await _context.Giaodichvis
            .FromSqlInterpolated(
                $"SELECT * FROM giaodichvi WHERE MaThamChieu = {maThamChieu} FOR UPDATE")
            .ToListAsync(cancellationToken);
        var existing = existingTransactions.SingleOrDefault();

        if (existing != null)
        {
            var isExactRetry =
                existing.MaVi == wallet.MaVi &&
                existing.SoTien == soTien &&
                string.Equals(existing.LoaiGiaoDich, loaiGiaoDich, StringComparison.Ordinal) &&
                string.Equals(existing.LoaiBienDong, loaiBienDong, StringComparison.Ordinal) &&
                string.Equals(existing.TrangThai, "ThanhCong", StringComparison.Ordinal) &&
                existing.MaDonHang == maDonHang &&
                existing.MaHoanTien == maHoanTien &&
                existing.MaDoiSoat == maDoiSoat;

            return isExactRetry
                ? new WalletOperationResult(true, null, wallet, existing)
                : new WalletOperationResult(
                    false,
                    "Mã tham chiếu giao dịch ví đã tồn tại nhưng không khớp dữ liệu.");
        }

        var soDuTruoc = wallet.SoDu;
        var soDuSau = loaiBienDong == "Cong"
            ? soDuTruoc + soTien
            : soDuTruoc - soTien;

        if (soDuSau < 0)
            return new WalletOperationResult(false, "Số dư ví FoodPay không đủ để thanh toán.");

        wallet.SoDu = soDuSau;
        wallet.NgayCapNhat = DateTime.Now;

        var transaction = new Giaodichvi
        {
            MaVi = wallet.MaVi,
            MaDonHang = maDonHang,
            MaHoanTien = maHoanTien,
            MaDoiSoat = maDoiSoat,
            LoaiGiaoDich = loaiGiaoDich,
            LoaiBienDong = loaiBienDong,
            SoTien = soTien,
            SoDuTruoc = soDuTruoc,
            SoDuSau = soDuSau,
            TrangThai = "ThanhCong",
            MaThamChieu = maThamChieu,
            NoiDung = string.IsNullOrWhiteSpace(noiDung) ? null : noiDung.Trim(),
            NgayTao = DateTime.Now
        };

        _context.Giaodichvis.Add(transaction);
        return new WalletOperationResult(true, null, wallet, transaction);
    }
}
