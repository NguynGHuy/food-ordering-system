import { apiFetch } from "./api";
import { runIdempotentRequest } from "./idempotency";

export interface ContractContent {
    maNhaHang: number;
    phienBanDieuKhoan: string;
    tyLePhiNenTang: number;
    ngayBatDau: string;
    ngayKetThuc: string;
    chinhSachDoiSoat: string;
    noiDungHopDong: string;
}

export interface ContractPreview extends ContractContent {
    maXacNhanNoiDung: string;
}

export interface SignedContract extends ContractContent {
    maHopDong: number;
    soHopDong: string;
    trangThai: string;
    thoiGianKy: string | null;
    thoiGianGuiDuyet: string | null;
    thoiGianDuyet: string | null;
    lyDoTuChoi: string | null;
    lyDoChamDut: string | null;
    maTaiKhoanChamDut: number | null;
    thoiGianChamDut: string | null;
}

function authHeaders() {
    return {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
    };
}

export function getContractPreview(): Promise<ContractPreview> {
    return apiFetch("/nha-hang/hop-dong/xem-truoc", {
        headers: authHeaders(),
        cache: "no-store",
    });
}

export function getMyContract(): Promise<{
    hopDong: SignedContract | null;
}> {
    return apiFetch("/nha-hang/hop-dong/cua-toi", {
        headers: authHeaders(),
        cache: "no-store",
    });
}

export interface SignContractRequest {
    dongYDieuKhoan: boolean;
    xacNhanKy: boolean;
    maXacNhanNoiDung: string;
}

export async function signContract(
    data: SignContractRequest
): Promise<{
    message: string;
    maHopDong: number;
    soHopDong: string;
    trangThai: string;
    thoiGianKy: string;
}> {
    const path = "/nha-hang/hop-dong/ky";
    return runIdempotentRequest(`POST ${path}`, data, (key) =>
        apiFetch(path, {
            method: "POST",
            headers: {
                ...authHeaders(),
                "Idempotency-Key": key,
            },
            body: JSON.stringify(data),
        })
    );
}

export async function submitContractForReview(
    maHopDong: number
): Promise<{ message: string }> {
    const path = "/nha-hang/hop-dong/gui-xet-duyet";
    const data = { maHopDong };
    return runIdempotentRequest(`POST ${path}`, data, (key) =>
        apiFetch(path, {
            method: "POST",
            headers: {
                ...authHeaders(),
                "Idempotency-Key": key,
            },
            body: JSON.stringify(data),
        })
    );
}
export function startNewContract() {
    return apiFetch("/nha-hang/hop-dong/bat-dau-ky-moi", {
        method: "POST",
        headers: authHeaders(),
    });
}

