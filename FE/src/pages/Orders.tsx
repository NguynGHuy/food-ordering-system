import { useCallback, useEffect, useState } from "react";

import { Link } from "react-router-dom";

import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  ChefHat,
  CircleX,
  Clock3,
  Copy,
  ReceiptText,
  RefreshCw,
  Store,
  TriangleAlert,
  Truck,
  X,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

import { cancelOrder, getMyOrders } from "../services/orderService";
import Pagination from "../components/Pagination";
import ScrollReveal from "../components/ScrollReveal";

interface CustomerOrder {
  maDonHang: number;
  maDonHangHienThi: string;
  tenNhaHang: string;
  thoiGianDat: string;
  trangThai: string;
  thanhTien: number;
  tenPhuongThuc: string | null;
  trangThaiThanhToan: string | null;
}

type FilterKey = "TatCa" | "DangXuLy" | "HoanThanh" | "DaHuy";

interface StatusMeta {
  label: string;
  className: string;
  icon: LucideIcon;
}

const FILTER_VALUES: Record<FilterKey, "processing" | "completed" | "cancelled" | undefined> = {
  TatCa: undefined,
  DangXuLy: "processing",
  HoanThanh: "completed",
  DaHuy: "cancelled",
};

const STATUS_META: Record<string, StatusMeta> = {
  ChoXacNhan: {
    label: "Chờ xác nhận",
    className: "waiting",
    icon: Clock3,
  },
  DaXacNhan: {
    label: "Đã xác nhận",
    className: "confirmed",
    icon: BadgeCheck,
  },
  DangChuanBi: {
    label: "Đang chuẩn bị",
    className: "preparing",
    icon: ChefHat,
  },
  DangGiao: {
    label: "Đang giao",
    className: "delivering",
    icon: Truck,
  },
  HoanThanh: {
    label: "Hoàn thành",
    className: "completed",
    icon: CheckCircle2,
  },
  DaHuy: {
    label: "Đã hủy",
    className: "cancelled",
    icon: CircleX,
  },
};

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

function formatShortOrderCode(code: string | null | undefined): string {
  if (!code) return "";
  const clean = code.trim();
  if (clean.length <= 11) return clean;
  return `${clean.slice(0, 5)}...${clean.slice(-4)}`;
}

function getStatusMeta(status: string): StatusMeta {
  return (
    STATUS_META[status] ?? {
      label: "Không xác định",
      className: "unknown",
      icon: Clock3,
    }
  );
}

function getPaymentLabel(order: CustomerOrder) {
  const isCod = order.tenPhuongThuc?.toUpperCase().includes("COD");

  if (isCod && order.trangThaiThanhToan === "ChoThanhToan") return "COD • Thu khi giao";
  if (order.trangThaiThanhToan === "ThanhCong") return "Đã thanh toán";
  if (order.trangThaiThanhToan === "ThatBai") return "Thanh toán thất bại";
  return "Chờ thanh toán";
}

function Orders() {
  const PAGE_SIZE = 8;
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [activeFilter, setActiveFilter] = useState<FilterKey>("TatCa");
  const [pageNumber, setPageNumber] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [counts, setCounts] = useState({
    all: 0,
    processing: 0,
    completed: 0,
    cancelled: 0,
  });

  const [cancelTarget, setCancelTarget] = useState<CustomerOrder | null>(null);

  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopyCode = async (code: string, id: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const loadOrders = useCallback(async (showFullLoading = true) => {
    try {
      if (showFullLoading) {
        setLoading(true);
      }

      setLoadError("");

      const data = await getMyOrders<CustomerOrder>({
        pageNumber,
        pageSize: PAGE_SIZE,
        filter: FILTER_VALUES[activeFilter],
      });

      setOrders(data.items);
      setTotalItems(data.totalItems);
      setTotalPages(data.totalPages);
      setCounts(data.counts);
      if (data.pageNumber !== pageNumber) setPageNumber(data.pageNumber);
    } catch (error) {
      // Lỗi làm mới nền không làm mất danh sách đang hiển thị.
      if (showFullLoading) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Không thể tải danh sách đơn hàng.",
        );
      }
    } finally {
      if (showFullLoading) {
        setLoading(false);
      }
    }
  }, [activeFilter, pageNumber]);

  useEffect(() => {
    const handleRealtimeUpdate = () => {
      void loadOrders(false);
    };

    const initialLoadTimer = window.setTimeout(() => {
      void loadOrders(true);
    }, 0);

    window.addEventListener("customer-orders-updated", handleRealtimeUpdate);

    return () => {
      window.clearTimeout(initialLoadTimer);
      window.removeEventListener(
        "customer-orders-updated",
        handleRealtimeUpdate,
      );
    };
  }, [loadOrders]);

  const filterItems = [
    {
      key: "TatCa" as const,
      label: "Tất cả",
      count: counts.all,
    },
    {
      key: "DangXuLy" as const,
      label: "Đang xử lý",
      count: counts.processing,
    },
    {
      key: "HoanThanh" as const,
      label: "Hoàn thành",
      count: counts.completed,
    },
    {
      key: "DaHuy" as const,
      label: "Đã hủy",
      count: counts.cancelled,
    },
  ];

  const openCancelDialog = (order: CustomerOrder) => {
    setCancelTarget(order);
    setCancelReason("");
    setCancelError("");
  };

  const closeCancelDialog = () => {
    if (cancelBusy) return;

    setCancelTarget(null);
    setCancelReason("");
    setCancelError("");
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget || cancelBusy) return;

    const reason = cancelReason.trim();

    if (!reason) {
      setCancelError("Vui lòng nhập lý do hủy đơn hàng.");
      return;
    }

    try {
      setCancelBusy(true);
      setCancelError("");

      await cancelOrder(cancelTarget.maDonHang, reason);

      setNotice(`Đã hủy đơn ${cancelTarget.maDonHangHienThi} thành công.`);

      setCancelTarget(null);
      setCancelReason("");

      await loadOrders(false);
    } catch (error) {
      setCancelError(
        error instanceof Error ? error.message : "Không thể hủy đơn lúc này.",
      );
    } finally {
      setCancelBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="customer-orders-page">
        <div className="loading-spinner" style={{ margin: "100px auto" }} />
      </main>
    );
  }

  return (
    <main className="customer-orders-page">
      <div className="customer-orders-container">
        <header className="customer-orders-hero">
          <div className="customer-orders-title">
            <span className="customer-orders-title-icon">
              <ReceiptText size={22} />
            </span>

            <div>
              <span>Đơn hàng của bạn</span>
              <h1>Theo dõi đơn đặt món</h1>

              <p>Xem tiến trình giao hàng và lịch sử những đơn bạn đã đặt.</p>
            </div>
          </div>

          <div className="customer-orders-total">
            <strong>{counts.all}</strong>
            <span>đơn hàng</span>
          </div>
        </header>

        {notice && (
          <div className="customer-orders-notice" role="status">
            <CheckCircle2 size={17} />

            <span>{notice}</span>

            <button
              type="button"
              aria-label="Đóng thông báo"
              onClick={() => setNotice("")}
            >
              <X size={15} />
            </button>
          </div>
        )}

        {loadError && (
          <div className="customer-orders-error">
            <div>
              <strong>Không tải được đơn hàng</strong>

              <p>{loadError}</p>
            </div>

            <button type="button" onClick={() => void loadOrders()}>
              <RefreshCw size={15} />
              Thử lại
            </button>
          </div>
        )}

        {!loadError && counts.all === 0 ? (
          <section className="customer-orders-empty">
            <span>
              <ReceiptText size={31} />
            </span>

            <h2>Bạn chưa có đơn hàng nào</h2>

            <p>Khám phá các nhà hàng và chọn món bạn yêu thích.</p>

            <Link to="/">
              Đặt món ngay
              <ArrowRight size={16} />
            </Link>
          </section>
        ) : (
          !loadError && (
            <>
              <nav className="customer-order-filters" aria-label="Lọc đơn hàng">
                {filterItems.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    className={activeFilter === filter.key ? "active" : ""}
                    onClick={() => {
                      setActiveFilter(filter.key);
                      setPageNumber(1);
                    }}
                  >
                    <span>{filter.label}</span>
                    <strong>{filter.count}</strong>
                  </button>
                ))}
              </nav>

              {orders.length === 0 ? (
                <section className="customer-orders-filter-empty">
                  <ReceiptText size={26} />

                  <h3>Không có đơn hàng trong mục này</h3>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveFilter("TatCa");
                      setPageNumber(1);
                    }}
                  >
                    Xem tất cả đơn hàng
                  </button>
                </section>
              ) : (
                <div className="customer-order-list">
                  {orders.map((order, index) => {
                    const status = getStatusMeta(order.trangThai);

                    const StatusIcon = status.icon;

                    const canCancel =
                      order.trangThai === "ChoXacNhan" ||
                      order.trangThai === "DaXacNhan";

                    return (
                      <ScrollReveal
                        key={order.maDonHang}
                        className="customer-order-card-reveal"
                        delay={Math.min(index, 3) * 60}
                      >
                      <article
                        className={`customer-order-card order-${status.className}`}
                      >
                        <div className="customer-order-card-header">
                          <div className="customer-order-restaurant">
                            <span>
                              <Store size={18} />
                            </span>

                            <div>
                              <h2>{order.tenNhaHang}</h2>

                              <time>
                                {new Date(order.thoiGianDat).toLocaleString(
                                  "vi-VN",
                                )}
                              </time>
                            </div>
                          </div>

                          <div className="customer-order-badges">
                            <span
                              className={`customer-order-payment payment-${order.trangThaiThanhToan || "unknown"}`}
                              title={`Trạng thái thanh toán: ${getPaymentLabel(order)}`}
                            >
                              <Banknote size={13} />
                              <span>{getPaymentLabel(order)}</span>
                            </span>
                            <span
                              className={`customer-order-status status-${status.className}`}
                              title={`Trạng thái xử lý: ${status.label}`}
                            >
                              <StatusIcon size={13} />
                              <span>{status.label}</span>
                            </span>
                          </div>
                        </div>

                        <div className="customer-order-card-body">
                          <div className="customer-order-code">
                            <span>Mã đơn</span>
                            <div className="customer-order-code-row">
                              <strong title={`Mã đơn đầy đủ: ${order.maDonHangHienThi}`}>
                                {formatShortOrderCode(order.maDonHangHienThi)}
                              </strong>
                              <button
                                type="button"
                                className="order-code-copy-mini"
                                title="Sao chép mã đơn đầy đủ"
                                aria-label="Sao chép mã đơn"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  void handleCopyCode(order.maDonHangHienThi, order.maDonHang);
                                }}
                              >
                                {copiedId === order.maDonHang ? (
                                  <CheckCircle2 size={13} className="text-emerald-600" />
                                ) : (
                                  <Copy size={13} />
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="customer-order-amount">
                            <span>Thành tiền</span>

                            <strong>{formatMoney(order.thanhTien)}</strong>
                          </div>
                        </div>

                        <footer className="customer-order-card-footer">
                          {canCancel ? (
                            <button
                              type="button"
                              className="customer-order-cancel"
                              onClick={() => openCancelDialog(order)}
                            >
                              Hủy đơn
                            </button>
                          ) : (
                            <span className="customer-order-footer-note">
                              {order.trangThai === "HoanThanh"
                                ? "Đơn hàng đã được giao thành công"
                                : order.trangThai === "DaHuy"
                                  ? "Đơn hàng không còn được xử lý"
                                  : "Đơn hàng đang được xử lý"}
                            </span>
                          )}

                          <Link
                            to={`/don-hang/${order.maDonHang}`}
                            className="customer-order-detail-link"
                          >
                            Xem chi tiết
                            <ArrowRight size={15} />
                          </Link>
                        </footer>
                      </article>
                      </ScrollReveal>
                    );
                  })}
                </div>
              )}

              {totalPages > 1 && (
                <Pagination
                  pageNumber={pageNumber}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  onPageChange={setPageNumber}
                />
              )}
            </>
          )
        )}
      </div>

      {cancelTarget && (
        <div
          className="customer-cancel-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-order-title"
          onMouseDown={closeCancelDialog}
        >
          <section
            className="customer-cancel-dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="customer-cancel-close"
              aria-label="Đóng"
              disabled={cancelBusy}
              onClick={closeCancelDialog}
            >
              <X size={17} />
            </button>

            <span className="customer-cancel-icon">
              <TriangleAlert size={25} />
            </span>

            <h2 id="cancel-order-title">Hủy đơn hàng?</h2>

            <p>
              Bạn đang yêu cầu hủy đơn{" "}
              <strong>{cancelTarget.maDonHangHienThi}</strong> tại{" "}
              {cancelTarget.tenNhaHang}.
            </p>

            {cancelTarget.trangThaiThanhToan === "ThanhCong" &&
              cancelTarget.tenPhuongThuc !== "COD" &&
              cancelTarget.thanhTien > 0 && (
                <p>
                  Số tiền {cancelTarget.thanhTien.toLocaleString("vi-VN")} đ
                  sẽ được hoàn vào ví.
                </p>
              )}

            <label htmlFor="cancel-order-reason">Lý do hủy đơn</label>

            <textarea
              id="cancel-order-reason"
              rows={3}
              maxLength={500}
              autoFocus
              placeholder="Ví dụ: Tôi muốn thay đổi món ăn..."
              value={cancelReason}
              disabled={cancelBusy}
              onChange={(event) => {
                setCancelReason(event.target.value);
                setCancelError("");
              }}
            />

            {cancelError && (
              <p className="customer-cancel-error" role="alert">
                {cancelError}
              </p>
            )}

            <div className="customer-cancel-actions">
              <button
                type="button"
                className="customer-cancel-secondary"
                disabled={cancelBusy}
                onClick={closeCancelDialog}
              >
                Giữ đơn hàng
              </button>

              <button
                type="button"
                className="customer-cancel-confirm"
                disabled={cancelBusy || !cancelReason.trim()}
                onClick={() => void handleConfirmCancel()}
              >
                {cancelBusy ? "Đang hủy..." : "Xác nhận hủy"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default Orders;
