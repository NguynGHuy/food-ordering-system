import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeDollarSign,
  CircleAlert,
  Landmark,
  RefreshCw,
  ReceiptText,
  TicketPercent,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  getFinanceOverview,
  type FinanceOverview,
} from "../services/adminFinanceService";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh";

function money(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

const STATUS_LABEL: Record<string, string> = {
  MoiTao: "Mới tạo",
  ChoXacNhan: "Chờ nhà hàng xác nhận",
  DaXacNhan: "Chờ thanh toán",
  DaThanhToan: "Đã thanh toán",
};

export default function AdminFinance() {
  const [data, setData] = useState<FinanceOverview | null>(null);
  const [filters, setFilters] = useState({ tuNgay: "", denNgay: "" });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setData(await getFinanceOverview({
        tuNgay: appliedFilters.tuNgay || undefined,
        denNgay: appliedFilters.denNgay || undefined,
      }));
    } catch (loadError) {
      setError(loadError instanceof Error
        ? loadError.message
        : "Không thể tải dữ liệu tài chính.");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useRealtimeRefresh(["taiChinh", "doiSoat"], load);

  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault();
    setAppliedFilters(filters);
  };

  const cards = data ? [
    {
      label: "Phí nền tảng",
      value: data.tongPhiNenTang,
      icon: BadgeDollarSign,
      tone: "green",
    },
    {
      label: "Voucher hệ thống tài trợ",
      value: data.tongChiPhiKhuyenMaiHeThong,
      icon: TicketPercent,
      tone: "orange",
    },
    {
      label: "Doanh thu Admin đã ghi nhận",
      value: data.doanhThuDaGhiNhan,
      icon: Landmark,
      tone: data.doanhThuDaGhiNhan >= 0 ? "blue" : "red",
    },
    {
      label: `Chờ đối soát (${data.soDonChoDoiSoat} đơn)`,
      value: data.doanhThuChoDoiSoat,
      icon: ReceiptText,
      tone: "violet",
    },
  ] : [];

  return (
    <div className="admin-finance-page">
      <header className="admin-promotions-heading">
        <div>
          <span>Kế toán & tài chính</span>
          <h1>Tài chính nền tảng</h1>
          <p>
            Doanh thu Admin được ghi nhận ngay khi đơn hoàn thành, không cần chờ tạo kỳ đối soát.
          </p>
        </div>
        <button type="button" className="refresh" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={16} className={loading ? "wallet-spin" : ""} /> Làm mới
        </button>
      </header>

      <form className="admin-finance-filters" onSubmit={applyFilters}>
        <label>
          Từ ngày
          <input
            type="date"
            value={filters.tuNgay}
            onChange={(event) => setFilters({ ...filters, tuNgay: event.target.value })}
          />
        </label>
        <label>
          Đến ngày
          <input
            type="date"
            value={filters.denNgay}
            onChange={(event) => setFilters({ ...filters, denNgay: event.target.value })}
          />
        </label>
        <button type="submit" disabled={loading}>Áp dụng</button>
      </form>

      {error && (
        <div className="admin-promotions-error">
          <CircleAlert size={18} /> {error}
        </div>
      )}

      {loading && !data ? (
        <div className="admin-promotions-loading">Đang tổng hợp dữ liệu tài chính...</div>
      ) : data && (
        <>
          {data.soDonDuLieuKhongHopLe > 0 && (
            <div className="admin-promotions-error">
              <CircleAlert size={18} />
              Có {data.soDonDuLieuKhongHopLe} đơn hoàn thành có dữ liệu thanh toán không khớp.
              Các đơn này chưa được tính vào doanh thu để tránh sai số.
            </div>
          )}

          <section className="admin-finance-cards">
            {cards.map(({ label, value, icon: Icon, tone }) => (
              <article key={label} className={`admin-finance-card ${tone}`}>
                <span><Icon size={20} /></span>
                <div>
                  <small>{label}</small>
                  <strong>{money(value)}</strong>
                </div>
              </article>
            ))}
          </section>

          <section className="admin-finance-debt-grid">
            <article>
              <div><Landmark size={20} /><span>Doanh thu nền tảng</span></div>
              <p>Đã đối soát <strong>{money(data.doanhThuDaDoiSoat)}</strong></p>
              <p>Chưa đối soát <b>{money(data.doanhThuChoDoiSoat)}</b></p>
            </article>
            <article>
              <div><ArrowUpFromLine size={20} /><span>Tiền ra cho nhà hàng</span></div>
              <p>Đã thanh toán <strong>{money(data.daThanhToanChoNhaHang)}</strong></p>
              <p>Còn phải trả <b>{money(data.conPhaiTraNhaHang)}</b></p>
            </article>
            <article>
              <div><ArrowDownToLine size={20} /><span>Tiền thu từ nhà hàng</span></div>
              <p>Đã thu <strong>{money(data.daThuTuNhaHang)}</strong></p>
              <p>Còn phải thu <b>{money(data.conPhaiThuNhaHang)}</b></p>
            </article>
          </section>

          <section className="admin-promotions-panel">
            <div className="admin-finance-table-heading">
              <div>
                <span>Ghi nhận theo đơn hoàn thành</span>
                <h2>Doanh thu Admin gần đây</h2>
              </div>
              <strong>{data.tongSoDon} đơn hợp lệ</strong>
            </div>
            <div className="admin-promotions-table-scroll">
              <table className="admin-promotions-table">
                <thead>
                  <tr>
                    <th>Đơn hàng</th>
                    <th>Nhà hàng</th>
                    <th>Phí nền tảng</th>
                    <th>Voucher hệ thống</th>
                    <th>Doanh thu Admin</th>
                    <th>Thanh toán</th>
                    <th>Đối soát</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cacDonDoanhThuGanDay.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="admin-finance-empty">
                        Chưa có đơn hoàn thành hợp lệ trong phạm vi này.
                      </td>
                    </tr>
                  ) : data.cacDonDoanhThuGanDay.map((order) => (
                    <tr key={order.maDonHang}>
                      <td>
                        <strong>{order.maDonHangHienThi}</strong>
                        <small>{dateTime(order.thoiGianGiaoThucTe)}</small>
                      </td>
                      <td>{order.tenNhaHang}</td>
                      <td>{money(order.phiNenTang)}</td>
                      <td>{money(order.giamGiaHeThong)}</td>
                      <td>
                        <strong className={order.doanhThuThuan < 0 ? "finance-negative" : "finance-positive"}>
                          {money(order.doanhThuThuan)}
                        </strong>
                      </td>
                      <td>{order.phuongThucThanhToan}</td>
                      <td>
                        <span className={`admin-promotion-state ${order.maDoiSoat ? "active" : "upcoming"}`}>
                          <i />
                          {order.maDoiSoat ? `Kỳ #${order.maDoiSoat}` : "Chưa đối soát"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="admin-finance-note">
              Doanh thu Admin = phí nền tảng − voucher do hệ thống tài trợ. Số liệu lấy từ
              snapshot của đơn đã hoàn thành và chỉ ghi nhận khi khoản thanh toán khớp chính xác.
            </p>
          </section>

          <section className="admin-promotions-panel">
            <div className="admin-finance-table-heading">
              <div>
                <span>Dấu vết kiểm toán</span>
                <h2>Các kỳ đối soát gần đây</h2>
              </div>
              <Link to="/admin/doi-soat">Mở trang đối soát</Link>
            </div>
            <div className="admin-promotions-table-scroll">
              <table className="admin-promotions-table">
                <thead>
                  <tr>
                    <th>Kỳ</th>
                    <th>Nhà hàng</th>
                    <th>Phí nền tảng</th>
                    <th>Voucher hệ thống</th>
                    <th>Thuần</th>
                    <th>Thanh toán</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cacKyGanDay.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="admin-finance-empty">
                        Chưa có kỳ đối soát trong phạm vi này.
                      </td>
                    </tr>
                  ) : data.cacKyGanDay.map((period) => (
                    <tr key={period.maDoiSoat}>
                      <td>
                        <strong>#{period.maDoiSoat}</strong>
                        <small>{period.tuNgay} – {period.denNgay}</small>
                      </td>
                      <td>
                        {period.tenNhaHang}
                        <small>{period.tongSoDon} đơn</small>
                      </td>
                      <td>{money(period.tongPhiNenTang)}</td>
                      <td>{money(period.tongGiamGiaHeThong)}</td>
                      <td>
                        <strong className={period.doanhThuThuan < 0 ? "finance-negative" : "finance-positive"}>
                          {money(period.doanhThuThuan)}
                        </strong>
                      </td>
                      <td>
                        {period.hinhThucThanhToan === "KhongPhatSinh"
                          ? "Không phát sinh"
                          : period.hinhThucThanhToan === "ViNhaHang"
                            ? "Ví nhà hàng"
                            : period.hinhThucThanhToan === "ChuyenKhoan"
                              ? "Chuyển khoản"
                              : "—"}
                      </td>
                      <td>
                        <span className={`admin-promotion-state ${period.trangThai === "DaThanhToan" ? "active" : "upcoming"}`}>
                          <i />{STATUS_LABEL[period.trangThai] ?? period.trangThai}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
