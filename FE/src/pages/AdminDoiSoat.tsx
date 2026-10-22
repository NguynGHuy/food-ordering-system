import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Eye, LoaderCircle, Plus, RefreshCw, Search, X } from "lucide-react";
import Pagination from "../components/Pagination";
import ReconciliationBreakdown from "../components/ReconciliationBreakdown";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh";
import {
  createDoiSoat,
  getAdminDoiSoat,
  getAdminDoiSoatDetail,
  getDoiSoatRestaurantOptions,
  payDoiSoat,
  type DoiSoatDetail,
  type DoiSoatRestaurantOption,
  type DoiSoatSummary,
} from "../services/doiSoatService";

function money(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Có lỗi xảy ra. Vui lòng thử lại.";
}

const STATUS_LABEL: Record<string, string> = {
  MoiTao: "Mới tạo",
  ChoXacNhan: "Chờ nhà hàng xác nhận",
  DaXacNhan: "Chờ thanh toán",
  DaThanhToan: "Đã thanh toán",
  TranhChap: "Đang tranh chấp",
};

export default function AdminDoiSoat() {
  const [list, setList] = useState<DoiSoatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<DoiSoatDetail | null>(null);
  const [maGiaoDich, setMaGiaoDich] = useState("");
  const [hinhThucThanhToan, setHinhThucThanhToan] = useState<"ChuyenKhoan" | "ViNhaHang">("ChuyenKhoan");
  const [formCreate, setFormCreate] = useState({ maNhaHang: "", tuNgay: "", denNgay: "" });
  const [restaurantSearch, setRestaurantSearch] = useState("");
  const [restaurantOptions, setRestaurantOptions] = useState<DoiSoatRestaurantOption[]>([]);
  const [restaurantOptionsLoading, setRestaurantOptionsLoading] = useState(false);
  const [restaurantOptionsError, setRestaurantOptionsError] = useState("");
  const [restaurantPickerOpen, setRestaurantPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getAdminDoiSoat({ pageNumber, pageSize: 10 });
      setList(response.items);
      setTotalPages(response.totalPages);
    } catch (caughtError: unknown) {
      setError(getErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }, [pageNumber]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  const refreshRealtime = useCallback(async () => {
    await loadData();
    if (showDetail) {
      try {
        setDetailData(await getAdminDoiSoatDetail(showDetail));
      } catch {
        // The list still refreshes; a transient detail failure is retried on reopen.
      }
    }
  }, [loadData, showDetail]);

  useRealtimeRefresh(["doiSoat"], refreshRealtime);

  useEffect(() => {
    if (!showCreate) return;

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setRestaurantOptionsLoading(true);
        setRestaurantOptionsError("");
        const options = await getDoiSoatRestaurantOptions(restaurantSearch);
        if (!cancelled) setRestaurantOptions(options);
      } catch (caughtError: unknown) {
        if (!cancelled) {
          setRestaurantOptions([]);
          setRestaurantOptionsError(getErrorMessage(caughtError));
        }
      } finally {
        if (!cancelled) setRestaurantOptionsLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [restaurantSearch, showCreate]);

  const openCreateModal = () => {
    setFormCreate({ maNhaHang: "", tuNgay: "", denNgay: "" });
    setRestaurantSearch("");
    setRestaurantOptionsError("");
    setRestaurantPickerOpen(true);
    setShowCreate(true);
  };

  const closeCreateModal = () => {
    if (busy) return;
    setShowCreate(false);
    setRestaurantPickerOpen(false);
    setRestaurantOptionsError("");
  };

  const selectRestaurant = (restaurant: DoiSoatRestaurantOption) => {
    setFormCreate((current) => ({ ...current, maNhaHang: String(restaurant.maNhaHang) }));
    setRestaurantSearch(restaurant.tenNhaHang);
    setRestaurantPickerOpen(false);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formCreate.maNhaHang) {
      alert("Vui lòng chọn một nhà hàng trong danh sách.");
      setRestaurantPickerOpen(true);
      return;
    }

    try {
      setBusy(true);
      await createDoiSoat({
        maNhaHang: Number(formCreate.maNhaHang),
        tuNgay: formCreate.tuNgay,
        denNgay: formCreate.denNgay,
      });
      setShowCreate(false);
      setFormCreate({ maNhaHang: "", tuNgay: "", denNgay: "" });
      setRestaurantSearch("");
      setRestaurantPickerOpen(false);
      await loadData();
      alert("Tạo kỳ đối soát thành công.");
    } catch (caughtError: unknown) {
      alert(getErrorMessage(caughtError));
    } finally {
      setBusy(false);
    }
  };

  const handleViewDetail = async (id: number) => {
    try {
      setBusy(true);
      const response = await getAdminDoiSoatDetail(id);
      setDetailData(response);
      setHinhThucThanhToan(response.soTienCanDoiSoat > 0 ? "ViNhaHang" : "ChuyenKhoan");
      setShowDetail(id);
    } catch (caughtError: unknown) {
      alert(getErrorMessage(caughtError));
    } finally {
      setBusy(false);
    }
  };

  const closeDetail = () => {
    setShowDetail(null);
    setDetailData(null);
    setMaGiaoDich("");
    setHinhThucThanhToan("ChuyenKhoan");
  };

  const handlePay = async () => {
    if (!detailData || !showDetail) return;
    if (detailData.soTienCanDoiSoat !== 0 &&
        hinhThucThanhToan === "ChuyenKhoan" &&
        !maGiaoDich.trim()) {
      alert("Vui lòng nhập mã giao dịch.");
      return;
    }

    try {
      setBusy(true);
      await payDoiSoat(showDetail, maGiaoDich, hinhThucThanhToan);
      alert("Xác nhận thanh toán thành công.");
      closeDetail();
      await loadData();
    } catch (caughtError: unknown) {
      alert(getErrorMessage(caughtError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-promotions-pro reconciliation-page">
      <header className="admin-promotions-heading">
        <div>
          <span>Kế toán & tài chính</span>
          <h1>Đối soát nhà hàng</h1>
          <p>Kiểm tra từng nguồn tiền trước khi chốt thanh toán với nhà hàng.</p>
        </div>
        <div className="admin-promotions-heading-actions">
          <button type="button" className="refresh" onClick={() => void loadData()} disabled={loading}>
            <RefreshCw size={15} /> Tải lại
          </button>
          <button type="button" className="create" onClick={openCreateModal}>
            <Plus size={16} /> Tạo kỳ đối soát
          </button>
        </div>
      </header>

      <section className="reconciliation-explainer">
        <strong>Số tiền cần đối soát</strong>
        <span>=</span>
        <span>Nhà hàng được hưởng</span>
        <span>−</span>
        <span>Tiền đã thu COD và tiền đã cộng vào ví</span>
      </section>

      {error && <div className="admin-promotions-error" role="alert">{error}</div>}

      <section className="admin-promotions-panel">
        {loading ? (
          <div className="admin-promotions-loading">Đang tải dữ liệu...</div>
        ) : (
          <div className="admin-promotions-table-scroll">
            <table className="admin-promotions-table reconciliation-admin-table">
              <thead>
                <tr>
                  <th>Kỳ đối soát</th>
                  <th>Nhà hàng</th>
                  <th>Số đơn</th>
                  <th>Phí nền tảng</th>
                  <th>Nhà hàng được hưởng</th>
                  <th>Đã nhận COD + ví</th>
                  <th>Còn đối soát</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr><td colSpan={9} className="admin-finance-empty">Chưa có kỳ đối soát nào.</td></tr>
                ) : list.map((item) => (
                  <tr key={item.maDoiSoat}>
                    <td>
                      <strong>Kỳ #{item.maDoiSoat}</strong>
                      <small>{item.tuNgay} – {item.denNgay}</small>
                    </td>
                    <td>{item.tenNhaHang}<small>Mã: {item.maNhaHang}</small></td>
                    <td>{item.tongSoDon} đơn</td>
                    <td>{money(item.tongPhiNenTang)}</td>
                    <td>{money(item.tongTienNhaHangNhan)}</td>
                    <td>{money(item.tongTienNhaHangDaThu)}</td>
                    <td>
                      <strong className={item.soTienCanDoiSoat < 0 ? "finance-negative" : "finance-positive"}>
                        {item.soTienCanDoiSoat < 0 ? "−" : ""}{money(Math.abs(item.soTienCanDoiSoat))}
                      </strong>
                    </td>
                    <td>
                      <span className={`admin-promotion-state ${item.trangThai === "DaThanhToan" ? "active" : "upcoming"}`}>
                        <i aria-hidden="true" />{STATUS_LABEL[item.trangThai] || item.trangThai}
                      </span>
                    </td>
                    <td>
                      <button className="admin-account-toggle unlock" onClick={() => void handleViewDetail(item.maDoiSoat)}>
                        <Eye size={14} /> Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <Pagination pageNumber={pageNumber} totalPages={totalPages} onPageChange={setPageNumber} />
        )}
      </section>

      {showCreate && createPortal((
        <div className="admin-promotion-modal-overlay">
          <div className="admin-promotion-modal edit-modal">
            <button className="admin-promotion-modal-close" onClick={closeCreateModal} disabled={busy} aria-label="Đóng"><X size={18} /></button>
            <form onSubmit={(event) => void handleCreate(event)}>
              <h2>Tạo kỳ đối soát mới</h2>
              <p className="reconciliation-form-intro">Tổng hợp các đơn đã hoàn thành và chưa thuộc kỳ đối soát nào.</p>
              <div className="reconciliation-form-field reconciliation-restaurant-picker">
                <label htmlFor="reconciliation-restaurant-search">Nhà hàng</label>
                <div className="reconciliation-restaurant-search-wrap">
                  <Search size={16} aria-hidden="true" />
                  <input
                    id="reconciliation-restaurant-search"
                    type="search"
                    autoComplete="off"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={restaurantPickerOpen}
                    aria-controls="reconciliation-restaurant-options"
                    placeholder="Tìm theo tên hoặc mã nhà hàng"
                    value={restaurantSearch}
                    onFocus={() => setRestaurantPickerOpen(true)}
                    onChange={(event) => {
                      setRestaurantSearch(event.target.value);
                      setFormCreate((current) => ({ ...current, maNhaHang: "" }));
                      setRestaurantPickerOpen(true);
                    }}
                  />
                  {restaurantOptionsLoading && <LoaderCircle className="reconciliation-picker-spinner" size={16} aria-label="Đang tải" />}
                </div>

                {restaurantPickerOpen && (
                  <div id="reconciliation-restaurant-options" className="reconciliation-restaurant-options" role="listbox">
                    {restaurantOptionsError ? (
                      <p className="reconciliation-picker-message is-error">{restaurantOptionsError}</p>
                    ) : restaurantOptionsLoading && restaurantOptions.length === 0 ? (
                      <p className="reconciliation-picker-message">Đang tìm nhà hàng...</p>
                    ) : restaurantOptions.length === 0 ? (
                      <p className="reconciliation-picker-message">Không tìm thấy nhà hàng phù hợp.</p>
                    ) : restaurantOptions.map((restaurant) => (
                      <button
                        key={restaurant.maNhaHang}
                        type="button"
                        role="option"
                        aria-selected={formCreate.maNhaHang === String(restaurant.maNhaHang)}
                        onClick={() => selectRestaurant(restaurant)}
                      >
                        <span>
                          <strong>{restaurant.tenNhaHang}</strong>
                          <small>{restaurant.diaChiQuan}</small>
                        </span>
                        <span className="reconciliation-restaurant-code">
                          Mã #{restaurant.maNhaHang}
                          {formCreate.maNhaHang === String(restaurant.maNhaHang) && <Check size={15} aria-hidden="true" />}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {formCreate.maNhaHang && (
                  <small className="reconciliation-picker-selected">Đã chọn mã nhà hàng #{formCreate.maNhaHang}</small>
                )}
              </div>
              <label className="reconciliation-form-field">
                <span>Từ ngày</span>
                <input type="date" required value={formCreate.tuNgay} onChange={(event) => setFormCreate({ ...formCreate, tuNgay: event.target.value })} />
              </label>
              <label className="reconciliation-form-field">
                <span>Đến ngày</span>
                <input type="date" required value={formCreate.denNgay} onChange={(event) => setFormCreate({ ...formCreate, denNgay: event.target.value })} />
              </label>
              <div className="promotion-edit-actions">
                <button type="button" onClick={closeCreateModal} disabled={busy}>Hủy</button>
                <button type="submit" disabled={busy}>{busy ? "Đang tạo..." : "Tạo kỳ đối soát"}</button>
              </div>
            </form>
          </div>
        </div>
      ), document.body)}

      {showDetail && detailData && createPortal((
        <div className="admin-promotion-modal-overlay">
          <div className="admin-promotion-modal reconciliation-modal">
            <button className="admin-promotion-modal-close" onClick={closeDetail}><X size={18} /></button>
            <div className="reconciliation-modal-title">
              <span>Nhà hàng: {detailData.tenNhaHang}</span>
              <h2>Chi tiết kỳ đối soát #{detailData.maDoiSoat}</h2>
            </div>

            <ReconciliationBreakdown detail={detailData} perspective="admin" />

            {detailData.trangThai === "DaXacNhan" && (
              <section className="reconciliation-payment-box">
                <strong>Nhà hàng đã xác nhận số liệu</strong>
                {detailData.soTienCanDoiSoat > 0 && (
                  <label className="admin-settlement-method">
                    <span>Hình thức thanh toán</span>
                    <select value={hinhThucThanhToan} onChange={(event) => setHinhThucThanhToan(event.target.value as "ChuyenKhoan" | "ViNhaHang")}>
                      <option value="ViNhaHang">Cộng vào ví nhà hàng</option>
                      <option value="ChuyenKhoan">Chuyển khoản ngân hàng</option>
                    </select>
                  </label>
                )}
                {detailData.soTienCanDoiSoat !== 0 && hinhThucThanhToan === "ChuyenKhoan" && (
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="Nhập mã giao dịch ngân hàng"
                    value={maGiaoDich}
                    onChange={(event) => setMaGiaoDich(event.target.value)}
                  />
                )}
                <button type="button" onClick={() => void handlePay()} disabled={busy}>
                  {detailData.soTienCanDoiSoat === 0
                    ? "Chốt kỳ không phát sinh công nợ"
                    : hinhThucThanhToan === "ViNhaHang"
                      ? "Cộng tiền vào ví nhà hàng"
                      : detailData.soTienCanDoiSoat > 0
                        ? "Xác nhận đã chuyển khoản"
                        : "Xác nhận đã nhận tiền"}
                </button>
              </section>
            )}

            {detailData.trangThai === "DaThanhToan" && (
              <p className="reconciliation-paid">
                Đã thanh toán · Mã giao dịch: {detailData.maGiaoDichDoiSoat || "—"}
              </p>
            )}
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
