import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh";
import { getAttention, STATE_LABELS } from "../services/orderWorkflowService";

export default function OrderAttentionList({ merchant = false }: { merchant?: boolean }) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof getAttention>>["items"]>([]);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { setRows((await getAttention()).items); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Không tải được đơn cần chú ý."); }
  }, []);
  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => { if (!document.hidden) void load(); }, 60000);
    return () => { window.clearTimeout(initial); window.clearInterval(interval); };
  }, [load]);
  useRealtimeRefresh(["donHang"], load);
  if (!rows.length && !error) return null;
  return <section className="order-workflow-panel is-late"><h2>Đơn cần chú ý</h2>
    {error && <p role="alert">{error} <button onClick={() => void load()}>Thử lại</button></p>}
    <ul className="order-attention-list">{rows.map(row => <li key={row.orderId}><div><strong>{row.code}</strong><span>{STATE_LABELS[row.state]} · {row.state === 1 ? "Cần nhận trước hạn" : "Cần kiểm tra tiến độ"}</span></div><Link to={`${merchant ? "/quan" : ""}/don-hang/${row.orderId}`}>Xem đơn</Link></li>)}</ul>
  </section>;
}
