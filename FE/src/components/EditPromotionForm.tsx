import { useState, type FormEvent } from "react";
import {
    CalendarDays,
    Save,
    TicketPercent,
    X,
} from "lucide-react";
import {
    updatePromotion,
    type Promotion,
    type UpdatePromotionRequest,
} from "../services/promotionService";

interface Props {
    promotion: Promotion;
    onSaved: (promotion: Promotion) => void;
    onCancel: () => void;
}

function EditPromotionForm({
    promotion,
    onSaved,
    onCancel,
}: Props) {
    const [moTa, setMoTa] = useState(promotion.moTa ?? "");
    const [soLuong, setSoLuong] = useState(promotion.soLuong);
    const [soLuotToiDaMoiKhach, setSoLuotToiDaMoiKhach] = useState(
        promotion.soLuotToiDaMoiKhach ?? 1
    );
    const [ngayBatDau, setNgayBatDau] = useState(
        promotion.ngayBatDau.slice(0, 16)
    );
    const [ngayKetThuc, setNgayKetThuc] = useState(
        promotion.ngayKetThuc.slice(0, 16)
    );
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();
        if (busy) return;

        setError("");

        if (!Number.isInteger(soLuotToiDaMoiKhach) || soLuotToiDaMoiKhach < 1) {
            setError("Số lượt tối đa mỗi khách phải là số nguyên dương.");
            return;
        }

        if (
            !Number.isInteger(soLuong) ||
            soLuong <
                Math.max(1, promotion.soLuongDaDung)
        ) {
            setError(
                "Số lượng phải là số nguyên dương và không nhỏ hơn số lượt đã dùng."
            );
            return;
        }

        const start = new Date(ngayBatDau).getTime();
        const end = new Date(ngayKetThuc).getTime();

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

        const payload: UpdatePromotionRequest = {
            moTa: moTa.trim() || null,
            soLuong,
            soLuotToiDaMoiKhach,
            ngayBatDau,
            ngayKetThuc,
        };

        try {
            setBusy(true);
            await updatePromotion(
                promotion.maKhuyenMai,
                payload
            );

            onSaved({ ...promotion, ...payload });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Không cập nhật được mã giảm giá."
            );
        } finally {
            setBusy(false);
        }
    };

    const discountText =
        promotion.loaiGiam === "PhanTram"
            ? `${promotion.giaTriGiam}%`
            : `${promotion.giaTriGiam.toLocaleString(
                  "vi-VN"
              )} đ`;

    return (
        <form
            className="merchant-promo-form edit"
            onSubmit={handleSubmit}
        >
            <header className="merchant-promo-form-header">
                <div>
                    <span>CHỈNH SỬA KHUYẾN MÃI</span>
                    <h2>Mã {promotion.maCode}</h2>
                    <p>
                        Chỉ cập nhật nội dung, số lượng và thời gian.
                    </p>
                </div>

                <button
                    type="button"
                    aria-label="Đóng"
                    onClick={onCancel}
                    disabled={busy}
                >
                    <X size={18} />
                </button>
            </header>

            <div className="merchant-promo-edit-summary">
                <span>
                    <TicketPercent size={17} />
                </span>

                <div>
                    <small>Mức giảm hiện tại</small>
                    <strong>{discountText}</strong>
                </div>

                <div>
                    <small>Đã sử dụng</small>
                    <strong>
                        {promotion.soLuongDaDung}/
                        {promotion.soLuong}
                    </strong>
                </div>
            </div>

            <fieldset
                className="merchant-promo-form-body edit"
                disabled={busy}
            >
                <label className="merchant-promo-field full">
                    <span>Mô tả chương trình</span>
                    <textarea
                        rows={3}
                        maxLength={200}
                        value={moTa}
                        onChange={(event) =>
                            setMoTa(event.target.value)
                        }
                    />
                    <small>{moTa.length}/300 ký tự</small>
                </label>

                <label className="merchant-promo-field full">
                    <span>
                        Tổng số lượng — đã dùng{" "}
                        {promotion.soLuongDaDung}
                    </span>
                    <input
                        required
                        type="number"
                        min={Math.max(
                            1,
                            promotion.soLuongDaDung
                        )}
                        step={1}
                        value={soLuong}
                        onChange={(event) =>
                            setSoLuong(
                                Number(event.target.value)
                            )
                        }
                    />
                </label>

                <label className="merchant-promo-field full">
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
                                setNgayBatDau(
                                    event.target.value
                                )
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
                                setNgayKetThuc(
                                    event.target.value
                                )
                            }
                        />
                    </div>
                </label>

                {error && (
                    <p className="merchant-promo-form-error">
                        {error}
                    </p>
                )}
            </fieldset>

            <footer className="merchant-promo-form-footer">
                <button
                    type="button"
                    className="cancel"
                    onClick={onCancel}
                    disabled={busy}
                >
                    Hủy
                </button>

                <button
                    type="submit"
                    className="save"
                    disabled={busy}
                >
                    <Save size={15} />
                    {busy ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
            </footer>
        </form>
    );
}

export default EditPromotionForm;
