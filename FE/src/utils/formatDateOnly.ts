export function formatDateOnly(value: string) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(value);
  return parts ? parts[3] + "/" + parts[2] + "/" + parts[1] : value;
}
