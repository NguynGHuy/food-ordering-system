import { apiFetch } from "./api";

export interface DanhMuc {
    maDanhMuc: number;
    maNhaHang: number;
    tenDanhMuc: string;
    thuTuHienThi: number | null;
}

function getAuthHeaders() {
    const token = localStorage.getItem("token");

    return {
        Authorization: `Bearer ${token}`,
    };
}

// =====================================================
// GET DANH SÁCH DANH MỤC
// Public
// =====================================================

export async function getDanhMucs(
    maNhaHang: number
): Promise<DanhMuc[]> {
    return apiFetch(
        `/danh-muc?maNhaHang=${maNhaHang}`
    );
}

// =====================================================
// TẠO DANH MỤC
// Role: Quan
// =====================================================

export async function createDanhMuc(
    tenDanhMuc: string,
    thuTuHienThi: number = 0
) {
    return apiFetch("/danh-muc", {
        method: "POST",

        headers: getAuthHeaders(),

        body: JSON.stringify({
            tenDanhMuc,
            thuTuHienThi,
        }),
    });
}

// =====================================================
// CẬP NHẬT DANH MỤC
// Role: Quan
// =====================================================

export async function updateDanhMuc(
    id: number,
    tenDanhMuc: string,
    thuTuHienThi: number
) {
    return apiFetch(`/danh-muc/${id}`, {
        method: "PUT",

        headers: getAuthHeaders(),

        body: JSON.stringify({
            tenDanhMuc,
            thuTuHienThi,
        }),
    });
}

// =====================================================
// XÓA DANH MỤC
// Role: Quan
// =====================================================

export async function deleteDanhMuc(
    id: number
) {
    return apiFetch(`/danh-muc/${id}`, {
        method: "DELETE",

        headers: getAuthHeaders(),
    });
}
