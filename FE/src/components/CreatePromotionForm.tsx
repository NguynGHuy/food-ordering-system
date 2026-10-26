import { useState, type FormEvent } from "react";
import {
    CalendarDays,
    CircleDollarSign,
    Save,
    TicketPercent,
    X,
} from "lucide-react";
import {
    createPromotion,
    createSystemPromotion,
} from "../services/promotionService";

interface Props {
    onCreated?: () => Promise<void>;
    onCancel?: () => void;
    admin?: boolean;
}

type DiscountType = "PhanTram" | "SoTien";

function CreatePromotionForm({
    onCreated,
    onCancel,
    admin = false,
}: Props) {
    const [maCode, setMaCode] = useState("");
    const [moTa, setMoTa] = useState("");
    const [loaiGiam, setLoaiGiam] =
        useState<DiscountType>("PhanTram");
    const [giaTriGiam, setGiaTriGiam] = useState(10);
    const [giamToiDa, setGiamToiDa] = useState("");
    const [donHangToiThieu, setDonHangToiThieu] = useState(0);
    const [soLuong, setSoLuong] = useState(100);
    const [soLuotToiDaMoiKhach, setSoLuotToiDaMoiKhach] = useState(1);
    const [ngayBatDau, setNgayBatDau] = useState("");
    const [ngayKetThuc, setNgayKetThuc] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();
        setError("");
        setSuccess("");

        const start = new Date(ngayBatDau).getTime();
        const end = new Date(ngayKetThuc).getTime();

        if (!maCode.trim()) {
            setError("Vui lòng nhập mã giảm giá.");
            return;
        }

        if (
            !Number.isFinite(start) ||
            !Number.isFinite(end) ||
            end <= start
        ) {
            setError(
                "Thời gian kết thúc phải sau thời gian bắt đầu."
            );
            return;
        }

        if (giaTriGiam <= 0) {
            setError("Giá trị giảm phải lớn hơn 0.");
            return;
        }

        if (loaiGiam === "PhanTram" && giaTriGiam > 100) {
            setError(
                "Mức giảm phần trăm không được vượt quá 100%."
            );
            return;
        }

        if (donHangToiThieu < 0 || soLuong < 1 || soLuotToiDaMoiKhach < 1) {
            setError(
                "Điều kiện đơn và số lượng mã không hợp lệ."
            );
            return;
        }

        if (busy) return;

        if (!/^[A-Z0-9_-]{1,30}$/i.test(maCode.trim())) {
            setError("Mã chỉ gồm chữ không dấu, số, dấu - hoặc _.");
            return;
        }

        if (
            !Number.isInteger(giaTriGiam) ||
            !Number.isInteger(donHangToiThieu) ||
            !Number.isInteger(soLuong) ||
            !Number.isInteger(soLuotToiDaMoiKhach)
        ) {
            setError("Giá trị giảm, đơn tối thiểu và số lượng phải là số nguyên.");
            return;
        }

        if (moTa.trim().length > 200) {
            setError("Mô tả không được vượt quá 200 ký tự.");
            return;
        }

        if (end <= Date.now()) {
            setError("Không thể tạo mã đã hết hạn.");
            return;
        }

        if (
            loaiGiam === "PhanTram" &&
            giamToiDa !== "" &&
            (!Number.isInteger(Number(giamToiDa)) ||
                Number(giamToiDa) <= 0)
        ) {
            setError("Giảm tối đa phải là số nguyên lớn hơn 0 hoặc để trống.");
            return;
        }

        try {
            setBusy(true);

            const payload = {
                maCode: maCode.trim().toUpperCase(),
                moTa: moTa.trim() || null,
                loaiGiam,
                giaTriGiam,
                giamToiDa:
                    loaiGiam === "PhanTram" &&
                    giamToiDa !== ""
                        ? Number(giamToiDa)
                        : null,
                donHangToiThieu,
                soLuong,
                soLuotToiDaMoiKhach,
                ngayBatDau,
                ngayKetThuc,
            };

            if (admin) {
                await createSystemPromotion(payload);
            } else {
                await createPromotion(payload);
            }

            setSuccess("Đã tạo mã giảm giá.");

            if (onCreated) {
                await onCreated();
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Không thể tạo mã giảm giá."
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <form
            className="merchant-promo-form"
            onSubmit={handleSubmit}
        >
            <header className="merchant-promo-form-header">
                <div>
                    <span>CHƯƠNG TRÌNH MỚI</span>
                    <h2>Tạo mã giảm giá</h2>
                    <p>
                        Thiết lập ưu đãi và thời gian sử dụng mã.
                    </p>
                </div>

                {onCancel && (
                    <button
                        type="button"
                        aria-label="Đóng"
                        onClick={onCancel}
                        disabled={busy}
                    >
                        <X size={18} />
                    </button>
                )}
            </header>

            <div className="merchant-promo-form-body">
                <label className="merchant-promo-field">
                    <span>Mã giảm giá</span>
                    <div className="merchant-promo-icon-input">
                        <TicketPercent size={16} />
                        <input
                            required
                            autoFocus
                            maxLength={30}
                            value={maCode}
                            placeholder="Ví dụ: FOODIE20"
                            onChange={(event) =>
                                setMaCode(
                                    event.target.value.toUpperCase()
                                )
                            }
                        />
                    </div>
                </label>

                <label className="merchant-promo-field">
                    <span>Loại giảm</span>
                    <select
                        value={loaiGiam}
                        onChange={(event) => {
                            setLoaiGiam(
                                event.target.value as DiscountType
                            );
                            setGiamToiDa("");
                        }}
                    >
                        <option value="PhanTram">
                            Giảm theo phần trăm
                        </option>
                        <option value="SoTien">
                            Giảm số tiền cố định
                        </option>
                    </select>
                </label>

                <label className="merchant-promo-field">
                    <span>
                        Giá trị giảm{" "}
                        {loaiGiam === "PhanTram" ? "(%)" : "(đ)"}
                    </span>
                    <input
                        required
                        type="number"
                        min={1}
                        max={
                            loaiGiam === "PhanTram"
                                ? 100
                                : undefined
                        }
                        value={giaTriGiam}
                        onChange={(event) =>
                            setGiaTriGiam(
                                Number(event.target.value)
                            )
                        }
                    />
                </label>

                {loaiGiam === "PhanTram" && (
                    <label className="merchant-promo-field">
                        <span>Giảm tối đa</span>
                        <div className="merchant-promo-money-input">
                            <CircleDollarSign size={16} />
                            <input
                                type="number"
                                min={0}
                                value={giamToiDa}
                                placeholder="Không giới hạn"
                                onChange={(event) =>
                                    setGiamToiDa(
                                        event.target.value
                                    )
                                }
                            />
                            <strong>đ</strong>
                        </div>
                    </label>
                )}

                <label className="merchant-promo-field">
                    <span>Đơn hàng tối thiểu</span>
                    <div className="merchant-promo-money-input">
                        <CircleDollarSign size={16} />
                        <input
                            required
                            type="number"
                            min={0}
                            step={1000}
                            value={donHangToiThieu}
                            onChange={(event) =>
                                setDonHangToiThieu(
                                    Number(event.target.value)
                                )
                            }
                        />
                        <strong>đ</strong>
                    </div>
                </label>

                <label className="merchant-promo-field">
                    <span>Số lượng mã</span>
                    <input
                        required
                        type="number"
                        min={1}
                        step={1}
                        value={soLuong}
                        onChange={(event) =>
                            setSoLuong(Number(event.target.value))
                        }
                    />
                </label>

                <label className="merchant-promo-field">
                    <span>Số lượt tối đa mỗi khách</span>
                    <input
                        required
                        type="number"
                        min={1}
                        step={1}
                        value={soLuotToiDaMoiKhach}
                        onChange={(event) =>
                            setSoLuotToiDaMoiKhach(Number(event.target.value))
                        }
                    />
                </label>

                <label className="merchant-promo-field">
                    <span>Bắt đầu</span>
                    <div className="merchant-promo-icon-input">
                        <CalendarDays size={16} />
                        <input
                            required
                            type="datetime-local"
                            value={ngayBatDau}
                            onChange={(event) =>
                                setNgayBatDau(event.target.value)
                            }
                        />
                    </div>
                </label>

                <label className="merchant-promo-field">
                    <span>Kết thúc</span>
                    <div className="merchant-promo-icon-input">
                        <CalendarDays size={16} />
                        <input
                            required
                            type="datetime-local"
                            value={ngayKetThuc}
                            onChange={(event) =>
                                setNgayKetThuc(event.target.value)
                            }
                        />
                    </div>
                </label>

                <label className="merchant-promo-field full">
                    <span>Mô tả chương trình</span>
                    <textarea
                        rows={3}
                        maxLength={200}
                        value={moTa}
                        placeholder="Mô tả ngắn về chương trình..."
                        onChange={(event) =>
                            setMoTa(event.target.value)
                        }
                    />
                    <small>{moTa.length}/300 ký tự</small>
                </label>

                {error && (
                    <p className="merchant-promo-form-error">
                        {error}
                    </p>
                )}

                {success && (
                    <p className="merchant-promo-form-success">
                        ✓ {success}
                    </p>
                )}
            </div>

            <footer className="merchant-promo-form-footer">
                {onCancel && (
                    <button
                        type="button"
                        className="cancel"
                        onClick={onCancel}
                        disabled={busy}
                    >
                        Hủy
                    </button>
                )}

                <button
                    type="submit"
                    className="save"
                    disabled={busy}
                >
                    <Save size={15} />
                    {busy ? "Đang tạo..." : "Tạo mã"}
                </button>
            </footer>
        </form>
    );
}

export default CreatePromotionForm;
