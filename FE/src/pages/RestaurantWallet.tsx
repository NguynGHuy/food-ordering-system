import { useCallback, useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CircleAlert, LoaderCircle, RefreshCw, ShieldCheck, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";
import Pagination from "../components/Pagination";
import { getMyWallet, getMyWalletTransactions, type WalletInfo, type WalletTransaction } from "../services/walletService";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh";

const PAGE_SIZE = 10;

const LABELS: Record<string, string> = {
  ThuNhapDonHang: "Thu nhập đơn hàng",
  NhanDoiSoat: "Nhận tiền đối soát",
  RutTien: "Rút tiền",
  ChuyenTien: "Chuyển tiền",
  DieuChinh: "Điều chỉnh số dư",
  KhoiTao: "Khởi tạo ví",
};

function money(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value || 0);
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

export default function RestaurantWallet() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [items, setItems] = useState<WalletTransaction[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [walletData, transactionData] = await Promise.all([
        getMyWallet(),
        getMyWalletTransactions({ pageNumber, pageSize: PAGE_SIZE }),
      ]);
      setWallet(walletData);
      setItems(transactionData.items);
      setTotalPages(transactionData.totalPages);
      setTotalItems(transactionData.totalItems);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải ví nhà hàng.");
    } finally {
      setLoading(false);
    }
  }, [pageNumber]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useRealtimeRefresh(["vi"], load);

  return (
    <div className="restaurant-wallet-page wallet-history-container">
      <section className="wallet-history-hero">
        <div className="wallet-history-hero-copy">
          <span className="wallet-history-eyebrow">Ví nhà hàng</span>
          <h1>Doanh thu và tiền đối soát</h1>
          <p>Thu nhập từ đơn hoàn thành và khoản Admin thanh toán qua ví đều được ghi sổ tại đây để kiểm tra ngược.</p>
        </div>
        <div className="wallet-balance-card">
          <div className="wallet-balance-card-top">
            <span><WalletCards size={22} /> Số dư khả dụng</span>
            <span className={`wallet-status ${wallet?.trangThai === "HoatDong" ? "is-active" : ""}`}><ShieldCheck size={14} />{wallet?.trangThai === "HoatDong" ? "Đang hoạt động" : "Tạm khóa"}</span>
          </div>
          {loading && !wallet ? <LoaderCircle className="wallet-spin" size={28} /> : <strong>{money(wallet?.soDu ?? 0)}</strong>}
          <small>Cập nhật gần nhất: {wallet ? dateTime(wallet.ngayCapNhat) : "—"}</small>
        </div>
      </section>

      <section className="wallet-history-panel">
        <div className="wallet-history-panel-head">
          <div><span>Sổ giao dịch</span><h2>Lịch sử biến động ví</h2></div>
          <button type="button" className="wallet-refresh-button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} className={loading ? "wallet-spin" : ""} /> Làm mới</button>
        </div>

        {error && <div className="wallet-history-error"><CircleAlert size={19} /><span>{error}</span><button type="button" onClick={() => void load()}>Thử lại</button></div>}

        {loading && items.length === 0 ? (
          <div className="wallet-history-loading"><LoaderCircle className="wallet-spin" size={28} /> Đang tải giao dịch...</div>
        ) : items.length === 0 ? (
          <div className="wallet-history-empty"><WalletCards size={34} /><h3>Chưa có giao dịch</h3><p>Thu nhập đơn hàng và tiền đối soát được cộng vào ví sẽ hiển thị tại đây.</p></div>
        ) : (
          <div className="wallet-transaction-list">
            {items.map((item) => {
              const credit = item.loaiBienDong === "Cong";
              return (
                <article className="wallet-transaction-item" key={item.maGiaoDichVi}>
                  <span className={`wallet-transaction-icon ${credit ? "is-credit" : "is-debit"}`}>{credit ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}</span>
                  <div className="wallet-transaction-main">
                    <div className="wallet-transaction-title-row"><div><h3>{LABELS[item.loaiGiaoDich] ?? item.loaiGiaoDich}</h3><time>{dateTime(item.ngayTao)}</time></div><strong className={credit ? "is-credit" : "is-debit"}>{credit ? "+" : "−"}{money(item.soTien)}</strong></div>
                    {item.noiDung && <p>{item.noiDung}</p>}
                    <div className="wallet-transaction-meta"><span>Số dư trước: <b>{money(item.soDuTruoc)}</b></span><span>Số dư sau: <b>{money(item.soDuSau)}</b></span><span>Mã: <b>{item.maThamChieu}</b></span>{item.maDonHang && <Link to={`/quan/don-hang/${item.maDonHang}`}>Xem đơn hàng</Link>}{item.maDoiSoat && <Link to="/quan/doi-soat">Xem kỳ #{item.maDoiSoat}</Link>}</div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <Pagination pageNumber={pageNumber} totalPages={totalPages} totalItems={totalItems} disabled={loading} onPageChange={setPageNumber} />
      </section>
    </div>
  );
}
