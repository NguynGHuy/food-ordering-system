import { apiFetch, buildQuery, type PagedResult } from "./api";
import { runIdempotentRequest } from "./idempotency";

export interface SupportRecord {
  id: number; orderId: number; status: string; kind: string; reason: string;
  createdAt: string; updatedAt: string; decisionReason?: string | null;
}
export interface WorkflowSnapshot {
  orderId: number; state: number; tracked: boolean; serverNow: string;
  stateEnteredAt: string | null; readyAt: string | null; paymentDeadline: string | null;
  acceptanceDeadline: string | null; reminderAt: string | null; escalationAt: string | null;
  late: boolean; needsAdmin: boolean; canRequestSupport: boolean; canSubmitSupport: boolean; supports: SupportRecord[];
}
export interface SupportRow extends SupportRecord { maDonHangHienThi: string; state: number }
export interface SupportDetail {
  support: SupportRecord;
  order: { maDonHang: number; maDonHangHienThi: string; maTrangThai: number; thanhTien: number; soTienNhaHangNhan: number; lyDoHuy: string | null };
  workflow: WorkflowSnapshot;
  payments: { maThanhToan: number; method: string; soTien: number; trangThaiThanhToan: string }[];
  refunds: { maHoanTien: number; soTienHoan: number; trangThai: string; kenhHoanTien: string }[];
  income: { maGiaoDichVi: number; soTien: number; trangThai: string }[];
  reconciliationCount: number;
  history: { maLichSu: number; maTrangThai: number; thoiGianTao: string; ghiChu: string | null }[];
  audit: { id: number; actorId: number | null; action: string; reason: string; createdAt: string }[];
}
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token") || ""}` });
export const getWorkflow = (id: number): Promise<WorkflowSnapshot> => apiFetch(`/don-hang/${id}/workflow`, { headers: auth() });
export const getAttention = (): Promise<{ items: { orderId: number; code: string; state: number }[] }> => apiFetch("/order-workflow/attention", { headers: auth() });
export const getSupportQueue = (pageNumber: number, status: string, search: string): Promise<PagedResult<SupportRow>> =>
  apiFetch(`/admin/order-support${buildQuery({ pageNumber, pageSize: 20, status: status || undefined, search: search || undefined })}`, { headers: auth() });
export const getSupportDetail = (id: number): Promise<SupportDetail> => apiFetch(`/admin/order-support/${id}`, { headers: auth() });
export function requestOrderSupport(id: number, reason: string) {
  const path = `/don-hang/${id}/support`, body = { reason };
  return runIdempotentRequest(`POST ${path}`, body, key => apiFetch(path, { method: "POST", headers: { ...auth(), "Idempotency-Key": key }, body: JSON.stringify(body) }));
}
export interface SupportDecision { action: string; reason: string; expectedState: number; verifiedUnableToServe: boolean; noCostDispute: boolean }
export function decideSupport(id: number, body: SupportDecision): Promise<{ status: string; decisionReason: string }> {
  const path = `/admin/order-support/${id}/decision`;
  return runIdempotentRequest(`PUT ${path}`, body, key => apiFetch(path, { method: "PUT", headers: { ...auth(), "Idempotency-Key": key }, body: JSON.stringify(body) }));
}
export const SUPPORT_LABELS: Record<string, string> = { Pending: "Chờ xử lý", NeedsReview: "Cần xử lý riêng", Rejected: "Đã từ chối", Cancelled: "Đã hủy và đối chiếu hoàn tiền" };
export const STATE_LABELS: Record<number, string> = { 1: "Chờ xác nhận", 2: "Đã xác nhận", 3: "Đang chuẩn bị", 4: "Đang giao", 5: "Hoàn thành", 6: "Đã hủy" };
export function workflowTime(value: string) {
  const instant = /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : value + "+07:00";
  return new Date(instant).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" });
}
