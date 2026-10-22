import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    CART_TTL_MS,
    getLatestCart,
    type RestaurantCart,
} from "../services/cartService";

function LatestCartBar() {
    const navigate = useNavigate();
    const [cart, setCart] = useState<RestaurantCart | null>(null);
    const [bump, setBump] = useState(false);

    const loadLatestCart = useCallback(async () => {
        try {
            const data = await getLatestCart();
            setCart(data && data.soLuongMon > 0 ? data : null);
        } catch {
            // Tài khoản không phải khách hàng hoặc phiên đăng nhập đã hết hạn.
            setCart(null);
        }
    }, []);

    useEffect(() => {
        const initialLoadTimer = window.setTimeout(() => {
            void loadLatestCart();
        }, 0);

        const handleCartUpdated = () => {
            void loadLatestCart();
            setBump(true);
            window.setTimeout(() => setBump(false), 800);
        };
        const handleLoginSuccess = () => void loadLatestCart();
        const handleLogoutSuccess = () => void loadLatestCart();

        window.addEventListener("cart-updated", handleCartUpdated);
        window.addEventListener("login-success", handleLoginSuccess);
        window.addEventListener("logout-success", handleLogoutSuccess);

        return () => {
            window.clearTimeout(initialLoadTimer);
            window.removeEventListener("cart-updated", handleCartUpdated);
            window.removeEventListener("login-success", handleLoginSuccess);
            window.removeEventListener("logout-success", handleLogoutSuccess);
        };
    }, [loadLatestCart]);

    useEffect(() => {
        if (!cart?.ngayCapNhat) return;

        const updatedAt = Date.parse(cart.ngayCapNhat);
        if (!Number.isFinite(updatedAt)) return;

        const remainingTime = Math.max(
            0,
            updatedAt + CART_TTL_MS - Date.now(),
        );
        const timer = window.setTimeout(
            () => void loadLatestCart(),
            remainingTime + 50,
        );

        return () => window.clearTimeout(timer);
    }, [cart?.ngayCapNhat, loadLatestCart]);

    if (!cart) return null;

    const openCart = () => {
        navigate(`/gio-hang?maNhaHang=${cart.maNhaHang}`);
    };

    return (
        <aside className={`latest-cart-home-dock ${bump ? "is-bumped" : ""}`} aria-label="Giỏ hàng gần đây">
            {bump && <span className="cart-bump-float-tag">+1 món</span>}
            <button
                type="button"
                className="latest-cart-home-button"
                onClick={openCart}
            >
                <span className="latest-cart-home-icon" aria-hidden="true">
                    🛒
                    <b>{cart.soLuongMon}</b>
                </span>

                <span className="latest-cart-home-info">
                    <small>Giỏ hàng gần đây</small>
                    <strong>{cart.tenNhaHang}</strong>
                    <span>
                        {cart.canLamMoi
                            ? "Sẽ kiểm tra lại khi thanh toán"
                            : `${cart.soLuongMon} món đang chờ bạn`}
                    </span>
                </span>

                <span className="latest-cart-home-total">
                    <strong>
                        {cart.tongTienTamTinh.toLocaleString("vi-VN")} đ
                    </strong>
                    <small>Xem giỏ ›</small>
                </span>
            </button>
        </aside>
    );
}

export default LatestCartBar;
