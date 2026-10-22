import { apiFetch, buildQuery, type PagedResult, type PaginationParams } from "./api";
import { runIdempotentRequest } from "./idempotency";

export interface DatHangRequest {
  maGioHang: number;
  maDiaChi: number;
  maPhuongThuc: number;
  maKhuyenMai?: number | null;
  ghiChu?: string;
}

export interface TienDonHang {
  tongTienHang: number;
  phiShip: number;
  soTienGiam: number;
  thanhTien: number;
}

export interface DatHangResult {
  message: string;
  maDonHang: number;
  maDonHangHienThi: string;
  maThanhToan: number;
  tenPhuongThuc: string;
  thanhTien: number;
}

export async function checkPreCheckout(
  maGioHang: number,
  maKhuyenMai: number | null = null,
): Promise<TienDonHang> {
  const token = localStorage.getItem("token");
  return apiFetch("/don-hang/kiem-tra-truoc-checkout", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ maGioHang, maKhuyenMai }),
  });
}

export async function placeOrder(data: DatHangRequest): Promise<DatHangResult> {
  const token = localStorage.getItem("token");
  const path = "/don-hang/dat-hang";
  return runIdempotentRequest(`POST ${path}`, data, (key) =>
    apiFetch(path, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Idempotency-Key": key,
      },
      body: JSON.stringify(data),
    })
  );
}

export interface CustomerOrderListResult<T> extends PagedResult<T> {
  counts: {
    all: number;
    processing: number;
    completed: number;
    cancelled: number;
  };
}

export async function getMyOrders<T = unknown>(
  params: PaginationParams & {
    filter?: "processing" | "completed" | "cancelled";
  } = {},
): Promise<CustomerOrderListResult<T>> {
  const token = localStorage.getItem("token");
  return apiFetch(`/don-hang/cua-toi${buildQuery(params)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function cancelOrder(id: number, lyDoHuy: string) {
  const token = localStorage.getItem("token");
  const path = `/don-hang/${id}/huy`;
  const body = { lyDoHuy };
  return runIdempotentRequest(`PUT ${path}`, body, (key) =>
    apiFetch(path, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Idempotency-Key": key,
      },
      body: JSON.stringify(body),
    })
  );
}
export async function getOrderById(id: number): Promise<OrderDetails> {
  const token = localStorage.getItem("token");
  return apiFetch(`/don-hang/${id}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getOrderStatusHistory(
  id: number,
): Promise<OrderStatusHistory[]> {
  const token = localStorage.getItem("token");
  return apiFetch(`/don-hang/${id}/lich-su-trang-thai`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export interface RestaurantOrderListResult<T> extends PagedResult<T> {
  summary: {
    all: number;
    pending: number;
    processing: number;
    completedToday: number;
    revenueToday: number;
  };
}

export async function getRestaurantOrders<T = unknown>(
  params: PaginationParams & { maTrangThai?: number } = {},
): Promise<RestaurantOrderListResult<T>> {
  const token = localStorage.getItem("token");
  return apiFetch(`/nha-hang/don-hang${buildQuery(params)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getOrderStatuses() {
  const token = localStorage.getItem("token");
  return apiFetch("/trang-thai-don-hang", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function updateOrderStatus(
  id: number,
  maTrangThai: number,
  ghiChu?: string,
) {
  const token = localStorage.getItem("token");
  return apiFetch(`/don-hang/${id}/trang-thai`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ maTrangThai, ghiChu }),
  });
}

export interface OrderTopping {
  tenTopping: string;
  giaThem: number;
  soLuong: number;
}

export interface OrderItem {
  maMonAn: number;
  tenMonAn: string;
  soLuong: number;
  donGia: number;
  thanhTien: number;
  toppings: OrderTopping[];
}

export interface OrderDetails {
  maDonHang: number;
  maDonHangHienThi: string;
  maNhaHang: number;
  tenNhaHang: string;
  trangThai: string;
  tenPhuongThuc: string | null;
  trangThaiThanhToan: string | null;
  maThanhToan: number | null;
  thoiGianDat: string;
  tenNguoiNhan: string;
  soDienThoaiNhan: string;
  diaChiGiaoHang: string;
  ghiChu: string | null;
  tongTienHang: number;
  phiShip: number;
  soTienGiam: number;
  thanhTien: number;
  chiTiet: OrderItem[];
}

export interface OrderStatusHistory {
  maLichSu: number;
  tenTrangThai: string;
  thoiGianTao: string;
  ghiChu: string | null;
}


export async function getOrderDetail(id: number) {
    const token = localStorage.getItem("token");
    return apiFetch(`/don-hang/${id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
    });
}
