import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    Bell,
    BellRing,
    Check,
    CheckCheck,
    Clock3,
    Inbox,
} from "lucide-react";
import {
    getNotifications,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    type Notification,
} from "../services/notificationService";
import ScrollReveal from "../components/ScrollReveal";
import Pagination from "../components/Pagination";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh";

type NotificationFilter = "all" | "unread" | "read";

function formatNotificationDate(value: string) {
    const date = new Date(value);
    const today = new Date();

    const sameDay =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

    if (sameDay) {
        return `Hôm nay, ${date.toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
        })}`;
    }

    return date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function Notifications() {
    const PAGE_SIZE = 10;
    const navigate = useNavigate();
    const location = useLocation();

    const isCustomerNotificationPage = location.pathname === "/thong-bao";
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filter, setFilter] = useState<NotificationFilter>("all");
    const [loading, setLoading] = useState(true);
    const [markingAll, setMarkingAll] = useState(false);
    const [markingId, setMarkingId] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [pageNumber, setPageNumber] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [counts, setCounts] = useState({ all: 0, unread: 0, read: 0 });

    const loadNotifications = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);

            const data = await getNotifications({
                pageNumber,
                pageSize: PAGE_SIZE,
                filter: filter === "all" ? undefined : filter,
            });

            setNotifications(data.items);
            setTotalItems(data.totalItems);
            setTotalPages(data.totalPages);
            setCounts(data.counts);
            if (data.pageNumber !== pageNumber) setPageNumber(data.pageNumber);
            setError("");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Không thể tải thông báo."
            );
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [filter, pageNumber]);

    useEffect(() => {
        const initialTimer = window.setTimeout(
            () => void loadNotifications(true),
            0
        );
        const handleRealtimeNotification = () => {
            void loadNotifications(false);
            window.dispatchEvent(new Event("notifications-updated"));
        };

        window.addEventListener("notification-received", handleRealtimeNotification);

        return () => {
            window.clearTimeout(initialTimer);
            window.removeEventListener("notification-received", handleRealtimeNotification);
        };
    }, [loadNotifications]);

    useRealtimeRefresh(
        ["thongBao"],
        useCallback(() => loadNotifications(false), [loadNotifications])
    );

    const markAsRead = async (id: number) => {
        try {
            setMarkingId(id);
            setError("");

            await markNotificationAsRead(id);
            await loadNotifications(false);

            window.dispatchEvent(
                new Event("notifications-updated")
            );

            return true;
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Không thể cập nhật thông báo."
            );

            return false;
        } finally {
            setMarkingId(null);
        }
    };

    const handleOpenNotification = async (
        item: Notification
    ) => {
        if (
            !item.duongDan ||
            markingAll ||
            markingId !== null
        ) {
            return;
        }

        if (!item.daDoc) {
            const marked = await markAsRead(
                item.maThongBao
            );

            if (!marked) return;
        }

        navigate(item.duongDan);
    };

    const markAllAsRead = async () => {
        try {
            setMarkingAll(true);
            setError("");

            await markAllNotificationsAsRead();
            setPageNumber(1);
            await loadNotifications(false);

            window.dispatchEvent(
                new Event("notifications-updated")
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Không thể cập nhật thông báo."
            );
        } finally {
            setMarkingAll(false);
        }
    };

    const unreadCount = counts.unread;

    const countFilter = (value: NotificationFilter) => counts[value];

    return (
        <div
            className={`merchant-notifications-page ${
                isCustomerNotificationPage
                    ? "customer-notifications-page"
                    : ""
            }`}
        >
            <ScrollReveal className="merchant-notifications-header-reveal" delay={40}>
                <header className="merchant-notifications-header">
                <div>
                    <span className="merchant-notifications-eyebrow">
                        TRUNG TÂM THÔNG BÁO
                    </span>

                    <h1>Thông báo</h1>

                    <p>
                        {unreadCount > 0
                            ? `Bạn có ${unreadCount} thông báo chưa đọc.`
                            : "Bạn đã đọc tất cả thông báo."}
                    </p>
                </div>

                {unreadCount > 0 && (
                    <button
                        type="button"
                        className="merchant-notifications-read-all"
                        onClick={() =>
                            void markAllAsRead()
                        }
                        disabled={
                            markingAll ||
                            markingId !== null
                        }
                    >
                        <CheckCheck size={16} />

                        {markingAll
                            ? "Đang cập nhật..."
                            : "Đọc tất cả"}
                    </button>
                )}
                </header>
            </ScrollReveal>

            {error && (
                <div className="merchant-notifications-error">
                    {error}
                </div>
            )}

            <ScrollReveal className="merchant-notifications-tabs-reveal" delay={80}>
                <nav className="merchant-notifications-tabs">
                {(
                    [
                        ["all", "Tất cả"],
                        ["unread", "Chưa đọc"],
                        ["read", "Đã đọc"],
                    ] as [NotificationFilter, string][]
                ).map(([value, label]) => (
                    <button
                        key={value}
                        type="button"
                        className={
                            filter === value
                                ? "active"
                                : ""
                        }
                        onClick={() => {
                            setFilter(value);
                            setPageNumber(1);
                        }}
                    >
                        {label}
                        <span>
                            {countFilter(value)}
                        </span>
                    </button>
                ))}
                </nav>
            </ScrollReveal>

            {loading ? (
                <ScrollReveal className="merchant-notifications-state-reveal" delay={100}>
                  <div className="merchant-notifications-loading">
                    Đang tải thông báo...
                  </div>
                </ScrollReveal>
            ) : notifications.length === 0 ? (
                <ScrollReveal className="merchant-notifications-state-reveal" delay={100}>
                  <div className="merchant-notifications-empty">
                    <span>
                        <Inbox size={28} />
                    </span>

                    <h3>
                        {counts.all === 0
                            ? "Chưa có thông báo"
                            : filter === "unread"
                              ? "Không còn thông báo chưa đọc"
                              : "Không có thông báo đã đọc"}
                    </h3>

                    <p>
                        {counts.all === 0
                            ? "Các cập nhật mới về đơn hàng và nhà hàng sẽ xuất hiện tại đây."
                            : "Hãy chọn một bộ lọc khác để xem thông báo."}
                    </p>
                  </div>
                </ScrollReveal>
            ) : (
                <ScrollReveal className="merchant-notifications-panel-reveal" delay={100}>
                  <section className="merchant-notifications-panel">
                    <div className="merchant-notifications-panel-title">
                        <div>
                            <Bell size={18} />

                            <h2>
                                {filter === "all"
                                    ? "Tất cả thông báo"
                                    : filter === "unread"
                                      ? "Thông báo chưa đọc"
                                      : "Thông báo đã đọc"}
                            </h2>
                        </div>

                        <span>
                            {totalItems} thông báo
                        </span>
                    </div>

                    <div className="merchant-notifications-list">
                        {notifications.map(
                            (item) => {
                                const hasDestination =
                                    Boolean(item.duongDan);

                                return (
                                    <article
                                        key={item.maThongBao}
                                        className={`merchant-notification-row ${
                                            item.daDoc ? "read" : "unread"
                                        }${hasDestination ? " clickable" : ""}`}
                                        role={
                                            hasDestination
                                                ? "link"
                                                : undefined
                                        }
                                        tabIndex={
                                            hasDestination
                                                ? 0
                                                : undefined
                                        }
                                        onClick={
                                            hasDestination
                                                ? () =>
                                                      void handleOpenNotification(
                                                          item
                                                      )
                                                : undefined
                                        }
                                        onKeyDown={(event) => {
                                            if (
                                                !hasDestination ||
                                                event.target !==
                                                    event.currentTarget
                                            ) {
                                                return;
                                            }

                                            if (
                                                event.key ===
                                                    "Enter" ||
                                                event.key === " "
                                            ) {
                                                event.preventDefault();

                                                void handleOpenNotification(
                                                    item
                                                );
                                            }
                                        }}
                                    >
                                        <div className="merchant-notification-icon">
                                            {item.daDoc ? (
                                                <Bell size={18} />
                                            ) : (
                                                <BellRing size={18} />
                                            )}
                                        </div>

                                        <div className="merchant-notification-content">
                                            <div>
                                                <h3>
                                                    {item.tieuDe}
                                                </h3>

                                                {!item.daDoc && (
                                                    <span>
                                                        Chưa đọc
                                                    </span>
                                                )}
                                            </div>

                                            <p>
                                                {item.noiDung}
                                            </p>

                                            <time>
                                                <Clock3 size={13} />

                                                {formatNotificationDate(
                                                    item.ngayTao
                                                )}
                                            </time>
                                        </div>

                                        <div className="merchant-notification-action">
                                            {item.daDoc ? (
                                                <span title="Đã đọc">
                                                    <Check
                                                        size={16}
                                                    />
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={(
                                                        event
                                                    ) => {
                                                        event.stopPropagation();

                                                        void markAsRead(
                                                            item.maThongBao
                                                        );
                                                    }}
                                                    disabled={
                                                        markingId !==
                                                            null ||
                                                        markingAll
                                                    }
                                                >
                                                    <Check
                                                        size={14}
                                                    />

                                                    {markingId ===
                                                    item.maThongBao
                                                        ? "Đang cập nhật..."
                                                        : "Đánh dấu đã đọc"}
                                                </button>
                                            )}
                                        </div>
                                    </article>
                                );
                            }
                        )}
                    </div>
                  </section>
                </ScrollReveal>
            )}

            {!loading && !error && totalPages > 1 && (
                <Pagination
                    pageNumber={pageNumber}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    onPageChange={setPageNumber}
                />
            )}
        </div>
    );
}

export default Notifications;
