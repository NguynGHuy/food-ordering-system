import { apiFetch } from "./api";

export interface CustomerProfile {
    maKhachHang: number;
    maTaiKhoan: number;
    hoTen: string;
    ngaySinh: string | null;
    gioiTinh: string | null;
    soDuVi: number;
    email: string | null;
    soDienThoai: string | null;
    anhDaiDien: string | null;
}

export interface UpdateProfileRequest {
    hoTen: string;
    ngaySinh: string | null;
    gioiTinh: string | null;
}

export async function getCustomerProfile() {
    const token = localStorage.getItem("token");

    return apiFetch("/khach-hang/ho-so", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}

export async function updateCustomerProfile(
    data: UpdateProfileRequest
) {
    const token = localStorage.getItem("token");

    return apiFetch("/khach-hang/ho-so", {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });
}

export async function uploadCustomerAvatar(file: File) {
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", file);

    return apiFetch("/khach-hang/anh-dai-dien", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
    }) as Promise<{ message: string; anhDaiDien: string }>;
}

export interface RefundHistoryItem {
    lyDoHoan: string;
    maDonHangHienThi: string;
    soTienHoan: number;
    thoiGianHoanThanh: string;
}

export function getRefundHistory() {
    const token = localStorage.getItem("token");
    return apiFetch("/khach-hang/hoan-tien", {
        headers: { Authorization: `Bearer ${token}` },
    }) as Promise<RefundHistoryItem[]>;
}

export async function deleteCustomerAvatar() {
    const token = localStorage.getItem("token");
    return apiFetch("/khach-hang/anh-dai-dien", {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}
