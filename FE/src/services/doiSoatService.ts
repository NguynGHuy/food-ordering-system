import { apiFetch, buildQuery, type PagedResult, type PaginationParams } from "./api";
import { runIdempotentRequest } from "./idempotency";

export interface DoiSoatSummary {
    maDoiSoat: number;
    maNhaHang: number;
    tenNhaHang: string;
    tuNgay: string;
    denNgay: string;
    tongSoDon: number;
    tongTienHang: number;
    tongGiamGiaNhaHang: number;
    tongGiamGiaHeThong: number;
    tongPhiShip: number;
    tongPhiNenTang: number;
    tongTienHoan: number;
    tongTienNhaHangNhan: number;
    tongTienNhaHangDaThu: number;
    soTienCanDoiSoat: number;
    trangThai: string;
    ngayTao: string;
}

export interface DoiSoatDetail extends DoiSoatSummary {
    tongTienHoan: number;
    maGiaoDichDoiSoat?: string | null;
    ghiChu?: string | null;
    ngayXacNhan?: string | null;
    ngayThanhToan?: string | null;
    lichSu: DoiSoatAuditEntry[];
    chiTiet: DoiSoatOrderDetail[];
}

export interface DoiSoatAuditEntry {
    maLichSuDoiSoat: number;
    hanhDong: string;
    trangThaiTruoc?: string | null;
    trangThaiSau: string;
    maGiaoDich?: string | null;
    ghiChu?: string | null;
    thoiGian: string;
    maTaiKhoan: number;
    vaiTroNguoiThucHien: string;
}

export interface DoiSoatOrderDetail {
    maDonHang: number;
    maDonHangHienThi: string;
    thoiGianGiaoThucTe: string | null;
    tongTienHang: number;
    giamGiaNhaHang: number;
    giamGiaHeThong: number;
    phiShip: number;
    tyLePhiNenTang: number;
    phiNenTang: number;
    soTienHoan: number;
    soTienNhaHangNhan: number;
    tienNhaHangDaThu: number;
    soTienCanDoiSoat: number;
    tienDaCongVaoVi: number;
    tienThuCod: number;
    phuongThucThanhToan: string | null;
    thanhTien: number;
}

export interface DoiSoatRestaurantOption {
    maNhaHang: number;
    tenNhaHang: string;
    diaChiQuan: string;
    taiKhoanDangHoatDong: boolean;
}

function authHeaders() {
    return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

export function getAdminDoiSoat(params: PaginationParams & { maNhaHang?: number } = {}) {
    return apiFetch(`/admin/doi-soat${buildQuery(params)}`, { headers: authHeaders() }) as Promise<PagedResult<DoiSoatSummary>>;
}

export function getDoiSoatRestaurantOptions(search = "") {
    return apiFetch(`/admin/doi-soat/nha-hang-lua-chon${buildQuery({ search })}`, {
        headers: authHeaders(),
        cache: "no-store"
    }) as Promise<DoiSoatRestaurantOption[]>;
}

export async function createDoiSoat(data: { maNhaHang: number; tuNgay: string; denNgay: string }) {
    const path = "/admin/doi-soat/tao-ky";
    return runIdempotentRequest(`POST ${path}`, data, (key) =>
        apiFetch(path, {
            method: "POST",
            headers: { ...authHeaders(), "Idempotency-Key": key },
            body: JSON.stringify(data)
        })
    );
}

export function getAdminDoiSoatDetail(id: number) {
    return apiFetch(`/admin/doi-soat/${id}`, { headers: authHeaders() }) as Promise<DoiSoatDetail>;
}

export async function payDoiSoat(
    id: number,
    maGiaoDich: string,
    hinhThucThanhToan: "ChuyenKhoan" | "ViNhaHang" = "ChuyenKhoan",
    ghiChu = ""
) {
    const path = `/admin/doi-soat/${id}/thanh-toan`;
    const data = {
        maGiaoDich: maGiaoDich.trim() || null,
        hinhThucThanhToan,
        ghiChu: ghiChu.trim() || null,
    };
    return runIdempotentRequest(`PUT ${path}`, data, (key) =>
        apiFetch(path, {
            method: "PUT",
            headers: { ...authHeaders(), "Idempotency-Key": key },
            body: JSON.stringify(data)
        })
    );
}

export async function resolveDoiSoatDispute(id: number, ghiChu: string) {
    const path = `/admin/doi-soat/${id}/giai-quyet-tranh-chap`;
    const data = { ghiChu: ghiChu.trim() };
    return runIdempotentRequest(`PUT ${path}`, data, (key) =>
        apiFetch(path, {
            method: "PUT",
            headers: { ...authHeaders(), "Idempotency-Key": key },
            body: JSON.stringify(data),
        })
    );
}

export function getQuanDoiSoat(params: PaginationParams = {}) {
    return apiFetch(`/nha-hang/doi-soat${buildQuery(params)}`, { headers: authHeaders() }) as Promise<PagedResult<DoiSoatSummary>>;
}

export function getQuanDoiSoatDetail(id: number) {
    return apiFetch(`/nha-hang/doi-soat/${id}`, { headers: authHeaders() }) as Promise<DoiSoatDetail>;
}

export async function confirmDoiSoat(id: number) {
    const path = `/nha-hang/doi-soat/${id}/xac-nhan`;
    const data = { id };
    return runIdempotentRequest(`PUT ${path}`, data, (key) =>
        apiFetch(path, {
            method: "PUT",
            headers: { ...authHeaders(), "Idempotency-Key": key }
        })
    );
}


export async function openDoiSoatDispute(id: number, lyDo: string) {
    const path = `/nha-hang/doi-soat/${id}/tranh-chap`;
    const data = { lyDo: lyDo.trim() };
    return runIdempotentRequest(`PUT ${path}`, data, (key) =>
        apiFetch(path, {
            method: "PUT",
            headers: { ...authHeaders(), "Idempotency-Key": key },
            body: JSON.stringify(data),
        })
    );
}
