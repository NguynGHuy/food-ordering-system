import { apiFetch, buildQuery, type PaginationParams, type PagedResult } from "./api";

export function getNhomToppingsPage(maNhaHang: number, pagination: PaginationParams): Promise<PagedResult<NhomTopping>> {
    return apiFetch(`/nhom-topping${buildQuery({ maNhaHang, pageNumber: 1, pageSize: 10, ...pagination })}`, { headers: getAuthHeaders() });
}

export function getManagedToppings(maNhomTopping: number, pagination: PaginationParams): Promise<PagedResult<Topping> & { activeTotal: number }> {
    return apiFetch(`/topping/quan${buildQuery({ maNhomTopping, ...pagination })}`, { headers: getAuthHeaders() });
}

// =====================================================
// TYPES
// =====================================================

export interface NhomTopping {
    maNhomTopping: number;

    maNhaHang: number;

    tenNhom: string;

    batBuocChon: boolean;

    chonToiDa: number | null;
}

export interface Topping {
    maTopping: number;

    maNhomTopping: number;

    tenTopping: string;

    giaThem: number;

    trangThai: boolean;
}

// =====================================================
// REQUEST TYPES
// =====================================================

export interface TaoNhomToppingRequest {
    tenNhom: string;

    batBuocChon: boolean;

    chonToiDa: number | null;
}

export interface CapNhatNhomToppingRequest {
    tenNhom: string;

    batBuocChon: boolean;

    chonToiDa: number | null;
}

export interface TaoToppingRequest {
    maNhomTopping: number;

    tenTopping: string;

    giaThem: number;
}

export interface CapNhatToppingRequest {
    tenTopping: string;

    giaThem: number;
}

function getAuthHeaders() {
    const token = localStorage.getItem("token");

    return {
        Authorization: `Bearer ${token}`,
    };
}

// =====================================================
// NHÓM TOPPING
// =====================================================

// GET danh sách nhóm topping của quán
// Role: Quan

export async function getNhomToppings(
    maNhaHang: number
): Promise<NhomTopping[]> {
    return apiFetch(
        `/nhom-topping?maNhaHang=${maNhaHang}`,
        {
            method: "GET",

            headers: getAuthHeaders(),
        }
    );
}

// POST tạo nhóm topping

export async function createNhomTopping(
    data: TaoNhomToppingRequest
) {
    return apiFetch("/nhom-topping", {
        method: "POST",

        headers: getAuthHeaders(),

        body: JSON.stringify(data),
    });
}

// PUT cập nhật nhóm topping

export async function updateNhomTopping(
    id: number,
    data: CapNhatNhomToppingRequest
) {
    return apiFetch(
        `/nhom-topping/${id}`,
        {
            method: "PUT",

            headers: getAuthHeaders(),

            body: JSON.stringify(data),
        }
    );
}

// DELETE nhóm topping

export async function deleteNhomTopping(
    id: number
) {
    return apiFetch(
        `/nhom-topping/${id}`,
        {
            method: "DELETE",

            headers: getAuthHeaders(),
        }
    );
}

// =====================================================
// TOPPING
// =====================================================

// GET topping theo nhóm
// Endpoint hiện tại public

export async function getToppings(
    maNhomTopping: number
): Promise<Topping[]> {
    return apiFetch(
        `/topping?maNhomTopping=${maNhomTopping}`
    );
}

// POST tạo topping

export async function createTopping(
    data: TaoToppingRequest
) {
    return apiFetch("/topping", {
        method: "POST",

        headers: getAuthHeaders(),

        body: JSON.stringify(data),
    });
}

// PUT cập nhật topping

export async function updateTopping(
    id: number,
    data: CapNhatToppingRequest
) {
    return apiFetch(
        `/topping/${id}`,
        {
            method: "PUT",

            headers: getAuthHeaders(),

            body: JSON.stringify(data),
        }
    );
}

// PUT bật / tắt topping

export async function updateTrangThaiTopping(
    id: number,
    trangThai: boolean
) {
    return apiFetch(
        `/topping/${id}/trang-thai`,
        {
            method: "PUT",

            headers: getAuthHeaders(),

            body: JSON.stringify({
                trangThai,
            }),
        }
    );
}

// DELETE topping

export async function deleteTopping(
    id: number
) {
    return apiFetch(
        `/topping/${id}`,
        {
            method: "DELETE",

            headers: getAuthHeaders(),
        }
    );
}
