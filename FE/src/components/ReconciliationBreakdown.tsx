import type { DoiSoatDetail } from "../services/doiSoatService";

interface ReconciliationBreakdownProps {
  detail: DoiSoatDetail;
  perspective: "admin" | "restaurant";
}

function money(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function dateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function debtDescription(value: number, perspective: "admin" | "restaurant") {
  if (value === 0) return "Hai bên đã nhận đủ tiền, không phát sinh công nợ.";
  if (value > 0) {
    return perspective === "admin"
      ? "Hệ thống còn phải thanh toán cho nhà hàng."
      : "Hệ thống còn phải thanh toán cho bạn.";
  }
  return perspective === "admin"
    ? "Nhà hàng còn phải thanh toán lại cho hệ thống."
    : "Bạn còn phải thanh toán lại cho hệ thống.";
}

export default function ReconciliationBreakdown({
  detail,
  perspective,
}: ReconciliationBreakdownProps) {
  const walletCredit = detail.chiTiet.reduce(
    (sum, order) => sum + Number(order.tienDaCongVaoVi || 0),
    0,
  );
  const codCollected = detail.chiTiet.reduce(
    (sum, order) => sum + Number(order.tienThuCod || 0),
    0,
  );
  const adminRevenue = detail.tongPhiNenTang - detail.tongGiamGiaHeThong;
  const debt = Number(detail.soTienCanDoiSoat || 0);

  const metrics = [
    ["Tổng tiền món", detail.tongTienHang],
    ["Phí giao hàng", detail.tongPhiShip],
    ["Nhà hàng tài trợ", detail.tongGiamGiaNhaHang],
    ["Hệ thống tài trợ", detail.tongGiamGiaHeThong],
    ["Phí nền tảng", detail.tongPhiNenTang],
    ["Doanh thu Admin", adminRevenue],
    ["Nhà hàng được hưởng", detail.tongTienNhaHangNhan],
    ["Nhà hàng đã thu COD", codCollected],
    ["Đã cộng vào ví nhà hàng", walletCredit],
    ["Tổng nhà hàng đã nhận", detail.tongTienNhaHangDaThu],
  ] as const;

  return (
    <div className="reconciliation-breakdown">
      <section className="reconciliation-period-meta">
        <div>
          <small>Phạm vi</small>
          <strong>{detail.tuNgay} – {detail.denNgay}</strong>
        </div>
        <div>
          <small>Số đơn hoàn thành</small>
          <strong>{detail.tongSoDon} đơn</strong>
        </div>
        <div>
          <small>Ngày tạo kỳ</small>
          <strong>{dateTime(detail.ngayTao)}</strong>
        </div>
        <div>
          <small>Ngày thanh toán</small>
          <strong>{dateTime(detail.ngayThanhToan)}</strong>
        </div>
      </section>

      <section className="reconciliation-metrics">
        {metrics.map(([label, value]) => (
          <article key={label}>
            <small>{label}</small>
            <strong>{money(value)}</strong>
          </article>
        ))}
      </section>

      <section className={`reconciliation-result ${debt < 0 ? "is-negative" : debt > 0 ? "is-positive" : "is-zero"}`}>
        <div>
          <small>Công thức đối soát</small>
          <p>
            Nhà hàng được hưởng <b>{money(detail.tongTienNhaHangNhan)}</b>
            <span>−</span>
            Đã thu COD và nhận vào ví <b>{money(detail.tongTienNhaHangDaThu)}</b>
          </p>
        </div>
        <div>
          <small>Số tiền còn phải đối soát</small>
          <strong>{debt < 0 ? "−" : ""}{money(Math.abs(debt))}</strong>
          <p>{debtDescription(debt, perspective)}</p>
        </div>
      </section>

      <section className="reconciliation-orders">
        <div className="reconciliation-orders-heading">
          <div>
            <small>Dấu vết kiểm toán</small>
            <h3>Chi tiết từng đơn hàng</h3>
          </div>
          <span>{detail.chiTiet.length} đơn</span>
        </div>
        <div className="reconciliation-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Đơn hàng</th>
                <th>Khách thanh toán</th>
                <th>Tiền món</th>
                <th>Giảm giá</th>
                <th>Phí ship</th>
                <th>Phí nền tảng</th>
                <th>Doanh thu Admin</th>
                <th>Nhà hàng được hưởng</th>
                <th>Đã thu COD</th>
                <th>Đã cộng ví</th>
                <th>Còn đối soát</th>
              </tr>
            </thead>
            <tbody>
              {detail.chiTiet.map((order) => {
                const discount = order.giamGiaNhaHang + order.giamGiaHeThong;
                const orderAdminRevenue = order.phiNenTang - order.giamGiaHeThong;
                return (
                  <tr key={order.maDonHang}>
                    <td>
                      <strong>{order.maDonHangHienThi}</strong>
                      <small>
                        {order.phuongThucThanhToan || "—"} · {dateTime(order.thoiGianGiaoThucTe)}
                      </small>
                    </td>
                    <td>{money(order.thanhTien)}</td>
                    <td>{money(order.tongTienHang)}</td>
                    <td>
                      {money(discount)}
                      <small>NH {money(order.giamGiaNhaHang)} · HT {money(order.giamGiaHeThong)}</small>
                    </td>
                    <td>{money(order.phiShip)}</td>
                    <td>
                      {money(order.phiNenTang)}
                      <small>{order.tyLePhiNenTang}%</small>
                    </td>
                    <td className={orderAdminRevenue < 0 ? "money-negative" : "money-positive"}>
                      {money(orderAdminRevenue)}
                    </td>
                    <td>{money(order.soTienNhaHangNhan)}</td>
                    <td>{money(order.tienThuCod)}</td>
                    <td>{money(order.tienDaCongVaoVi)}</td>
                    <td className={order.soTienCanDoiSoat < 0 ? "money-negative" : "money-positive"}>
                      {order.soTienCanDoiSoat < 0 ? "−" : ""}
                      {money(Math.abs(order.soTienCanDoiSoat))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {detail.ghiChu && (
        <p className="reconciliation-note"><strong>Ghi chú:</strong> {detail.ghiChu}</p>
      )}
    </div>
  );
}
