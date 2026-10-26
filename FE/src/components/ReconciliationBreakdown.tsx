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

function debtLabel(value: number, perspective: "admin" | "restaurant") {
  if (value === 0) return "Không phát sinh công nợ";
  if (value > 0) {
    return perspective === "admin"
      ? "Hệ thống trả nhà hàng"
      : "Hệ thống trả bạn";
  }
  return perspective === "admin"
    ? "Nhà hàng trả hệ thống"
    : "Bạn trả hệ thống";
}

const AUDIT_ACTION_LABEL: Record<string, string> = {
  TaoKy: "Tạo kỳ",
  XacNhan: "Nhà hàng xác nhận",
  MoTranhChap: "Mở tranh chấp",
  GiaiQuyetTranhChap: "Admin giải quyết tranh chấp",
  ThanhToan: "Ghi nhận thanh toán",
};

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
  const auditHistory = detail.lichSu ?? [];

  const metrics = [
    ["Tổng tiền món", detail.tongTienHang],
    ["Phí giao hàng", detail.tongPhiShip],
    ["Nhà hàng tài trợ", detail.tongGiamGiaNhaHang],
    ["Hệ thống tài trợ", detail.tongGiamGiaHeThong],
    ["Phí nền tảng", detail.tongPhiNenTang],
    ["Tiền hoàn", detail.tongTienHoan],
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
          <p>
            Tiền hoàn được trình bày riêng. Kỳ mới chỉ nhận đơn hoàn thành không có
            khoản hoàn tiền thành công.
          </p>
        </div>
        <div>
          <small>{debtLabel(debt, perspective)}</small>
          <strong>{money(Math.abs(debt))}</strong>
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
                <th>Hoàn tiền</th>
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
                    <td>{money(order.soTienHoan)}</td>
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

      <section className="reconciliation-audit">
        <div className="reconciliation-orders-heading">
          <div>
            <small>Nhật ký bất biến</small>
            <h3>Lịch sử xử lý đối soát</h3>
          </div>
          <span>{auditHistory.length} sự kiện</span>
        </div>
        {auditHistory.length === 0 ? (
          <p className="reconciliation-audit-empty">
            Kỳ cũ chưa có dữ liệu audit. Các thao tác mới sẽ được ghi nhận sau khi áp dụng migration.
          </p>
        ) : (
          <ol>
            {auditHistory.map((entry) => (
              <li key={entry.maLichSuDoiSoat}>
                <div>
                  <strong>{AUDIT_ACTION_LABEL[entry.hanhDong] || entry.hanhDong}</strong>
                  <span>{dateTime(entry.thoiGian)}</span>
                </div>
                <p>
                  {entry.trangThaiTruoc ? `${entry.trangThaiTruoc} → ` : ""}
                  {entry.trangThaiSau} · {entry.vaiTroNguoiThucHien} #{entry.maTaiKhoan}
                </p>
                {entry.maGiaoDich && <p>Mã giao dịch: {entry.maGiaoDich}</p>}
                {entry.ghiChu && <p>{entry.ghiChu}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>

      {detail.ghiChu && (
        <p className="reconciliation-note"><strong>Ghi chú:</strong> {detail.ghiChu}</p>
      )}
    </div>
  );
}
