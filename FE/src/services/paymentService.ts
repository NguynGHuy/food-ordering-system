import { apiFetch } from "./api";
import { runIdempotentRequest } from "./idempotency";

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
  return runIdempotentRequest(`PUT ${path}`, body, (key) =>
    apiFetch(path, {
      method: "PUT",
      headers: { ...authHeaders(), "Idempotency-Key": key },
      body: JSON.stringify(body),
    })
  );
}

export async function changePaymentMethod(id: number, maPhuongThuc: number) {
  const path = `/thanh-toan/${id}/doi-phuong-thuc`;
  const body = { maPhuongThuc };
  return runIdempotentRequest(`POST ${path}`, body, (key) =>
    apiFetch(path, {
      method: "POST",
      headers: { ...authHeaders(), "Idempotency-Key": key },
      body: JSON.stringify(body),
    })
  );
}

export interface DongMonNho {
  tenMonAn: string;
  hinhAnh: string | null;
  soLuong: number;
  thanhTien: number;
  toppings: { tenTopping: string; giaThem: number }[];
}
