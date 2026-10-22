import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowRight,
    Building2,
    CheckCircle2,
    Clock3,
    MapPin,
    RefreshCw,
    ShoppingBag,
    Star,
    TicketPercent,
    UsersRound,
    WalletCards,
} from "lucide-react";
import {
    getAdminAccounts,
    getAdminOverview,
    getPendingRestaurants,
    getTopRestaurants,
} from "../services/adminService";
import type {
    AdminOverview,
    TopRestaurant,
} from "../services/adminService";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh";

interface DashboardData {
    overview: AdminOverview;
    accountCount: number;
    pendingCount: number;
    topRestaurants: TopRestaurant[];
}

function formatMoney(value: number) {
    return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

function AdminHome() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadDashboard = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const [overview, accounts, pending, topRestaurants] =
                await Promise.all([
                    getAdminOverview(),
                    getAdminAccounts({ pageNumber: 1, pageSize: 1 }),
                    getPendingRestaurants({ pageNumber: 1, pageSize: 1 }),
                    getTopRestaurants(),
                ]);

            setData({
                overview,
                accountCount: accounts.totalItems,
                pendingCount: pending.totalItems,
                topRestaurants: Array.isArray(topRestaurants)
                    ? topRestaurants
                    : [],
            });
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

    useEffect(() => {
        const frameId = window.requestAnimationFrame(() => {
            void loadDashboard();
        });

        return () => window.cancelAnimationFrame(frameId);
    }, [loadDashboard]);

    useRealtimeRefresh(["tongQuan", "nhaHang", "hopDong", "taiChinh"], loadDashboard);

    if (loading) {
        return (
            <div className="admin-dashboard-loading">
                <RefreshCw size={22} />
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
            description: "Tài khoản đang có trên hệ thống",
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
            description: "Đơn hàng đã được ghi nhận",
            icon: ShoppingBag,
            tone: "orange",
        },
        {
            label: "Doanh thu hoàn thành",
            value: formatMoney(data.overview.tongDoanhThu),
            description: "Tổng giá trị đơn đã hoàn thành",
            icon: WalletCards,
            tone: "purple",
        },
    ];

    return (
        <div className="admin-dashboard">
            <section className="admin-dashboard-welcome">
                <div>
                    <span className="admin-dashboard-eyebrow">
                        Tổng quan hệ thống
                    </span>
                    <h1>Hoạt động kinh doanh</h1>
                    <p>
                        Theo dõi số liệu và xử lý những công việc quản trị
                        quan trọng.
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
                                Danh sách sẽ xuất hiện khi nhà hàng nhận được
                                đánh giá từ khách hàng.
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
                    </nav>
                </aside>
            </div>
        </div>
    );
}

export default AdminHome;
