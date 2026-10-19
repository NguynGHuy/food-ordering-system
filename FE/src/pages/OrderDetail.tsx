import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getOrderById, getOrderStatusHistory } from "../services/orderService";
import { getCustomerProfile } from "../services/customerService";
import OrderReviewPanel from "../components/OrderReviewPanel";
import PaymentQr from "../components/PaymentQr";
import { getRestaurantById } from "../services/restaurantService";
import {
    ArrowLeft,
    Banknote,
    Bike,
    Check,
    Clock3,
    History,
    MapPin,
    MessageSquareText,
    ReceiptText,
    RefreshCw,
    ShieldCheck,
    Smartphone,
    Star,
    Store,
    UtensilsCrossed,
    Wallet,
    XCircle,
} from "lucide-react";
import {
    changePaymentMethod,
    getPaymentMethods,
    getPaymentsByOrder,
    simulatePayment,
} from "../services/paymentService";
import type {
    OrderDetails,
    OrderStatusHistory,
} from "../services/orderService";

const FLOW = [
    { code: "ChoXacNhan", label: "Chờ xác nhận", hint: "Quán sẽ xác nhận đơn trong ít phút." },
    { code: "DaXacNhan", label: "Đã xác nhận", hint: "Quán đã nhận đơn của bạn." },
    { code: "DangChuanBi", label: "Đang chuẩn bị", hint: "Quán đang chuẩn bị món." },
    { code: "DangGiao", label: "Đang giao", hint: "Đơn đang trên đường giao tới bạn." },
    { code: "HoanThanh", label: "Hoàn thành", hint: "Đơn đã giao thành công." },
];

const STATUS_LABEL: Record<string, string> = {
    ChoXacNhan: "Chờ xác nhận",
    DaXacNhan: "Đã xác nhận",
    DangChuanBi: "Đang chuẩn bị",
    DangGiao: "Đang giao",
    HoanThanh: "Hoàn thành",
    DaHuy: "Đã hủy",
};

function formatMoney(value: number) {
    return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

interface ReviewDish {
    maMonAn: number;
    tenMonAn: string;
}

interface ThanhToanDon {
    maThanhToan: number;
    maPhuongThuc: number;
    tenPhuongThuc: string;
    trangThaiThanhToan: string;
}

interface PhuongThucThanhToan {
    maPhuongThuc: number;
    tenPhuongThuc: string;
}

const PAYMENT_LABEL: Record<string, string> = {
    ChoThanhToan: "Chờ thanh toán",
    ThanhCong: "Thành công",
    ThatBai: "Thất bại",
};

function OrderDetail() {
    const { id } = useParams();
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [history, setHistory] = useState<OrderStatusHistory[]>([]);
    const [loadedId, setLoadedId] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [showReview, setShowReview] = useState(false);
    const [payments, setPayments] = useState<ThanhToanDon[]>([]);
    const [methods, setMethods] = useState<PhuongThucThanhToan[]>([]);
    const [paymentVersion, setPaymentVersion] = useState(0);
    const [showRetry, setShowRetry] = useState(false);
    const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
    const [retrying, setRetrying] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [qrBusy, setQrBusy] = useState(false);
    const [qrPaymentId, setQrPaymentId] = useState<number | null>(null);
    const [qrMethodName, setQrMethodName] = useState("");
    const [soDuVi, setSoDuVi] = useState(0);

    useEffect(() => {
    const maDonHang = Number(id);

    if (!id || !Number.isInteger(maDonHang) || maDonHang <= 0) {
        return;
    }

    let cancelled = false;

    const load = async (background = false) => {
        try {
            const [orderData, historyData] = await Promise.all([
                getOrderById(maDonHang),
                getOrderStatusHistory(maDonHang),
            ]);

            let paymentData: ThanhToanDon[] = [];
            let methodData: PhuongThucThanhToan[] = [];

            try {
                const rawPayments = await getPaymentsByOrder(maDonHang);
                paymentData = Array.isArray(rawPayments)
                    ? rawPayments
                    : [];
            } catch {
                paymentData = [];
            }

            try {
                const rawMethods = await getPaymentMethods();
                methodData = Array.isArray(rawMethods)
                    ? rawMethods
                    : [];
            } catch {
                methodData = [];
            }

            try {
                const profile = await getCustomerProfile() as { diemTichLuy: number };
                if (!cancelled) {
                    setSoDuVi(Number(profile.diemTichLuy ?? 0));
                }
            } catch {
                if (!cancelled) setSoDuVi(0);
            }

            if (cancelled) return;

            setOrder(orderData);
            setHistory(historyData);
            setPayments(paymentData);
            setMethods(methodData);
            setError("");
        } catch (err) {
            if (cancelled || background) return;

            setError(
                err instanceof Error
                    ? err.message
                    : "Không tải được đơn hàng."
            );
            setOrder(null);
            setHistory([]);
            setPayments([]);
        } finally {
            if (!cancelled && !background) {
                setLoadedId(id);
            }
        }
    };

    const handleRealtimeUpdate = () => {
        void load(true);
    };

    void load();

    window.addEventListener(
        "customer-orders-updated",
        handleRealtimeUpdate
    );

    return () => {
        cancelled = true;

        window.removeEventListener(
            "customer-orders-updated",
            handleRealtimeUpdate
        );
    };
}, [id, paymentVersion]);
    useEffect(() => {
    if (!order) return;

    const elements = Array.from(
        document.querySelectorAll<HTMLElement>(
            [
                ".order-detail-page .order-detail-card",
                ".order-detail-page .order-review-callout",
                ".order-detail-page .order-detail-review-panel",
            ].join(",")
        )
    );

    elements.forEach((element, index) => {
        element.classList.add("order-detail-reveal");

        element.style.setProperty(
            "--order-reveal-delay",
            `${Math.min(index, 5) * 0.12}s`
        );
    });

    if (typeof IntersectionObserver === "undefined") {
        const frame = requestAnimationFrame(() => {
            elements.forEach((element) => {
                element.classList.add("is-visible");
            });
        });

        return () => {
            cancelAnimationFrame(frame);
        };
    }

    let observer: IntersectionObserver | null = null;
    let firstFrame = 0;
    let secondFrame = 0;

    firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => {
            observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (!entry.isIntersecting) return;

                        entry.target.classList.add("is-visible");
                        observer?.unobserve(entry.target);
                    });
                },
                {
                    threshold: 0.12,
                    rootMargin: "0px 0px -45px 0px",
                }
            );

            elements.forEach((element) => {
                observer?.observe(element);
            });
        });
    });

    return () => {
        cancelAnimationFrame(firstFrame);
        cancelAnimationFrame(secondFrame);
        observer?.disconnect();
    };
}, [order?.maDonHang, showReview]);
    const latestPayment = [...payments].sort(
        (a, b) => b.maThanhToan - a.maThanhToan
    )[0];

    const handleRetry = async () => {
        if (!order || !latestPayment || selectedMethodId === null) return;

        const method = methods.find((item) => item.maPhuongThuc === selectedMethodId);
        if (!method) return;

        try {
            setRetrying(true);
            const nhaHang =
    await getRestaurantById(
        order.maNhaHang
    );

            if (!nhaHang.dangMoCua) {
                alert(
                    nhaHang.trangThaiHienThi ||
                    "Nhà hàng hiện không nhận đơn."
                );
                return;
            }

            const created = await changePaymentMethod(
                latestPayment.maThanhToan,
                method.maPhuongThuc
            );
            const newPaymentId = Number(created.maThanhToanMoi);

            if (method.tenPhuongThuc === "COD" || method.tenPhuongThuc === "FoodPay") {
                setShowRetry(false);
                setPaymentVersion((current) => current + 1);
                return;
            }

            setQrPaymentId(newPaymentId);
            setQrMethodName(method.tenPhuongThuc);
            setShowQr(true);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Không đổi được phương thức thanh toán.");
        } finally {
            setRetrying(false);
        }
    };

    const handleQrSuccess = async () => {
        if (qrPaymentId === null) return;
        try {
            setQrBusy(true);
            await simulatePayment(qrPaymentId, "ThanhCong");
            setShowQr(false);
            setShowRetry(false);
            setPaymentVersion((current) => current + 1);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Không cập nhật được thanh toán.");
        } finally {
            setQrBusy(false);
        }
    };

    const handleQrFail = async () => {
        if (qrPaymentId === null) return;
        try {
            setQrBusy(true);
            await simulatePayment(qrPaymentId, "ThatBai");
            setShowQr(false);
            setShowRetry(false);
            setPaymentVersion((current) => current + 1);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Không cập nhật được thanh toán.");
        } finally {
            setQrBusy(false);
        }
    };

    const maDonHang = Number(id);

    if (!id || !Number.isInteger(maDonHang) || maDonHang <= 0) {
        return (
            <main className="profile-page">
                <p className="auth-error">Mã đơn hàng không hợp lệ.</p>
                <Link to="/don-hang">← Về danh sách đơn hàng</Link>
            </main>
        );
    }

    if (loadedId !== id) {
        return (
            <div
                className="loading-spinner"
                style={{ margin: "100px auto" }}
            />
        );
    }

    const currentIndex = FLOW.findIndex((step) => step.code === order?.trangThai);
    const latestNote = history.length > 0 ? history[history.length - 1].ghiChu : "";
    const statusHint =
        order?.trangThai === "DaHuy"
            ? latestNote || "Đơn hàng đã được hủy."
            : latestNote || FLOW[currentIndex]?.hint || "";

    // Một món có thể xuất hiện nhiều dòng do chọn topping khác nhau.
    // Chỉ hiển thị một form đánh giá cho mỗi món.
    const reviewDishes: ReviewDish[] = order?.chiTiet ?? [];

    const uniqueReviewDishes = reviewDishes.filter(
        (dish, index, dishes) =>
            dish.maMonAn > 0 &&
            dishes.findIndex((item) => item.maMonAn === dish.maMonAn) === index
    );

    return (
        <main className="profile-page order-detail-page">
            <Link
                to="/don-hang"
                className="order-detail-back"
            >
                <ArrowLeft size={16} />
                Đơn hàng của tôi
            </Link>
            {error || !order ? (
                <div className="empty-result">
                    <h3>{error || "Không tìm thấy đơn hàng."}</h3>
                    <Link to="/don-hang" className="menu-button" style={{ display: "inline-flex", marginTop: 15 }}>
                        Quay lại danh sách
                    </Link>
                </div>
            ) : (
                <article className="order-detail-shell">
                    <header
                        className={`order-detail-hero status-${order.trangThai}`}
                    >
                        <div className="order-detail-hero-top">
                            <div className="order-detail-hero-content">
                                <span className="order-detail-eyebrow">
                                    Chi tiết đơn hàng
                                </span>

                                <div className="order-detail-title-row">
                                    <h1>
                                        {order.maDonHangHienThi}
                                    </h1>

                                    <span
                                        className={`order-detail-status status-${order.trangThai}`}
                                    >
                                        {STATUS_LABEL[order.trangThai] ||
                                            order.trangThai}
                                    </span>
                                </div>

                                {statusHint && (
                                    <p className="order-detail-status-hint">
                                        {statusHint}
                                    </p>
                                )}

                                <div className="order-detail-hero-meta">
                                    <span>
                                        <Store size={14} />
                                        {order.tenNhaHang}
                                    </span>

                                    <span>
                                        <Clock3 size={14} />

                                        {new Date(
                                            order.thoiGianDat
                                        ).toLocaleString("vi-VN")}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {order.trangThai === "DaHuy" ? (
                            <div className="order-cancelled-panel">
                                <span>
                                    <XCircle size={20} />
                                </span>

                                <div>
                                    <strong>Đơn hàng đã bị hủy</strong>

                                    <p>
                                        {latestNote ||
                                            "Đơn hàng không còn được tiếp tục xử lý."}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="order-progress-wrap">
                                <ol className="order-progress">
                                    {FLOW.map((step, index) => {
                                        const reached =
                                            currentIndex >= 0 &&
                                            index <= currentIndex;

                                        const passed =
                                            currentIndex >= 0 &&
                                            index < currentIndex;

                                        const current =
                                            index === currentIndex;

                                        return (
                                            <li
                                                key={step.code}
                                                className={`order-progress-step${
                                                    reached
                                                        ? " is-reached"
                                                        : ""
                                                }${
                                                    passed
                                                        ? " is-passed"
                                                        : ""
                                                }${
                                                    current
                                                        ? " is-current"
                                                        : ""
                                                }`}
                                            >
                                                <div className="order-progress-marker">
                                                    {reached ? (
                                                        <Check size={14} />
                                                    ) : (
                                                        <span>
                                                            {index + 1}
                                                        </span>
                                                    )}
                                                    {current && step.code === "DangGiao" && (
                                                        <span className="order-delivery-bike-badge" aria-label="Shipper đang giao món">
                                                            <Bike size={18} />
                                                        </span>
                                                    )}
                                                </div>

                                                <span className="order-progress-label">
                                                    {step.label}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ol>
                            </div>
                        )}
                    </header>

                        <div className="order-detail-layout">
    <div className="order-detail-main-column">
        <section className="order-detail-card order-detail-items-card">
            <div className="order-detail-section-heading">
                <span className="order-detail-section-icon">
                    <UtensilsCrossed size={18} />
                </span>

                <div>
                    <h2>Món đã đặt</h2>
                    <p>
                        {order.chiTiet?.length ?? 0} dòng món trong đơn hàng
                    </p>
                </div>
            </div>

            <div className="order-detail-food-list">
                {(order.chiTiet || []).map((ct, index) => (
                    <article
                        key={`${ct.maMonAn}-${index}`}
                        className="order-detail-food-item"
                    >
                        <span className="order-detail-food-number">
                            {index + 1}
                        </span>

                        <div className="order-detail-food-info">
                            <div className="order-detail-food-name">
                                <h3>{ct.tenMonAn}</h3>
                                <span>x{ct.soLuong}</span>
                            </div>

                            {(ct.toppings || []).length > 0 && (
                                <div className="order-detail-toppings">
                                    {(ct.toppings || []).map(
                                        (tp, toppingIndex) => (
                                            <span
                                                key={`${tp.tenTopping}-${toppingIndex}`}
                                            >
                                                + {tp.tenTopping}
                                                {tp.soLuong > 1
                                                    ? ` x${tp.soLuong}`
                                                    : ""}
                                            </span>
                                        )
                                    )}
                                </div>
                            )}
                        </div>

                        <strong className="order-detail-food-price">
                            {formatMoney(ct.thanhTien)}
                        </strong>
                    </article>
                ))}
            </div>
        </section>

        <section className="order-detail-card">
            <div className="order-detail-section-heading">
                <span className="order-detail-section-icon">
                    <MapPin size={18} />
                </span>

                <div>
                    <h2>Thông tin giao hàng</h2>
                    <p>Địa chỉ nhận món của đơn hàng</p>
                </div>
            </div>

            <div className="order-delivery-content">
                <div className="order-delivery-recipient">
                    <div>
                        <span>Người nhận</span>
                        <strong>{order.tenNguoiNhan}</strong>
                    </div>

                    <div>
                        <span>Số điện thoại</span>
                        <strong>{order.soDienThoaiNhan}</strong>
                    </div>
                </div>

                <div className="order-delivery-address">
                    <MapPin size={16} />
                    <p>{order.diaChiGiaoHang}</p>
                </div>

                {order.ghiChu && (
                    <div className="order-delivery-note">
                        <MessageSquareText size={16} />

                        <div>
                            <span>Ghi chú</span>
                            <p>{order.ghiChu}</p>
                        </div>
                    </div>
                )}
            </div>
        </section>

        <section className="order-detail-card">
            <div className="order-detail-section-heading order-history-heading">
                <span className="order-detail-section-icon">
                    <History size={18} />
                </span>

                <div>
                    <h2>Lịch sử đơn hàng</h2>
                    <p>Theo dõi quá trình xử lý đơn</p>
                </div>

                <span className="order-detail-code">
                    {order.maDonHangHienThi}
                </span>
            </div>

            {history.length === 0 ? (
                <p className="order-detail-empty-history">
                    Chưa có lịch sử trạng thái.
                </p>
            ) : (
                <ul className="order-detail-history">
                    {[...history].reverse().map((item, index) => (
                        <li
                            key={item.maLichSu}
                            className={index === 0 ? "is-latest" : ""}
                        >
                            <span className="order-history-dot">
                                {index === 0 && <Check size={12} />}
                            </span>

                            <div className="order-history-content">
                                <div>
                                    <strong>
                                        {STATUS_LABEL[item.tenTrangThai] ||
                                            item.tenTrangThai}
                                    </strong>

                                    {index === 0 && (
                                        <span className="order-history-latest">
                                            Mới nhất
                                        </span>
                                    )}
                                </div>

                                <time>
                                    {new Date(
                                        item.thoiGianTao
                                    ).toLocaleString("vi-VN")}
                                </time>

                                {item.ghiChu && <p>{item.ghiChu}</p>}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    </div>

    <aside className="order-detail-side-column">
        <section className="order-detail-card order-detail-money-card">
            <div className="order-detail-section-heading">
                <span className="order-detail-section-icon">
                    <ReceiptText size={18} />
                </span>

                <div>
                    <h2>Thanh toán</h2>
                    <p>Chi tiết số tiền của đơn</p>
                </div>
            </div>

            <div className="order-detail-money-lines">
                <div>
                    <span>Tổng tiền món</span>
                    <strong>{formatMoney(order.tongTienHang)}</strong>
                </div>

                <div>
                    <span>Phí giao hàng</span>
                    <strong>{formatMoney(order.phiShip)}</strong>
                </div>

                <div className="order-detail-discount">
                    <span>Giảm giá</span>
                    <strong>-{formatMoney(order.soTienGiam)}</strong>
                </div>

                <div className="order-detail-grand-total">
                    <span>Thành tiền</span>
                    <strong>{formatMoney(order.thanhTien)}</strong>
                </div>
            </div>
        </section>

        {latestPayment && (
            <section className="order-detail-card order-payment-card">
                <div className="order-payment-heading">
                    <span className="order-payment-icon">
                    {latestPayment.tenPhuongThuc
                        .toUpperCase()
                        .includes("COD") ? (
                        <Banknote size={19} />
                    ) : latestPayment.tenPhuongThuc === "FoodPay" ? (
                        <Wallet size={19} />
                    ) : (
                        <Smartphone size={19} />
                    )}
                    </span>

                    <div>
                        <span>Phương thức thanh toán</span>
                        <strong>{latestPayment.tenPhuongThuc}</strong>
                    </div>

                    <span
                        className={`order-payment-state state-${latestPayment.trangThaiThanhToan}`}
                    >
                        {PAYMENT_LABEL[
                            latestPayment.trangThaiThanhToan
                        ] || latestPayment.trangThaiThanhToan}
                    </span>
                </div>

                {order.trangThai !== "DaHuy" &&
                    latestPayment.trangThaiThanhToan ===
                        "ChoThanhToan" &&
                    latestPayment.tenPhuongThuc !== "COD" &&
                    latestPayment.tenPhuongThuc !== "FoodPay" && (
                        <button
                            type="button"
                            className="order-detail-primary-button"
                            onClick={() => {
                                setQrPaymentId(
                                    latestPayment.maThanhToan
                                );
                                setQrMethodName(
                                    latestPayment.tenPhuongThuc
                                );
                                setShowQr(true);
                            }}
                        >
                            <Smartphone size={17} />
                            Tiếp tục thanh toán
                        </button>
                    )}

                {order.trangThai !== "DaHuy" &&
                    latestPayment.trangThaiThanhToan === "ThatBai" &&
                    (showRetry ? (
                        <div className="order-payment-retry">
                            <p className="order-payment-retry-title">
                                Chọn phương thức thanh toán mới
                            </p>

                            <div className="order-retry-methods">
                                {methods.map((item) => {
                                    const isCod = item.tenPhuongThuc
                                        .toUpperCase()
                                        .includes("COD");
                                    const isFoodPay = item.tenPhuongThuc === "FoodPay";
                                    const khoaFoodPay =
                                        isFoodPay &&
                                        soDuVi < Number(order.thanhTien);

                                    return (
                                        <label
                                            key={item.maPhuongThuc}
                                            className={`order-retry-method ${
                                                selectedMethodId ===
                                                item.maPhuongThuc
                                                    ? "selected"
                                                    : ""
                                            }${khoaFoodPay ? " is-disabled" : ""}`}
                                        >
                                            <input
                                                type="radio"
                                                name="retry-payment"
                                                disabled={khoaFoodPay}
                                                checked={
                                                    selectedMethodId ===
                                                    item.maPhuongThuc
                                                }
                                                onChange={() => {
                                                    if (khoaFoodPay) return;
                                                    setSelectedMethodId(
                                                        item.maPhuongThuc
                                                    );
                                                }}
                                            />

                                            <span className="order-retry-radio" />

                                            <span className="order-retry-icon">
                                                {isCod ? (
                                                    <Banknote size={17} />
                                                ) : isFoodPay ? (
                                                    <Wallet size={17} />
                                                ) : (
                                                    <Smartphone size={17} />
                                                )}
                                            </span>

                                            <span>
                                                <strong>
                                                    {item.tenPhuongThuc}
                                                </strong>

                                                <small>
                                                    {isCod
                                                        ? "Thanh toán khi nhận món"
                                                        : isFoodPay
                                                          ? khoaFoodPay
                                                            ? `Số dư ${soDuVi.toLocaleString("vi-VN")} đ, chưa đủ`
                                                            : `Ví ${soDuVi.toLocaleString("vi-VN")} đ`
                                                          : "Thanh toán trực tuyến"}
                                                </small>
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>

                            <div className="order-retry-actions">
                                <button
                                    type="button"
                                    className="order-detail-primary-button"
                                    onClick={handleRetry}
                                    disabled={
                                        retrying ||
                                        selectedMethodId === null
                                    }
                                >
                                    {retrying
                                        ? "Đang xử lý..."
                                        : "Xác nhận thanh toán"}
                                </button>

                                <button
                                    type="button"
                                    className="order-detail-secondary-button"
                                    onClick={() => setShowRetry(false)}
                                    disabled={retrying}
                                >
                                    Để sau
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="order-detail-primary-button"
                            onClick={() => {
                                setSelectedMethodId(
                                    latestPayment.maPhuongThuc
                                );
                                setShowRetry(true);
                            }}
                        >
                            <RefreshCw size={16} />
                            Chọn cách thanh toán lại
                        </button>
                    ))}

                <div className="order-payment-security">
                    <ShieldCheck size={14} />
                    Thông tin thanh toán được bảo vệ an toàn.
                </div>
            </section>
        )}

        {order.trangThai === "HoanThanh" && (
            <section className="order-review-callout">
                <div className="order-review-callout-content">
                    <span className="order-review-star">
                        <Star size={20} />
                    </span>

                    <div>
                        <strong>Bạn thấy đơn hàng thế nào?</strong>
                        <p>
                            Đánh giá quán và từng món để chia sẻ trải
                            nghiệm.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() =>
                        setShowReview((previous) => !previous)
                    }
                    aria-expanded={showReview}
                    aria-controls="order-review-panel"
                >
                    {showReview ? "Ẩn đánh giá" : "Viết đánh giá"}
                </button>
            </section>
        )}
    </aside>
</div>

{order.trangThai === "HoanThanh" && (
    <section
        id="order-review-panel"
        className="order-detail-review-panel"
        hidden={!showReview}
    >
        <div className="order-detail-section-heading">
            <span className="order-detail-section-icon">
                <Star size={18} />
            </span>

            <div>
                <h2>Đánh giá trải nghiệm</h2>
                <p>Bạn có thể đánh giá nhà hàng và từng món.</p>
            </div>
        </div>

        <OrderReviewPanel
            key={order.maDonHang}
            maDonHang={order.maDonHang}
            maNhaHang={order.maNhaHang}
            tenNhaHang={order.tenNhaHang}
            dishes={uniqueReviewDishes}
        />
    </section>
)}
                </article>
            )}
           {showQr && order && (
    <div
        className="order-qr-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-qr-title"
        onMouseDown={() => {
            if (!qrBusy) {
                setShowQr(false);
            }
        }}
    >
        <section
            className="order-qr-dialog"
            onMouseDown={(event) => event.stopPropagation()}
        >
            <button
                type="button"
                className="order-qr-close"
                aria-label="Đóng cửa sổ thanh toán"
                disabled={qrBusy}
                onClick={() => setShowQr(false)}
            >
                ×
            </button>

            <header className="order-qr-header">
                <span className="order-qr-header-icon">
                    <Smartphone size={21} />
                </span>

                <div>
                    <span>Thanh toán trực tuyến</span>
                    <h2 id="order-qr-title">
                        Thanh toán qua {qrMethodName}
                    </h2>

                    <p>
                        Quét mã bằng ứng dụng thanh toán trên điện thoại.
                    </p>
                </div>
            </header>

            <div className="order-qr-amount">
                <span>Số tiền cần thanh toán</span>
                <strong>{formatMoney(order.thanhTien)}</strong>
            </div>

            <div className="order-qr-code-frame">
                <PaymentQr />
            </div>

            <div className="order-qr-guide">
                <div>
                    <span>1</span>
                    <p>Mở ứng dụng {qrMethodName} trên điện thoại.</p>
                </div>

                <div>
                    <span>2</span>
                    <p>Quét mã QR và kiểm tra đúng số tiền.</p>
                </div>

                <div>
                    <span>3</span>
                    <p>
                        Sau khi hoàn tất, nhấn nút xác nhận bên dưới.
                    </p>
                </div>
            </div>

            <div className="order-qr-actions">
                <button
                    type="button"
                    className="order-qr-success-button"
                    onClick={handleQrSuccess}
                    disabled={qrBusy}
                >
                    <Check size={17} />

                    {qrBusy
                        ? "Đang xử lý..."
                        : "Tôi đã thanh toán"}
                </button>

                <button
                    type="button"
                    className="order-qr-failed-button"
                    onClick={handleQrFail}
                    disabled={qrBusy}
                >
                    <XCircle size={16} />
                    Thanh toán thất bại
                </button>
            </div>

            <button
                type="button"
                className="order-qr-later-button"
                disabled={qrBusy}
                onClick={() => setShowQr(false)}
            >
                Thanh toán sau
            </button>

            <div className="order-qr-security">
                <ShieldCheck size={14} />

                <span>
                    Đây là thanh toán mô phỏng phục vụ cho đồ án.
                </span>
            </div>
        </section>
    </div>
)}
        </main>
    );
}

export default OrderDetail;
