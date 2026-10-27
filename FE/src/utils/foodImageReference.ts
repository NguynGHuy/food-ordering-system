// Keep aligned with FoodImageReferenceAttribute and the shared test fixtures.
export function isFoodImageReference(raw: string | null | undefined): boolean {
  if (raw == null) return true;
  if (raw.length > 255 || raw.includes("\\") ||
      [...raw].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return false;
  const reference = raw.trim();
  if (!reference) return true;
  if (/\s/.test(reference)) return false;
  if (reference.startsWith("/uploads/foods/")) {
    return /^\/uploads\/foods\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+(?:\.[a-z0-9_-]+)*\.(?:webp|png|jpe?g|gif)$/i.test(reference);
  }
  const match = /^https?:\/\/([^/?#]+)([^?#]*)/i.exec(reference);
  if (!match || match[1].includes("@")) return false;
  const path = match[2];
  if (/%(?![0-9a-f]{2})/i.test(path)) return false;
  try {
    const decodedPath = decodeURIComponent(path);
    if (decodedPath.includes("\\") || /%[0-9a-f]{2}/i.test(decodedPath) ||
        [...decodedPath].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) ||
        decodedPath.split("/").some(segment => segment === "." || segment === "..")) return false;
    const url = new URL(reference);
    return ["http:", "https:"].includes(url.protocol) && !!url.hostname && !url.username && !url.password;
  } catch {
    return false;
  }
}
