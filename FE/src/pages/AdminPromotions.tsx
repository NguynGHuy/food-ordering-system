import MotionPresence from "../components/MotionPresence";
import { useCallback, useEffect, useState } from "react";
import {
    CalendarDays,
    Clock3,
    Edit3,
    PauseCircle,
    PlayCircle,
    Plus,
    RefreshCw,
    Search,
    TicketPercent,
} from "lucide-react";
import CreatePromotionForm from "../components/CreatePromotionForm";
import EditPromotionForm from "../components/EditPromotionForm";
import {
    getSystemPromotions,
    togglePromotionStatus,
} from "../services/promotionService";
import type { Promotion } from "../services/promotionService";
import Pagination from "../components/Pagination";

type PromotionFilter =
    | "all"
    | "active"
    | "upcoming"
    | "inactive"
    | "expired";

interface PromotionState {
    code: Exclude<PromotionFilter, "all">;
    label: string;
}

function getPromotionState(item: Promotion): PromotionState {
    const now = Date.now();
    const start = new Date(item.ngayBatDau).getTime();
    const end = new Date(item.ngayKetThuc).getTime();

    if (!item.trangThai) {
        return { code: "inactive", label: "Đã tắt" };
    }

    if (now < start) {
        return { code: "upcoming", label: "Sắp diễn ra" };
    }

    if (now > end) {
        return { code: "expired", label: "Đã hết hạn" };
    }

    return { code: "active", label: "Đang hoạt động" };
}

function formatMoney(value: number) {
    return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

function formatDate(value: string) {
    return new Date(value).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function AdminPromotions() {
    const PAGE_SIZE = 10;
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [keyword, setKeyword] = useState("");
    const [filter, setFilter] = useState<PromotionFilter>("all");
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [editingPromotion, setEditingPromotion] =
        useState<Promotion | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [pageNumber, setPageNumber] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [counts, setCounts] = useState({
        all: 0,
        active: 0,
        upcoming: 0,
        ended: 0,
        inactive: 0,
        expired: 0,
    });

    const loadPromotions = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            setError("");

            const result = await getSystemPromotions({
                pageNumber,
                pageSize: PAGE_SIZE,
                search: keyword.trim() || undefined,
                state: filter === "all" ? undefined : filter,
            });
            setPromotions(result.items);
            setTotalItems(result.totalItems);
            setTotalPages(result.totalPages);
            setCounts(result.counts);
            if (result.pageNumber !== pageNumber) setPageNumber(result.pageNumber);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Không thể tải danh sách khuyến mãi."
            );
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [filter, keyword, pageNumber]);

    useEffect(() => {
        const frameId = window.requestAnimationFrame(() => {
            void loadPromotions();
        });

        return () => window.cancelAnimationFrame(frameId);
    }, [loadPromotions]);

    const handleToggle = async (item: Promotion) => {
        if (busyId !== null) return;

        try {
            setBusyId(item.maKhuyenMai);
            setError("");
            setSuccess("");

            await togglePromotionStatus(item.maKhuyenMai);
            await loadPromotions(false);

            setSuccess(
                item.trangThai
                    ? `Đã tắt mã ${item.maCode}.`
                    : `Đã bật mã ${item.maCode}.`
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Không thể thay đổi trạng thái khuyến mãi."
            );
        } finally {
            setBusyId(null);
        }
    };

    const handleCreated = async () => {
        await loadPromotions(false);
        setShowCreate(false);
        setSuccess("Đã tạo mã khuyến mãi hệ thống.");
    };

    const handleSaved = (updated: Promotion) => {
        setPromotions((current) =>
            current.map((item) =>
                item.maKhuyenMai === updated.maKhuyenMai
                    ? updated
                    : item
            )
        );

        setEditingPromotion(null);
        setSuccess(`Đã cập nhật mã ${updated.maCode}.`);
        void loadPromotions(false);
    };

    return (
        <div className="admin-promotions-pro">
            <header className="admin-promotions-heading">
                <div>
                    <span>Ưu đãi toàn hệ thống</span>
                    <h1>Khuyến mãi hệ thống</h1>
                    <p>
                        Tạo và quản lý các mã giảm giá do hệ thống phát hành.
                    </p>
                </div>

                <div className="admin-promotions-heading-actions">
                    <button
                        type="button"
                        className="refresh"
                        disabled={loading}
                        onClick={() => void loadPromotions()}
                    >
                        <RefreshCw size={15} />
                        Tải lại
                    </button>

                    <button
                        type="button"
                        className="create"
                        onClick={() => {
                            setSuccess("");
                            setShowCreate(true);
                        }}
                    >
                        <Plus size={16} />
                        Tạo khuyến mãi
                    </button>
                </div>
            </header>

            <section className="admin-promotion-summary">
                <article>
                    <span className="total">
                        <TicketPercent size={18} />
                    </span>
                    <div>
                        <small>Tổng mã hệ thống</small>
                        <strong>{counts.all}</strong>
                    </div>
                </article>

                <article>
                    <span className="active">
                        <PlayCircle size={18} />
                    </span>
                    <div>
                        <small>Đang hoạt động</small>
                        <strong>{counts.active}</strong>
                    </div>
                </article>

                <article>
                    <span className="upcoming">
                        <Clock3 size={18} />
                    </span>
                    <div>
                        <small>Sắp diễn ra</small>
                        <strong>{counts.upcoming}</strong>
                    </div>
                </article>
            </section>

            {success && (
                <div className="admin-promotions-success" role="status">
                    {success}
                </div>
            )}

            {error && (
                <div className="admin-promotions-error" role="alert">
                    {error}
                </div>
            )}

            <section className="admin-promotions-panel">
                <div className="admin-promotions-toolbar">
                    <label className="admin-promotion-search">
                        <Search size={16} />
                        <input
                            type="search"
                            placeholder="Tìm mã hoặc mô tả..."
                            value={keyword}
                            onChange={(event) => {
                                setKeyword(event.target.value);
                                setPageNumber(1);
                            }}
                        />
                    </label>

                    <div className="admin-promotion-filters">
                        {(
                            [
                                ["all", "Tất cả"],
                                ["active", "Đang chạy"],
                                ["upcoming", "Sắp diễn ra"],
                                ["inactive", "Đã tắt"],
                                ["expired", "Hết hạn"],
                            ] as const
                        ).map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                className={
                                    filter === value ? "active" : ""
                                }
                                onClick={() => {
                                    setFilter(value);
                                    setPageNumber(1);
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="admin-promotions-result">
                    Hiển thị{" "}
                    <strong>{totalItems}</strong> khuyến mãi
                </div>

                {loading ? (
                    <div className="admin-promotions-loading">
                        <RefreshCw size={21} />
                        <span>Đang tải khuyến mãi...</span>
                    </div>
                ) : promotions.length === 0 ? (
                    <div className="admin-promotions-empty">
                        <TicketPercent size={28} />
                        <strong>Không có khuyến mãi phù hợp</strong>
                        <p>
                            Hãy thay đổi bộ lọc hoặc tạo mã khuyến mãi mới.
                        </p>
                    </div>
                ) : (
                    <div className="admin-promotions-table-scroll">
                        <table className="admin-promotions-table">
                            <thead>
                                <tr>
                                    <th>Mã khuyến mãi</th>
                                    <th>Mức giảm</th>
                                    <th>Sử dụng</th>
                                    <th>Thời gian áp dụng</th>
                                    <th>Trạng thái</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>

                            <tbody>
                                {promotions.map((item) => {
                                    const state =
                                        getPromotionState(item);

                                    const usagePercent =
                                        item.soLuong > 0
                                            ? Math.min(
                                                  100,
                                                  (item.soLuongDaDung /
                                                      item.soLuong) *
                                                      100
                                              )
                                            : 0;

                                    return (
                                        <tr key={item.maKhuyenMai}>
                                            <td>
                                                <div className="admin-promotion-code">
                                                    <span>
                                                        <TicketPercent
                                                            size={17}
                                                        />
                                                    </span>

                                                    <div>
                                                        <strong>
                                                            {item.maCode}
                                                        </strong>
                                                        <small>
                                                            {item.moTa ||
                                                                "Không có mô tả"}
                                                        </small>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>
                                                <div className="admin-promotion-discount">
                                                    <strong>
                                                        {item.loaiGiam ===
                                                        "PhanTram"
                                                            ? `${item.giaTriGiam}%`
                                                            : formatMoney(
                                                                  item.giaTriGiam
                                                              )}
                                                    </strong>

                                                    <small>
                                                        {item.giamToiDa !==
                                                        null
                                                            ? `Tối đa ${formatMoney(
                                                                  item.giamToiDa
                                                              )}`
                                                            : `Đơn từ ${formatMoney(
                                                                  item.donHangToiThieu
                                                              )}`}
                                                    </small>
                                                </div>
                                            </td>

                                            <td>
                                                <div className="admin-promotion-usage">
                                                    <span>
                                                        {item.soLuongDaDung}/
                                                        {item.soLuong}
                                                    </span>

                                                    <i>
                                                        <b
                                                            style={{
                                                                width: `${usagePercent}%`,
                                                            }}
                                                        />
                                                    </i>
                                                </div>
                                            </td>

                                            <td>
                                                <div className="admin-promotion-period">
                                                    <CalendarDays
                                                        size={14}
                                                    />
                                                    <span>
                                                        {formatDate(
                                                            item.ngayBatDau
                                                        )}
                                                        <small>
                                                            đến{" "}
                                                            {formatDate(
                                                                item.ngayKetThuc
                                                            )}
                                                        </small>
                                                    </span>
                                                </div>
                                            </td>

                                            <td>
                                                <span
                                                    className={`admin-promotion-state ${state.code}`}
                                                >
                                                    <i aria-hidden="true" />
                                                    {state.label}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="admin-promotion-actions">
                                                    <button
                                                        type="button"
                                                        className="edit"
                                                        title="Sửa mã"
                                                        disabled={
                                                            busyId !== null
                                                        }
                                                        onClick={() => {
                                                            setSuccess("");
                                                            setEditingPromotion(
                                                                item
                                                            );
                                                        }}
                                                    >
                                                        <Edit3 size={14} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className={
                                                            item.trangThai
                                                                ? "disable"
                                                                : "enable"
                                                        }
                                                        disabled={
                                                            busyId !== null
                                                        }
                                                        onClick={() =>
                                                            void handleToggle(
                                                                item
                                                            )
                                                        }
                                                    >
                                                        {busyId ===
                                                        item.maKhuyenMai ? (
                                                            "Đang xử lý..."
                                                        ) : item.trangThai ? (
                                                            <>
                                                                <PauseCircle
                                                                    size={14}
                                                                />
                                                                Tắt
                                                            </>
                                                        ) : (
                                                            <>
                                                                <PlayCircle
                                                                    size={14}
                                                                />
                                                                Bật
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && !error && totalPages > 1 && (
                    <Pagination
                        pageNumber={pageNumber}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        onPageChange={setPageNumber}
                    />
                )}
            </section>

            <MotionPresence present={Boolean(showCreate)}>{showCreate && (
                <div
                    className="admin-promotion-modal-overlay"
                    role="dialog"
                    aria-modal="true"
                    onMouseDown={() => setShowCreate(false)}
                >
                    <section
                        className="admin-promotion-modal"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <CreatePromotionForm
                            admin
                            onCreated={handleCreated}
                            onCancel={() => setShowCreate(false)}
                        />
                    </section>
                </div>
            )}</MotionPresence>

            <MotionPresence present={Boolean(editingPromotion)}>{editingPromotion && (
                <div
                    className="admin-promotion-modal-overlay"
                    role="dialog"
                    aria-modal="true"
                    onMouseDown={() => setEditingPromotion(null)}
                >
                    <section
                        className="admin-promotion-modal edit-modal"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <EditPromotionForm
                            key={editingPromotion.maKhuyenMai}
                            promotion={editingPromotion}
                            onSaved={handleSaved}
                            onCancel={() => setEditingPromotion(null)}
                        />
                    </section>
                </div>
            )}</MotionPresence>
        </div>
    );
}

export default AdminPromotions;
