import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Eye, RefreshCw, X } from "lucide-react";
import Pagination from "../components/Pagination";
import ReconciliationBreakdown from "../components/ReconciliationBreakdown";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh";
import {
  confirmDoiSoat,
  getQuanDoiSoat,
  getQuanDoiSoatDetail,
  type DoiSoatDetail,
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
  MoiTao: "Đang tính toán",
  ChoXacNhan: "Chờ bạn xác nhận",
  DaXacNhan: "Chờ Admin thanh toán",
  DaThanhToan: "Đã hoàn tất",
  TranhChap: "Đang khiếu nại",
};

export default function RestaurantDoiSoat() {
  const [list, setList] = useState<DoiSoatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showDetail, setShowDetail] = useState<number | null>(null);
  const [detailData, setDetailData] = useState<DoiSoatDetail | null>(null);
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getQuanDoiSoat({ pageNumber, pageSize: 10 });
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
        setDetailData(await getQuanDoiSoatDetail(showDetail));
      } catch {
        // Keep the current modal readable and retry when the user reopens it.
      }
    }
  }, [loadData, showDetail]);

  useRealtimeRefresh(["doiSoat"], refreshRealtime);

  const handleViewDetail = async (id: number) => {
    try {
      setBusy(true);
      const response = await getQuanDoiSoatDetail(id);
      setDetailData(response);
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
  };

  const handleConfirm = async () => {
    if (!showDetail || !detailData) return;
    const agreed = window.confirm(
      "Bạn xác nhận đã kiểm tra tiền COD, tiền đã vào ví, phí nền tảng và số tiền còn đối soát?",
    );
    if (!agreed) return;

    try {
      setBusy(true);
      await confirmDoiSoat(showDetail);
      alert("Đã xác nhận số liệu. Vui lòng chờ Admin chốt kỳ.");
      closeDetail();
      await loadData();
    } catch (caughtError: unknown) {
      alert(getErrorMessage(caughtError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="merchant-info-page reconciliation-page">
      <header className="merchant-info-header">
        <div>
          <span className="merchant-info-eyebrow">TÀI CHÍNH</span>
          <h1>Đối soát doanh thu</h1>
          <p>Kiểm tra đầy đủ tiền COD, tiền vào ví, các khoản phí và công nợ với hệ thống.</p>
        </div>
        <button type="button" className="merchant-info-reset" onClick={() => void loadData()} disabled={loading}>
          <RefreshCw size={16} /> Tải lại
        </button>
      </header>

      <section className="reconciliation-explainer">
        <strong>Số tiền còn đối soát</strong>
        <span>=</span>
        <span>Tiền nhà hàng được hưởng</span>
        <span>−</span>
        <span>Tiền bạn đã thu COD và đã nhận vào ví</span>
      </section>

      {error && <p className="merchant-info-error" role="alert">{error}</p>}

      <section className="merchant-info-section reconciliation-list-panel">
        {loading ? (
          <p>Đang tải dữ liệu...</p>
        ) : list.length === 0 ? (
          <p>Chưa có kỳ đối soát nào.</p>
        ) : (
          <div className="reconciliation-table-scroll">
            <table className="reconciliation-list-table">
              <thead>
                <tr>
                  <th>Kỳ đối soát</th>
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
                {list.map((item) => (
                  <tr key={item.maDoiSoat}>
                    <td>
                      <strong>#{item.maDoiSoat}</strong>
                      <small>{item.tuNgay} – {item.denNgay}</small>
                    </td>
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
                      <span className={`merchant-info-approval ${item.trangThai === "ChoXacNhan" ? "" : "is-approved"}`}>
                        {STATUS_LABEL[item.trangThai] || item.trangThai}
                      </span>
                    </td>
                    <td>
                      <button className="merchant-info-save reconciliation-view-button" onClick={() => void handleViewDetail(item.maDoiSoat)} disabled={busy}>
                        <Eye size={14} /> Xem chi tiết
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

      {showDetail && detailData && createPortal((
        <div className="merchant-config-overlay">
          <div className="merchant-config-dialog reconciliation-modal">
            <header className="merchant-config-header">
              <div>
                <span>BẢNG KÊ CHI TIẾT</span>
                <h2>Kỳ đối soát #{detailData.maDoiSoat}</h2>
              </div>
              <button type="button" onClick={closeDetail}><X size={18} /></button>
            </header>
            <div className="merchant-config-body">
              <ReconciliationBreakdown detail={detailData} perspective="restaurant" />

              {detailData.trangThai === "ChoXacNhan" && (
                <div className="reconciliation-confirm-box">
                  <p>
                    Chỉ xác nhận sau khi bạn đã kiểm tra từng đơn, tiền COD,
                    tiền đã cộng vào ví và phí nền tảng.
                  </p>
                  <button className="merchant-info-save" onClick={() => void handleConfirm()} disabled={busy}>
                    <CheckCircle2 size={18} />
                    {busy ? "Đang xác nhận..." : "Xác nhận số liệu đúng"}
                  </button>
                </div>
              )}

              {detailData.trangThai === "DaThanhToan" && (
                <div className="reconciliation-paid">
                  <strong>Đã hoàn tất đối soát</strong>
                  <span>Mã giao dịch: {detailData.maGiaoDichDoiSoat || "—"}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
