import { useCallback, useEffect, useState } from "react";
import RestaurantSetupProgress from "../components/RestaurantSetupProgress";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Clock3,
  CupSoda,
  Power,
  ReceiptText,
  RefreshCw,
  Store,
  TicketPercent,
  UserRound,
  UtensilsCrossed,
  WalletCards,
} from "lucide-react";
import {
  getRestaurantProfile,
  type Restaurant,
} from "../services/restaurantService";
import { getRestaurantOrders } from "../services/orderService";
import ScrollReveal from "../components/ScrollReveal";
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

const formatTime = (value?: string | null) =>
  value ? value.slice(0, 5) : "--:--";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

function QuanHome() {
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<RestaurantOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

      const [restaurantData, orderData] = await Promise.all([
        getRestaurantProfile(),
        getRestaurantOrders<RestaurantOrderSummary>({ pageNumber: 1, pageSize: 5 }),
      ]);

      setRestaurant(restaurantData);
      setOrders(orderData.items);
      setSummary(orderData.summary);
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
  const recentOrders = orders;

  const todayLabel = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  return (
    <main className="merchant-live-dashboard">
      <ScrollReveal className="merchant-live-hero-reveal" delay={40}>
        <header className="merchant-live-hero">
        <div className="merchant-live-welcome">
          <span>TRUNG TÂM VẬN HÀNH</span>
          <h1>
            {getGreeting()}, {restaurant.tenNhaHang}
          </h1>
          <p>
            {todayLabel} · Theo dõi tình hình kinh doanh và các đơn cần xử lý.
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

      <ScrollReveal className="merchant-live-stats-reveal" delay={100}>
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

      <ScrollReveal className="merchant-live-layout-reveal" delay={130}>
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
