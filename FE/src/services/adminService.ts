import { apiFetch, buildQuery, type PagedResult, type PaginationParams } from "./api";

export interface AdminAccount {
  maTaiKhoan: number;
  email: string;
  soDienThoai: string | null;
  role: string;
  trangThai: boolean;
  daXacThucEmail: boolean;
  ngayTao: string;
  anhDaiDien: string | null;
}

export interface PendingRestaurant {
  maNhaHang: number;
  tenNhaHang: string;
  diaChiQuan: string | null;
  trangThaiDuyet: string;
}

function authHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  };
}

export interface AdminAccountQuery extends PaginationParams {
  search?: string;
  role?: string;
  trangThai?: boolean;
}

export interface AdminAccountListResult extends PagedResult<AdminAccount> {
  counts: { all: number; active: number; locked: number };
}

export function getAdminAccounts(params: AdminAccountQuery = {}): Promise<AdminAccountListResult> {
  return apiFetch(`/admin/tai-khoan${buildQuery(params)}`, {
    headers: authHeaders(),
  });
}

export function lockAccount(id: number) {
  return apiFetch(`/admin/tai-khoan/${id}/khoa`, {
    method: "PUT",
    headers: authHeaders(),
  });
}

export function unlockAccount(id: number) {
  return apiFetch(`/admin/tai-khoan/${id}/mo-khoa`, {
    method: "PUT",
    headers: authHeaders(),
  });
}

export interface PendingRestaurantQuery extends PaginationParams {
  search?: string;
}

export function getPendingRestaurants(params: PendingRestaurantQuery = {}): Promise<PagedResult<PendingRestaurant>> {
  return apiFetch(`/admin/nha-hang/cho-duyet${buildQuery(params)}`, {
    headers: authHeaders(),
  });
}

export interface AdminOverview {
  tongNhaHang: number;
  tongDonHang: number;
  tongDoanhThu: number;
}

export function getAdminOverview(): Promise<AdminOverview> {
  return apiFetch("/admin/thong-ke/tong-quan", {
    headers: authHeaders(),
  });
}

export interface TopRestaurant {
  maNhaHang: number;
  tenNhaHang: string;
  diaChiQuan: string | null;
  danhGiaTrungBinh: number | null;
}

export function getTopRestaurants(): Promise<TopRestaurant[]> {
  return apiFetch("/admin/thong-ke/top-nha-hang", {
    headers: authHeaders(),
  });
}

export interface AdminDailyRevenue {
  ngay: string;
  ngayNgan: string;
  isoDate: string;
  tongGiaTriDon: number;
  doanhThuNenTang: number;
  soDonHoanThanh: number;
}

export interface AdminStatusDistribution {
  maTrangThai: number;
  tenTrangThai: string;
  soLuong: number;
  tyLe: number;
}

export interface AdminPendingTasks {
  nhaHangChoDuyet: number;
  hopDongSapHetHan: number;
  doiSoatTranhChap: number;
  doiSoatChoXacNhan: number;
}

export interface AdminAnalyticsData {
  days: number;
  rangeLabel: string;
  doanhThuTheoNgay: AdminDailyRevenue[];
  phanBoTrangThai: AdminStatusDistribution[];
  congViecCanXuLy: AdminPendingTasks;
  tongDoanhThuKyNay: number;
  tongDoanhThuNenTangKyNay: number;
  tongDonKyNay: number;
}

export function getAdminAnalytics(days = 7): Promise<AdminAnalyticsData> {
  return apiFetch(`/admin/thong-ke/analytics?days=${days}`, {
    headers: authHeaders(),
  });
}
