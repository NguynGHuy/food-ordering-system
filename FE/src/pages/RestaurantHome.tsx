import { useCallback, useEffect, useRef, useState } from "react";
import RestaurantSetupProgress from "../components/RestaurantSetupProgress";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Clock3,
  CupSoda,
  FileText,
  PackageX,
  Power,
  ReceiptText,
  RefreshCw,
  Star,
  Store,
  TicketPercent,
  UserRound,
  UtensilsCrossed,
  Volume2,
  VolumeX,
  WalletCards,
} from "lucide-react";
import {
  getRestaurantProfile,
  getMerchantAnalytics,
  type Restaurant,
  type MerchantAnalyticsData,
} from "../services/restaurantService";
import {
  getRestaurantOrders,
  updateOrderStatus,
} from "../services/orderService";
import ScrollReveal from "../components/ScrollReveal";
import RevenueAreaChart from "../components/RevenueAreaChart";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh";

interface RestaurantOrderSummary {
  maDonHang: number;
  maDonHangHienThi: string;
  tenNguoiNhan: string;
  thoiGianDat: string;
  trangThai: string;
  thanhTien: number;
}

const ORDER_STATUS: Record<string, { label: string; className: string }> = {
  ChoXacNhan: { label: "Chờ xác nhận", className: "pending" },
  DaXacNhan: { label: "Đã xác nhận", className: "confirmed" },
  DangChuanBi: { label: "Đang chuẩn bị", className: "preparing" },
  DangGiao: { label: "Đang giao", className: "delivering" },
  HoanThanh: { label: "Hoàn thành", className: "completed" },
  DaHuy: { label: "Đã hủy", className: "cancelled" },
};

const QUICK_ACTIONS = [
  {
    to: "/quan/menu",
    label: "Thực đơn",
    description: "Quản lý món ăn",
    icon: UtensilsCrossed,
  },
  {
    to: "/quan/khuyen-mai",
    label: "Khuyến mãi",
    description: "Quản lý ưu đãi",
    icon: TicketPercent,
  },
  {
    to: "/quan/thong-tin",
    label: "Thông tin quán",
    description: "Cập nhật hồ sơ",
    icon: Store,
  },
  {
    to: "/quan/topping",
    label: "Topping",
    description: "Quản lý lựa chọn thêm",
    icon: CupSoda,
  },
];

const formatMoney = (value: number) =>
  `${Number(value || 0).toLocaleString("vi-VN")} đ`;

const formatShortOrderCode = (code: string) => {
  const normalized = code.trim();
  return normalized.length <= 18
    ? normalized
    : `${normalized.slice(0, 10)}…${normalized.slice(-6)}`;
};

const formatTime = (value?: string | null) =>
  value ? value.slice(0, 5) : "--:--";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

// Chime generator via Web Audio API (zero external sound file dependency)
function playOrderChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.setValueAtTime(880, now + 0.12); // A5

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(1174.66, now + 0.12); // D6 harmonic

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.12);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
    osc2.addEventListener("ended", () => {
      void ctx.close();
    }, { once: true });
  } catch {
    // Audio autoplay restrictions or browser unsupported
  }
}

function QuanHome() {
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [recentOrders, setRecentOrders] = useState<RestaurantOrderSummary[]>([]);
  const [pendingOrders, setPendingOrders] = useState<RestaurantOrderSummary[]>([]);
  const [analytics, setAnalytics] = useState<MerchantAnalyticsData | null>(null);
  const [selectedDays, setSelectedDays] = useState<number>(7);
  const selectedDaysRef = useRef<number>(7);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [error, setError] = useState("");
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  // Sound preference
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem("foodie_merchant_sound") === "true";
  });

  const knownOrderIdsRef = useRef<Set<number>>(new Set());

  const [summary, setSummary] = useState({
    all: 0,
    pending: 0,
    processing: 0,
    completedToday: 0,
    revenueToday: 0,
  });

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [restaurantData, orderData, pendingData, analyticsData] = await Promise.all([
        getRestaurantProfile(),
        getRestaurantOrders<RestaurantOrderSummary>({ pageNumber: 1, pageSize: 5 }),
        getRestaurantOrders<RestaurantOrderSummary>({ pageNumber: 1, pageSize: 6, maTrangThai: 1 }), // 1 = ChoXacNhan
        getMerchantAnalytics(selectedDaysRef.current),
      ]);

      setRestaurant(restaurantData);
      setRecentOrders(orderData.items);
      setPendingOrders(pendingData.items);
      setSummary(orderData.summary);
      setAnalytics(analyticsData);
      selectedDaysRef.current = analyticsData.days;
      setSelectedDays(analyticsData.days);
      setAnalyticsError("");

      // Store known IDs so existing orders don't chime
      const ids = new Set<number>();
      orderData.items.forEach((o) => ids.add(o.maDonHang));
      pendingData.items.forEach((o) => ids.add(o.maDonHang));
      knownOrderIdsRef.current = ids;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được dữ liệu tổng quan.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFilterDays = async (days: number) => {
    if (days === selectedDaysRef.current || chartLoading) return;

    try {
      setChartLoading(true);
      setAnalyticsError("");
      const res = await getMerchantAnalytics(days);
      setAnalytics(res);
      selectedDaysRef.current = res.days;
      setSelectedDays(res.days);
    } catch (err) {
      setAnalyticsError(
        err instanceof Error
          ? err.message
          : "Không thể cập nhật kỳ báo cáo. Vui lòng thử lại.",
      );
    } finally {
      setChartLoading(false);
    }
  };

  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem("foodie_merchant_sound", String(nextVal));
    if (nextVal) {
      playOrderChime();
    }
  };

  const handleQuickConfirm = async (orderId: number) => {
    if (confirmingId !== null) return;
    try {
      setConfirmingId(orderId);
      await updateOrderStatus(orderId, 2); // 2 = DaXacNhan
      // Refresh pending orders and summary immediately
      const [orderData, pendingData] = await Promise.all([
        getRestaurantOrders<RestaurantOrderSummary>({ pageNumber: 1, pageSize: 5 }),
        getRestaurantOrders<RestaurantOrderSummary>({ pageNumber: 1, pageSize: 6, maTrangThai: 1 }),
      ]);
      setRecentOrders(orderData.items);
      setPendingOrders(pendingData.items);
      setSummary(orderData.summary);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Không thể xác nhận đơn hàng.");
    } finally {
      setConfirmingId(null);
    }
  };

  // Listen to new order realtime event
  useEffect(() => {
    const handleNewOrderEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{
        maDonHang?: number;
        maDonHangHienThi?: string;
        tenNguoiNhan?: string;
        thanhTien?: number;
      }>;
      const detail = customEvent.detail;
      if (!detail?.maDonHang) return;

      // Check if new order
      if (!knownOrderIdsRef.current.has(detail.maDonHang)) {
        knownOrderIdsRef.current.add(detail.maDonHang);

        if (soundEnabled) {
          playOrderChime();
        }

      }
    };

    window.addEventListener("restaurant-order-created", handleNewOrderEvent);
    return () => {
      window.removeEventListener("restaurant-order-created", handleNewOrderEvent);
    };
  }, [soundEnabled]);

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(initialLoadTimer);
  }, [loadDashboard]);

  useRealtimeRefresh(["donHang", "nhaHang", "hopDong"], loadDashboard);

  if (loading) {
    return (
      <main className="merchant-live-dashboard">
        <div className="merchant-live-loading">
          <div className="loading-spinner" />
          <p>Đang tải dữ liệu tổng quan...</p>
        </div>
      </main>
    );
  }

  if (error || !restaurant) {
    return (
      <main className="merchant-live-dashboard">
        <div className="merchant-live-error">
          <RefreshCw size={28} />
          <h2>Không tải được tổng quan</h2>
          <p>{error || "Không tìm thấy thông tin nhà hàng."}</p>
          <button type="button" onClick={() => void loadDashboard()}>
            <RefreshCw size={15} /> Thử lại
          </button>
        </div>
      </main>
    );
  }

  const isOpen = Boolean(restaurant.dangMoCua);
  const statusText =
    restaurant.trangThaiHienThi || (isOpen ? "Đang mở cửa" : "Đang đóng cửa");

  const todayLabel = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  const chartPoints = (analytics?.doanhThuTheoNgay ?? []).map((item) => ({
    label: item.ngayNgan,
    fullDate: item.ngay,
    value1: item.tongGiaTriDon,
    value2: item.thuNhapNhaHang,
    count: item.soDonHoanThanh,
  }));

  const alerts = analytics?.canhBao ?? {
    donChoLau: 0,
    monTamNgung: 0,
    voucherSapHetHan: 0,
    hopDongSapHetHan: false,
  };

  const hasAnyAlert =
    alerts.donChoLau > 0 ||
    alerts.monTamNgung > 0 ||
    alerts.voucherSapHetHan > 0 ||
    alerts.hopDongSapHetHan;

  return (
    <main className="merchant-live-dashboard">
      {/* 1. HERO BANNER & STATUS (PRESERVED) */}
      <ScrollReveal className="merchant-live-hero-reveal" delay={40}>
        <header className="merchant-live-hero">
          <div className="merchant-live-welcome">
            <div className="merchant-live-eyebrow-row">
              <span>TRUNG TÂM VẬN HÀNH</span>
              <button
                type="button"
                className={`merchant-sound-toggle ${soundEnabled ? "is-on" : "is-off"}`}
                onClick={handleToggleSound}
                title={soundEnabled ? "Âm báo đơn mới đang BẬT" : "Âm báo đơn mới đang TẮT"}
              >
                {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                <span>{soundEnabled ? "Âm báo: BẬT" : "Âm báo: TẮT"}</span>
              </button>
            </div>
            <h1>
              {getGreeting()}, {restaurant.tenNhaHang}
            </h1>
            <p>
              {todayLabel} · Theo dõi tình hình kinh doanh, tiếp nhận đơn và xử lý vận hành.
            </p>
          </div>

          <button
            type="button"
            className={`merchant-live-status ${isOpen ? "is-open" : "is-closed"}`}
            onClick={() => navigate("/quan/trang-thai")}
          >
            <span className="merchant-live-status-dot" />
            <div>
              <small>Trạng thái quán</small>
              <strong>{statusText}</strong>
            </div>
            <ArrowRight size={17} />
          </button>
        </header>
      </ScrollReveal>

      {restaurant.trangThaiDuyet !== "DaDuyet" && (
        <RestaurantSetupProgress
          key={restaurant.maNhaHang}
          restaurant={restaurant}
        />
      )}

      {/* 2. 4 ALL-TIME KPI CARDS (PRESERVED) */}
      <ScrollReveal className="merchant-live-stats-reveal" delay={80}>
        <section className="merchant-live-stats">
          <article className="stat-pending">
            <span>
              <ReceiptText size={21} />
            </span>
            <div>
              <small>Chờ xác nhận</small>
              <strong>{summary.pending}</strong>
              <p>đơn cần xử lý</p>
            </div>
          </article>

          <article className="stat-processing">
            <span>
              <ChefHat size={21} />
            </span>
            <div>
              <small>Đang xử lý</small>
              <strong>{summary.processing}</strong>
              <p>đơn đang thực hiện</p>
            </div>
          </article>

          <article className="stat-completed">
            <span>
              <CheckCircle2 size={21} />
            </span>
            <div>
              <small>Hoàn thành hôm nay</small>
              <strong>{summary.completedToday}</strong>
              <p>đơn giao thành công</p>
            </div>
          </article>

          <article className="stat-revenue">
            <span>
              <WalletCards size={21} />
            </span>
            <div>
              <small>Doanh thu hôm nay</small>
              <strong>{formatMoney(summary.revenueToday)}</strong>
              <p>từ đơn hoàn thành</p>
            </div>
          </article>
        </section>
      </ScrollReveal>

      {/* 3. KHU VỰC ƯU TIÊN: ĐƠN HÀNG CẦN XỬ LÝ NGAY (CHO XAC NHAN) */}
      <ScrollReveal className="merchant-priority-reveal" delay={110}>
        <section className="merchant-priority-orders">
          <header className="merchant-priority-header">
            <div className="priority-title-wrap">
              <span className="priority-pulse-dot" />
              <div>
                <h2>Đơn hàng cần xử lý ngay</h2>
                <p>Tiếp nhận và chuẩn bị món nhanh chóng để tài xế kịp lấy hàng</p>
              </div>
            </div>
            <span className="priority-count-badge">
              {pendingOrders.length} đơn chờ xác nhận
            </span>
          </header>

          {pendingOrders.length === 0 ? (
            <div className="merchant-priority-empty">
              <CheckCircle2 size={28} className="empty-check-icon" />
              <strong>Không có đơn hàng cần xác nhận</strong>
              <p>Tất cả đơn hàng đã được tiếp nhận. Đơn mới của khách sẽ hiển thị tại đây ngay khi đặt món.</p>
            </div>
          ) : (
            <div className="merchant-priority-grid">
              {pendingOrders.map((order) => (
                <article key={order.maDonHang} className="merchant-priority-card">
                  <div className="priority-card-top">
                    <div>
                      <span
                        className="priority-order-code"
                        title={order.maDonHangHienThi}
                      >
                        {formatShortOrderCode(order.maDonHangHienThi)}
                      </span>
                      <span className="priority-order-time">
                        <Clock3 size={13} />
                        {new Date(order.thoiGianDat).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <strong className="priority-order-money">{formatMoney(order.thanhTien)}</strong>
                  </div>

                  <div className="priority-card-customer">
                    <UserRound size={14} />
                    <span>Khách hàng: <strong>{order.tenNguoiNhan}</strong></span>
                  </div>

                  <div className="priority-card-actions">
                    <button
                      type="button"
                      className="btn-priority-view"
                      onClick={() => navigate(`/quan/don-hang/${order.maDonHang}`)}
                    >
                      Chi tiết
                    </button>
                    <button
                      type="button"
                      className="btn-priority-confirm"
                      disabled={confirmingId === order.maDonHang}
                      onClick={() => void handleQuickConfirm(order.maDonHang)}
                    >
                      {confirmingId === order.maDonHang ? (
                        <>
                          <RefreshCw size={14} className="spin-icon" />
                          Đang nhận...
                        </>
                      ) : (
                        <>
                          <Check size={15} />
                          Nhận đơn ngay
                        </>
                      )}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </ScrollReveal>

      {/* 4. BIỂU ĐỒ DOANH THU 7 NGÀY / 30 NGÀY */}
      <ScrollReveal className="merchant-chart-reveal" delay={130}>
        <section className="merchant-chart-section">
          <header className="merchant-chart-header">
            <div>
              <span>Hiệu quả kinh doanh</span>
              <h2>Biểu đồ doanh thu hoàn thành</h2>
              <p>Kỳ báo cáo: {analytics?.rangeLabel || "Đang tải..."}</p>
            </div>

            <div className="merchant-chart-controls">
              <div className="merchant-chart-totals">
                <div>
                  <small>Tổng đơn bán</small>
                  <strong>{formatMoney(analytics?.tongGiaTriDonKyNay ?? 0)}</strong>
                </div>
                <div className="divider" />
                <div>
                  <small>Thu nhập thực nhận</small>
                  <strong className="merchant-net-income">
                    {formatMoney(analytics?.tongThuNhapKyNay ?? 0)}
                  </strong>
                </div>
              </div>

              <div className="merchant-days-filter">
                {[
                  { label: "7 ngày qua", days: 7 },
                  { label: "30 ngày qua", days: 30 },
                ].map((pill) => (
                  <button
                    key={pill.days}
                    type="button"
                    className={`time-pill ${selectedDays === pill.days ? "is-active" : ""}`}
                    onClick={() => void handleFilterDays(pill.days)}
                    disabled={chartLoading}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          {analyticsError && (
            <p className="dashboard-analytics-error" role="alert">
              {analyticsError}
            </p>
          )}

          <div className="merchant-chart-body">
            {chartLoading ? (
              <div className="merchant-chart-loading" style={{ height: 240 }}>
                <RefreshCw size={20} className="spin-icon" />
                <span>Đang cập nhật biểu đồ...</span>
              </div>
            ) : (
              <RevenueAreaChart
                data={chartPoints}
                series1Name="Tổng giá trị đơn khách trả"
                series2Name="Thu nhập thực nhận của quán"
                series1Color="#f4511e"
                series2Color="#10b981"
                height={240}
              />
            )}
            <p className="merchant-chart-caption">
              * Thu nhập thực nhận của nhà hàng được tính sau khi đã trừ tỷ lệ phí dịch vụ nền tảng theo hợp đồng kinh doanh. Tiền được cộng vào ví Foodie ngay sau khi đơn giao thành công.
            </p>
          </div>
        </section>
      </ScrollReveal>

      {/* 5. CẢNH BÁO VẬN HÀNH & ĐÁNH GIÁ GẦN ĐÂY */}
      <div className="merchant-operational-grid">
        {/* Cảnh báo vận hành */}
        <section className="merchant-card-panel merchant-alerts-panel">
          <header className="merchant-card-header">
            <div>
              <span>Giám sát hoạt động</span>
              <h2>Cảnh báo vận hành</h2>
            </div>
            {hasAnyAlert ? (
              <span className="alert-badge has-issues">
                <AlertTriangle size={13} /> Cần chú ý
              </span>
            ) : (
              <span className="alert-badge normal">
                <CheckCircle2 size={13} /> Bình thường
              </span>
            )}
          </header>

          <div className="merchant-alerts-list">
            {alerts.donChoLau > 0 && (
              <div className="alert-item is-warning" onClick={() => navigate("/quan/don-hang?maTrangThai=1")}>
                <Clock3 size={18} />
                <div className="alert-text">
                  <strong>{alerts.donChoLau} đơn chờ quá 15 phút chưa xác nhận</strong>
                  <p>Hãy kiểm tra và xác nhận ngay để khách không hủy đơn.</p>
                </div>
                <ArrowRight size={15} />
              </div>
            )}

            {alerts.monTamNgung > 0 && (
              <div className="alert-item" onClick={() => navigate("/quan/menu")}>
                <PackageX size={18} />
                <div className="alert-text">
                  <strong>{alerts.monTamNgung} món đang tạm ngừng bán</strong>
                  <p>Món ăn bị ẩn khỏi thực đơn do hết nguyên liệu hoặc tạm tắt.</p>
                </div>
                <ArrowRight size={15} />
              </div>
            )}

            {alerts.voucherSapHetHan > 0 && (
              <div className="alert-item" onClick={() => navigate("/quan/khuyen-mai")}>
                <TicketPercent size={18} />
                <div className="alert-text">
                  <strong>{alerts.voucherSapHetHan} chương trình ưu đãi sắp hết hạn (3 ngày)</strong>
                  <p>Gia hạn hoặc tạo mới voucher để giữ chân khách hàng quen.</p>
                </div>
                <ArrowRight size={15} />
              </div>
            )}

            {alerts.hopDongSapHetHan && (
              <div className="alert-item is-warning" onClick={() => navigate("/quan/hop-dong")}>
                <FileText size={18} />
                <div className="alert-text">
                  <strong>Hợp đồng quán sắp hết hạn vào {alerts.ngayHetHanHopDong || "30 ngày tới"}</strong>
                  <p>Liên hệ quản trị viên hoặc chuẩn bị gia hạn hợp đồng mới.</p>
                </div>
                <ArrowRight size={15} />
              </div>
            )}

            {!hasAnyAlert && (
              <div className="merchant-alerts-empty">
                <CheckCircle2 size={26} />
                <strong>Mọi hoạt động kinh doanh đều ổn định</strong>
                <p>Không có món tạm ngưng, không có đơn chờ quá hạn và hợp đồng còn thời hạn dài.</p>
              </div>
            )}
          </div>
        </section>

        {/* Đánh giá khách hàng gần đây */}
        <section className="merchant-card-panel merchant-reviews-panel">
          <header className="merchant-card-header">
            <div>
              <span>Phản hồi khách hàng</span>
              <h2>Đánh giá gần đây</h2>
            </div>
            <div className="restaurant-rating-pill">
              <Star size={14} className="star-filled" />
              <strong>{Number(restaurant.danhGiaTrungBinh || 0).toFixed(1)}</strong>
            </div>
          </header>

          <div className="merchant-reviews-list">
            {(analytics?.danhGiaMoiNhat ?? []).length === 0 ? (
              <div className="merchant-reviews-empty">
                <Star size={26} />
                <strong>Chưa có đánh giá nào gần đây</strong>
                <p>Nhận xét và số sao của khách hàng sau khi nhận món sẽ xuất hiện tại đây.</p>
              </div>
            ) : (
              (analytics?.danhGiaMoiNhat ?? []).map((review) => (
                <article key={review.maDanhGia} className="merchant-review-item">
                  <div className="review-item-header">
                    <div className="review-customer-info">
                      <strong>{review.tenKhachHang || "Khách hàng"}</strong>
                      {review.maDonHangHienThi && (
                        <small>Đơn: {review.maDonHangHienThi}</small>
                      )}
                    </div>
                    <div className="review-stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={13}
                          className={i < review.soSao ? "star-active" : "star-inactive"}
                        />
                      ))}
                    </div>
                  </div>
                  {review.noiDung && (
                    <p className="review-comment">"{review.noiDung}"</p>
                  )}
                  <time className="review-time">
                    {new Date(review.ngayDanhGia).toLocaleString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      {/* 6. RECENT ORDERS & QUICK ACTIONS (PRESERVED) */}
      <ScrollReveal className="merchant-live-layout-reveal" delay={160}>
        <div className="merchant-live-layout">
          <section className="merchant-recent-orders">
            <header>
              <div>
                <h2>Đơn hàng gần đây</h2>
                <p>Các đơn mới nhất tại nhà hàng</p>
              </div>
              <button type="button" onClick={() => navigate("/quan/don-hang")}>
                Xem tất cả <ArrowRight size={14} />
              </button>
            </header>

            {recentOrders.length === 0 ? (
              <div className="merchant-recent-empty">
                <ClipboardList size={27} />
                <strong>Chưa có đơn hàng</strong>
                <p>Đơn mới của khách sẽ xuất hiện tại đây.</p>
              </div>
            ) : (
              <div className="merchant-recent-list">
                {recentOrders.map((order) => {
                  const status = ORDER_STATUS[order.trangThai] || {
                    label: order.trangThai,
                    className: "default",
                  };

                  return (
                    <button
                      key={order.maDonHang}
                      type="button"
                      onClick={() =>
                        navigate(`/quan/don-hang/${order.maDonHang}`)
                      }
                    >
                      <span className="merchant-recent-icon">
                        <ReceiptText size={17} />
                      </span>

                      <div className="merchant-recent-main">
                        <strong>{order.maDonHangHienThi}</strong>
                        <span>
                          <UserRound size={12} />
                          {order.tenNguoiNhan}
                        </span>
                      </div>

                      <time>
                        {new Date(order.thoiGianDat).toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </time>

                      <div className="merchant-recent-money">
                        <strong>{formatMoney(order.thanhTien)}</strong>
                        <span className={`status-${status.className}`}>
                          {status.label}
                        </span>
                      </div>

                      <ArrowRight className="merchant-recent-arrow" size={16} />
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="merchant-live-side">
            <section
              className={`merchant-live-operation ${isOpen ? "is-open" : "is-closed"}`}
            >
              <div className="merchant-operation-heading">
                <span>
                  <Power size={21} />
                </span>
                <div>
                  <small>Vận hành nhà hàng</small>
                  <h2>{statusText}</h2>
                </div>
              </div>

              <p>
                {isOpen
                  ? "Nhà hàng đang hiển thị và có thể tiếp nhận đơn hàng mới."
                  : "Nhà hàng hiện không tiếp nhận đơn hàng mới từ khách."}
              </p>

              <div className="merchant-operation-hours">
                <Clock3 size={16} />
                <div>
                  <small>Giờ hoạt động</small>
                  <strong>
                    {formatTime(restaurant.gioMoCua)} –{" "}
                    {formatTime(restaurant.gioDongCua)}
                  </strong>
                </div>
              </div>

              <button type="button" onClick={() => navigate("/quan/trang-thai")}>
                Quản lý trạng thái <ArrowRight size={14} />
              </button>
            </section>

            <section className="merchant-live-quick">
              <header>
                <h2>Truy cập nhanh</h2>
              </header>
              <div>
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.to}
                      type="button"
                      onClick={() => navigate(action.to)}
                    >
                      <span>
                        <Icon size={17} />
                      </span>
                      <div>
                        <strong>{action.label}</strong>
                        <small>{action.description}</small>
                      </div>
                      <ArrowRight size={14} />
                    </button>
                  );
                })}
              </div>
            </section>
          </aside>
        </div>
      </ScrollReveal>
    </main>
  );
}

export default QuanHome;
