using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace DatMonAnOnline.API.Common;

// Khuyến mãi - validate dùng chung cho quán và Admin
public class PromotionCreateRequest : IValidatableObject
{
    [Required, MaxLength(30)]
    public string MaCode { get; set; } = "";

    [MaxLength(200)]
    public string? MoTa { get; set; }

    [Required]
    public string LoaiGiam { get; set; } = "";

    public decimal GiaTriGiam { get; set; }

    public decimal? GiamToiDa { get; set; }

    public decimal DonHangToiThieu { get; set; }

    [Range(1, int.MaxValue)]
    public int SoLuong { get; set; }

    [Range(1, int.MaxValue)]
    public int SoLuotToiDaMoiKhach { get; set; } = 1;

    public DateTime NgayBatDau { get; set; }

    public DateTime NgayKetThuc { get; set; }

    public IEnumerable<ValidationResult> Validate(
        ValidationContext validationContext)
    {
        var code = MaCode?.Trim() ?? "";

        if (!Regex.IsMatch(code, @"^[A-Za-z0-9_-]{1,30}$"))
        {
            yield return new ValidationResult(
                "Mã chỉ gồm chữ không dấu, số, dấu gạch ngang hoặc gạch dưới.",
                new[] { nameof(MaCode) });
        }

        if (LoaiGiam != "PhanTram" && LoaiGiam != "SoTien")
        {
            yield return new ValidationResult(
                "Loại giảm phải là PhanTram hoặc SoTien.",
                new[] { nameof(LoaiGiam) });
        }

        if (GiaTriGiam <= 0 ||
            GiaTriGiam != decimal.Truncate(GiaTriGiam))
        {
            yield return new ValidationResult(
                "Giá trị giảm phải là số nguyên lớn hơn 0.",
                new[] { nameof(GiaTriGiam) });
        }

        if (LoaiGiam == "PhanTram" && GiaTriGiam > 100)
        {
            yield return new ValidationResult(
                "Mức giảm phần trăm không được vượt quá 100%.",
                new[] { nameof(GiaTriGiam) });
        }

        if (LoaiGiam == "PhanTram" &&
            GiamToiDa.HasValue &&
            (GiamToiDa.Value <= 0 ||
             GiamToiDa.Value != decimal.Truncate(GiamToiDa.Value)))
        {
            yield return new ValidationResult(
                "Giảm tối đa phải là số nguyên lớn hơn 0 hoặc để trống.",
                new[] { nameof(GiamToiDa) });
        }

        if (DonHangToiThieu < 0 ||
            DonHangToiThieu != decimal.Truncate(DonHangToiThieu))
        {
            yield return new ValidationResult(
                "Đơn hàng tối thiểu phải là số nguyên không âm.",
                new[] { nameof(DonHangToiThieu) });
        }

        if (NgayBatDau.Year < 1000 ||
            NgayKetThuc.Year < 1000 ||
            NgayKetThuc <= NgayBatDau)
        {
            yield return new ValidationResult(
                "Thời gian kết thúc phải sau thời gian bắt đầu.",
                new[] { nameof(NgayKetThuc) });
        }

        if (NgayKetThuc <= DateTime.Now)
        {
            yield return new ValidationResult(
                "Không thể tạo mã đã hết hạn.",
                new[] { nameof(NgayKetThuc) });
        }

        const decimal maxMoney = 999999999999999999m;

        if (GiaTriGiam > maxMoney ||
            DonHangToiThieu > maxMoney ||
            (GiamToiDa.HasValue && GiamToiDa.Value > maxMoney))
        {
            yield return new ValidationResult(
                "Giá trị tiền vượt giới hạn lưu trữ.");
        }
    }
}
