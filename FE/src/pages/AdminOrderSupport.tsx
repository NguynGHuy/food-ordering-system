import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Pagination from "../components/Pagination";
import OrderWorkflowPanel from "../components/OrderWorkflowPanel";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh";
import { decideSupport, getSupportDetail, getSupportQueue, STATE_LABELS, SUPPORT_LABELS, workflowTime, type SupportDetail, type SupportRow } from "../services/orderWorkflowService";
import type { PagedResult } from "../services/api";

const money = (value: number) => value.toLocaleString("vi-VN") + " ₫";
export default function AdminOrderSupport() {
  const { id } = useParams();
  return <SupportContent key={id || "queue"} id={id} />;
}
function SupportContent({ id }: { id?: string }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("Open");
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [data, setData] = useState<PagedResult<SupportRow> | null>(null);
  const [detail, setDetail] = useState<SupportDetail | null>(null);
  const [error, setError] = useState("");
  const [action, setAction] = useState("ReviewSeparately");
  const [reason, setReason] = useState("");
  const [verified, setVerified] = useState(false);
  const [noDispute, setNoDispute] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const load = useCallback(async () => {
    try {
      if (id) {
        const next = await getSupportDetail(Number(id)); setDetail(next);
        if (next.support.status === "NeedsReview") setAction("Reject");
      }
      else setData(await getSupportQueue(page, status, submittedSearch));
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Không tải được hỗ trợ."); }
  }, [id, page, status, submittedSearch]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useRealtimeRefresh(["donHang"], load);
  return <main className="order-support-admin">
    <header className="order-support-page-heading"><div><h1>Hỗ trợ đơn hàng</h1><p>Đối chiếu sự cố, trạng thái và tài chính trước khi quyết định.</p></div><button onClick={() => void load()} disabled={busy}>Tải lại</button></header>
    {error && <p role="alert" className="order-workflow-error">{error}</p>}
    {result && <p role="status">{result}</p>}
    {!id ? <>
      <form className="order-support-toolbar" onSubmit={e => { e.preventDefault(); setPage(1); setSubmittedSearch(search.trim()); }}>
        <label>Tìm mã đơn hoặc lý do<input value={search} maxLength={150} onChange={e => setSearch(e.target.value)} /></label>
        <label>Trạng thái<select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="Open">Đang cần xử lý</option><option value="">Tất cả</option>{Object.entries(SUPPORT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button type="submit">Tìm kiếm</button>
      </form>
      {!data && !error && <p role="status">Đang tải hàng đợi…</p>}
      {data && <><div className="order-support-table-scroll"><table><thead><tr><th>Đơn / yêu cầu</th><th>Trạng thái đơn</th><th>Lý do</th><th>Hỗ trợ</th><th>Ngày tạo (VN)</th><th>Thao tác</th></tr></thead><tbody>{data.items.map(row => <tr key={row.id}>
        <td><strong>{row.maDonHangHienThi}</strong><small>#{row.id} · {row.kind === "SLA" ? "Chậm tiến độ" : row.kind === "Acceptance" ? "Hạn nhận / tài chính" : "Yêu cầu hỗ trợ"}</small></td><td>{STATE_LABELS[row.state]}</td><td>{row.reason}</td><td>{SUPPORT_LABELS[row.status]}</td><td>{workflowTime(row.createdAt)}</td><td><Link to={`/admin/ho-tro-don-hang/${row.id}`}>Xem & xử lý</Link></td>
      </tr>)}</tbody></table></div>{data.items.length === 0 && <p>Không có yêu cầu phù hợp bộ lọc.</p>}<Pagination pageNumber={data.pageNumber} totalPages={data.totalPages} totalItems={data.totalItems} onPageChange={setPage} /></>}
    </> : !detail ? !error && <p role="status">Đang tải chi tiết…</p> : <>
      <Link to="/admin/ho-tro-don-hang">← Hàng đợi hỗ trợ</Link>
      <section className="order-workflow-panel"><div className="order-workflow-heading"><h2>{detail.order.maDonHangHienThi}</h2><span>{STATE_LABELS[detail.order.maTrangThai]}</span></div><p><strong>Yêu cầu #{detail.support.id}: {SUPPORT_LABELS[detail.support.status]}</strong></p><p>{detail.support.reason}</p>{detail.support.decisionReason && <p>Quyết định: {detail.support.decisionReason}</p>}
        <dl className="order-support-finance"><div><dt>Tổng đơn</dt><dd>{money(detail.order.thanhTien)}</dd></div><div><dt>Được hưởng theo snapshot</dt><dd>{money(detail.order.soTienNhaHangNhan)}</dd></div><div><dt>Thu nhập đã ghi / kỳ đối soát</dt><dd>{detail.income.length} / {detail.reconciliationCount}</dd></div></dl>
        <h3>Thanh toán</h3>{detail.payments.map(p => <p key={p.maThanhToan}>{p.method} · {p.trangThaiThanhToan} · {money(p.soTien)}</p>)}
        <h3>Hoàn tiền</h3>{detail.refunds.length ? detail.refunds.map(r => <p key={r.maHoanTien}>{r.kenhHoanTien} · {r.trangThai} · {money(r.soTienHoan)}</p>) : <p>Chưa có bản ghi hoàn tiền.</p>}
      </section>
      <OrderWorkflowPanel orderId={detail.order.maDonHang} compact />
      <section className="order-workflow-panel"><h2>Lịch sử đơn</h2><ol>{detail.history.map(h => <li key={h.maLichSu}><time>{workflowTime(h.thoiGianTao)}</time> · {STATE_LABELS[h.maTrangThai]}<p>{h.ghiChu}</p></li>)}</ol></section>
      <section className="order-workflow-panel"><h2>Nhật ký hỗ trợ</h2><ol>{detail.audit.map(a => <li key={a.id}><time>{workflowTime(a.createdAt)}</time> · {a.action} · {a.actorId ? `Tài khoản #${a.actorId}` : "Hệ thống"}<p>{a.reason}</p></li>)}</ol></section>
      {(detail.support.status === "Pending" || detail.support.status === "NeedsReview") && <form className="order-workflow-panel order-support-decision" onSubmit={async e => {
        e.preventDefault(); if (busy || !confirmed || reason.trim().length < 5) return;
        setBusy(true); setResult("");
        try {
          const response = await decideSupport(detail.support.id, { action, reason: reason.trim(), expectedState: detail.order.maTrangThai, verifiedUnableToServe: verified, noCostDispute: noDispute });
          setResult(`Đã ghi nhận: ${SUPPORT_LABELS[response.status] || response.status}. ${response.decisionReason || ""}`); await load(); setConfirmed(false);
        } catch (e) { setError(e instanceof Error ? e.message : "Không thực hiện được quyết định."); }
        finally { setBusy(false); }
      }}>
        <h2>Quyết định Admin</h2>
        <label>Hướng xử lý<select value={action} disabled={busy} onChange={e => { setAction(e.target.value); setConfirmed(false); }}><option value="ReviewSeparately" disabled={detail.support.status !== "Pending"}>Chuyển xử lý riêng — không đảo tiền</option><option value="ApproveCancel" disabled={detail.support.status !== "Pending"}>Duyệt hủy ngoại lệ và hoàn hợp lệ</option><option value="Reject">Từ chối yêu cầu</option></select></label>
        <label>Lý do quyết định<textarea required minLength={5} maxLength={700} rows={4} value={reason} disabled={busy} onChange={e => setReason(e.target.value)} /></label>
        {action === "ApproveCancel" && <><label className="order-support-check"><input type="checkbox" required checked={verified} disabled={busy} onChange={e => setVerified(e.target.checked)} />Đã xác minh đơn không thể tiếp tục phục vụ.</label><label className="order-support-check"><input type="checkbox" required checked={noDispute} disabled={busy} onChange={e => setNoDispute(e.target.checked)} />Không có chi phí Quán/tranh chấp cần phân xử ngoài luồng.</label><p className="order-workflow-hint">Nếu đủ điều kiện, backend hủy và hoàn toàn bộ khoản đã thanh toán hợp lệ vào FoodPay. COD chưa thu không tạo refund. Không tự bồi thường hoặc sửa đối soát đã chốt.</p></>}
        <label className="order-support-check"><input type="checkbox" required checked={confirmed} disabled={busy} onChange={e => setConfirmed(e.target.checked)} />Tôi xác nhận quyết định và lý do trên; backend sẽ kiểm tra lại trạng thái/tài chính dưới khóa.</label>
        <button type="submit" disabled={busy || !confirmed}>{busy ? "Đang xác minh…" : "Xác nhận quyết định"}</button>
      </form>}
    </>}
  </main>;
}
