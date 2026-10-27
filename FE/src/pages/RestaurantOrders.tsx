import { useCallback, useEffect, useMemo, useState } from "react";

import { Link, useSearchParams } from "react-router-dom";

import {
  ArrowRight,
  Banknote,
  BadgeCheck,
  CheckCircle2,
  ChefHat,
  CircleX,
  ClipboardList,
  Clock3,
  PackageOpen,
  RefreshCw,
  Truck,
  UserRound,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

import {
  getOrderStatuses,
  getRestaurantOrders,
} from "../services/orderService";
import ScrollReveal from "../components/ScrollReveal";
import Pagination from "../components/Pagination";

interface OrderStatus {
  maTrangThai: number;
  tenTrangThai: string;
}

interface RestaurantOrderSummary {
  maDonHang: number;
  maDonHangHienThi: string;
  tenNguoiNhan: string;
  thoiGianDat: string;
  trangThai: string;
  thanhTien: number;
  tenPhuongThuc?: string | null;
  trangThaiThanhToan?: string | null;
}

interface StatusMeta {
  label: string;
  className: string;
  icon: LucideIcon;
}

const STATUS_META: Record<string, StatusMeta> = {
  ChoXacNhan: {
    label: "Chờ xác nhận",
    className: "pending",
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

function getStatusMeta(status: string): StatusMeta {
  return (
    STATUS_META[status] ?? {
      label: status || "Không xác định",
      className: "default",
      icon: Clock3,
    }
  );
}

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

function formatOrderTime(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

function getPaymentMeta(order: RestaurantOrderSummary) {
  if (order.tenPhuongThuc?.toUpperCase() === "COD") {
    return {
      label: order.trangThaiThanhToan === "ThanhCong"
        ? "COD · Đã thu tiền"
        : "COD · Thu khi giao",
      className: order.trangThaiThanhToan === "ThanhCong" ? "paid" : "cod",
    };
  }

  if (order.trangThaiThanhToan === "ThanhCong") {
    return { label: `${order.tenPhuongThuc || "Online"} · Đã thanh toán`, className: "paid" };
  }

  if (order.trangThaiThanhToan === "ThatBai") {
    return { label: `${order.tenPhuongThuc || "Online"} · Thất bại`, className: "failed" };
  }

  return { label: `${order.tenPhuongThuc || "Online"} · Chờ thanh toán`, className: "pending" };
}

function RestaurantOrders() {
  const PAGE_SIZE = 10;
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<RestaurantOrderSummary[]>([]);

  const [statuses, setStatuses] = useState<OrderStatus[]>([]);

  const [selectedStatus, setSelectedStatus] = useState<number | null>(() => {
    const value = Number(searchParams.get("maTrangThai"));
    return Number.isInteger(value) && value > 0 ? value : null;
  });
  const [pageNumber, setPageNumber] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    getOrderStatuses()
      .then((data) => {
        if (!cancelled) {
          setStatuses(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatuses([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);
  const loadOrders = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true);
        }

        setError("");

        const data = await getRestaurantOrders<RestaurantOrderSummary>({
          pageNumber,
          pageSize: PAGE_SIZE,
          maTrangThai: selectedStatus ?? undefined,
        });

        setOrders(data.items);
        setTotalItems(data.totalItems);
        setTotalPages(data.totalPages);
        if (data.pageNumber !== pageNumber) setPageNumber(data.pageNumber);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Không tải được đơn hàng.",
        );

        // Khi tải lần đầu bị lỗi thì xóa danh sách.
        // Nếu chỉ làm mới realtime bị lỗi,
        // giữ lại danh sách đang hiển thị.
        if (showLoading) {
          setOrders([]);
        }
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [pageNumber, selectedStatus],
  );

  useEffect(() => {
    const handleRealtimeUpdate = () => {
      // Cập nhật ngầm, không làm cả trang
      // quay lại trạng thái loading.
      void loadOrders(false);
    };

    const initialLoadTimer = window.setTimeout(() => {
      void loadOrders(true);
    }, 0);

    window.addEventListener("restaurant-orders-updated", handleRealtimeUpdate);

    return () => {
      window.clearTimeout(initialLoadTimer);
      window.removeEventListener(
        "restaurant-orders-updated",
        handleRealtimeUpdate,
      );
    };
  }, [loadOrders]);

  const currentFilterLabel = useMemo(() => {
    if (selectedStatus === null) {
      return "Tất cả đơn hàng";
    }

    const selected = statuses.find(
      (status) => status.maTrangThai === selectedStatus,
    );

    if (!selected) {
      return "Đơn hàng đã lọc";
    }

    return getStatusMeta(selected.tenTrangThai).label;
  }, [selectedStatus, statuses]);

  return (
    <main className="quan-orders merchant-orders-page">
      <ScrollReveal className="merchant-orders-header-reveal" delay={40}>
        <header className="merchant-orders-header">
        <div className="merchant-orders-heading">
          <span className="merchant-orders-heading-icon">
            <ClipboardList size={22} />
          </span>

          <div>
            <span>Quản lý vận hành</span>
            <h1>Đơn hàng của quán</h1>

            <p>Theo dõi và xử lý các đơn khách đã đặt tại nhà hàng.</p>
          </div>
        </div>

        <div className="merchant-orders-count">
          <strong>{loading ? "—" : totalItems}</strong>

          <span>đơn đang hiển thị</span>
        </div>
        </header>
      </ScrollReveal>

      <ScrollReveal className="merchant-orders-filter-reveal" delay={100}>
        <section className="merchant-order-filter-section">
        <div className="merchant-order-filter-heading">
          <div>
            <strong>Lọc theo trạng thái</strong>
            <span>{currentFilterLabel}</span>
          </div>

          <button
            type="button"
            className="merchant-orders-refresh"
            disabled={loading}
            onClick={() => void loadOrders()}
          >
            <RefreshCw size={14} className={loading ? "is-spinning" : ""} />
            Làm mới
          </button>
        </div>

        <nav
          className="merchant-order-tabs"
          aria-label="Lọc đơn hàng theo trạng thái"
        >
          <button
            type="button"
            className={`merchant-order-tab tab-all ${
              selectedStatus === null ? "is-active" : ""
            }`}
            onClick={() => {
              setSelectedStatus(null);
              setPageNumber(1);
            }}
          >
            <ClipboardList size={14} />
            Tất cả
          </button>

          {statuses.map((status) => {
            const meta = getStatusMeta(status.tenTrangThai);

            const StatusIcon = meta.icon;

            return (
              <button
                key={status.maTrangThai}
                type="button"
                className={`merchant-order-tab tab-${meta.className} ${
                  selectedStatus === status.maTrangThai ? "is-active" : ""
                }`}
                onClick={() => {
                  setSelectedStatus(status.maTrangThai);
                  setPageNumber(1);
                }}
              >
                <StatusIcon size={14} />
                {meta.label}
              </button>
            );
          })}
        </nav>
        </section>
      </ScrollReveal>

      {loading ? (
        <section className="merchant-orders-loading">
          <div className="loading-spinner" />

          <p>Đang tải đơn hàng...</p>
        </section>
      ) : error ? (
        <section className="merchant-orders-error">
          <CircleX size={25} />

          <h2>Không tải được đơn hàng</h2>
          <p>{error}</p>

          <button type="button" onClick={() => void loadOrders()}>
            <RefreshCw size={15} />
            Thử lại
          </button>
        </section>
      ) : orders.length === 0 ? (
        <section className="merchant-orders-empty">
          <span>
            <PackageOpen size={28} />
          </span>

          <h2>Chưa có đơn hàng</h2>

          <p>Hiện chưa có đơn nào thuộc trạng thái “{currentFilterLabel}”.</p>

          {selectedStatus !== null && (
            <button type="button" onClick={() => {
              setSelectedStatus(null);
              setPageNumber(1);
            }}>
              Xem tất cả đơn hàng
            </button>
          )}
        </section>
      ) : (
        <>
        <section className="merchant-order-list">
          {orders.map((order, index) => {
            const status = getStatusMeta(order.trangThai);
            const payment = getPaymentMeta(order);

            const StatusIcon = status.icon;

            return (
              <ScrollReveal
                key={order.maDonHang}
                className="merchant-order-card-reveal"
                delay={Math.min(index, 8) * 75}
              >
                <Link
                  to={`/quan/don-hang/${order.maDonHang}`}
                  className={`merchant-order-card order-${status.className}`}
                  aria-label={`Xem chi tiết đơn ${order.maDonHangHienThi}`}
                >
                  <div className="merchant-order-status-mark">
                    <StatusIcon size={18} />
                  </div>

                  <div className="merchant-order-primary">
                    <div className="merchant-order-code-row">
                      <strong>{order.maDonHangHienThi}</strong>

                      <span
                        className={`merchant-order-status status-${status.className}`}
                      >
                        <StatusIcon size={13} />

                        {status.label}
                      </span>
                    </div>

                    <div className="merchant-order-customer">
                      <UserRound size={13} />

                      <span>{order.tenNguoiNhan}</span>
                    </div>

                    <time>
                      <Clock3 size={12} />

                      {formatOrderTime(order.thoiGianDat)}
                    </time>

                    <span className={`merchant-order-payment payment-${payment.className}`}>
                      <Banknote size={12} />
                      {payment.label}
                    </span>
                  </div>

                  <div className="merchant-order-price">
                    <span>Thành tiền</span>

                    <strong>{formatMoney(order.thanhTien)}</strong>
                  </div>

                  <div className="merchant-order-open">
                    <span>Xem đơn</span>
                    <ArrowRight size={16} />
                  </div>
                </Link>
              </ScrollReveal>
            );
          })}
        </section>
        {totalPages > 1 && (
          <Pagination
            pageNumber={pageNumber}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={setPageNumber}
          />
        )}
        </>
      )}
    </main>
  );
}

export default RestaurantOrders;
