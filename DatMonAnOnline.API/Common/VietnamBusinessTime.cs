namespace DatMonAnOnline.API.Common;

public static class VietnamBusinessTime
{
    private static readonly TimeZoneInfo Zone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh");

    // Financial DATETIME columns contain Vietnam wall time (no offset).
    // Keep historical values/date boundaries unchanged; never interpret them as UTC.
    public static DateTime Now(TimeProvider? clock = null) =>
        TimeZoneInfo.ConvertTime((clock ?? TimeProvider.System).GetUtcNow(), Zone).DateTime;
}
