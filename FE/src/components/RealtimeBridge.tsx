import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
    getNotificationConnection,
    startNotificationConnection,
    stopNotificationConnection,
} from "../services/signalRService";

export type RealtimeDataChanged = {
    phamVi: string[];
    duLieu?: unknown;
    thoiGianUtc?: string;
};

function RealtimeBridge() {
    const location = useLocation();

    useEffect(() => {
        const connection = getNotificationConnection();

        const handleNotification = (data: unknown) => {
            window.dispatchEvent(
                new CustomEvent("notification-received", {
                    detail: data,
                })
            );
        };

        const handleNewOrder = (data: unknown) => {
            window.dispatchEvent(
                new CustomEvent("restaurant-order-created", {
                    detail: data,
                })
            );

            window.dispatchEvent(
                new Event("restaurant-orders-updated")
            );

            dispatchDataChanged(["donHang"], data);
        };

        const handleOrderUpdated = (data: unknown) => {
            window.dispatchEvent(
                new CustomEvent("customer-order-updated", {
                    detail: data,
                })
            );

            window.dispatchEvent(
                new Event("customer-orders-updated")
            );

            dispatchDataChanged(["donHang"], data);
        };

        const handleOrderCancelled = (data: unknown) => {
            window.dispatchEvent(
                new CustomEvent("order-cancelled", {
                    detail: data,
                })
            );

            window.dispatchEvent(
                new Event("customer-orders-updated")
            );

            window.dispatchEvent(
                new Event("restaurant-orders-updated")
            );

            dispatchDataChanged(["donHang"], data);
        };

        const handleDataChanged = (data: RealtimeDataChanged) => {
            if (!data || !Array.isArray(data.phamVi) || data.phamVi.length === 0) {
                return;
            }

            window.dispatchEvent(
                new CustomEvent<RealtimeDataChanged>("realtime-data-changed", {
                    detail: data,
                })
            );
        };

        const handleLoginSuccess = () => {
            void startNotificationConnection();
        };

        const handleLogoutSuccess = () => {
            void stopNotificationConnection();
        };

        const handleStorageChange = (
            event: StorageEvent
        ) => {
            if (event.key !== "token") return;

            if (event.newValue) {
                void startNotificationConnection();
            } else {
                void stopNotificationConnection();
            }
        };

        connection.on(
            "NhanThongBao",
            handleNotification
        );
        connection.on(
            "DonHangMoi",
            handleNewOrder
        );
        connection.on(
            "DonHangCapNhat",
            handleOrderUpdated
        );
        connection.on(
            "DonHangDaHuy",
            handleOrderCancelled
        );
        connection.on(
            "DuLieuThayDoi",
            handleDataChanged
        );

        window.addEventListener(
            "login-success",
            handleLoginSuccess
        );
        window.addEventListener(
            "logout-success",
            handleLogoutSuccess
        );
        window.addEventListener(
            "storage",
            handleStorageChange
        );

        return () => {
            connection.off(
                "NhanThongBao",
                handleNotification
            );
            connection.off(
                "DonHangMoi",
                handleNewOrder
            );
            connection.off(
                "DonHangCapNhat",
                handleOrderUpdated
            );
            connection.off(
                "DonHangDaHuy",
                handleOrderCancelled
            );
            connection.off(
                "DuLieuThayDoi",
                handleDataChanged
            );

            window.removeEventListener(
                "login-success",
                handleLoginSuccess
            );
            window.removeEventListener(
                "logout-success",
                handleLogoutSuccess
            );
            window.removeEventListener(
                "storage",
                handleStorageChange
            );

            void stopNotificationConnection();
        };
    }, []);

    // Kiểm tra lại kết nối khi chuyển trang.
    // Đây cũng là phương án dự phòng cho các nút đăng xuất cũ
    // chưa phát sự kiện logout-success.
    useEffect(() => {
        if (localStorage.getItem("token")) {
            void startNotificationConnection();
        } else {
            void stopNotificationConnection();
        }
    }, [location.pathname]);

    return null;
}

function dispatchDataChanged(phamVi: string[], duLieu?: unknown) {
    window.dispatchEvent(
        new CustomEvent<RealtimeDataChanged>("realtime-data-changed", {
            detail: { phamVi, duLieu },
        })
    );
}

export default RealtimeBridge;
