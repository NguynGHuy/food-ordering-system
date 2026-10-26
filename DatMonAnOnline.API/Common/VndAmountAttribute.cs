using System.ComponentModel.DataAnnotations;

namespace DatMonAnOnline.API.Common;

// Matches the existing DECIMAL(18,0) storage; no new business price ceiling.
[AttributeUsage(AttributeTargets.Property)]
public sealed class VndAmountAttribute : ValidationAttribute
{
    public const decimal Maximum = 999999999999999999m;
    public static bool IsSupported(decimal amount)
        => amount >= 0 && amount <= Maximum && decimal.Truncate(amount) == amount;

    public VndAmountAttribute() : base("Số tiền VND phải là số nguyên không âm, không vượt giới hạn lưu trữ.") { }
    public override bool IsValid(object? value) => value is null || value is decimal amount && IsSupported(amount);
}
