import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
    clearCart,
    CART_TTL_MS,
    getRestaurantCart,
    removeCartItem,
    updateCartItemOptions,
    updateCartItemQty,
    type CartItem,
    type RestaurantCart,
} from "../services/cartService";
import { getMonAn, type MonAnChiTiet } from "../services/menuService";
import {
    ArrowLeft,
    ArrowRight,
    CircleAlert,
    MessageSquareText,
    Minus,
    Plus,
    ReceiptText,
    ShoppingBag,
    SlidersHorizontal,
    Trash2,
    UtensilsCrossed,
    Save,
    X,
} from "lucide-react";
function formatMoney(value: number) {
    return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}
function Cart() {
    
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const maNhaHang = Number(searchParams.get("maNhaHang"));
    const checkoutRequested = searchParams.get("checkout") === "1";

    const [cart, setCart] = useState<RestaurantCart | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [editingItemId, setEditingItemId] = useState<number | null>(null);
    const [editingFood, setEditingFood] = useState<MonAnChiTiet | null>(null);
    const [editingToppings, setEditingToppings] = useState<number[]>([]);
    const [editingNote, setEditingNote] = useState("");
    const [editingError, setEditingError] = useState("");
    const [openingOptionsId, setOpeningOptionsId] = useState<number | null>(null);

    const loadCart = useCallback(
    async (showPageLoading = true) => {
        if (
            !Number.isInteger(maNhaHang) ||
            maNhaHang <= 0
        ) {
            setError(
                "Không xác định được nhà hàng của giỏ hàng."
            );
            setLoading(false);
            return;
        }

        try {
            if (showPageLoading) {
                setLoading(true);
            }

            setError("");

            const data = await getRestaurantCart(
                maNhaHang
            );

            setCart(data);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Không thể tải giỏ hàng."
            );
        } finally {
            if (showPageLoading) {
                setLoading(false);
            }
        }
    },
    [maNhaHang]
);

    useEffect(() => {
        const timer = window.setTimeout(
            () => void loadCart(true),
            0
        );

        return () => window.clearTimeout(timer);
    }, [loadCart]);

    useEffect(() => {
        if (!cart?.chiTiet.length || !cart.ngayCapNhat) return;

        const updatedAt = Date.parse(cart.ngayCapNhat);
        if (!Number.isFinite(updatedAt)) return;

        const remainingTime = Math.max(
            0,
            updatedAt + CART_TTL_MS - Date.now()
        );
        const timer = window.setTimeout(
            () => void loadCart(false),
            remainingTime + 50
        );

        return () => window.clearTimeout(timer);
    }, [cart?.chiTiet.length, cart?.ngayCapNhat, loadCart]);

    useEffect(() => {
        if (
            !checkoutRequested ||
            loading ||
            !cart?.maGioHang ||
            !localStorage.getItem("token")
        ) {
            return;
        }

        navigate(`/thanh-toan?maGioHang=${cart.maGioHang}`, {
            replace: true,
        });
    }, [cart?.maGioHang, checkoutRequested, loading, navigate]);

    const handleUpdateQty = async (id: number, currentQty: number, change: number) => {
        const nextQty = currentQty + change;
        if (nextQty < 1 || busy) return;

        try {
            setBusy(true);
            await updateCartItemQty(id, nextQty);
            await loadCart(false);
            window.dispatchEvent(new Event("cart-updated"));
        } catch (err) {
            alert(err instanceof Error ? err.message : "Không thể cập nhật số lượng.");
        } finally {
            setBusy(false);
        }
    };

    const handleRemove = async (id: number) => {
        if (busy || !window.confirm("Bỏ món này khỏi giỏ hàng?")) return;

        try {
            setBusy(true);
            await removeCartItem(id);
            await loadCart(false);
            window.dispatchEvent(new Event("cart-updated"));
        } catch (err) {
            alert(err instanceof Error ? err.message : "Không thể xóa món.");
        } finally {
            setBusy(false);
        }
    };

    const handleClear = async () => {
        if (!cart || busy || !window.confirm(`Xóa toàn bộ món trong giỏ của ${cart.tenNhaHang}?`)) {
            return;
        }

        try {
            setBusy(true);
            await clearCart(cart.maGioHang, cart.maNhaHang);
            await loadCart(false);
            window.dispatchEvent(new Event("cart-updated"));
        } catch (err) {
            alert(err instanceof Error ? err.message : "Không thể xóa giỏ hàng.");
        } finally {
            setBusy(false);
        }
    };

    const handleCheckout = () => {
        if (!cart || busy) return;

        if (!localStorage.getItem("token")) {
            const returnUrl = `/gio-hang?maNhaHang=${cart.maNhaHang}&checkout=1`;
            navigate(`/dang-nhap?returnUrl=${encodeURIComponent(returnUrl)}`);
            return;
        }

        if (!cart.maGioHang) {
            alert("Không xác định được giỏ hàng cần thanh toán.");
            return;
        }

        navigate(`/thanh-toan?maGioHang=${cart.maGioHang}`);
    };

    const openEditOptions = async (item: CartItem) => {
        if (busy || openingOptionsId !== null) return;

        try {
            setOpeningOptionsId(item.maChiTietGioHang);
            setEditingError("");
            const food = await getMonAn(item.maMonAn);
            setEditingItemId(item.maChiTietGioHang);
            setEditingFood(food);
            setEditingToppings(item.toppings.map((tp) => tp.maTopping));
            setEditingNote(item.ghiChu ?? "");
        } catch (err) {
            alert(err instanceof Error ? err.message : "Không thể tải tùy chọn món.");
        } finally {
            setOpeningOptionsId(null);
        }
    };

    const closeEditOptions = () => {
        if (busy) return;
        setEditingItemId(null);
        setEditingFood(null);
        setEditingToppings([]);
        setEditingNote("");
        setEditingError("");
    };

    const toggleEditingTopping = (
        maTopping: number,
        group: MonAnChiTiet["nhomToppings"][number]
    ) => {
        setEditingError("");
        setEditingToppings((current) => {
            if (current.includes(maTopping)) {
                return current.filter((id) => id !== maTopping);
            }

            const groupIds = group.toppings.map((tp) => tp.maTopping);
            const selectedInGroup = current.filter((id) => groupIds.includes(id));

            if (group.chonToiDa === 1) {
                return [
                    ...current.filter((id) => !groupIds.includes(id)),
                    maTopping,
                ];
            }

            if (group.chonToiDa && selectedInGroup.length >= group.chonToiDa) {
                setEditingError(
                    `Nhóm ${group.tenNhom} chỉ được chọn tối đa ${group.chonToiDa} topping.`
                );
                return current;
            }

            return [...current, maTopping];
        });
    };

    const handleSaveOptions = async () => {
        if (!editingFood || editingItemId === null || busy) return;

        for (const group of editingFood.nhomToppings) {
            const groupIds = group.toppings.map((tp) => tp.maTopping);
            const selectedCount = editingToppings.filter((id) =>
                groupIds.includes(id)
            ).length;

            if (group.batBuocChon && selectedCount === 0) {
                setEditingError(`Vui lòng chọn topping cho nhóm ${group.tenNhom}.`);
                return;
            }
        }

        try {
            setBusy(true);
            setEditingError("");
            await updateCartItemOptions(editingItemId, {
                ghiChu: editingNote.trim() || undefined,
                danhSachMaTopping: editingToppings,
            });
            await loadCart(false);
            window.dispatchEvent(new Event("cart-updated"));
            setEditingItemId(null);
            setEditingFood(null);
            setEditingToppings([]);
            setEditingNote("");
        } catch (err) {
            setEditingError(
                err instanceof Error ? err.message : "Không thể cập nhật topping."
            );
        } finally {
            setBusy(false);
        }
    };

    const editingToppingTotal = editingFood
        ? editingFood.nhomToppings
              .flatMap((group) => group.toppings)
              .filter((tp) => editingToppings.includes(tp.maTopping))
              .reduce((total, tp) => total + tp.giaThem, 0)
        : 0;
if (loading) {
    return (
        <main className="cart-page cart-state-page">
            <div className="loading-spinner" />
            <p>Đang tải giỏ hàng...</p>
        </main>
    );
}

if (error || !cart) {
    return (
        <main className="cart-page cart-state-page">
            <div className="cart-state-icon error">
                <CircleAlert size={28} />
            </div>

            <h2>Không thể mở giỏ hàng</h2>

            <p>
                {error ||
                    "Không tìm thấy thông tin giỏ hàng."}
            </p>

            <Link
                to="/nha-hang"
                className="cart-state-button"
            >
                <ArrowLeft size={16} />
                Xem nhà hàng
            </Link>
        </main>
    );
}

if (cart.chiTiet.length === 0) {
    return (
        <main className="cart-page cart-state-page">
            <div className="cart-state-icon">
                <ShoppingBag size={29} />
            </div>

            <h2>Giỏ hàng đang trống</h2>

            <p>
                Bạn chưa chọn món nào tại{" "}
                <strong>{cart.tenNhaHang}</strong>.
                Những giỏ hàng ở quán khác vẫn được giữ nguyên.
            </p>

            <Link
                to={`/nha-hang/${cart.maNhaHang}`}
                className="cart-state-button"
            >
                <ArrowLeft size={16} />
                Chọn món tại quán
            </Link>
        </main>
    );
}

    return (
        <main className="cart-page">
            <div className="cart-container restaurant-cart-container">
    <Link
        to={`/nha-hang/${cart.maNhaHang}`}
        className="cart-back-link"
    >
        <ArrowLeft size={16} />
        Quay lại nhà hàng
    </Link>

    <header className="cart-restaurant-heading">
        <div>
            <span>Giỏ hàng nhà hàng</span>
            <h1>{cart.tenNhaHang}</h1>

            <p>
                Bạn đang có {cart.soLuongMon} món trong
                giỏ hàng này.
            </p>
        </div>

        <button
            type="button"
            className="clear-cart-btn"
            disabled={busy}
            onClick={handleClear}
        >
            <Trash2 size={15} />
            Xóa giỏ hàng
        </button>
    </header>

    {cart.canLamMoi && (
        <div className="cart-refresh-notice" role="status">
            <CircleAlert size={18} />
            <span>
                Giỏ hàng đã lâu chưa được chỉnh sửa. Món, giá và ưu đãi sẽ
                được kiểm tra lại khi thanh toán; các món của bạn vẫn được giữ nguyên.
            </span>
        </div>
    )}

    <div className="restaurant-cart-layout">
        <section className="cart-items-panel">
            <div className="cart-items-heading">
                <div>
                    <ReceiptText size={18} />

                    <h2>Món đã chọn</h2>
                </div>

                <span>{cart.chiTiet.length} loại món</span>
            </div>

            <div className="cart-items">
                {cart.chiTiet.map((item, index) => (
                <article
                    key={item.maChiTietGioHang}
                    className="cart-item"
                    style={{
                        animationDelay: `${
                            0.75 +
                            Math.min(index, 5) * 0.12
                        }s`,
                    }}
                >
                        <div className="cart-item-image">
                            {item.hinhAnh ? (
                                <img
                                    src={item.hinhAnh}
                                    alt={item.tenMonAn}
                                />
                            ) : (
                                <UtensilsCrossed
                                    size={27}
                                    strokeWidth={1.5}
                                />
                            )}
                        </div>

                        <div className="item-info">
                            <div className="cart-item-title-row">
                                <div>
                                    <h3>{item.tenMonAn}</h3>

                                    <span className="cart-item-unit-price">
                                        {formatMoney(item.donGia)} / món
                                    </span>
                                </div>

                                <strong
                                    key={item.thanhTien}
                                    className="item-price cart-value-change"
                                >
                                    {formatMoney(item.thanhTien)}
                                </strong>
                            </div>

                            {item.toppings.length > 0 && (
                                <div className="cart-item-toppings">
                                    {item.toppings.map((tp) => (
                                        <span
                                            key={tp.maTopping}
                                            className="item-topping"
                                        >
                                            {tp.tenTopping}

                                            {tp.giaThem > 0 && (
                                                <>
                                                    {" "}
                                                    +
                                                    {formatMoney(
                                                        tp.giaThem
                                                    )}
                                                </>
                                            )}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {item.ghiChu && (
                                <p className="item-note">
                                    <MessageSquareText size={14} />

                                    <span>{item.ghiChu}</span>
                                </p>
                            )}

                            <div className="cart-item-footer">
                                <button
                                    type="button"
                                    className="edit-item-options-btn"
                                    disabled={
                                        busy ||
                                        openingOptionsId !== null
                                    }
                                    onClick={() =>
                                        void openEditOptions(item)
                                    }
                                >
                                    <SlidersHorizontal size={14} />

                                    {openingOptionsId ===
                                    item.maChiTietGioHang
                                        ? "Đang tải..."
                                        : "Sửa tùy chọn"}
                                </button>

                                <div className="item-actions">
                                    <div className="qty-control">
                                        <button
                                            type="button"
                                            aria-label="Giảm số lượng"
                                            disabled={
                                                busy ||
                                                item.soLuong <= 1
                                            }
                                            onClick={() =>
                                                handleUpdateQty(
                                                    item.maChiTietGioHang,
                                                    item.soLuong,
                                                    -1
                                                )
                                            }
                                        >
                                            <Minus size={15} />
                                        </button>

                                        <span
                                            key={item.soLuong}
                                            className="cart-qty-value"
                                        >
                                            {item.soLuong}
                                        </span>

                                        <button
                                            type="button"
                                            aria-label="Tăng số lượng"
                                            disabled={busy}
                                            onClick={() =>
                                                handleUpdateQty(
                                                    item.maChiTietGioHang,
                                                    item.soLuong,
                                                    1
                                                )
                                            }
                                        >
                                            <Plus size={15} />
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        className="remove-btn"
                                        aria-label={`Xóa ${item.tenMonAn}`}
                                        disabled={busy}
                                        onClick={() =>
                                            handleRemove(
                                                item.maChiTietGioHang
                                            )
                                        }
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </section>

        <aside className="cart-summary">
            <div className="cart-summary-heading">
                <ReceiptText size={18} />

                <div>
                    <span>Thông tin thanh toán</span>
                    <h2>Tóm tắt đơn hàng</h2>
                </div>
            </div>

            <div className="cart-summary-content">
                <div className="summary-row">
                    <span>Số lượng món</span>
                    <strong>{cart.soLuongMon} món</strong>
                </div>

                <div className="summary-row">
                    <span>Tạm tính</span>

                    <strong>
                        {formatMoney(cart.tongTienTamTinh)}
                    </strong>
                </div>
            </div>

            <div className="cart-summary-note">
                Phí giao hàng và khuyến mãi sẽ được tính
                ở bước thanh toán.
            </div>

            <div className="summary-row total">
                <span>Tổng tạm tính</span>

                <strong
                    key={cart.tongTienTamTinh}
                    className="cart-value-change"
                >
                    {formatMoney(cart.tongTienTamTinh)}
                </strong>
            </div>

            <button
                type="button"
                className="checkout-btn"
                disabled={busy}
                onClick={handleCheckout}
            >
                <span>Tiếp tục thanh toán</span>
                <ArrowRight size={17} />
            </button>

            <Link
                to={`/nha-hang/${cart.maNhaHang}`}
                className="cart-continue-shopping"
            >
                Chọn thêm món
            </Link>
        </aside>
    </div>
</div>

            {editingFood && (
    <div
        className="food-option-overlay"
        onMouseDown={closeEditOptions}
    >
        <section
            className="food-option-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-food-title"
            onMouseDown={(event) =>
                event.stopPropagation()
            }
        >
            <button
                type="button"
                className="food-option-close"
                aria-label="Đóng form chỉnh sửa"
                disabled={busy}
                onClick={closeEditOptions}
            >
                <X size={18} />
            </button>

            <div className="food-option-header">
                <span className="food-option-eyebrow">
                    Chỉnh sửa tùy chọn
                </span>

                <h2 id="edit-food-title">
                    {editingFood.tenMonAn}
                </h2>

                <p>
                    Thay đổi topping hoặc ghi chú cho món
                    ăn trong giỏ hàng.
                </p>

                <div className="food-option-price">
                    {formatMoney(
                        editingFood.gia +
                            editingToppingTotal
                    )}
                    <small> / món</small>
                </div>
            </div>

            <div className="food-option-body">
                {editingFood.nhomToppings.length === 0 && (
                    <div className="no-topping-message">
                        <UtensilsCrossed size={18} />

                        <div>
                            <strong>Không có topping</strong>

                            <p>
                                Món này hiện không có topping
                                để lựa chọn.
                            </p>
                        </div>
                    </div>
                )}

                {editingFood.nhomToppings.map(
                    (group) => (
                        <div
                            key={group.maNhomTopping}
                            className="topping-group"
                        >
                            <div className="topping-group-title">
                                <div>
                                    <h3>{group.tenNhom}</h3>

                                    {group.chonToiDa ? (
                                        <p>
                                            Chọn tối đa{" "}
                                            {group.chonToiDa} lựa chọn
                                        </p>
                                    ) : (
                                        <p>
                                            Chọn topping bạn muốn
                                        </p>
                                    )}
                                </div>

                                <span
                                    className={
                                        group.batBuocChon
                                            ? "required"
                                            : "optional"
                                    }
                                >
                                    {group.batBuocChon
                                        ? "Bắt buộc"
                                        : "Tùy chọn"}
                                </span>
                            </div>

                            <div className="topping-options">
                                {group.toppings.map(
                                    (topping) => (
                                        <label
                                            key={
                                                topping.maTopping
                                            }
                                            className="topping-option"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={editingToppings.includes(
                                                    topping.maTopping
                                                )}
                                                onChange={() =>
                                                    toggleEditingTopping(
                                                        topping.maTopping,
                                                        group
                                                    )
                                                }
                                            />

                                            <span className="topping-option-name">
                                                {
                                                    topping.tenTopping
                                                }
                                            </span>

                                            <strong>
                                                {topping.giaThem >
                                                0
                                                    ? `+${formatMoney(
                                                          topping.giaThem
                                                      )}`
                                                    : "Miễn phí"}
                                            </strong>
                                        </label>
                                    )
                                )}
                            </div>
                        </div>
                    )
                )}

                <label className="food-note-field">
                    <div className="food-note-heading">
                        <span>
                            <MessageSquareText size={16} />
                            Ghi chú cho quán
                        </span>

                        <small>
                            {editingNote.length}/300
                        </small>
                    </div>

                    <textarea
                        value={editingNote}
                        maxLength={300}
                        rows={3}
                        placeholder="Ví dụ: ít cay, không hành, để sốt riêng..."
                        onChange={(event) =>
                            setEditingNote(
                                event.target.value
                            )
                        }
                    />
                </label>

                {editingError && (
                    <p className="food-option-error">
                        <CircleAlert size={15} />
                        <span>{editingError}</span>
                    </p>
                )}
            </div>

            <div className="food-option-footer edit-options-footer">
                <button
                    type="button"
                    className="food-add-confirm edit-save-confirm"
                    disabled={busy}
                    onClick={() =>
                        void handleSaveOptions()
                    }
                >
                    <Save size={17} />

                    <span>
                        {busy
                            ? "Đang lưu..."
                            : "Lưu thay đổi"}
                    </span>

                    {!busy && (
                        <strong>
                            {formatMoney(
                                editingFood.gia +
                                    editingToppingTotal
                            )}
                        </strong>
                    )}
                </button>
            </div>
        </section>
    </div>
)}
        </main>
    );
}

export default Cart;
