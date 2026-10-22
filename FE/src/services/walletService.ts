import {
    apiFetch,
    buildQuery,
    type PagedResult,
    type PaginationParams,
} from "./api";

export interface WalletInfo {
    maVi: number;
    soDu: number;
    donViTienTe: string;
    trangThai: "HoatDong" | "TamKhoa" | "Dong";
    ngayCapNhat: string;
}

export interface WalletTransaction {
    maGiaoDichVi: number;
    maDonHang: number | null;
    maHoanTien: number | null;
    maDoiSoat: number | null;
    loaiGiaoDich: string;
    loaiBienDong: "Cong" | "Tru";
    soTien: number;
    soDuTruoc: number;
    soDuSau: number;
    trangThai: string;
    maThamChieu: string;
    noiDung: string | null;
    ngayTao: string;
}

export interface WalletTransactionQuery extends PaginationParams {
    loaiBienDong?: "Cong" | "Tru";
    loaiGiaoDich?: string;
}

function authHeaders() {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
}

export function getMyWallet() {
    return apiFetch("/vi", {
        headers: authHeaders(),
    }) as Promise<WalletInfo>;
}

export function getMyWalletTransactions(params: WalletTransactionQuery = {}) {
    const query = buildQuery(params);
    return apiFetch(`/vi/giao-dich${query}`, {
        headers: authHeaders(),
    }) as Promise<PagedResult<WalletTransaction>>;
}
