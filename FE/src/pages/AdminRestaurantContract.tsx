import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Download, FileText, XCircle } from "lucide-react";
import {
    approveRestaurantDocuments,
    getAdminContract,
    downloadAdminContractFile,
    rejectRestaurantDocuments,
    terminateContract,
} from "../services/adminContractService";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh";
import type {
    AdminContractDetails,
    ContractFileType,
    DocumentReviewResult,
} from "../services/adminContractService";

const STATUS: Record<string, string> = {
    Nhap: "Bản nháp",
    ChoKy: "Chờ ký",
    DaKy: "Đã ký",
    ChoDuyet: "Chờ xét duyệt",
    HieuLuc: "Đã duyệt",
    TuChoi: "Đã từ chối",
    HetHan: "Hết hạn",
    ChamDut: "Đã chấm dứt",
};

function formatTime(value: string | null) {
    return value ? new Date(value).toLocaleString("vi-VN") : "Chưa có";
}

function formatDate(value: string) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
}

interface ReviewState {
    ketQuaGiayPhep: "" | DocumentReviewResult;
    ketQuaGiayToDaiDien: "" | DocumentReviewResult;
    ketQuaHopDong: "" | DocumentReviewResult;
}

const EMPTY_REVIEW: ReviewState = {
    ketQuaGiayPhep: "",
    ketQuaGiayToDaiDien: "",
    ketQuaHopDong: "",
};

function AdminRestaurantContract() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [result, setResult] = useState<{
        id: string;
        data: AdminContractDetails | null;
        error: string;
    } | null>(null);

    const [downloading, setDownloading] =
        useState<ContractFileType | null>(null);
    const [fileError, setFileError] = useState("");
    const [review, setReview] = useState<ReviewState>(EMPTY_REVIEW);
    const [reviewNote, setReviewNote] = useState("");
    const [decisionError, setDecisionError] = useState("");
    const [deciding, setDeciding] = useState<"approve" | "reject" | null>(null);
    const [terminationReason, setTerminationReason] = useState("");
    const [terminating, setTerminating] = useState(false);
    const [terminationError, setTerminationError] = useState("");
    const [realtimeVersion, setRealtimeVersion] = useState(0);

    useEffect(() => {
        const maNhaHang = Number(id);
        if (!id || !Number.isInteger(maNhaHang) || maNhaHang <= 0) return;

        let cancelled = false;

        getAdminContract(maNhaHang)
            .then((data) => {
                if (!cancelled) {
                    setResult({ id, data, error: "" });
                    setReview(data.thamDinh
                        ? {
                            ketQuaGiayPhep: data.thamDinh.ketQuaGiayPhep,
                            ketQuaGiayToDaiDien: data.thamDinh.ketQuaGiayToDaiDien,
                            ketQuaHopDong: data.thamDinh.ketQuaHopDong,
                        }
                        : EMPTY_REVIEW);
                    setReviewNote(data.thamDinh?.ghiChu ?? "");
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setResult({
                        id,
                        data: null,
                        error: err instanceof Error
                            ? err.message
                            : "Không tải được hồ sơ.",
                    });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [id, realtimeVersion]);

    const refreshRealtime = useCallback(() => {
        setRealtimeVersion((previous) => previous + 1);
    }, []);

    useRealtimeRefresh(["hopDong", "nhaHang", "hoSoPhapLy"], refreshRealtime);

    const data = result?.data;
    const contract = data?.hopDong;

    const handleDownload = async (type: ContractFileType) => {
        if (!contract || downloading !== null) return;

        try {
            setDownloading(type);
            setFileError("");
            await downloadAdminContractFile(contract.maHopDong, type);
        } catch (err) {
            setFileError(
                err instanceof Error ? err.message : "Không tải được tệp."
            );
        } finally {
            setDownloading(null);
        }
    };

    const allReviewed = Object.values(review).every(Boolean);
    const allValid = Object.values(review).every(value => value === "HopLe");

    const handleDecision = async (approve: boolean) => {
        const maNhaHang = Number(id);
        if (!contract || !Number.isInteger(maNhaHang) || deciding !== null) return;

        if (!allReviewed) {
            setDecisionError("Vui lòng chọn kết quả kiểm tra cho cả ba tài liệu.");
            return;
        }

        if (approve && !allValid) {
            setDecisionError("Chỉ có thể duyệt khi tất cả tài liệu đều hợp lệ.");
            return;
        }

        if (!approve && !reviewNote.trim()) {
            setDecisionError("Vui lòng nhập lý do từ chối hoặc nội dung cần bổ sung.");
            return;
        }

        const payload = {
            maHopDong: contract.maHopDong,
            ketQuaGiayPhep: review.ketQuaGiayPhep as DocumentReviewResult,
            ketQuaGiayToDaiDien: review.ketQuaGiayToDaiDien as DocumentReviewResult,
            ketQuaHopDong: review.ketQuaHopDong as DocumentReviewResult,
            ghiChu: reviewNote.trim() || undefined,
        };

        try {
            setDeciding(approve ? "approve" : "reject");
            setDecisionError("");

            if (approve) {
                await approveRestaurantDocuments(maNhaHang, payload);
            } else {
                await rejectRestaurantDocuments(
                    maNhaHang,
                    payload,
                    reviewNote.trim()
                );
            }

            navigate("/admin/nha-hang");
        } catch (err) {
            setDecisionError(
                err instanceof Error
                    ? err.message
                    : "Không thể lưu kết quả thẩm định."
            );
        } finally {
            setDeciding(null);
        }
    };

    if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0) {
        return <p className="auth-error">Mã nhà hàng không hợp lệ.</p>;
    }

    if (!result || result.id !== id) {
        return <p>Đang tải hồ sơ nhà hàng...</p>;
    }

    if (result.error || !data) {
        return (
            <div>
                <Link to="/admin/nha-hang">← Về danh sách nhà hàng</Link>
                <p className="auth-error">{result.error || "Không có dữ liệu."}</p>
            </div>
        );
    }

    const restaurantInfo = [
        ["Nhà hàng", data.nhaHang.tenNhaHang],
        ["Địa chỉ quán", data.nhaHang.diaChiQuan],
        ["Email", data.nhaHang.email],
        ["Số điện thoại", data.nhaHang.soDienThoai],
    ];

    const legalInfo = contract ? [
        ["Tên pháp lý", contract.tenPhapLy],
        ["Người đại diện", contract.nguoiDaiDien],
        ["Chức vụ", contract.chucVuNguoiDaiDien],
        ["Số giấy tờ đại diện", contract.soGiayToNguoiDaiDien],
        ["Mã số thuế", contract.maSoThue],
        ["Địa chỉ pháp lý", contract.diaChiPhapLy],
        ["Số giấy phép kinh doanh", contract.soGiayPhepKinhDoanh],
        ["Thời gian ký", formatTime(contract.thoiGianKy)],
        ["Thời gian gửi", formatTime(contract.thoiGianGuiDuyet)],
        ["Phí nền tảng", `${contract.tyLePhiNenTang}%`],
        ["Ngày bắt đầu", formatDate(contract.ngayBatDau)],
        ["Ngày kết thúc", formatDate(contract.ngayKetThuc)],
    ] : [];

    const documents: {
        type: ContractFileType;
        title: string;
        exists: boolean;
        reviewKey: keyof ReviewState;
    }[] = [
            { type: "giay-phep", title: "Giấy phép kinh doanh", exists: !!contract?.coGiayPhep, reviewKey: "ketQuaGiayPhep" },
            { type: "giay-to", title: "Giấy tờ đại diện", exists: !!contract?.coGiayToDaiDien, reviewKey: "ketQuaGiayToDaiDien" },
            { type: "hop-dong", title: "Bản hợp đồng", exists: !!contract?.coTepHopDong, reviewKey: "ketQuaHopDong" },
        ];


    const handleTerminate = async () => {
        if (!contract || !id || terminating) return;

        const lyDo = terminationReason.trim();

        if (!lyDo) {
            setTerminationError("Vui lòng nhập lý do chấm dứt.");
            return;
        }

        if (!window.confirm(
            `Chấm dứt hợp đồng ${contract.soHopDong}? Quán sẽ không nhận được đơn mới.`
        )) return;

        try {
            setTerminating(true);
            setTerminationError("");

            await terminateContract(contract.maHopDong, lyDo);

            const updated = await getAdminContract(Number(id));
            setResult({ id, data: updated, error: "" });
            setTerminationReason("");
        } catch (err: unknown) {
            setTerminationError(
                err instanceof Error
                    ? err.message
                    : "Không thể chấm dứt hợp đồng."
            );
        } finally {
            setTerminating(false);
        }
    };

    return (
        <div className="admin-contract-page">
            <Link className="admin-contract-back" to="/admin/nha-hang">
                ← Về danh sách nhà hàng
            </Link>

            <div className="profile-page-header">
                <h1>Hồ sơ & hợp đồng</h1>
                <p>Kiểm tra thông tin và giấy tờ trước khi quyết định xét duyệt.</p>
            </div>

            <section className="admin-contract-section">
                <h2>Thông tin nhà hàng</h2>
                <dl className="admin-contract-info">
                    {restaurantInfo.map(([label, value]) => (
                        <div key={label}>
                            <dt>{label}</dt>
                            <dd>{value || "Chưa có"}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            {!contract ? (
                <section className="admin-contract-section">
                    <p>Nhà hàng chưa có hợp đồng.</p>
                </section>
            ) : (
                <>
                    <section className="admin-contract-section">
                        <div className="admin-contract-heading">
                            <h2>Thông tin hợp đồng</h2>
                            <span>{STATUS[contract.trangThai] ?? contract.trangThai}</span>
                        </div>

                        <p className="admin-contract-number">
                            <FileText size={17} />
                            {contract.soHopDong}
                        </p>

                        <dl className="admin-contract-info">
                            {legalInfo.map(([label, value]) => (
                                <div key={label}>
                                    <dt>{label}</dt>
                                    <dd>{value || "Chưa có"}</dd>
                                </div>
                            ))}
                        </dl>

                        {contract.lyDoTuChoi && (
                            <p className="auth-error">
                                Lý do từ chối: {contract.lyDoTuChoi}
                            </p>
                        )}
                    </section>

                    <section className="admin-contract-section">
                        <h2>Lịch sử hợp đồng</h2>
                        {data.lichSuHopDong.length === 0 ? (
                            <p>Chưa có lịch sử hợp đồng.</p>
                        ) : (
                            <dl className="admin-contract-info">
                                {data.lichSuHopDong.map((item) => {
                                    const thamDinh = data.lichSuThamDinh.find(
                                        (reviewItem) => reviewItem.maHopDong === item.maHopDong
                                    );

                                    return (
                                        <div key={item.maHopDong}>
                                            <dt>{item.soHopDong}</dt>
                                            <dd>
                                                {STATUS[item.trangThai] ?? item.trangThai}
                                                {` · ${formatDate(item.ngayBatDau)}–${formatDate(item.ngayKetThuc)}`}
                                                {thamDinh
                                                    ? ` · ${thamDinh.ketQua === "DaDuyet" ? "Đã duyệt" : "Từ chối"} bởi Admin #${thamDinh.maTaiKhoanAdmin}`
                                                    : ""}
                                            </dd>
                                        </div>
                                    );
                                })}
                            </dl>
                        )}
                    </section>

                    <section className="admin-contract-section">
                        <h2>Giấy tờ đính kèm</h2>
                        {fileError && <p className="auth-error" role="alert">{fileError}</p>}

                        <div className="admin-contract-review-list">
                            {documents.map((document) => (
                                <div className="admin-contract-review-row" key={document.type}>
                                    <button
                                        type="button"
                                        disabled={!document.exists || downloading !== null}
                                        onClick={() => void handleDownload(document.type)}
                                    >
                                        <Download size={16} />
                                        {downloading === document.type
                                            ? "Đang tải..."
                                            : `Tải ${document.title.toLowerCase()}`}
                                        {!document.exists && " — chưa có"}
                                    </button>

                                    <label>
                                        <span>Kết quả kiểm tra</span>
                                        <select
                                            value={review[document.reviewKey]}
                                            disabled={contract.trangThai !== "ChoDuyet" || deciding !== null}
                                            onChange={(event) => {
                                                const value = event.target.value as "" | DocumentReviewResult;
                                                setReview(current => ({
                                                    ...current,
                                                    [document.reviewKey]: value,
                                                }));
                                                setDecisionError("");
                                            }}
                                        >
                                            <option value="">Chưa kiểm tra</option>
                                            <option value="HopLe">Hợp lệ</option>
                                            <option value="CanBoSung">Cần bổ sung</option>
                                        </select>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="admin-contract-section admin-contract-review-decision">
                        <h2>Kết quả thẩm định</h2>

                        {data.thamDinh ? (
                            <div className={`admin-contract-review-result ${data.thamDinh.ketQua === "DaDuyet" ? "approved" : "rejected"}`}>
                                {data.thamDinh.ketQua === "DaDuyet"
                                    ? <CheckCircle2 size={20} />
                                    : <XCircle size={20} />}
                                <div>
                                    <strong>
                                        {data.thamDinh.ketQua === "DaDuyet"
                                            ? "Hồ sơ đã được duyệt"
                                            : "Hồ sơ cần bổ sung"}
                                    </strong>
                                    <p>
                                        Admin #{data.thamDinh.maTaiKhoanAdmin} · {formatTime(data.thamDinh.thoiGian)}
                                    </p>
                                    {data.thamDinh.ghiChu && <p>{data.thamDinh.ghiChu}</p>}
                                </div>
                            </div>
                        ) : contract.trangThai === "ChoDuyet" ? (
                            <>
                                <p className="admin-contract-review-help">
                                    Mở từng tài liệu, đối chiếu thông tin rồi chọn kết quả. Hệ thống chỉ cho duyệt khi cả ba tài liệu đều hợp lệ.
                                </p>

                                <label className="admin-contract-reject-reason">
                                    <span>Ghi chú thẩm định / lý do cần bổ sung</span>
                                    <textarea
                                        rows={4}
                                        maxLength={1000}
                                        value={reviewNote}
                                        disabled={deciding !== null}
                                        placeholder="Ghi rõ nội dung sai hoặc tài liệu cần bổ sung khi từ chối..."
                                        onChange={(event) => {
                                            setReviewNote(event.target.value);
                                            setDecisionError("");
                                        }}
                                    />
                                </label>

                                {decisionError && (
                                    <p className="auth-error" role="alert">{decisionError}</p>
                                )}

                                <div className="admin-contract-review-actions">
                                    <button
                                        type="button"
                                        className="reject"
                                        disabled={!allReviewed || !reviewNote.trim() || deciding !== null}
                                        onClick={() => void handleDecision(false)}
                                    >
                                        <XCircle size={17} />
                                        {deciding === "reject" ? "Đang từ chối..." : "Yêu cầu bổ sung"}
                                    </button>

                                    <button
                                        type="button"
                                        className="approve"
                                        disabled={!allValid || deciding !== null}
                                        onClick={() => void handleDecision(true)}
                                    >
                                        <CheckCircle2 size={17} />
                                        {deciding === "approve" ? "Đang duyệt..." : "Duyệt hồ sơ"}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <p>Hồ sơ này không còn ở trạng thái chờ xét duyệt.</p>
                        )}
                    </section>

                        {contract.trangThai === "HieuLuc" && (
                            <section className="admin-contract-section">
                                <h2>Chấm dứt hợp đồng</h2>
                                <p>
                                    Quán sẽ ngừng nhận đơn mới. Những đơn đã đặt
                                    vẫn được xử lý theo quy trình hiện tại.
                                </p>

                                <label className="admin-contract-reject-reason">
                                    <span>Lý do chấm dứt</span>
                                    <textarea
                                        rows={3}
                                        maxLength={500}
                                        value={terminationReason}
                                        disabled={terminating}
                                        onChange={(event) =>
                                            setTerminationReason(event.target.value)
                                        }
                                    />
                                </label>

                                {terminationError && (
                                    <p className="auth-error" role="alert">
                                        {terminationError}
                                    </p>
                                )}

                                <button
                                    type="button"
                                    className="admin-contract-terminate-button"
                                    disabled={terminating || !terminationReason.trim()}
                                    onClick={() => void handleTerminate()}
                                >
                                    {terminating ? "Đang xử lý..." : "Chấm dứt hợp đồng"}
                                </button>
                            </section>
                        )}

                        {contract.trangThai === "ChamDut" && (
                            <section className="admin-contract-section">
                                <h2>Hợp đồng đã chấm dứt</h2>
                                <p>Lý do: {contract.lyDoChamDut}</p>
                                <p>Thời gian: {formatTime(contract.thoiGianChamDut)}</p>
                                <p>Tài khoản thực hiện: {contract.maTaiKhoanChamDut}</p>
                            </section>
                        )}

                    <section className="admin-contract-section">
                        <h2>Nội dung đã ký — phiên bản {contract.phienBanDieuKhoan}</h2>
                        <div className="merchant-contract-content">
                            {contract.noiDungHopDong || "Chưa có nội dung."}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}

export default AdminRestaurantContract;
