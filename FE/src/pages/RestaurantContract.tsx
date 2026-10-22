import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, FileText, Percent, RefreshCw } from "lucide-react";
import {
    getContractPreview,
    getMyContract,
    signContract,
    submitContractForReview,
    startNewContract,
} from "../services/contractService";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh";

import type {
    ContractPreview,
    SignedContract,
} from "../services/contractService";

function formatDate(value: string) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
}

function RestaurantContract() {
    const [result, setResult] = useState<{
        version: number;
        data: ContractPreview | SignedContract | null;
        rejectedContract: SignedContract | null;
        error: string;
    } | null>(null);

    const [version, setVersion] = useState(0);
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [confirmSign, setConfirmSign] = useState(false);
    const [signing, setSigning] = useState(false);
    const [signError, setSignError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [preparingNew, setPreparingNew] = useState(false);
    const [startingNew, setStartingNew] = useState(false);
    const [renewalError, setRenewalError] = useState("");

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const current = await getMyContract();
                const existing = current.hopDong;

                const rejectedContract =
                    existing?.trangThai === "TuChoi" ? existing : null;

                const canPrepareNew =
                    existing?.trangThai === "TuChoi" ||
                    existing?.trangThai === "HetHan";

                const data =
                    preparingNew && canPrepareNew
                        ? await getContractPreview()
                        : existing ?? await getContractPreview();

                if (!cancelled) {
                    setResult({
                        version,
                        data,
                        rejectedContract,
                        error: "",
                    });
                }
            } catch (err) {
                if (!cancelled) {
                    setResult({
                        version,
                        data: null,
                        rejectedContract: null,
                        error: err instanceof Error
                            ? err.message
                            : "Không tải được hợp đồng.",
                    });
                }
            }
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, [version, preparingNew]);

    const refreshRealtime = useCallback(() => {
        setVersion((previous) => previous + 1);
    }, []);

    useRealtimeRefresh(["hopDong", "nhaHang"], refreshRealtime);

    const loading = !result || result.version !== version;
    const contract = result?.data;

    const signedContract =
        contract && "maHopDong" in contract ? contract : null;

    const statusLabels: Record<string, string> = {
        Nhap: "Bản nháp",
        ChoKy: "Chờ ký",
        DaKy: "Đã ký — chưa gửi xét duyệt",
        ChoDuyet: "Chờ Admin duyệt",
        HieuLuc: "Đã duyệt",
        TuChoi: "Đã bị từ chối",
        HetHan: "Hết hạn",
        ChamDut: "Đã chấm dứt",
    };

    const handleSign = async () => {
        if (
            !contract ||
            "maHopDong" in contract ||
            signing ||
            !agreeTerms ||
            !confirmSign
        ) {
            return;
        }

        try {
            setSigning(true);
            setSignError("");

            await signContract({
                dongYDieuKhoan: agreeTerms,
                xacNhanKy: confirmSign,
                maXacNhanNoiDung: contract.maXacNhanNoiDung,
            });

            setPreparingNew(false);
            setAgreeTerms(false);
            setConfirmSign(false);
            setVersion((previous) => previous + 1);
        } catch (err) {
            setSignError(
                err instanceof Error
                    ? err.message
                    : "Không ký được hợp đồng."
            );
        } finally {
            setSigning(false);
        }
    };

    const handleSubmitForReview = async () => {
        if (!signedContract ||
            signedContract.trangThai !== "DaKy" ||
            submitting) {
            return;
        }

        try {
            setSubmitting(true);
            setSubmitError("");
            await submitContractForReview(signedContract.maHopDong);
            setVersion((previous) => previous + 1);
        } catch (err) {
            setSubmitError(
                err instanceof Error
                    ? err.message
                    : "Không gửi được hồ sơ."
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleStartNewContract = async () => {
        if (startingNew) return;

        try {
            setStartingNew(true);
            setRenewalError("");

            await startNewContract();

            setAgreeTerms(false);
            setConfirmSign(false);
            setSignError("");
            setSubmitError("");
            setPreparingNew(true);
            setVersion((previous) => previous + 1);
        } catch (err: unknown) {
            setRenewalError(
                err instanceof Error
                    ? err.message
                    : "Không thể bắt đầu ký hợp đồng mới."
            );
        } finally {
            setStartingNew(false);
        }
    };

    return (
        <div className="merchant-info-page merchant-contract-page">
            <header className="merchant-info-header">
                <div>
                    <span className="merchant-info-eyebrow">
                        HỢP TÁC VỚI FOODIE
                    </span>
                    <h1>Hợp đồng nhà hàng</h1>
                    <p>Xem thông tin hợp tác, phí nền tảng và chính sách đối soát.</p>
                </div>

                <div className="merchant-info-approval">
                    <FileText size={16} />
                    {!loading && signedContract
                        ? statusLabels[signedContract.trangThai] ??
                        signedContract.trangThai
                        : "Bản xem trước"}
                </div>
            </header>

            {!loading && preparingNew && result?.rejectedContract && (
                <div className="merchant-contract-resubmit-notice">
                    <FileText size={18} />
                    <div>
                        <strong>Đang chuẩn bị hợp đồng mới</strong>
                        <p>
                            Lý do từ chối lần trước:{" "}
                            {result.rejectedContract.lyDoTuChoi || "Không có ghi chú."}
                        </p>
                        <p>Bản hợp đồng cũ được giữ nguyên trong lịch sử.</p>
                    </div>
                </div>
            )}

            {!loading && signedContract && (
    <div className="merchant-info-notice success" role="status">
        <FileText size={17} />
        <div>
            <strong>Hợp đồng {signedContract.soHopDong}</strong>
            {signedContract.thoiGianKy && (
                <div>
                    Đã xác nhận ký lúc{" "}
                    {new Date(signedContract.thoiGianKy)
                        .toLocaleString("vi-VN")}
                </div>
            )}
        </div>
    </div>
)}

{!loading && signedContract?.lyDoTuChoi && (
    <div className="merchant-info-notice error">
        Lý do từ chối: {signedContract.lyDoTuChoi}
    </div>
)}

            {loading ? (
                <div className="quan-layout-loading">
                    <div className="loading-spinner" />
                    <p>Đang tải nội dung hợp đồng...</p>
                </div>
            ) : result?.error ? (
                <section className="merchant-info-section">
                    <div className="merchant-info-notice error" role="alert">
                        {result.error}
                    </div>

                    <div className="merchant-contract-links">
                        <Link to="/quan/thong-tin">Thông tin quán →</Link>
                        <Link to="/quan/ho-so-phap-ly">Hồ sơ pháp lý →</Link>
                    </div>

                    <button
                        type="button"
                        className="merchant-info-reset"
                        onClick={() => setVersion((previous) => previous + 1)}
                    >
                        <RefreshCw size={16} />
                        Kiểm tra lại
                    </button>
                </section>
            ) : contract ? (
                <div className="merchant-info-layout">
                    <div className="merchant-info-editor">
                        <section className="merchant-info-section">
                            <div className="merchant-info-section-title">
                                <FileText size={18} />
                                <div>
                                    <h2>
                                        {signedContract
                                            ? "Nội dung hợp đồng đã lưu"
                                            : "Nội dung hợp đồng"}
                                    </h2>
                                    <p>
                                        Phiên bản điều khoản {contract.phienBanDieuKhoan}.
                                        {signedContract
                                            ? " Nội dung được lưu tại thời điểm ký."
                                            : " Vui lòng đọc trước khi xác nhận ký."}
                                    </p>
                                </div>
                            </div>

                            <div className="merchant-contract-content">
                                {contract.noiDungHopDong}
                            </div>
                        </section>
                                {!signedContract && (
                                    <section className="merchant-info-section merchant-contract-sign">
                                        <div className="merchant-info-section-title">
                                            <FileText size={18} />
                                            <div>
                                                <h2>Xác nhận ký hợp đồng</h2>
                                                <p>
                                                    Kiểm tra thông tin và nội dung hợp đồng trước khi ký.
                                                </p>
                                            </div>
                                        </div>

                                        <label className="merchant-contract-consent">
                                            <input
                                                type="checkbox"
                                                checked={agreeTerms}
                                                disabled={signing}
                                                onChange={(event) => setAgreeTerms(event.target.checked)}
                                            />
                                            <span>
                                                Tôi đã đọc và đồng ý nội dung hợp đồng, tỷ lệ phí
                                                nền tảng và chính sách đối soát.
                                            </span>
                                        </label>

                                        <label className="merchant-contract-consent">
                                            <input
                                                type="checkbox"
                                                checked={confirmSign}
                                                disabled={signing}
                                                onChange={(event) => setConfirmSign(event.target.checked)}
                                            />
                                            <span>
                                                Tôi xác nhận thông tin đã cung cấp là chính xác
                                                và xác nhận ký hợp đồng này.
                                            </span>
                                        </label>

                                        {signError && (
                                            <div className="merchant-info-notice error" role="alert">
                                                {signError}
                                            </div>
                                        )}

                                        <p className="merchant-contract-sign-note">
                                            Sau khi ký, hồ sơ pháp lý và giấy tờ sẽ khóa chỉnh sửa.
                                            Bạn cần gửi xét duyệt để Admin xử lý.
                                        </p>

                                        <div className="merchant-info-actions">
                                            <button
                                                type="button"
                                                className="merchant-info-reset"
                                                disabled={signing}
                                                onClick={() => {
                                                    setAgreeTerms(false);
                                                    setConfirmSign(false);
                                                    setSignError("");
                                                    setVersion((previous) => previous + 1);
                                                }}
                                            >
                                                <RefreshCw size={16} />
                                                Tải lại hợp đồng
                                            </button>

                                            <button
                                                type="button"
                                                className="merchant-info-save"
                                                disabled={signing || !agreeTerms || !confirmSign}
                                                onClick={() => void handleSign()}
                                            >
                                                <FileText size={16} />
                                                {signing ? "Đang xác nhận..." : "Xác nhận ký hợp đồng"}
                                            </button>
                                        </div>
                                    </section>
                                )}

                                {signedContract?.trangThai === "DaKy" && (
                                    <section className="merchant-info-section">
                                        <div className="merchant-info-section-title">
                                            <FileText size={18} />
                                            <div>
                                                <h2>Gửi hồ sơ xét duyệt</h2>
                                                <p>
                                                    Hợp đồng đã ký. Gửi hồ sơ để Admin kiểm tra
                                                    thông tin pháp lý và chấp thuận nhà hàng.
                                                </p>
                                            </div>
                                        </div>

                                        {submitError && (
                                            <div className="merchant-info-notice error" role="alert">
                                                {submitError}
                                            </div>
                                        )}

                                        <div className="merchant-info-actions">
                                            <button
                                                type="button"
                                                className="merchant-info-save"
                                                disabled={submitting}
                                                onClick={() => void handleSubmitForReview()}
                                            >
                                                <FileText size={16} />
                                                {submitting ? "Đang gửi..." : "Gửi xét duyệt"}
                                            </button>
                                        </div>
                                    </section>
                                )}

                                {signedContract?.trangThai === "ChoDuyet" && (
                                    <section className="merchant-info-section">
                                        <div className="merchant-info-section-title">
                                            <FileText size={18} />
                                            <div>
                                                <h2>Đang chờ xét duyệt</h2>
                                                <p>
                                                    Hồ sơ đã được gửi đến Admin.
                                                    Bạn có thể xem lại hợp đồng trong thời gian chờ.
                                                </p>
                                            </div>
                                        </div>

                                        {signedContract.thoiGianGuiDuyet && (
                                            <p className="merchant-contract-policy">
                                                Thời gian gửi:{" "}
                                                {new Date(signedContract.thoiGianGuiDuyet)
                                                    .toLocaleString("vi-VN")}
                                            </p>
                                        )}
                                    </section>
                                )}

                                {signedContract?.trangThai === "ChamDut" && (
                                    <section className="merchant-info-section">
                                        <h2>Hợp đồng đã bị chấm dứt</h2>
                                        <p>
                                            Nhà hàng hiện không thể nhận đơn mới.
                                            Vui lòng liên hệ Admin để được hướng dẫn.
                                        </p>
                                        <p>
                                            <strong>Lý do:</strong>{" "}
                                            {signedContract.lyDoChamDut}
                                        </p>

                                        {signedContract.thoiGianChamDut && (
                                            <p>
                                                Thời gian:{" "}
                                                {new Date(signedContract.thoiGianChamDut)
                                                    .toLocaleString("vi-VN")}
                                            </p>
                                        )}
                                    </section>
                                )}

                                {signedContract?.trangThai === "HetHan" && (
                                    <section className="merchant-info-section merchant-contract-resubmit">
                                        <div className="merchant-info-section-title">
                                            <FileText size={18} />
                                            <div>
                                                <h2>Hợp đồng đã hết hạn</h2>
                                                <p>
                                                    Bắt đầu thủ tục ký mới, kiểm tra lại hồ sơ
                                                    và gửi Admin xét duyệt để tiếp tục nhận đơn.
                                                </p>
                                            </div>
                                        </div>

                                        {renewalError && (
                                            <p className="auth-error" role="alert">
                                                {renewalError}
                                            </p>
                                        )}

                                        <div className="merchant-info-actions">
                                            <button
                                                type="button"
                                                className="merchant-info-save"
                                                disabled={startingNew}
                                                onClick={handleStartNewContract}
                                            >
                                                <FileText size={16} />
                                                {startingNew
                                                    ? "Đang xử lý..."
                                                    : "Bắt đầu ký hợp đồng mới"}
                                            </button>
                                        </div>
                                    </section>
                                )}

                                {signedContract?.trangThai === "TuChoi" && (
                                    <section className="merchant-info-section merchant-contract-resubmit">
                                        <div className="merchant-info-section-title">
                                            <FileText size={18} />
                                            <div>
                                                <h2>Bổ sung hồ sơ và gửi lại</h2>
                                                <p>
                                                    Sửa thông tin theo lý do Admin đã nêu,
                                                    sau đó xem và ký bản hợp đồng mới.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="merchant-contract-resubmit-steps">
                                            <div>
                                                <span>1</span>
                                                <p>Cập nhật thông tin quán hoặc hồ sơ pháp lý.</p>
                                            </div>
                                            <div>
                                                <span>2</span>
                                                <p>Tải giấy tờ thay thế nếu cần bổ sung.</p>
                                            </div>
                                            <div>
                                                <span>3</span>
                                                <p>Xem lại hợp đồng mới, xác nhận ký và gửi xét duyệt.</p>
                                            </div>
                                        </div>

                                        <div className="merchant-contract-links">
                                            <Link to="/quan/thong-tin">Sửa thông tin quán →</Link>
                                            <Link to="/quan/ho-so-phap-ly">Sửa hồ sơ pháp lý →</Link>
                                        </div>

                                        <div className="merchant-info-actions">
                                            <button
                                                type="button"
                                                className="merchant-info-save"
                                                onClick={() => {
                                                    setAgreeTerms(false);
                                                    setConfirmSign(false);
                                                    setSignError("");
                                                    setSubmitError("");
                                                    setPreparingNew(true);
                                                    setVersion((previous) => previous + 1);
                                                }}
                                            >
                                                <FileText size={16} />
                                                Xem hợp đồng mới
                                            </button>
                                        </div>
                                    </section>
                                )}

                    </div>

                    <aside className="merchant-info-sidebar">
                        <section className="merchant-info-section">
                            <div className="merchant-info-section-title">
                                <Percent size={18} />
                                <div>
                                    <h2>Phí nền tảng</h2>
                                    <p>Tỷ lệ áp dụng trong hợp đồng.</p>
                                </div>
                            </div>

                            <strong className="merchant-contract-fee">
                                {contract.tyLePhiNenTang}%
                            </strong>
                        </section>

                        <section className="merchant-info-section">
                            <div className="merchant-info-section-title">
                                <CalendarDays size={18} />
                                <div>
                                    <h2>{signedContract ? "Thời hạn hợp đồng" : "Thời hạn dự kiến"}</h2>
                                     <p>
                                        {signedContract
                                            ? "Theo bản hợp đồng đã lưu."
                                            : "Được ghi nhận khi xác nhận ký."}
                                     </p>
                                </div>
                            </div>

                            <div className="merchant-contract-dates">
                                <div>
                                    <span>Ngày bắt đầu</span>
                                    <strong>{formatDate(contract.ngayBatDau)}</strong>
                                </div>
                                <div>
                                    <span>Ngày kết thúc</span>
                                    <strong>{formatDate(contract.ngayKetThuc)}</strong>
                                </div>
                            </div>
                        </section>

                        <section className="merchant-info-section">
                            <div className="merchant-info-section-title">
                                <FileText size={18} />
                                <div>
                                    <h2>Đối soát</h2>
                                    <p>Chính sách trong bản hợp đồng.</p>
                                </div>
                            </div>

                            <p className="merchant-contract-policy">
                                {contract.chinhSachDoiSoat}
                            </p>

                            <div className="merchant-contract-links">
                                <Link to="/quan/ho-so-phap-ly">
                                    Kiểm tra hồ sơ pháp lý →
                                </Link>
                            </div>
                        </section>
                    </aside>
                </div>
            ) : null}
        </div>
    );
}

export default RestaurantContract;
