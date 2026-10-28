import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Banknote,
  Check,
  CircleX,
  Clock3,
  History,
  MapPin,
  MessageSquareText,
  Phone,
  ReceiptText,
  Store,
  UserRound,
  UtensilsCrossed,
} from "lucide-react";
import {
  cancelOrder,
  getOrderById,
  getOrderStatusHistory,
  updateOrderStatus,
} from "../services/orderService";
import type {
  OrderDetails,
  OrderStatusHistory,
} from "../services/orderService";

const FLOW = [
  { code: "ChoXacNhan", label: "Chờ xác nhận" },
  { code: "DaXacNhan", label: "Đã xác nhận" },
  { code: "DangChuanBi", label: "Đang chuẩn bị" },
  { code: "DangGiao", label: "Đang giao" },
  { code: "HoanThanh", label: "Hoàn thành" },
];

const STATUS_LABEL: Record<string, string> = {
  ChoXacNhan: "Chờ xác nhận",
  DaXacNhan: "Đã xác nhận",
  DangChuanBi: "Đang chuẩn bị",
  DangGiao: "Đang giao",
  HoanThanh: "Hoàn thành",
  DaHuy: "Đã hủy",
};

const STATUS_CLASS: Record<string, string> = {
  ChoXacNhan: "pending",
  DaXacNhan: "confirmed",
  DangChuanBi: "preparing",
  DangGiao: "delivering",
  HoanThanh: "completed",
  DaHuy: "cancelled",
};

const NEXT_STEP: Record<string, { id: number; label: string }> = {
  ChoXacNhan: { id: 2, label: "Xác nhận đơn" },
  DaXacNhan: { id: 3, label: "Bắt đầu chuẩn bị" },
  DangChuanBi: { id: 4, label: "Bắt đầu giao" },
  DangGiao: { id: 5, label: "Hoàn thành đơn" },
};

const formatMoney = (value: number) =>
  `${Number(value || 0).toLocaleString("vi-VN")} đ`;

function RestaurantOrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [history, setHistory] = useState<OrderStatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (maDonHang: number) => {
    const [orderData, historyData] = await Promise.all([
      getOrderById(maDonHang),
      getOrderStatusHistory(maDonHang),
    ]);

    setOrder(orderData);
    setHistory(Array.isArray(historyData) ? historyData : []);
  }, []);

  useEffect(() => {
    const maDonHang = Number(id);

    if (!id || !Number.isInteger(maDonHang) || maDonHang <= 0) {
      const invalidOrderTimer = window.setTimeout(() => {
        setError("Mã đơn hàng không hợp lệ.");
        setLoading(false);
      }, 0);
      return () => window.clearTimeout(invalidOrderTimer);
    }

    let cancelled = false;

    const run = async (showFullLoading = true) => {
      try {
        if (showFullLoading) {
          setLoading(true);
        }

        const [orderData, historyData] = await Promise.all([
          getOrderById(maDonHang),
          getOrderStatusHistory(maDonHang),
        ]);

        if (cancelled) return;

        setOrder(orderData);
        setHistory(Array.isArray(historyData) ? historyData : []);
        setError("");
      } catch (err) {
        if (cancelled || !showFullLoading) return;

        setError(
          err instanceof Error ? err.message : "Không tải được đơn hàng.",
        );
        setOrder(null);
        setHistory([]);
      } finally {
        if (!cancelled && showFullLoading) {
          setLoading(false);
        }
      }
    };

    const handleRealtimeUpdate = () => {
      void run(false);
    };

    void run();

    window.addEventListener("restaurant-orders-updated", handleRealtimeUpdate);

    return () => {
      cancelled = true;

      window.removeEventListener(
        "restaurant-orders-updated",
        handleRealtimeUpdate,
      );
    };
  }, [id]);

  const handleAdvance = async () => {
    if (!order) return;
    const nextStep = NEXT_STEP[order.trangThai];
    if (!nextStep) return;

    try {
      setBusy(true);
      await updateOrderStatus(order.maDonHang, nextStep.id);
      await load(order.maDonHang);
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Không cập nhật được trạng thái.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    const seHoan =
      order.trangThaiThanhToan === "ThanhCong" &&
      !order.tenPhuongThuc?.toUpperCase().includes("COD") &&
      order.thanhTien > 0;
    const reason = window.prompt(
      seHoan
        ? `Hủy đơn sẽ hoàn ${order.thanhTien.toLocaleString("vi-VN")} đ vào ví khách. Nhập lý do hủy:`
        : "Nhập lý do hủy đơn hàng:",
    );
    if (!reason?.trim()) return;

    try {
      setBusy(true);
      await cancelOrder(order.maDonHang, reason.trim());
      await load(order.maDonHang);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Không thể hủy đơn lúc này.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="merchant-detail-page">
        <div className="loading-spinner" style={{ margin: "100px auto" }} />
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="merchant-detail-page">
        <Link to="/quan/don-hang" className="merchant-detail-back">
          <ArrowLeft size={16} /> Danh sách đơn
        </Link>
        <div className="merchant-detail-empty">
          {error || "Không tìm thấy đơn hàng."}
        </div>
      </main>
    );
  }

  const currentIndex = FLOW.findIndex((step) => step.code === order.trangThai);
  const next = NEXT_STEP[order.trangThai];
  const canCancel = ["ChoXacNhan", "DaXacNhan"].includes(order.trangThai);
  const statusClass = STATUS_CLASS[order.trangThai] || "default";
  const isCod = order.tenPhuongThuc?.toUpperCase().includes("COD") ?? false;
  const paymentReady = isCod || order.trangThaiThanhToan === "ThanhCong";
  const paymentLabel = isCod
    ? order.trangThaiThanhToan === "ThanhCong"
      ? "COD đã thu tiền"
      : "COD • Cần thu khi giao"
    : order.trangThaiThanhToan === "ThanhCong"
      ? "Đã thanh toán online"
      : order.trangThaiThanhToan === "ThatBai"
        ? "Thanh toán thất bại"
        : "Chờ khách thanh toán";

  return (
    <main className="merchant-detail-page">
      <Link to="/quan/don-hang" className="merchant-detail-back">
        <ArrowLeft size={16} /> Danh sách đơn hàng
      </Link>

      <article className="merchant-detail-shell">
        <header className={`merchant-detail-hero status-${statusClass}`}>
          <div className="merchant-detail-hero-top">
            <div>
              <span className="merchant-detail-eyebrow">Chi tiết đơn hàng</span>
              <div className="merchant-detail-title">
                <h1>{order.maDonHangHienThi}</h1>
                <span
                  className={`merchant-detail-status status-${statusClass}`}
                >
                  {STATUS_LABEL[order.trangThai] || order.trangThai}
                </span>
              </div>
              <div className="merchant-detail-meta">
                <span>
                  <Store size={14} />
                  {order.tenNhaHang}
                </span>
                <span>
                  <Clock3 size={14} />
                  {new Date(order.thoiGianDat).toLocaleString("vi-VN")}
                </span>
              </div>
            </div>

            {(next || canCancel) && (
              <div className="merchant-detail-actions">
                {canCancel && (
                  <button
                    className="merchant-detail-cancel"
                    onClick={handleCancel}
                    disabled={busy}
                  >
                    <CircleX size={15} /> Hủy đơn
                  </button>
                )}
                {next && paymentReady && (
                  <button
                    className="merchant-detail-advance"
                    onClick={handleAdvance}
                    disabled={busy}
                  >
                    <Check size={15} />
                    {busy ? "Đang xử lý..." : next.label}
                  </button>
                )}
              </div>
            )}
          </div>

          {order.trangThai === "DaHuy" ? (
            <div className="merchant-detail-cancelled">
              <CircleX size={19} />
              <div>
                <strong>Đơn hàng đã bị hủy</strong>
                <p>Đơn không còn được tiếp tục xử lý.</p>
              </div>
            </div>
          ) : (
            <ol className="merchant-detail-progress">
              {FLOW.map((step, index) => {
                const reached = currentIndex >= 0 && index <= currentIndex;
                const current = index === currentIndex;
                return (
                  <li
                    key={step.code}
                    className={`${reached ? "reached" : ""} ${current ? "current" : ""}`}
                  >
                    <span>{reached ? <Check size={12} /> : index + 1}</span>
                    <small>{step.label}</small>
                  </li>
                );
              })}
            </ol>
          )}
        </header>

        <div className="merchant-detail-layout">
          <div className="merchant-detail-main">
            <section className="merchant-detail-card">
              <div className="merchant-detail-card-title">
                <UtensilsCrossed size={17} />
                <div>
                  <h2>Món khách đã đặt</h2>
                  <p>{order.chiTiet?.length || 0} dòng món</p>
                </div>
              </div>

              <div className="merchant-detail-items">
                {(order.chiTiet || []).map((ct, index) => (
                  <article
                    key={`${ct.maMonAn}-${index}`}
                    className="merchant-detail-item"
                  >
                    <span className="merchant-detail-item-number">
                      {index + 1}
                    </span>
                    <div>
                      <h3>
                        {ct.tenMonAn} <small>x{ct.soLuong}</small>
                      </h3>
                      {(ct.toppings || []).length > 0 && (
                        <div className="merchant-detail-toppings">
                          {(ct.toppings || []).map((tp, tpIndex) => (
                            <span key={`${tp.tenTopping}-${tpIndex}`}>
                              + {tp.tenTopping}
                              {tp.soLuong > 1 ? ` x${tp.soLuong}` : ""}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <strong>{formatMoney(ct.thanhTien)}</strong>
                  </article>
                ))}
              </div>
            </section>

            <section className="merchant-detail-card">
              <div className="merchant-detail-card-title">
                <MapPin size={17} />
                <div>
                  <h2>Thông tin giao hàng</h2>
                  <p>Người nhận và địa chỉ giao món</p>
                </div>
              </div>

              <div className="merchant-delivery-info">
                <div>
                  <UserRound size={15} />
                  <span>
                    <small>Người nhận</small>
                    <strong>{order.tenNguoiNhan}</strong>
                  </span>
                </div>
                <div>
                  <Phone size={15} />
                  <span>
                    <small>Số điện thoại</small>
                    <strong>{order.soDienThoaiNhan}</strong>
                  </span>
                </div>
                <div className="merchant-delivery-address">
                  <MapPin size={15} />
                  <p>{order.diaChiGiaoHang}</p>
                </div>
                {order.ghiChu && (
                  <div className="merchant-delivery-note">
                    <MessageSquareText size={15} />
                    <p>{order.ghiChu}</p>
                  </div>
                )}
              </div>
            </section>

            <section className="merchant-detail-card">
              <div className="merchant-detail-card-title">
                <History size={17} />
                <div>
                  <h2>Lịch sử trạng thái</h2>
                  <p>Các bước xử lý đơn hàng</p>
                </div>
              </div>

              {history.length === 0 ? (
                <p className="merchant-history-empty">
                  Chưa có lịch sử trạng thái.
                </p>
              ) : (
                <ul className="merchant-detail-history">
                  {[...history].reverse().map((item, index) => (
                    <li
                      key={item.maLichSu}
                      className={index === 0 ? "latest" : ""}
                    >
                      <span>{index === 0 && <Check size={11} />}</span>
                      <div>
                        <strong>
                          {STATUS_LABEL[item.tenTrangThai] || item.tenTrangThai}
                        </strong>
                        <time>
                          {new Date(item.thoiGianTao).toLocaleString("vi-VN")}
                        </time>
                        <p>
                          Người thực hiện: {item.maTaiKhoan != null
                            ? `Tài khoản #${item.maTaiKhoan}`
                            : "Không có thông tin tài khoản"}
                        </p>
                        {item.ghiChu && <p>{item.ghiChu}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="merchant-detail-summary">
            <section className="merchant-detail-card">
              <div className="merchant-detail-card-title">
                <ReceiptText size={17} />
                <div>
                  <h2>Thanh toán</h2>
                  <p>Chi tiết giá trị đơn hàng</p>
                </div>
              </div>

              <div className="merchant-detail-money">
                <div className={`merchant-payment-state state-${order.trangThaiThanhToan || "unknown"}`}>
                  <Banknote size={17} />
                  <span>Trạng thái thanh toán</span>
                  <strong>{paymentLabel}</strong>
                  <small>{order.tenPhuongThuc || "Chưa xác định phương thức"}</small>
                </div>
                <div>
                  <span>Tổng tiền món</span>
                  <strong>{formatMoney(order.tongTienHang)}</strong>
                </div>
                <div>
                  <span>Phí giao hàng</span>
                  <strong>{formatMoney(order.phiShip)}</strong>
                </div>
                <div className="discount">
                  <span>Giảm giá</span>
                  <strong>-{formatMoney(order.soTienGiam)}</strong>
                </div>
                <div className="total">
                  <span>Thành tiền</span>
                  <strong>{formatMoney(order.thanhTien)}</strong>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </article>
    </main>
  );
}

export default RestaurantOrderDetail;
