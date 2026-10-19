import { apiFetch } from "./api";
import { getIdempotencyKey } from "./idempotency";

function authHeaders() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

export async function getPaymentMethods() {
  return apiFetch("/thanh-toan/phuong-thuc", {
    method: "GET",
    headers: authHeaders(),
  });
}

export async function createPayment(maDonHang: number, maPhuongThuc: number) {
  const path = "/thanh-toan";
  const body = { maDonHang, maPhuongThuc };
  const key = await getIdempotencyKey(`POST ${path}`, body);
  return apiFetch(path, {
    method: "POST",
    headers: { ...authHeaders(), "Idempotency-Key": key },
    body: JSON.stringify(body),
  });
}

export async function getPaymentsByOrder(maDonHang: number) {
  return apiFetch(`/thanh-toan/don-hang/${maDonHang}`, {
    method: "GET",
    headers: authHeaders(),
  });
}

export async function simulatePayment(
  id: number,
  ketQua: "ThanhCong" | "ThatBai",
) {
  const path = `/thanh-toan/${id}/mo-phong`;
  const body = { ketQua };
  const key = await getIdempotencyKey(`PUT ${path}`, body);
  return apiFetch(path, {
    method: "PUT",
    headers: { ...authHeaders(), "Idempotency-Key": key },
    body: JSON.stringify(body),
  });
}

export async function changePaymentMethod(id: number, maPhuongThuc: number) {
  const path = `/thanh-toan/${id}/doi-phuong-thuc`;
  const body = { maPhuongThuc };
  const key = await getIdempotencyKey(`POST ${path}`, body);
  return apiFetch(path, {
    method: "POST",
    headers: { ...authHeaders(), "Idempotency-Key": key },
    body: JSON.stringify(body),
  });
}

export interface DongMonNho {
  tenMonAn: string;
  hinhAnh: string | null;
  soLuong: number;
  thanhTien: number;
  toppings: { tenTopping: string; giaThem: number }[];
}
