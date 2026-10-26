export function lastClosedDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => Number(parts.find((entry) => entry.type === type)!.value);
  // UTC is used only for calendar arithmetic, independently of the browser zone/DST.
  const date = new Date(Date.UTC(part("year"), part("month") - 1, part("day") - 1));
  return date.toISOString().slice(0, 10);
}
