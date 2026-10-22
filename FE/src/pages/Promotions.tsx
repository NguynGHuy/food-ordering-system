import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Pencil,
  Plus,
  Power,
  ShoppingBag,
  TicketPercent,
  Users,
} from "lucide-react";
import {
  getMyPromotions,
  togglePromotionStatus,
  type Promotion,
} from "../services/promotionService";
import CreatePromotionForm from "../components/CreatePromotionForm";
import EditPromotionForm from "../components/EditPromotionForm";
import ScrollReveal from "../components/ScrollReveal";
import Pagination from "../components/Pagination";

type PromotionFilter = "all" | "active" | "upcoming" | "ended";
type PromotionState = "active" | "upcoming" | "expired" | "inactive";

const STATUS_INFO: Record<
  PromotionState,
  { label: string; className: string }
> = {
  active: { label: "Đang áp dụng", className: "active" },
  upcoming: { label: "Sắp diễn ra", className: "upcoming" },
  expired: { label: "Đã hết hạn", className: "expired" },
  inactive: { label: "Đã tắt", className: "inactive" },
};

function getPromotionState(item: Promotion): PromotionState {
  if (!item.trangThai) return "inactive";

  const now = Date.now();
  const start = new Date(item.ngayBatDau).getTime();
  const end = new Date(item.ngayKetThuc).getTime();

  if (start > now) return "upcoming";
  if (end < now) return "expired";
  return "active";
}

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Promotions() {
  const PAGE_SIZE = 8;
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [filter, setFilter] = useState<PromotionFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [changingId, setChangingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [counts, setCounts] = useState({ all: 0, active: 0, upcoming: 0, ended: 0 });

  const loadPromotions = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError("");

      const data = await getMyPromotions({
        pageNumber,
        pageSize: PAGE_SIZE,
        state: filter === "all" ? undefined : filter,
      });
      setPromotions(data.items);
      setTotalItems(data.totalItems);
      setTotalPages(data.totalPages);
      setCounts(data.counts);
      if (data.pageNumber !== pageNumber) setPageNumber(data.pageNumber);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể lấy danh sách khuyến mãi.",
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [filter, pageNumber]);

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      void loadPromotions();
    }, 0);

    return () => window.clearTimeout(initialLoadTimer);
  }, [loadPromotions]);

  const showMessage = (message: string) => {
    setSuccess(message);
    window.setTimeout(() => setSuccess(""), 3000);
  };

  const handleToggle = async (item: Promotion) => {
    try {
      setChangingId(item.maKhuyenMai);
      setError("");
      setSuccess("");

      await togglePromotionStatus(item.maKhuyenMai);
      await loadPromotions(false);

      showMessage(
        item.trangThai
          ? `Đã tắt mã ${item.maCode}.`
          : `Đã bật mã ${item.maCode}.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể thay đổi trạng thái mã giảm giá.",
      );
    } finally {
      setChangingId(null);
    }
  };

  const countByFilter = (value: PromotionFilter) => counts[value];

  if (loading) {
    return (
      <div className="quan-page-loading">Đang tải danh sách khuyến mãi...</div>
    );
  }

  const editingPromotion =
    promotions.find((item) => item.maKhuyenMai === editingId) ?? null;

  return (
    <div className="merchant-promotions-page">
      <ScrollReveal className="merchant-promotions-header-reveal" delay={40}>
        <header className="merchant-promotions-header">
        <div>
          <span className="merchant-promotions-eyebrow">
            CHƯƠNG TRÌNH ƯU ĐÃI
          </span>
          <h1>Khuyến mãi</h1>
          <p>Tạo và quản lý mã giảm giá dành cho khách hàng.</p>
        </div>

        <button
          type="button"
          className="merchant-promotions-add"
          onClick={() => {
            setCreateOpen(true);
            setEditingId(null);
            setError("");
            setSuccess("");
          }}
        >
          <Plus size={16} />
          Tạo mã mới
        </button>
        </header>
      </ScrollReveal>

      {error && !createOpen && editingId === null && (
        <div className="merchant-promotions-notice error">{error}</div>
      )}

      {success && (
        <div className="merchant-promotions-notice success">✓ {success}</div>
      )}

      <ScrollReveal className="merchant-promotions-tabs-reveal" delay={80}>
        <nav className="merchant-promotions-tabs">
        {(
          [
            ["all", "Tất cả"],
            ["active", "Đang áp dụng"],
            ["upcoming", "Sắp diễn ra"],
            ["ended", "Đã tắt / hết hạn"],
          ] as [PromotionFilter, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={filter === value ? "active" : ""}
            onClick={() => {
              setFilter(value);
              setPageNumber(1);
            }}
          >
            {label}
            <span>{countByFilter(value)}</span>
          </button>
        ))}
        </nav>
      </ScrollReveal>

      {promotions.length === 0 ? (
        <ScrollReveal className="merchant-promotions-empty-reveal" delay={110}>
          <div className="merchant-promotions-empty">
          <span>
            <TicketPercent size={28} />
          </span>
          <h3>
            {counts.all === 0
              ? "Chưa có mã giảm giá"
              : "Không có mã phù hợp"}
          </h3>
          <p>
            {counts.all === 0
              ? "Tạo chương trình ưu đãi đầu tiên cho khách hàng."
              : "Không có mã giảm giá thuộc trạng thái này."}
          </p>

          {counts.all === 0 && (
            <button type="button" onClick={() => setCreateOpen(true)}>
              <Plus size={15} />
              Tạo mã mới
            </button>
          )}
          </div>
        </ScrollReveal>
      ) : (
        <div className="merchant-promotions-grid">
          {promotions.map((item, index) => {
            const state = getPromotionState(item);
            const status = STATUS_INFO[state];
            const usagePercent =
              item.soLuong > 0
                ? Math.min(100, (item.soLuongDaDung / item.soLuong) * 100)
                : 0;

            return (
              <ScrollReveal
                key={item.maKhuyenMai}
                className="merchant-promotion-card-reveal"
                delay={Math.min(index * 50, 250)}
              >
                <article
                  className={`merchant-promotion-card state-${status.className}`}
                >
                <header className="merchant-promotion-card-header">
                  <div className="merchant-promotion-code">
                    <span>
                      <TicketPercent size={16} />
                    </span>

                    <div>
                      <small>MÃ GIẢM GIÁ</small>
                      <h2>{item.maCode}</h2>
                    </div>
                  </div>

                  <span
                    className={`merchant-promotion-status ${status.className}`}
                  >
                    <i />
                    {status.label}
                  </span>
                </header>

                <p className="merchant-promotion-description">
                  {item.moTa || "Chương trình ưu đãi của nhà hàng."}
                </p>

                <div className="merchant-promotion-value">
                  <span>Mức ưu đãi</span>
                  <strong>
                    {item.loaiGiam === "PhanTram"
                      ? `${item.giaTriGiam}%`
                      : formatMoney(item.giaTriGiam)}
                  </strong>

                  {item.giamToiDa !== null && item.loaiGiam === "PhanTram" && (
                    <small>Giảm tối đa {formatMoney(item.giamToiDa)}</small>
                  )}
                </div>

                <div className="merchant-promotion-meta">
                  <div>
                    <ShoppingBag size={15} />
                    <span>
                      Đơn tối thiểu
                      <strong>{formatMoney(item.donHangToiThieu)}</strong>
                    </span>
                  </div>

                  <div>
                    <Users size={15} />
                    <span>
                      Lượt sử dụng
                      <strong>
                        {item.soLuongDaDung}/{item.soLuong}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="merchant-promotion-progress">
                  <div>
                    <span>Tiến độ sử dụng</span>
                    <strong>{Math.round(usagePercent)}%</strong>
                  </div>

                  <span>
                    <i
                      style={{
                        width: `${usagePercent}%`,
                      }}
                    />
                  </span>
                </div>

                <div className="merchant-promotion-period">
                  <CalendarDays size={15} />
                  <div>
                    <span>Thời gian áp dụng</span>
                    <p>
                      {formatDate(item.ngayBatDau)}
                      <b>→</b>
                      {formatDate(item.ngayKetThuc)}
                    </p>
                  </div>
                </div>

                <footer className="merchant-promotion-actions">
                  <button
                    type="button"
                    className="edit"
                    disabled={changingId !== null || editingId !== null}
                    onClick={() => {
                      setCreateOpen(false);
                      setEditingId(item.maKhuyenMai);
                      setSuccess("");
                      setError("");
                    }}
                  >
                    <Pencil size={14} />
                    Chỉnh sửa
                  </button>

                  <button
                    type="button"
                    className={item.trangThai ? "disable" : "enable"}
                    disabled={changingId !== null || editingId !== null}
                    onClick={() => void handleToggle(item)}
                  >
                    <Power size={14} />
                    {changingId === item.maKhuyenMai
                      ? "Đang xử lý..."
                      : item.trangThai
                        ? "Tắt mã"
                        : "Bật mã"}
                  </button>
                </footer>
                </article>
              </ScrollReveal>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          pageNumber={pageNumber}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setPageNumber}
        />
      )}

      {createOpen && (
        <div className="merchant-promotion-overlay">
          <div className="merchant-promotion-modal create">
            <CreatePromotionForm
              onCancel={() => setCreateOpen(false)}
              onCreated={async () => {
                await loadPromotions(false);
                setCreateOpen(false);
                showMessage("Đã tạo mã giảm giá mới.");
              }}
            />
          </div>
        </div>
      )}

      {editingPromotion && (
        <div className="merchant-promotion-overlay">
          <div className="merchant-promotion-modal edit">
            <EditPromotionForm
              key={editingPromotion.maKhuyenMai}
              promotion={editingPromotion}
              onCancel={() => setEditingId(null)}
              onSaved={(updated) => {
                setPromotions((current) =>
                  current.map((item) =>
                    item.maKhuyenMai === updated.maKhuyenMai ? updated : item,
                  ),
                );
                setEditingId(null);
                showMessage(`Đã cập nhật mã ${updated.maCode}.`);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Promotions;
