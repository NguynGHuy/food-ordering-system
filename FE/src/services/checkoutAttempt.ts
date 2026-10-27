import { forgetIdempotencyKey, getIdempotencyKey } from "./idempotency";
import { placeOrder, type DatHangRequest, type DatHangResult } from "./orderService";

// Shorter than the backend's 48-hour idempotency retention. No token, address
// text, wallet balance or payment credentials are written to this record.
const lifetime = 24 * 60 * 60 * 1000;
const prefix = "foodie:checkout-attempt:";
const operation = "POST /don-hang/dat-hang";
export interface CheckoutAttempt {
    key: string;
    createdAt: number;
    payload: DatHangRequest;
}
const inFlight = new Map<string, Promise<DatHangResult>>();

async function scope(): Promise<string> {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Vui lòng đăng nhập.");
    // Fingerprint only; never persist the JWT. A different login cannot replay
    // another session's attempt. The backend still enforces ownership.
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    return prefix + Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
}

export async function getPendingCheckout(): Promise<CheckoutAttempt | null> {
    const storageKey = await scope();
    for (const key of Object.keys(sessionStorage)) {
        if (!key.startsWith(prefix)) continue;
        try {
            const value = JSON.parse(sessionStorage.getItem(key) ?? "null");
            if (!value || !Number.isFinite(value.createdAt) || Date.now() - value.createdAt >= lifetime)
                sessionStorage.removeItem(key);
        } catch { sessionStorage.removeItem(key); }
    }
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const value = JSON.parse(raw) as CheckoutAttempt;
    const p = value.payload;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.key)
        || value.createdAt > Date.now() || !p
        || ![p.maGioHang, p.maDiaChi, p.maPhuongThuc].every(n => Number.isSafeInteger(n) && n > 0)
        || (p.maKhuyenMai != null && (!Number.isSafeInteger(p.maKhuyenMai) || p.maKhuyenMai <= 0))
        || (p.ghiChu !== undefined && (typeof p.ghiChu !== "string" || p.ghiChu.length > 300))) {
        sessionStorage.removeItem(storageKey);
        throw new Error("Thông tin khôi phục không hợp lệ. Vui lòng kiểm tra lịch sử đơn hàng.");
    }
    return value;
}

export async function beginCheckout(payload: DatHangRequest): Promise<CheckoutAttempt> {
    const pending = await getPendingCheckout();
    if (pending) return pending;
    const attempt = { key: await getIdempotencyKey(operation, payload), createdAt: Date.now(), payload: { ...payload } };
    // Persist before sending. If storage is unavailable, do not submit an attempt
    // that could not be recovered after refresh.
    sessionStorage.setItem(await scope(), JSON.stringify(attempt));
    return attempt;
}

export async function submitCheckout(attempt: CheckoutAttempt): Promise<DatHangResult> {
    const storageKey = await scope();
    const id = storageKey + ":" + attempt.key;
    const existing = inFlight.get(id);
    if (existing) return existing;
    const request = (async () => {
        const result = await placeOrder(attempt.payload, attempt.key);
        if (!Number.isSafeInteger(result?.maDonHang) || result.maDonHang <= 0)
            throw new Error("Chưa xác minh được kết quả đặt hàng. Vui lòng thử khôi phục.");
        try {
            const pending = JSON.parse(sessionStorage.getItem(storageKey) ?? "null") as CheckoutAttempt | null;
            if (pending?.key === attempt.key) sessionStorage.removeItem(storageKey);
            await forgetIdempotencyKey(operation, attempt.payload, attempt.key);
        } catch {
            // A cleanup/storage error must not hide an already verified order.
            // A surviving record can still replay safely on the next visit.
        }
        return result;
    })();
    inFlight.set(id, request);
    try { return await request; }
    finally { inFlight.delete(id); }
    // On any rejection (including 400/409), retain payload/key. Never infer
    // financial failure from an HTTP status or create a replacement attempt.
}
