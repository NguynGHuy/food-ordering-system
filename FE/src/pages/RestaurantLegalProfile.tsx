import { useEffect, useState } from "react";
import type { SyntheticEvent } from "react";
import LegalDocuments from "../components/LegalDocuments";
import { Link } from "react-router-dom";
import {
    Building2,
    CheckCircle2,
    FileText,
    RotateCcw,
    Save,
    ShieldCheck,
    UserRound,
} from "lucide-react";
import {
    getLegalProfile,
    saveLegalProfile,
} from "../services/legalProfileService";
import type {
    LegalProfileRequest,
    LegalProfileResponse,
} from "../services/legalProfileService";

type LegalForm = {
    [K in keyof LegalProfileRequest]: string;
};

const EMPTY_FORM: LegalForm = {
    nguoiDaiDien: "",
    chucVuNguoiDaiDien: "",
    soGiayToNguoiDaiDien: "",
    tenPhapLy: "",
    maSoThue: "",
    diaChiPhapLy: "",
    soGiayPhepKinhDoanh: "",
};

const STATUS_LABEL: Record<string, string> = {
    ChuaHoanTat: "Chưa hoàn tất",
    ChoDuyet: "Chờ xét duyệt",
    DaDuyet: "Đã được duyệt",
    TuChoi: "Đã bị từ chối",
};

interface Field {
    name: keyof LegalForm;
    label: string;
    maxLength: number;
}

const REPRESENTATIVE_FIELDS: Field[] = [
    { name: "nguoiDaiDien", label: "Họ tên người đại diện", maxLength: 100 },
    { name: "chucVuNguoiDaiDien", label: "Chức vụ", maxLength: 100 },
    { name: "soGiayToNguoiDaiDien", label: "Số CCCD / giấy tờ đại diện", maxLength: 30 },
];

const BUSINESS_FIELDS: Field[] = [
    { name: "tenPhapLy", label: "Tên pháp lý của hộ kinh doanh / doanh nghiệp", maxLength: 200 },
    { name: "maSoThue", label: "Mã số thuế", maxLength: 30 },
    { name: "diaChiPhapLy", label: "Địa chỉ pháp lý", maxLength: 255 },
    { name: "soGiayPhepKinhDoanh", label: "Số giấy phép kinh doanh", maxLength: 50 },
];

function RestaurantLegalProfile() {
    const [data, setData] = useState<LegalProfileResponse | null>(null);
    const [form, setForm] = useState<LegalForm>(EMPTY_FORM);
    const [savedForm, setSavedForm] = useState<LegalForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        let cancelled = false;

        getLegalProfile()
            .then((result) => {
                if (cancelled) return;

                const next: LegalForm = {
                    nguoiDaiDien: result.hoSo?.nguoiDaiDien ?? "",
                    chucVuNguoiDaiDien: result.hoSo?.chucVuNguoiDaiDien ?? "",
                    soGiayToNguoiDaiDien: result.hoSo?.soGiayToNguoiDaiDien ?? "",
                    tenPhapLy: result.hoSo?.tenPhapLy ?? "",
                    maSoThue: result.hoSo?.maSoThue ?? "",
                    diaChiPhapLy: result.hoSo?.diaChiPhapLy ?? "",
                    soGiayPhepKinhDoanh: result.hoSo?.soGiayPhepKinhDoanh ?? "",
                };

                setData(result);
                setForm(next);
                setSavedForm(next);
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Không tải được hồ sơ pháp lý."
                    );
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (saving || uploading || !data?.duocChinhSua) return;

        setError("");
        setMessage("");

        const normalized: LegalForm = {
            nguoiDaiDien: form.nguoiDaiDien.trim(),
            chucVuNguoiDaiDien: form.chucVuNguoiDaiDien.trim(),
            soGiayToNguoiDaiDien: form.soGiayToNguoiDaiDien.trim(),
            tenPhapLy: form.tenPhapLy.trim(),
            maSoThue: form.maSoThue.trim(),
            diaChiPhapLy: form.diaChiPhapLy.trim(),
            soGiayPhepKinhDoanh: form.soGiayPhepKinhDoanh.trim(),
        };

        try {
            setSaving(true);
            const result = await saveLegalProfile(normalized);
            setForm(normalized);
            setSavedForm(normalized);
            setMessage(result.message);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Không lưu được hồ sơ pháp lý."
            );
        } finally {
            setSaving(false);
        }
    };

    const renderFields = (fields: Field[]) =>
        fields.map((field) => (
            <label className="merchant-info-field" key={field.name}>
                <span>{field.label}</span>
                <input
                    type="text"
                    name={field.name}
                    value={form[field.name]}
                    maxLength={field.maxLength}
                    placeholder={`Nhập ${field.label.toLowerCase()}`}
                    onChange={(event) => {
                        const value = event.target.value;
                        setMessage("");
                        setForm((previous) => ({
                            ...previous,
                            [field.name]: value,
                        }));
                    }}
                />
            </label>
        ));

    if (!data) {
        return error ? (
            <div className="merchant-info-notice error" role="alert">
                {error}
            </div>
        ) : (
            <div className="quan-layout-loading">
                <div className="loading-spinner" />
                <p>Đang tải hồ sơ pháp lý...</p>
            </div>
        );
    }

    return (
        <div className="merchant-info-page merchant-legal-page">
            <header className="merchant-info-header">
                <div>
                    <span className="merchant-info-eyebrow">HỒ SƠ NHÀ HÀNG</span>
                    <h1>Hồ sơ pháp lý</h1>
                    <p>Thông tin đại diện và đăng ký kinh doanh để chuẩn bị hợp đồng.</p>
                </div>

                <div
                    className={`merchant-info-approval ${data.trangThaiDuyet === "DaDuyet" ? "is-approved" : ""
                        }`}
                >
                    <ShieldCheck size={16} />
                    {STATUS_LABEL[data.trangThaiDuyet] ?? data.trangThaiDuyet}
                </div>
            </header>

            {message && (
                <div className="merchant-info-notice success" role="status">
                    <CheckCircle2 size={17} />
                    {message}
                </div>
            )}

            {error && (
                <div className="merchant-info-notice error" role="alert">
                    {error}
                </div>
            )}

            {!data.duocChinhSua && (
                <div className="merchant-legal-readonly">
                    <ShieldCheck size={18} />
                    <span>
                        Hồ sơ đang được khóa chỉnh sửa.
                        Bạn vẫn có thể xem thông tin đã lưu.
                    </span>
                </div>
            )}

            <form className="merchant-info-layout" onSubmit={handleSubmit}>
                <div className="merchant-info-editor">
                    <fieldset
                        className="merchant-legal-fieldset"
                        disabled={saving || uploading || !data.duocChinhSua}
                    >
                        <section className="merchant-info-section">
                            <div className="merchant-info-section-title">
                                <UserRound size={18} />
                                <div>
                                    <h2>Người đại diện</h2>
                                    <p>Thông tin người đại diện ký hợp đồng với nền tảng.</p>
                                </div>
                            </div>

                            <div className="merchant-info-fields">
                                {renderFields(REPRESENTATIVE_FIELDS)}
                            </div>
                        </section>

                        <section className="merchant-info-section">
                            <div className="merchant-info-section-title">
                                <Building2 size={18} />
                                <div>
                                    <h2>Thông tin kinh doanh</h2>
                                    <p>Điền thông tin theo hồ sơ đăng ký kinh doanh.</p>
                                </div>
                            </div>

                            <div className="merchant-info-fields">
                                {renderFields(BUSINESS_FIELDS)}
                            </div>
                        </section>
                    </fieldset>

                    <LegalDocuments
                        businessFile={data.hoSo?.fileGiayPhepKinhDoanh ?? null}
                        representativeFile={data.hoSo?.fileGiayToNguoiDaiDien ?? null}
                        canEdit={data.duocChinhSua}
                        disabled={saving}
                        onBusyChange={setUploading}
                    />

                    {data.duocChinhSua && (
                        <div className="merchant-info-actions">
                            <button
                                type="button"
                                className="merchant-info-reset"
                                disabled={saving || uploading}
                                onClick={() => {
                                    setForm({ ...savedForm });
                                    setMessage("");
                                    setError("");
                                }}
                            >
                                <RotateCcw size={16} />
                                Khôi phục
                            </button>

                            <button
                                type="submit"
                                className="merchant-info-save"
                                disabled={saving || uploading}
                            >
                                <Save size={16} />
                                {saving ? "Đang lưu..." : "Lưu hồ sơ"}
                            </button>
                        </div>
                    )}
                </div>

                <aside className="merchant-info-sidebar">
                    <section className="merchant-info-section">
                        <div className="merchant-info-section-title">
                            <FileText size={18} />
                            <div>
                                <h2>{data.duocChinhSua ? "Hoàn thiện hồ sơ" : "Hồ sơ đã lưu"}</h2>
                                <p>{data.duocChinhSua ? "Chuẩn bị thông tin trước khi ký hợp đồng." : "Thông tin pháp lý dùng để đối chiếu hợp đồng."}</p>
                            </div>
                        </div>

                        <div className="merchant-legal-help">
                            {data.duocChinhSua && <>
                            <p>
                                Bạn có thể lưu thông tin đang nhập và quay lại
                                hoàn thiện sau.
                            </p>
                            <p>
                                Lưu hồ sơ chưa gửi yêu cầu xét duyệt.
                                Bước ký hợp đồng và gửi hồ sơ sẽ thực hiện tiếp theo.
                            </p>
                            </>}
                            <Link to="/quan/thong-tin">
                                Xem thông tin quán →
                            </Link>
                        </div>
                    </section>
                </aside>
            </form>
        </div>
    );
}

export default RestaurantLegalProfile;