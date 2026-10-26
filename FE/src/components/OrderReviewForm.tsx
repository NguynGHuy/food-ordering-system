import { useId, useState } from "react";
import type { SyntheticEvent } from "react";
import {
    CheckCircle2,
    MessageSquareText,
    Send,
    Store,
    UtensilsCrossed,
} from "lucide-react";

import {
    createFoodReview,
    createRestaurantReview,
} from "../services/reviewService";

import type { SavedReview } from "../services/reviewService";

type Props = {
    maDonHang: number;
    title: string;
    existingReview?: SavedReview | null;
} & (
    | {
          loai: "mon";
          maMonAn: number;
      }
    | {
          loai: "quan";
          maNhaHang: number;
      }
);

const RATING_TEXT: Record<number, string> = {
    1: "Rất tệ",
    2: "Chưa tốt",
    3: "Bình thường",
    4: "Hài lòng",
    5: "Tuyệt vời",
};

function OrderReviewForm(props: Props) {
    const inputId = useId();

    const [soSao, setSoSao] = useState(5);
    const [noiDung, setNoiDung] = useState("");
    const [busy, setBusy] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (
        event: SyntheticEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (busy || success || props.existingReview) {
            return;
        }

        try {
            setBusy(true);
            setError("");

            /*
             * Giữ nguyên payload gửi lên API để tránh ảnh hưởng
             * đến logic đánh giá hiện tại.
             */
            const common = {
                maDonHang: props.maDonHang,
                soSao,
                noiDung: noiDung.trim() || null,
            };

            if (props.loai === "mon") {
                await createFoodReview({
                    ...common,
                    maMonAn: props.maMonAn,
                    hinhAnh: null,
                });
            } else {
                await createRestaurantReview({
                    ...common,
                    maNhaHang: props.maNhaHang,
                });
            }

            setSuccess(true);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Không gửi được đánh giá."
            );
        } finally {
            setBusy(false);
        }
    };

    const savedReview: SavedReview | null =
        props.existingReview ??
        (success
            ? {
                  soSao,
                  noiDung: noiDung.trim() || null,
              }
            : null);

    const reviewTitle = props.title.replace(
        /^(Quán|Món):\s*/i,
        ""
    );

    const reviewType =
        props.loai === "quan"
            ? "Đánh giá nhà hàng"
            : "Đánh giá món ăn";

    return (
        <form
            className={`order-review-form ${
                savedReview ? "is-saved" : ""
            }`}
            onSubmit={handleSubmit}
        >
            <header className="order-review-form-header">
                <span className="order-review-type-icon">
                    {props.loai === "quan" ? (
                        <Store size={18} />
                    ) : (
                        <UtensilsCrossed size={18} />
                    )}
                </span>

                <div>
                    <span className="order-review-type">
                        {reviewType}
                    </span>

                    <h3>{reviewTitle}</h3>
                </div>
            </header>

            {savedReview ? (
                <div className="order-review-saved">
                    <div className="order-review-saved-heading">
                        <span className="order-review-success-icon">
                            <CheckCircle2 size={18} />
                        </span>

                        <div>
                            <strong>Đã gửi đánh giá</strong>
                            <p>
                                Cảm ơn bạn đã chia sẻ trải nghiệm.
                            </p>
                        </div>
                    </div>

                    <div
                        className="order-review-saved-rating"
                        aria-label={`${savedReview.soSao} trên 5 sao`}
                    >
                        <div className="order-review-saved-stars">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                    key={star}
                                    className={
                                        star <= savedReview.soSao
                                            ? "selected"
                                            : ""
                                    }
                                >
                                    ★
                                </span>
                            ))}
                        </div>

                        <strong>
                            {savedReview.soSao}/5
                        </strong>

                        <span>
                            {RATING_TEXT[savedReview.soSao]}
                        </span>
                    </div>

                    <div className="order-review-saved-content">
                        <MessageSquareText size={15} />

                        <p>
                            {savedReview.noiDung ||
                                "Bạn không để lại nhận xét."}
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    <fieldset disabled={busy}>
                        <legend>
                            Trải nghiệm của bạn thế nào?
                        </legend>

                        <div className="order-review-rating-row">
                            <div
                                className="order-review-stars"
                                role="group"
                                aria-label="Chọn số sao đánh giá"
                            >
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        className={
                                            star <= soSao
                                                ? "selected"
                                                : ""
                                        }
                                        aria-label={`${star} sao`}
                                        aria-pressed={
                                            star === soSao
                                        }
                                        onClick={() => {
                                            setSoSao(star);
                                            setError("");
                                        }}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>

                            <div className="order-review-rating-text">
                                <strong>{soSao}/5</strong>
                                <span>{RATING_TEXT[soSao]}</span>
                            </div>
                        </div>

                        <label
                            className="order-review-comment-label"
                            htmlFor={inputId}
                        >
                            <MessageSquareText size={14} />
                            Nhận xét của bạn
                        </label>

                        <textarea
                            id={inputId}
                            rows={3}
                            maxLength={500}
                            placeholder={
                                props.loai === "quan"
                                    ? "Chia sẻ cảm nhận về nhà hàng, dịch vụ hoặc cách đóng gói..."
                                    : "Chia sẻ cảm nhận về hương vị và chất lượng món ăn..."
                            }
                            value={noiDung}
                            onChange={(event) => {
                                setNoiDung(event.target.value);
                                setError("");
                            }}
                        />

                        <div className="order-review-character-count">
                            {noiDung.length}/500 ký tự · không bắt buộc
                        </div>
                    </fieldset>

                    {error && (
                        <p
                            className="auth-error order-review-error"
                            role="alert"
                        >
                            {error}
                        </p>
                    )}

                    <div className="order-review-submit-row">
                        <span>
                            Đánh giá chỉ có thể gửi một lần.
                        </span>

                        <button
                            type="submit"
                            disabled={busy}
                        >
                            <Send size={15} />

                            {busy
                                ? "Đang gửi..."
                                : "Gửi đánh giá"}
                        </button>
                    </div>
                </>
            )}
        </form>
    );
}

export default OrderReviewForm;
