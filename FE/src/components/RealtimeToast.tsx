import {
    getNotifications,
    markNotificationAsRead,
    type Notification,
} from "../services/notificationService";
import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowRight,
    BellRing,
    X,
} from "lucide-react";

const AUTO_CLOSE_MS = 6500;

function RealtimeToast() {
    const navigate = useNavigate();

    const [toasts, setToasts] =
        useState<Notification[]>([]);

    const [openingId, setOpeningId] =
        useState<number | null>(null);

    const timersRef =
        useRef<Map<number, number>>(new Map());

    const dismissToast = useCallback(
        (id: number) => {
            const timer =
                timersRef.current.get(id);

            if (timer !== undefined) {
                window.clearTimeout(timer);
                timersRef.current.delete(id);
            }

            setToasts((current) =>
                current.filter(
                    (item) =>
                        item.maThongBao !== id
                )
            );
        },
        []
    );

    useEffect(() => {
        const timers = timersRef.current;

        const handleNotification = (
            event: Event
        ) => {
            const realtimeEvent =
                event as CustomEvent<Notification>;

            const notification =
                realtimeEvent.detail;

            if (
                !notification ||
                typeof notification.maThongBao !==
                    "number"
            ) {
                return;
            }

            const normalizedNotification: Notification =
                {
                    ...notification,
                    daDoc:
                        notification.daDoc ?? false,
                    duongDan:
                        notification.duongDan ?? null,
                };

            setToasts((current) => [
                normalizedNotification,
                ...current.filter(
                    (item) =>
                        item.maThongBao !==
                        normalizedNotification.maThongBao
                ),
            ].slice(0, 3));

            const oldTimer =
                timersRef.current.get(
                    notification.maThongBao
                );

            if (oldTimer !== undefined) {
                window.clearTimeout(oldTimer);
            }

            const timer = window.setTimeout(
                () => {
                    dismissToast(
                        notification.maThongBao
                    );
                },
                AUTO_CLOSE_MS
            );

            timersRef.current.set(
                notification.maThongBao,
                timer
            );
        };

        window.addEventListener(
            "notification-received",
            handleNotification
        );

        return () => {
            window.removeEventListener(
                "notification-received",
                handleNotification
            );

            timers.forEach(
                (timer) =>
                    window.clearTimeout(timer)
            );

            timers.clear();
        };
    }, [dismissToast]);

    const handleOpen = async (
    notification: Notification
) => {
    if (openingId !== null) return;

    setOpeningId(notification.maThongBao);

    let targetPath =
        notification.duongDan ?? null;

    try {
        if (!notification.daDoc) {
            await markNotificationAsRead(
                notification.maThongBao
            );

            window.dispatchEvent(
                new Event("notifications-updated")
            );
        }

        // Payload SignalR thiếu đường dẫn thì lấy lại từ API.
        if (!targetPath) {
            const latestNotifications =
                await getNotifications({ pageNumber: 1, pageSize: 20 });

            targetPath =
                latestNotifications.items.find(
                    (item) =>
                        item.maThongBao ===
                        notification.maThongBao
                )?.duongDan ?? null;
        }
    } catch {
        // Thông báo vẫn được đóng; người dùng có thể mở lại từ trang thông báo.
    }

    dismissToast(notification.maThongBao);
    setOpeningId(null);

    if (targetPath) {
        navigate(targetPath);
    }
};

    if (toasts.length === 0) {
        return null;
    }

    return (
        <aside
            className="realtime-toast-stack"
            aria-live="polite"
            aria-label="Thông báo mới"
        >
            {toasts.map((item) => (
                <article
                    key={item.maThongBao}
                    className="realtime-toast"
                >
                    <button
                        type="button"
                        className="realtime-toast-main"
                        disabled={
                            openingId ===
                            item.maThongBao
                        }
                        onClick={() =>
                            void handleOpen(item)
                        }
                    >
                        <span className="realtime-toast-icon">
                            <BellRing size={19} />
                        </span>

                        <span className="realtime-toast-content">
                            <strong>
                                {item.tieuDe}
                            </strong>

                            <span>
                                {item.noiDung}
                            </span>
                        </span>

                        {item.duongDan && (
                            <ArrowRight
                                className="realtime-toast-arrow"
                                size={16}
                            />
                        )}
                    </button>

                    <button
                        type="button"
                        className="realtime-toast-close"
                        aria-label="Đóng thông báo"
                        onClick={() =>
                            dismissToast(
                                item.maThongBao
                            )
                        }
                    >
                        <X size={15} />
                    </button>
                </article>
            ))}
        </aside>
    );
}

export default RealtimeToast;
