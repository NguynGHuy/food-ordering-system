async function getStorageKey(
    operation: string,
    payload: unknown
): Promise<string> {
    const token = localStorage.getItem("token");

    if (!token) {
        throw new Error("Vui lòng đăng nhập.");
    }

    const source = JSON.stringify({
        token,
        operation,
        payload,
    });

    const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(source)
    );

    const fingerprint = Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");

    return `idempotency:${fingerprint}`;
}

export async function getIdempotencyKey(
    operation: string,
    payload: unknown
): Promise<string> {
    const storageKey = await getStorageKey(operation, payload);
    const existing = sessionStorage.getItem(storageKey);

    if (existing) return existing;

    const key = crypto.randomUUID();
    sessionStorage.setItem(storageKey, key);

    return key;
}

/**
 * Mỗi thao tác thành công sẽ bỏ key cũ để lần bấm sau có key mới.
 * Nếu request lỗi hoặc mất kết nối, key vẫn được giữ để retry an toàn.
 */
export async function runIdempotentRequest<T>(
    operation: string,
    payload: unknown,
    request: (key: string) => Promise<T>
): Promise<T> {
    const storageKey = await getStorageKey(operation, payload);
    const key = await getIdempotencyKey(operation, payload);
    const result = await request(key);

    // Không xóa nhầm key mới nếu một thao tác khác đã bắt đầu song song.
    if (sessionStorage.getItem(storageKey) === key) {
        sessionStorage.removeItem(storageKey);
    }

    return result;
}
