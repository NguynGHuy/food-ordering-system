import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    AlertTriangle,
    ArrowRight,
    Building2,
    Calendar,
    CheckCircle2,
    Clock3,
    FileText,
    MapPin,
    RefreshCw,
    Scale,
    ShieldCheck,
    ShoppingBag,
    Star,
    TicketPercent,
    TrendingUp,
    UsersRound,
    WalletCards,
} from "lucide-react";
import {
    getAdminAccounts,
    getAdminAnalytics,
    getAdminOverview,
    getPendingRestaurants,
    getTopRestaurants,
    type AdminAnalyticsData,
    type AdminOverview,
    type TopRestaurant,
} from "../services/adminService";
import RevenueAreaChart from "../components/RevenueAreaChart";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh";

interface DashboardData {
    overview: AdminOverview;
    accountCount: number;
    pendingCount: number;
    topRestaurants: TopRestaurant[];
}

const STATUS_COLOR_MAP: Record<string, { label: string; color: string; bg: string; text: string }> = {
    ChoXacNhan: { label: "Chờ xác nhận", color: "#f59e0b", bg: "#fff8e6", text: "#b45309" },
    DaXacNhan: { label: "Đã xác nhận", color: "#3b82f6", bg: "#eff6ff", text: "#1d4ed8" },
    DangChuanBi: { label: "Đang chuẩn bị", color: "#8b5cf6", bg: "#f5f3ff", text: "#6d28d9" },
    DangGiao: { label: "Đang giao", color: "#06b6d4", bg: "#ecfeff", text: "#0e7490" },
    HoanThanh: { label: "Hoàn thành", color: "#10b981", bg: "#f0fdf4", text: "#15803d" },
    DaHuy: { label: "Đã hủy", color: "#ef4444", bg: "#fef2f2", text: "#b91c1c" },
};

function formatMoney(value: number) {
    return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

function AdminHome() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
    const [selectedDays, setSelectedDays] = useState<number>(7);
    const selectedDaysRef = useRef<number>(7);
    const [loading, setLoading] = useState(true);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsError, setAnalyticsError] = useState("");
    const [error, setError] = useState("");

    const loadDashboard = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const [overview, accounts, pending, topRestaurants, analyticsData] =
                await Promise.all([
                    getAdminOverview(),
                    getAdminAccounts({ pageNumber: 1, pageSize: 1 }),
                    getPendingRestaurants({ pageNumber: 1, pageSize: 1 }),
                    getTopRestaurants(),
                    getAdminAnalytics(selectedDaysRef.current),
                ]);

            setData({
                overview,
                accountCount: accounts.totalItems,
                pendingCount: pending.totalItems,
                topRestaurants: Array.isArray(topRestaurants)
                    ? topRestaurants
                    : [],
            });
            setAnalytics(analyticsData);
            selectedDaysRef.current = analyticsData.days;
            setSelectedDays(analyticsData.days);
            setAnalyticsError("");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Không thể tải dữ liệu tổng quan."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    const handleFilterDays = async (days: number) => {
        if (days === selectedDaysRef.current || analyticsLoading) return;

        try {
            setAnalyticsLoading(true);
            setAnalyticsError("");
            const res = await getAdminAnalytics(days);
            setAnalytics(res);
            selectedDaysRef.current = res.days;
            setSelectedDays(res.days);
        } catch (err) {
            setAnalyticsError(
                err instanceof Error
                    ? err.message
                    : "Không thể cập nhật kỳ báo cáo. Vui lòng thử lại."
            );
        } finally {
            setAnalyticsLoading(false);
        }
    };

    useEffect(() => {
        const frameId = window.requestAnimationFrame(() => {
            void loadDashboard();
        });

        return () => window.cancelAnimationFrame(frameId);
    }, [loadDashboard]);

    useRealtimeRefresh(
        ["tongQuan", "nhaHang", "hopDong", "taiChinh", "donHang", "doiSoat"],
        loadDashboard
    );

    if (loading) {
        return (
            <div className="admin-dashboard-loading">
                <RefreshCw size={22} className="spin-icon" />
                <span>Đang tải dữ liệu hệ thống...</span>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="admin-dashboard-error">
                <strong>Không thể tải trang tổng quan</strong>
                <p>{error || "Dữ liệu hệ thống không khả dụng."}</p>
                <button type="button" onClick={() => void loadDashboard()}>
                    <RefreshCw size={15} />
                    Thử lại
                </button>
            </div>
        );
    }

    const stats = [
        {
            label: "Tổng tài khoản",
            value: data.accountCount.toLocaleString("vi-VN"),
            description: "Toàn bộ tài khoản trên hệ thống",
            icon: UsersRound,
            tone: "blue",
        },
        {
            label: "Nhà hàng đã duyệt",
            value: data.overview.tongNhaHang.toLocaleString("vi-VN"),
            description: "Nhà hàng đang hoạt động",
            icon: Building2,
            tone: "green",
        },
        {
            label: "Tổng đơn hàng",
            value: data.overview.tongDonHang.toLocaleString("vi-VN"),
            description: "Đơn hàng toàn thời gian",
            icon: ShoppingBag,
            tone: "orange",
        },
        {
            label: "Doanh thu hoàn thành",
            value: formatMoney(data.overview.tongDoanhThu),
            description: "Tổng GMV đơn đã giao thành công",
            icon: WalletCards,
            tone: "purple",
        },
    ];

    const chartPoints = (analytics?.doanhThuTheoNgay ?? []).map((item) => ({
        label: item.ngayNgan,
        fullDate: item.ngay,
        value1: item.tongGiaTriDon,
        value2: item.doanhThuNenTang,
        count: item.soDonHoanThanh,
    }));

    const pendingTasks = analytics?.congViecCanXuLy ?? {
        nhaHangChoDuyet: data.pendingCount,
        hopDongSapHetHan: 0,
        doiSoatTranhChap: 0,
        doiSoatChoXacNhan: 0,
    };

    const hasPendingWork =
        pendingTasks.nhaHangChoDuyet > 0 ||
        pendingTasks.hopDongSapHetHan > 0 ||
        pendingTasks.doiSoatTranhChap > 0 ||
        pendingTasks.doiSoatChoXacNhan > 0;

    return (
        <div className="admin-dashboard">
            {/* 1. WELCOME BANNER (PRESERVED) */}
            <section className="admin-dashboard-welcome">
                <div>
                    <span className="admin-dashboard-eyebrow">
                        Tổng quan hệ thống
                    </span>
                    <h1>Hoạt động kinh doanh</h1>
                    <p>
                        Theo dõi chỉ số thương mại, biểu đồ doanh thu và công việc quản trị quan trọng.
                    </p>
                </div>

                <Link
                    to="/admin/nha-hang"
                    className={`admin-pending-summary${
                        data.pendingCount > 0 ? " has-pending" : ""
                    }`}
                >
                    <span className="admin-pending-icon">
                        {data.pendingCount > 0 ? (
                            <Clock3 size={20} />
                        ) : (
                            <CheckCircle2 size={20} />
                        )}
                    </span>

                    <span>
                        <small>Yêu cầu đang chờ</small>
                        <strong>
                            {data.pendingCount > 0
                                ? `${data.pendingCount} nhà hàng chờ duyệt`
                                : "Không có yêu cầu mới"}
                        </strong>
                    </span>

                    <ArrowRight size={18} />
                </Link>
            </section>

            {/* 2. ALL-TIME KPI CARDS (PRESERVED) */}
            <section className="admin-dashboard-stats">
                {stats.map((stat) => {
                    const Icon = stat.icon;

                    return (
                        <article
                            key={stat.label}
                            className={`admin-dashboard-stat tone-${stat.tone}`}
                        >
                            <div className="admin-stat-icon">
                                <Icon size={20} />
                            </div>

                            <div className="admin-stat-content">
                                <span>{stat.label}</span>
                                <strong>{stat.value}</strong>
                                <small>{stat.description}</small>
                            </div>
                        </article>
                    );
                })}
            </section>

            {/* TIME FILTER BAR */}
            <div className="admin-analytics-toolbar">
                <div className="admin-toolbar-info">
                    <Calendar size={16} />
                    <span>
                        Kỳ báo cáo: <strong>{analytics?.rangeLabel || "Đang tải..."}</strong>
                    </span>
                    <small>(Múi giờ Việt Nam · Chỉ tính đơn hoàn thành)</small>
                </div>

                <div className="admin-time-pills">
                    {[
                        { label: "Hôm nay", days: 1 },
                        { label: "7 ngày qua", days: 7 },
                        { label: "30 ngày qua", days: 30 },
                    ].map((pill) => (
                        <button
                            key={pill.days}
                            type="button"
                            className={`time-pill ${selectedDays === pill.days ? "is-active" : ""}`}
                            onClick={() => void handleFilterDays(pill.days)}
                            disabled={analyticsLoading}
                        >
                            {pill.label}
                        </button>
                    ))}
                </div>
            </div>

            {analyticsError && (
                <p className="dashboard-analytics-error" role="alert">
                    {analyticsError}
                </p>
            )}

            {/* 3. CHARTS ROW: REVENUE TREND + STATUS BREAKDOWN */}
            <div className="admin-analytics-grid">
                {/* Revenue Trend Chart */}
                <section className="admin-dashboard-panel admin-chart-panel">
                    <header className="admin-dashboard-panel-header">
                        <div>
                            <span>Doanh số hệ thống</span>
                            <h2>Biểu đồ doanh thu theo thời gian</h2>
                        </div>
                        <div className="admin-chart-period-summary">
                            <div>
                                <small>Tổng GMV kỳ này</small>
                                <strong>{formatMoney(analytics?.tongDoanhThuKyNay ?? 0)}</strong>
                            </div>
                            <div className="divider" />
                            <div>
                                <small>Phí nền tảng thực thu</small>
                                <strong className="platform-revenue">
                                    {formatMoney(analytics?.tongDoanhThuNenTangKyNay ?? 0)}
                                </strong>
                            </div>
                        </div>
                    </header>

                    <div className="admin-chart-body">
                        {analyticsLoading ? (
                            <div className="admin-chart-loading" style={{ height: 250 }}>
                                <RefreshCw size={20} className="spin-icon" />
                                <span>Đang cập nhật biểu đồ...</span>
                            </div>
                        ) : (
                            <RevenueAreaChart
                                data={chartPoints}
                                series1Name="Tổng giá trị đơn (GMV)"
                                series2Name="Phí nền tảng thu được"
                                series1Color="#f4511e"
                                series2Color="#10b981"
                                height={240}
                            />
                        )}
                        <p className="admin-chart-caption">
                            * Biểu đồ ghi nhận từ các đơn hàng đã hoàn thành trong kỳ. Phí nền tảng là khoản doanh thu thực tế được hệ thống đối soát theo tỷ lệ chiết khấu hợp đồng của từng nhà hàng.
                        </p>
                    </div>
                </section>

                {/* Order Status Distribution */}
                <section className="admin-dashboard-panel admin-status-panel">
                    <header className="admin-dashboard-panel-header">
                        <div>
                            <span>Tình trạng vận hành</span>
                            <h2>Phân bố trạng thái đơn hàng</h2>
                        </div>
                        <span className="total-badge">
                            {analytics?.tongDonKyNay ?? 0} đơn trong kỳ
                        </span>
                    </header>

                    <div className="admin-status-body">
                        {/* Multi-segment progress bar */}
                        <div className="admin-status-bar" aria-label="Tỷ lệ trạng thái đơn hàng">
                            {(analytics?.phanBoTrangThai ?? []).map((item) => {
                                if (item.tyLe <= 0) return null;
                                const meta = STATUS_COLOR_MAP[item.tenTrangThai] || { color: "#9ca3af" };
                                return (
                                    <div
                                        key={item.maTrangThai}
                                        className="status-bar-segment"
                                        style={{
                                            width: `${item.tyLe}%`,
                                            background: meta.color,
                                        }}
                                        title={`${item.tenTrangThai}: ${item.soLuong} đơn (${item.tyLe}%)`}
                                    />
                                );
                            })}
                        </div>

                        {/* Status Grid Cards */}
                        <div className="admin-status-grid">
                            {(analytics?.phanBoTrangThai ?? []).map((item) => {
                                const meta = STATUS_COLOR_MAP[item.tenTrangThai] || {
                                    label: item.tenTrangThai,
                                    color: "#6b7280",
                                    bg: "#f3f4f6",
                                    text: "#374151",
                                };
                                return (
                                    <div
                                        key={item.maTrangThai}
                                        className="admin-status-card"
                                        style={{ background: meta.bg }}
                                    >
                                        <div className="status-card-header">
                                            <span
                                                className="status-dot"
                                                style={{ background: meta.color }}
                                            />
                                            <span className="status-name" style={{ color: meta.text }}>
                                                {meta.label}
                                            </span>
                                        </div>
                                        <div className="status-card-data">
                                            <strong style={{ color: meta.text }}>{item.soLuong}</strong>
                                            <small>{item.tyLe}%</small>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            </div>

            {/* 4. OPERATIONAL TASKS ALERT ROW */}
            <section className="admin-dashboard-panel admin-tasks-panel">
                <header className="admin-dashboard-panel-header">
                    <div>
                        <span>Nhiệm vụ quản trị</span>
                        <h2>Công việc cần xử lý ngay</h2>
                    </div>
                    {hasPendingWork ? (
                        <span className="admin-urgent-tag">
                            <AlertTriangle size={13} />
                            Cần giải quyết
                        </span>
                    ) : (
                        <span className="admin-clean-tag">
                            <CheckCircle2 size={13} />
                            Đã giải quyết xong
                        </span>
                    )}
                </header>

                <div className="admin-tasks-grid">
                    <Link to="/admin/nha-hang" className="admin-task-card">
                        <div className="task-icon pending-rest">
                            <Building2 size={20} />
                        </div>
                        <div className="task-info">
                            <strong>Nhà hàng chờ duyệt</strong>
                            <p>Hồ sơ đăng ký mở quán mới</p>
                        </div>
                        <div className="task-badge">
                            <span className={pendingTasks.nhaHangChoDuyet > 0 ? "has-count" : "zero"}>
                                {pendingTasks.nhaHangChoDuyet}
                            </span>
                            <ArrowRight size={15} />
                        </div>
                    </Link>

                    <Link to="/admin/hop-dong" className="admin-task-card">
                        <div className="task-icon expiring-contract">
                            <FileText size={20} />
                        </div>
                        <div className="task-info">
                            <strong>Hợp đồng sắp hết hạn</strong>
                            <p>Hiệu lực còn dưới 30 ngày</p>
                        </div>
                        <div className="task-badge">
                            <span className={pendingTasks.hopDongSapHetHan > 0 ? "has-count" : "zero"}>
                                {pendingTasks.hopDongSapHetHan}
                            </span>
                            <ArrowRight size={15} />
                        </div>
                    </Link>

                    <Link to="/admin/doi-soat" className="admin-task-card">
                        <div className="task-icon dispute">
                            <Scale size={20} />
                        </div>
                        <div className="task-info">
                            <strong>Đối soát đang tranh chấp</strong>
                            <p>Quán mở yêu cầu khiếu nại</p>
                        </div>
                        <div className="task-badge">
                            <span className={pendingTasks.doiSoatTranhChap > 0 ? "has-urgent" : "zero"}>
                                {pendingTasks.doiSoatTranhChap}
                            </span>
                            <ArrowRight size={15} />
                        </div>
                    </Link>

                    <Link to="/admin/doi-soat" className="admin-task-card">
                        <div className="task-icon settlement">
                            <TrendingUp size={20} />
                        </div>
                        <div className="task-info">
                            <strong>Đối soát chờ xác nhận</strong>
                            <p>Kỳ đối soát đang xử lý</p>
                        </div>
                        <div className="task-badge">
                            <span className={pendingTasks.doiSoatChoXacNhan > 0 ? "has-count" : "zero"}>
                                {pendingTasks.doiSoatChoXacNhan}
                            </span>
                            <ArrowRight size={15} />
                        </div>
                    </Link>
                </div>
            </section>

            {/* 5. TOP RESTAURANTS & QUICK LINKS (PRESERVED) */}
            <div className="admin-dashboard-grid">
                <section className="admin-dashboard-panel admin-ranking-panel">
                    <header className="admin-dashboard-panel-header">
                        <div>
                            <span>Hiệu suất nhà hàng</span>
                            <h2>Nhà hàng được đánh giá cao</h2>
                        </div>

                        <Link to="/admin/nha-hang">
                            Xem nhà hàng
                            <ArrowRight size={15} />
                        </Link>
                    </header>

                    {data.topRestaurants.length === 0 ? (
                        <div className="admin-dashboard-empty">
                            <Star size={25} />
                            <strong>Chưa có dữ liệu đánh giá</strong>
                            <p>
                                Danh sách sẽ xuất hiện khi nhà hàng nhận được đánh giá từ khách hàng.
                            </p>
                        </div>
                    ) : (
                        <div className="admin-ranking-list">
                            {data.topRestaurants
                                .slice(0, 5)
                                .map((restaurant, index) => {
                                    const rating = Number(
                                        restaurant.danhGiaTrungBinh || 0
                                    );

                                    return (
                                        <article
                                            key={restaurant.maNhaHang}
                                            className="admin-ranking-item"
                                        >
                                            <span
                                                className={`admin-ranking-number${
                                                    index < 3
                                                        ? ` rank-${index + 1}`
                                                        : ""
                                                }`}
                                            >
                                                {index + 1}
                                            </span>

                                            <div className="admin-ranking-info">
                                                <strong>
                                                    {restaurant.tenNhaHang}
                                                </strong>

                                                <span>
                                                    <MapPin size={13} />
                                                    {restaurant.diaChiQuan ||
                                                        "Chưa cập nhật địa chỉ"}
                                                </span>
                                            </div>

                                            <div className="admin-ranking-rating">
                                                <Star size={15} />
                                                <strong>
                                                    {rating > 0
                                                        ? rating.toFixed(1)
                                                        : "--"}
                                                </strong>
                                            </div>
                                        </article>
                                    );
                                })}
                        </div>
                    )}
                </section>

                <aside className="admin-dashboard-panel admin-work-panel">
                    <header className="admin-dashboard-panel-header">
                        <div>
                            <span>Truy cập nhanh</span>
                            <h2>Công việc quản trị</h2>
                        </div>
                    </header>

                    <nav className="admin-work-list">
                        <Link to="/admin/tai-khoan">
                            <span className="admin-work-icon accounts">
                                <UsersRound size={18} />
                            </span>

                            <span>
                                <strong>Quản lý tài khoản</strong>
                                <small>
                                    {data.accountCount} tài khoản trong hệ thống
                                </small>
                            </span>

                            <ArrowRight size={16} />
                        </Link>

                        <Link to="/admin/nha-hang">
                            <span className="admin-work-icon restaurants">
                                <Building2 size={18} />
                            </span>

                            <span>
                                <strong>Duyệt nhà hàng</strong>
                                <small>
                                    {data.pendingCount > 0
                                        ? `${data.pendingCount} yêu cầu cần xử lý`
                                        : "Không có yêu cầu đang chờ"}
                                </small>
                            </span>

                            <ArrowRight size={16} />
                        </Link>

                        <Link to="/admin/khuyen-mai">
                            <span className="admin-work-icon promotions">
                                <TicketPercent size={18} />
                            </span>

                            <span>
                                <strong>Khuyến mãi hệ thống</strong>
                                <small>Tạo và quản lý chương trình ưu đãi</small>
                            </span>

                            <ArrowRight size={16} />
                        </Link>

                        <Link to="/admin/tai-chinh">
                            <span className="admin-work-icon finance">
                                <ShieldCheck size={18} />
                            </span>

                            <span>
                                <strong>Báo cáo tài chính</strong>
                                <small>Theo dõi dòng tiền và đối soát nền tảng</small>
                            </span>

                            <ArrowRight size={16} />
                        </Link>
                    </nav>
                </aside>
            </div>
        </div>
    );
}

export default AdminHome;
