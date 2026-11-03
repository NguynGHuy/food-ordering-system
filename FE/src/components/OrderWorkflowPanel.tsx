import { useCallback, useEffect, useRef, useState } from "react";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh";
import { getWorkflow, requestOrderSupport, STATE_LABELS, SUPPORT_LABELS, workflowTime, type WorkflowSnapshot } from "../services/orderWorkflowService";

export default function OrderWorkflowPanel({ orderId, compact = false, refreshToken = "" }: { orderId: number; compact?: boolean; refreshToken?: string | number }) {
  const [data, setData] = useState<WorkflowSnapshot | null>(null);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(0);
  const generation = useRef(0);
  const mounted = useRef(true);
  const anchor = useRef({ server: 0, started: 0 });
  const refreshedDeadline = useRef("");
  const load = useCallback(async () => {
    const sequence = ++generation.current;
    try {
      const result = await getWorkflow(orderId);
      if (!mounted.current || sequence !== generation.current) return;
      anchor.current = { server: Date.parse(result.serverNow), started: performance.now() };
      setNow(anchor.current.server); setData(result); setError("");
    } catch (e) { if (mounted.current && sequence === generation.current) setError(e instanceof Error ? e.message : "Không tải được tiến độ."); }
  }, [orderId]);
  useEffect(() => {
    mounted.current = true;
    const initial = window.setTimeout(() => void load(), 0);
    const visible = () => { if (!document.hidden) void load(); };
    document.addEventListener("visibilitychange", visible);
    return () => { mounted.current = false; window.clearTimeout(initial); document.removeEventListener("visibilitychange", visible); };
  }, [load, refreshToken]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (anchor.current.server) setNow(anchor.current.server + performance.now() - anchor.current.started);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);
  useRealtimeRefresh(["donHang"], load);
  const deadline = data?.paymentDeadline || data?.acceptanceDeadline;
  useEffect(() => {
    if (deadline && now >= Date.parse(deadline) && refreshedDeadline.current !== deadline) {
      refreshedDeadline.current = deadline; void load();
    }
  }, [deadline, now, load]);

  if (!data) return <section className="order-workflow-panel" aria-label="Tiến độ đơn">{error ? <><p role="alert">{error}</p><button onClick={() => void load()}>Thử lại</button></> : <p role="status">Đang tải thời hạn xử lý…</p>}</section>;
  const remaining = deadline ? Math.max(0, Math.ceil((Date.parse(deadline) - now) / 1000)) : null;
  if (!data.canRequestSupport && data.supports.length === 0 && !error) return null;
  return <section className={`order-workflow-panel${data.late ? " is-late" : ""}`} aria-label="Thời hạn và hỗ trợ đơn">
    <div className="order-workflow-heading"><h2>Tiến độ & hỗ trợ</h2><span>{STATE_LABELS[data.state]}</span></div>
    {!data.tracked && <p>Đơn cũ chưa có mốc theo dõi đủ tin cậy. Hệ thống không tự gán thời hạn mới cho đơn này.</p>}
    {deadline && <div className="order-workflow-deadline"><strong>{data.paymentDeadline ? "Hạn thanh toán" : "Hạn Quán nhận"}</strong>
      <time dateTime={deadline}>{workflowTime(deadline)}</time><span className="order-workflow-countdown">{remaining! > 0 ? `${Math.floor(remaining! / 60).toString().padStart(2, "0")}:${(remaining! % 60).toString().padStart(2, "0")}` : "Đã đến hạn — chờ hệ thống xác nhận"}</span></div>}
    {data.acceptanceDeadline && <p className="order-workflow-hint">Thời hạn nhận tính từ khi đơn sẵn sàng cho Quán, không từ lúc chờ thanh toán online.</p>}
    {data.reminderAt && <p>Nhắc tiến độ từ {workflowTime(data.reminderAt)}. {data.needsAdmin || (data.escalationAt && now >= Date.parse(data.escalationAt)) ? "Đơn đã đến ngưỡng cần Admin hỗ trợ." : "Đơn đang chuẩn bị/giao không tự bị hủy vì chậm."}</p>}
    {error && <p role="alert">{error} <button onClick={() => void load()}>Tải lại</button></p>}
    {!compact && data.supports.length > 0 && <ul className="order-workflow-supports">{data.supports.map(s => <li key={s.id}><strong>#{s.id} · {SUPPORT_LABELS[s.status] || s.status}</strong><p>{s.reason}</p>{s.decisionReason && <p>Quyết định: {s.decisionReason}</p>}</li>)}</ul>}
    {!compact && data.canSubmitSupport && <form onSubmit={async e => {
      e.preventDefault(); if (busy || reason.trim().length < 5) return;
      setBusy(true); setMessage("");
      try { await requestOrderSupport(orderId, reason.trim()); setReason(""); await load(); setMessage("Đã gửi yêu cầu. Chưa có thao tác hủy/hoàn tiền cho đến khi được xác nhận."); }
      catch (e) { setError(e instanceof Error ? e.message : "Gửi hỗ trợ thất bại."); }
      finally { setBusy(false); }
    }}>
      <label htmlFor={`workflow-reason-${orderId}`}>Đơn gặp sự cố? Ghi rõ lý do cần hỗ trợ</label>
      <textarea id={`workflow-reason-${orderId}`} required minLength={5} maxLength={1000} rows={3} value={reason} disabled={busy} onChange={e => setReason(e.target.value)} />
      <button type="submit" disabled={busy}>{busy ? "Đang gửi…" : "Gửi yêu cầu hỗ trợ"}</button>
    </form>}
    {message && <p role="status">{message}</p>}
  </section>;
}
