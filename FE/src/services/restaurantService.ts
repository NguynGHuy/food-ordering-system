import { apiFetch, buildQuery, type PagedResult, type PaginationParams } from "./api";

/* =========================================================
   CÁC CHẾ ĐỘ HOẠT ĐỘNG CỦA NHÀ HÀNG
========================================================= */

export type RestaurantOperatingMode =
    | "TuDong"
    | "MoThuCong"
    | "TamNgung";

/* =========================================================
   RESTAURANT
========================================================= */

export interface Restaurant {
    maNhaHang: number;
    maTaiKhoan?: number;

    tenNhaHang: string;
    moTa: string | null;
    diaChiQuan: string;
    anhBia: string | null;

    gioMoCua: string | null;
    gioDongCua: string | null;

    trangThaiDuyet?: string;
    khoaThongTinHopDong?: boolean;

    /*
     * Thuộc tính cũ được giữ tạm thời để không ảnh hưởng
     * những component chưa sửa.
     */
    trangThaiHoatDong?: string;

    /*
     * Chế độ mà chủ quán đã chọn:
     * TuDong | MoThuCong | TamNgung
     */
    cheDoHoatDong: RestaurantOperatingMode;

    /*
     * Trạng thái thực tế do backend tính toán.
     */
    dangMoCua: boolean;

    /*
     * Ví dụ:
     * - Đang mở cửa theo giờ hoạt động
     * - Đang mở cửa thủ công
     * - Ngoài giờ hoạt động
     * - Nhà hàng đang tạm ngưng
     */
    trangThaiHienThi: string;

    danhGiaTrungBinh: number;
    phiShipMacDinh: number;

    email?: string | null;
    soDienThoai?: string | null;
}

/* =========================================================
   CẬP NHẬT HỒ SƠ
========================================================= */

export interface UpdateRestaurantRequest {
    tenNhaHang: string;
    moTa: string | null;
    diaChiQuan: string;
    anhBia: string | null;
    gioMoCua: string | null;
    gioDongCua: string | null;
    phiShipMacDinh: number;
}

/* =========================================================
   AUTH HEADER
========================================================= */

function getAuthHeaders() {
    const token = localStorage.getItem("token");

    return {
        Authorization: `Bearer ${token}`,
    };
}

/* =========================================================
   PUBLIC
========================================================= */

export interface RestaurantQuery extends PaginationParams {
    search?: string;
    sort?: "rating";
    openOnly?: boolean;
}

export async function getRestaurants(
    params: RestaurantQuery = {}
): Promise<PagedResult<Restaurant>> {
    return apiFetch(`/nha-hang${buildQuery(params)}`, {
        method: "GET",
        cache: "no-store",
    });
}

export async function getRestaurantById(
    id: number
): Promise<Restaurant> {
    return apiFetch(`/nha-hang/${id}`, {
        method: "GET",
        cache: "no-store",
    });
}

/* =========================================================
   QUÁN: HỒ SƠ
========================================================= */

export async function getRestaurantProfile(): Promise<
    Restaurant
> {
    return apiFetch("/nha-hang/ho-so", {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
    });
}

export async function updateRestaurantProfile(
    data: UpdateRestaurantRequest
) {
    return apiFetch("/nha-hang/ho-so", {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
}

export async function uploadRestaurantCover(file: File): Promise<{ anhBia: string }> {
    const body = new FormData();
    body.append("file", file);
    return apiFetch("/nha-hang/anh-bia", {
        method: "POST", headers: getAuthHeaders(), body,
    });
}

/* =========================================================
   QUÁN: CẬP NHẬT CHẾ ĐỘ HOẠT ĐỘNG
========================================================= */

export async function updateRestaurantStatus(
    cheDoHoatDong: RestaurantOperatingMode
) {
    return apiFetch(
        "/nha-hang/trang-thai-hoat-dong",
        {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify({
                cheDoHoatDong,
            }),
        }
    );
}
