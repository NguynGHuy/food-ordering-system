export function getApiUrl(configuredUrl: string | undefined, development: boolean): string {
    const value = configuredUrl?.trim().replace(/\/+$/, "") ||
        (development ? "http://localhost:5038/api" : "/api");
    if (value.startsWith("/") && !value.startsWith("//") && !/[?#\\]/.test(value)) {
        return value;
    }
    const url = new URL(value);
    if (!(["http:", "https:"].includes(url.protocol)) || url.username || url.password || url.search || url.hash) {
        throw new Error("VITE_API_URL phải là URL HTTP(S) hoặc đường dẫn cùng origin, không chứa thông tin đăng nhập/query.");
    }
    return value;
}

export const API_URL = getApiUrl(import.meta.env?.VITE_API_URL, import.meta.env?.DEV ?? false);

export interface PagedResult<T> {
    items: T[];
    pageNumber: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
}

export interface PaginationParams {
    pageNumber?: number;
    pageSize?: number;
}

export function buildQuery<T extends object>(params: T) {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            query.set(key, String(value));
        }
    });

    const value = query.toString();
    return value ? `?${value}` : "";
}

export function resolveMediaUrl(path: string | null | undefined) {
    if (!path) return null;
    if (/^(https?:|data:|blob:)/i.test(path)) return path;

    const serverUrl = API_URL.replace(/\/api\/?$/, "");
    return `${serverUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiFetch(
    endpoint: string,
    options: RequestInit = {}
) {
    const hasJsonBody = options.body != null && !(options.body instanceof FormData);
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
            ...options.headers,
        },
    });

    const text = await response.text();

    let data = null;

    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = text;
        }
    }

    if (!response.ok) {
        let message = `Request thất bại (${response.status})`;

        if (typeof data === "string" && data.trim()) {
            const serverMessage = data.trim();
            const looksLikeServerTrace =
                serverMessage.length > 500 ||
                /(?:\bat\s+[\w.]+\(|stack trace|exception\s*\()/i.test(serverMessage);

            message = looksLikeServerTrace
                ? "Máy chủ đang gặp lỗi. Vui lòng thử lại sau."
                : serverMessage;
        } else if (data && typeof data === "object") {
            if ("message" in data && typeof data.message === "string") {
                message = data.message;
            } else if ("title" in data && typeof data.title === "string") {
                message = data.title;
            }
        }

        throw new Error(message);
    }

    return data;
}
