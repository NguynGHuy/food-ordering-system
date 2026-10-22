import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  CircleAlert,
  LoaderCircle,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import Pagination from "../components/Pagination";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh";
import {
  getMyWallet,
  getMyWalletTransactions,
  type WalletInfo,
  type WalletTransaction,
} from "../services/walletService";

const PAGE_SIZE = 10;

const transactionLabels: Record<string, string> = {
  NapTien: "Nạp tiền",
  ThanhToan: "Thanh toán đơn hàng",
  HoanTien: "Hoàn tiền",
  ThuNhapDonHang: "Thu nhập đơn hàng",
  NhanDoiSoat: "Nhận tiền đối soát",
  RutTien: "Rút tiền",
  ChuyenTien: "Chuyển tiền",
  DieuChinh: "Điều chỉnh số dư",
  KhoiTao: "Khởi tạo ví",
};

const transactionTypes = [
  "NapTien",
  "ThanhToan",
  "HoanTien",
  "ThuNhapDonHang",
  "NhanDoiSoat",
  "RutTien",
  "ChuyenTien",
  "DieuChinh",
  "KhoiTao",
];

function formatMoney(value: number, currency = "VND") {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function WalletHistory() {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [movement, setMovement] = useState<"" | "Cong" | "Tru">("");
  const [transactionType, setTransactionType] = useState("");
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [error, setError] = useState("");

  const loadWallet = useCallback(async () => {
    try {
      setLoadingWallet(true);
      const data = await getMyWallet();
      setWallet(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải thông tin ví.");
    } finally {
      setLoadingWallet(false);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      setLoadingTransactions(true);
      setError("");
      const data = await getMyWalletTransactions({
        pageNumber,
        pageSize: PAGE_SIZE,
        loaiBienDong: movement || undefined,
        loaiGiaoDich: transactionType || undefined,
      });

      setTransactions(data.items);
      setTotalPages(data.totalPages);
      setTotalItems(data.totalItems);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải lịch sử giao dịch.");
    } finally {
      setLoadingTransactions(false);
    }
  }, [movement, pageNumber, transactionType]);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/dang-nhap", { replace: true });
      return;
    }

    const timeout = window.setTimeout(() => void loadWallet(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadWallet, navigate]);

  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    const timeout = window.setTimeout(() => void loadTransactions(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadTransactions]);

  const refreshRealtime = useCallback(async () => {
    await Promise.all([loadWallet(), loadTransactions()]);
  }, [loadTransactions, loadWallet]);

  useRealtimeRefresh(["vi"], refreshRealtime);

  const handleMovementChange = (value: "" | "Cong" | "Tru") => {
    setMovement(value);
    setPageNumber(1);
  };

  const handleTypeChange = (value: string) => {
    setTransactionType(value);
    setPageNumber(1);
  };

  const retry = () => {
    setError("");
    void loadWallet();
    void loadTransactions();
  };

  return (
    <main className="wallet-history-page">
      <div className="wallet-history-container">
        <Link to="/ho-so" className="wallet-history-back">
          <ArrowLeft size={17} /> Quay lại hồ sơ
        </Link>

        <section className="wallet-history-hero">
          <div className="wallet-history-hero-copy">
            <span className="wallet-history-eyebrow">Ví Foodie</span>
            <h1>Lịch sử giao dịch</h1>
            <p>Theo dõi rõ từng khoản tiền vào, tiền ra và số dư sau giao dịch.</p>
          </div>

          <div className="wallet-balance-card" aria-label="Số dư ví hiện tại">
            <div className="wallet-balance-card-top">
              <span><WalletCards size={22} /> Số dư khả dụng</span>
              <span className={`wallet-status ${wallet?.trangThai === "HoatDong" ? "is-active" : ""}`}>
                <ShieldCheck size={14} />
                {wallet?.trangThai === "HoatDong" ? "Đang hoạt động" : "Tạm khóa"}
              </span>
            </div>
            {loadingWallet ? (
              <LoaderCircle className="wallet-spin" size={28} />
            ) : (
              <strong>{formatMoney(wallet?.soDu ?? 0, wallet?.donViTienTe ?? "VND")}</strong>
            )}
            <small>
              Cập nhật gần nhất: {wallet ? formatDate(wallet.ngayCapNhat) : "--"}
            </small>
          </div>
        </section>

        <section className="wallet-history-panel" aria-labelledby="wallet-transactions-title">
          <div className="wallet-history-panel-head">
            <div>
              <span>Biến động số dư</span>
              <h2 id="wallet-transactions-title">Các giao dịch gần đây</h2>
            </div>
            <button type="button" className="wallet-refresh-button" onClick={retry} disabled={loadingTransactions}>
              <RefreshCw size={16} className={loadingTransactions ? "wallet-spin" : ""} />
              Làm mới
            </button>
          </div>

          <div className="wallet-history-filters">
            <div className="wallet-movement-tabs" aria-label="Lọc theo biến động">
              {([
                ["", "Tất cả"],
                ["Cong", "Tiền vào"],
                ["Tru", "Tiền ra"],
              ] as const).map(([value, label]) => (
                <button
                  type="button"
                  key={value || "all"}
                  className={movement === value ? "is-active" : ""}
                  onClick={() => handleMovementChange(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="wallet-type-filter">
              <span>Loại giao dịch</span>
              <select value={transactionType} onChange={(event) => handleTypeChange(event.target.value)}>
                <option value="">Tất cả loại</option>
                {transactionTypes.map((type) => (
                  <option key={type} value={type}>{transactionLabels[type]}</option>
                ))}
              </select>
            </label>
          </div>

          {error && (
            <div className="wallet-history-error" role="alert">
              <CircleAlert size={19} />
              <span>{error}</span>
              <button type="button" onClick={retry}>Thử lại</button>
            </div>
          )}

          {loadingTransactions ? (
            <div className="wallet-history-loading">
              <LoaderCircle className="wallet-spin" size={28} />
              <span>Đang tải giao dịch...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="wallet-history-empty">
              <ReceiptText size={34} />
              <h3>Chưa có giao dịch</h3>
              <p>{movement || transactionType ? "Không có giao dịch phù hợp bộ lọc." : "Các giao dịch ví của bạn sẽ hiển thị tại đây."}</p>
            </div>
          ) : (
            <div className="wallet-transaction-list">
              {transactions.map((transaction) => {
                const isCredit = transaction.loaiBienDong === "Cong";
                return (
                  <article className="wallet-transaction-item" key={transaction.maGiaoDichVi}>
                    <span className={`wallet-transaction-icon ${isCredit ? "is-credit" : "is-debit"}`}>
                      {isCredit ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                    </span>

                    <div className="wallet-transaction-main">
                      <div className="wallet-transaction-title-row">
                        <div>
                          <h3>{transactionLabels[transaction.loaiGiaoDich] ?? transaction.loaiGiaoDich}</h3>
                          <time dateTime={transaction.ngayTao}>{formatDate(transaction.ngayTao)}</time>
                        </div>
                        <strong className={isCredit ? "is-credit" : "is-debit"}>
                          {isCredit ? "+" : "−"}{formatMoney(transaction.soTien)}
                        </strong>
                      </div>

                      {transaction.noiDung && <p>{transaction.noiDung}</p>}

                      <div className="wallet-transaction-meta">
                        <span>Số dư sau: <b>{formatMoney(transaction.soDuSau)}</b></span>
                        <span>Mã: <b>{transaction.maThamChieu}</b></span>
                        {transaction.maDonHang && (
                          <Link to={`/don-hang/${transaction.maDonHang}`}>Xem đơn hàng</Link>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <Pagination
            pageNumber={pageNumber}
            totalPages={totalPages}
            totalItems={totalItems}
            disabled={loadingTransactions}
            onPageChange={setPageNumber}
          />
        </section>
      </div>
    </main>
  );
}

export default WalletHistory;
