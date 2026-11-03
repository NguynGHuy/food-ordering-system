import { apiFetch, buildQuery, type PagedResult } from "./api";

type PageMetadata = Pick<PagedResult<unknown>, "pageNumber" | "pageSize" | "totalItems" | "totalPages">;

export interface FinancePeriod {
  maDoiSoat: number;
  maNhaHang: number;
  tenNhaHang: string;
  tuNgay: string;
  denNgay: string;
  tongSoDon: number;
  tongPhiNenTang: number;
  tongGiamGiaHeThong: number;
  doanhThuThuan: number;
  soTienCanDoiSoat: number;
  trangThai: string;
  maGiaoDichDoiSoat: string | null;
  hinhThucThanhToan: "KhongPhatSinh" | "ViNhaHang" | "ChuyenKhoan" | null;
  ngayThanhToan: string | null;
}

export interface PlatformRevenueOrder {
  maDonHang: number;
  maDonHangHienThi: string;
  maNhaHang: number;
  tenNhaHang: string;
  thoiGianGiaoThucTe: string;
  tongTienHang: number;
  thanhTien: number;
  phiNenTang: number;
  giamGiaHeThong: number;
  doanhThuThuan: number;
  phuongThucThanhToan: string;
  maDoiSoat: number | null;
  trangThaiDoiSoat: "DaDuaVaoKy" | "ChuaDoiSoat";
}

export interface FinanceOverview {
  tuNgay: string | null;
  denNgay: string | null;
  tongSoKy: number;
  soKyDaThanhToan: number;
  soKyChoXuLy: number;
  tongSoDon: number;
  soDonDuLieuKhongHopLe: number;
  tongPhiNenTang: number;
  tongChiPhiKhuyenMaiHeThong: number;
  doanhThuThuan: number;
  doanhThuDaGhiNhan: number;
  doanhThuDaDoiSoat: number;
  doanhThuChoDoiSoat: number;
  soDonChoDoiSoat: number;
  daThanhToanChoNhaHang: number;
  daThuTuNhaHang: number;
  conPhaiTraNhaHang: number;
  conPhaiThuNhaHang: number;
  cacDonDoanhThuGanDay: PlatformRevenueOrder[];
  cacKyGanDay: FinancePeriod[];
  donDoanhThuPagination: PageMetadata;
  kyDoiSoatPagination: PageMetadata;
  capNhatLuc: string;
}

export function getFinanceOverview(filters: { tuNgay?: string; denNgay?: string; orderPageNumber?: number; orderPageSize?: number; periodPageNumber?: number; periodPageSize?: number } = {}) {
  return apiFetch(`/admin/tai-chinh/tong-quan${buildQuery(filters)}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  }) as Promise<FinanceOverview>;
}
