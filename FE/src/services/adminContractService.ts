import {
    apiFetch,
    API_URL,
    buildQuery,
    type PagedResult,
    type PaginationParams,
} from "./api";
import { runIdempotentRequest } from "./idempotency";

export type ContractFileType = "giay-phep" | "giay-to" | "hop-dong";
export type DocumentReviewResult = "HopLe" | "CanBoSung";

export interface DocumentReviewPayload {
    ketQuaGiayPhep: DocumentReviewResult;
    ketQuaGiayToDaiDien: DocumentReviewResult;
    ketQuaHopDong: DocumentReviewResult;
    ghiChu?: string;
    maHopDong: number;
}

export interface AdminContractDetails {
    nhaHang: {
        maNhaHang: number;
        tenNhaHang: string;
        diaChiQuan: string;
        trangThaiDuyet: string;
        email: string;
        soDienThoai: string | null;
    };
    hopDong: {
        maHopDong: number;
        soHopDong: string;
        trangThai: string;
        nguoiDaiDien: string;
        chucVuNguoiDaiDien: string | null;
        soGiayToNguoiDaiDien: string | null;
        tenPhapLy: string | null;
        maSoThue: string | null;
        diaChiPhapLy: string | null;
        soGiayPhepKinhDoanh: string | null;
        phienBanDieuKhoan: string;
        tyLePhiNenTang: number;
        ngayBatDau: string;
        ngayKetThuc: string;
        thoiGianKy: string | null;
        thoiGianGuiDuyet: string | null;
        noiDungHopDong: string | null;
        lyDoTuChoi: string | null;
        lyDoChamDut: string | null;
        thoiGianChamDut: string | null;
        maTaiKhoanChamDut: number | null;
        coGiayPhep: boolean;
        coGiayToDaiDien: boolean;
        coTepHopDong: boolean;
    } | null;
    thamDinh: {
        ketQuaGiayPhep: DocumentReviewResult;
        ketQuaGiayToDaiDien: DocumentReviewResult;
        ketQuaHopDong: DocumentReviewResult;
        ketQua: "DaDuyet" | "TuChoi";
        ghiChu: string | null;
        thoiGian: string;
        maTaiKhoanAdmin: number;
    } | null;
    lichSuHopDong: Array<{
        maHopDong: number;
        soHopDong: string;
        trangThai: string;
        ngayBatDau: string;
        ngayKetThuc: string;
        thoiGianKy: string | null;
        thoiGianGuiDuyet: string | null;
        thoiGianDuyet: string | null;
        maTaiKhoanDuyet: number | null;
        lyDoTuChoi: string | null;
        lyDoChamDut: string | null;
        maTaiKhoanChamDut: number | null;
        thoiGianChamDut: string | null;
    }>;
    lichSuThamDinh: Array<{
        maHopDong: number;
        ketQua: "DaDuyet" | "TuChoi";
        ghiChu: string | null;
        thoiGian: string;
        maTaiKhoanAdmin: number;
    }>;
}

export interface AdminContractItem {
    maHopDong: number;
    maNhaHang: number;
    soHopDong: string;
    tenNhaHang: string;
    nguoiDaiDien: string;
    trangThai: string;
    ngayBatDau: string;
    ngayKetThuc: string;
    tyLePhiNenTang: number;
}

export interface AdminContractQuery extends PaginationParams {
    search?: string;
    state?: string;
}

export function getAdminContracts(
    params: AdminContractQuery = {}
): Promise<PagedResult<AdminContractItem>> {
    return apiFetch(`/admin/hop-dong${buildQuery(params)}`, {
        headers: authHeaders(),
        cache: "no-store",
    });
}
function authHeaders() {
    return {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
    };
}

export function getAdminContract(
    maNhaHang: number
): Promise<AdminContractDetails> {
    return apiFetch(`/admin/nha-hang/${maNhaHang}/hop-dong`, {
        headers: authHeaders(),
        cache: "no-store",
    });
}

export async function approveRestaurantDocuments(
    maNhaHang: number,
    review: DocumentReviewPayload
) {
    const path = `/admin/nha-hang/${maNhaHang}/duyet`;
    return runIdempotentRequest(`PUT ${path}`, review, (key) =>
        apiFetch(path, {
            method: "PUT",
            headers: {
                ...authHeaders(),
                "Idempotency-Key": key,
            },
            body: JSON.stringify(review),
        })
    );
}

export async function rejectRestaurantDocuments(
    maNhaHang: number,
    review: DocumentReviewPayload,
    lyDo: string
) {
    const path = `/admin/nha-hang/${maNhaHang}/tu-choi`;
    const data = { ...review, lyDo };
    return runIdempotentRequest(`PUT ${path}`, data, (key) =>
        apiFetch(path, {
            method: "PUT",
            headers: {
                ...authHeaders(),
                "Idempotency-Key": key,
            },
            body: JSON.stringify(data),
        })
    );
}

export async function downloadAdminContractFile(
    maHopDong: number,
    loai: ContractFileType
): Promise<void> {
    const response = await fetch(
        `${API_URL}/admin/hop-dong/${maHopDong}/tep/${loai}`,
        { headers: authHeaders(), cache: "no-store" }
    );

    if (!response.ok) {
        let message = `Không tải được tệp (${response.status}).`;

        try {
            const body: unknown = await response.json();
            if (
                body !== null &&
                typeof body === "object" &&
                "message" in body &&
                typeof body.message === "string"
            ) {
                message = body.message;
            }
        } catch {
            // Giữ thông báo mặc định.
        }

        throw new Error(message);
    }

    const blob = await response.blob();
    const extension = blob.type.startsWith("text/plain")
        ? "txt"
        : blob.type === "application/pdf"
            ? "pdf"
            : blob.type === "image/png" ? "png" : "jpg";

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${loai}-${maHopDong}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function terminateContract(
    maHopDong: number,
    lyDo: string
) {
    const path = `/admin/hop-dong/${maHopDong}/cham-dut`;
    const data = { lyDo: lyDo.trim() };
    return runIdempotentRequest(`PUT ${path}`, data, (key) =>
        apiFetch(path, {
            method: "PUT",
            headers: {
                ...authHeaders(),
                "Idempotency-Key": key,
            },
            body: JSON.stringify(data),
        })
    );
}
