import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Plus, X, Eye } from "lucide-react";
import Pagination from "../components/Pagination";
import {
    getAdminDoiSoat,
    createDoiSoat,
    getAdminDoiSoatDetail,
    payDoiSoat,
    type DoiSoatDetail,
    type DoiSoatSummary
} from "../services/doiSoatService";

function formatMoney(value: number) {
    return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "Có lỗi xảy ra. Vui lòng thử lại.";
}

const STATUS_LABEL: Record<string, string> = {
    MoiTao: "Mới tạo",
    ChoXacNhan: "Chờ nhà hàng xác nhận",
    DaXacNhan: "Chờ thanh toán",
    DaThanhToan: "Đã thanh toán",
    TranhChap: "Đang tranh chấp"
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
    
    // Form tạo mới
    const [formCreate, setFormCreate] = useState({ maNhaHang: "", tuNgay: "", denNgay: "" });
    const [busy, setBusy] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const res = await getAdminDoiSoat({ pageNumber, pageSize: 10 });
            setList(res.items);
            setTotalPages(res.totalPages);
        } catch (error: unknown) {
            setError(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [pageNumber]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => void loadData(), 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadData]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setBusy(true);
            await createDoiSoat({
                maNhaHang: Number(formCreate.maNhaHang),
                tuNgay: formCreate.tuNgay,
                denNgay: formCreate.denNgay
            });
            setShowCreate(false);
            setFormCreate({ maNhaHang: "", tuNgay: "", denNgay: "" });
            void loadData();
            alert("Tạo kỳ đối soát thành công!");
        } catch (error: unknown) {
            alert(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    const handleViewDetail = async (id: number) => {
        try {
            setBusy(true);
            const res = await getAdminDoiSoatDetail(id);
            setDetailData(res);
            setShowDetail(id);
        } catch (error: unknown) {
            alert(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    const handlePay = async () => {
        if (!maGiaoDich.trim()) return alert("Vui lòng nhập mã giao dịch.");
        try {
            setBusy(true);
            await payDoiSoat(showDetail!, maGiaoDich);
            alert("Xác nhận thanh toán thành công!");
            setShowDetail(null);
            setMaGiaoDich("");
            void loadData();
        } catch (error: unknown) {
            alert(getErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="admin-promotions-pro">
            <header className="admin-promotions-heading">
                <div>
                    <span>Kế toán & Tài chính</span>
                    <h1>Đối soát doanh thu</h1>
                    <p>Quản lý doanh thu, phí nền tảng và thanh toán cho nhà hàng.</p>
                </div>
                <div className="admin-promotions-heading-actions">
                    <button type="button" className="refresh" onClick={() => void loadData()} disabled={loading}>
                        <RefreshCw size={15} /> Tải lại
                    </button>
                    <button type="button" className="create" onClick={() => setShowCreate(true)}>
                        <Plus size={16} /> Tạo kỳ đối soát
                    </button>
                </div>
            </header>

            {error && (
                <div className="admin-promotions-error" role="alert">
                    {error}
                </div>
            )}

            <section className="admin-promotions-panel">
                {loading ? (
                    <div className="admin-promotions-loading">Đang tải dữ liệu...</div>
                ) : (
                    <div className="admin-promotions-table-scroll">
                        <table className="admin-promotions-table">
                            <thead>
                                <tr>
                                    <th>Kỳ đối soát</th>
                                    <th>Nhà hàng</th>
                                    <th>Số đơn</th>
                                    <th>Tiền cần thanh toán</th>
                                    <th>Trạng thái</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {list.map(item => {
                                    const absTien = Math.abs(item.soTienCanDoiSoat);
                                    let textColor = "#16805a"; // Không công nợ
                                    if (item.soTienCanDoiSoat > 0) textColor = "#c2410c"; // Hệ thống trả
                                    else if (item.soTienCanDoiSoat < 0) textColor = "#dc2626"; // Nhà hàng trả

                                    return (
                                        <tr key={item.maDoiSoat}>
                                            <td>
                                                <strong>Kỳ #{item.maDoiSoat}</strong>
                                                <small>{item.tuNgay} đến {item.denNgay}</small>
                                            </td>
                                            <td>{item.tenNhaHang} <small>Mã: {item.maNhaHang}</small></td>
                                            <td>{item.tongSoDon} đơn</td>
                                            <td>
                                                <strong style={{ color: textColor }}>
                                                    {item.soTienCanDoiSoat < 0 ? "-" : ""}{formatMoney(absTien)}
                                                </strong>
                                            </td>
                                            <td>
                                                <span className={`admin-promotion-state ${item.trangThai === 'DaThanhToan' ? 'active' : 'upcoming'}`}>
                                                    <i aria-hidden="true" />
                                                    {STATUS_LABEL[item.trangThai] || item.trangThai}
                                                </span>
                                            </td>
                                            <td>
                                                <button className="admin-account-toggle unlock" onClick={() => void handleViewDetail(item.maDoiSoat)}>
                                                    <Eye size={14} /> Chi tiết
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {totalPages > 1 && <Pagination pageNumber={pageNumber} totalPages={totalPages} onPageChange={setPageNumber} />}
            </section>

            {/* MODAL TẠO MỚI */}
            {showCreate && (
                <div className="admin-promotion-modal-overlay">
                    <div className="admin-promotion-modal edit-modal">
                        <button className="admin-promotion-modal-close" onClick={() => setShowCreate(false)}><X size={18} /></button>
                        <form onSubmit={(e) => void handleCreate(e)}>
                            <h2>Tạo kỳ đối soát mới</h2>
                            <p style={{ marginBottom: 20 }}>Tổng hợp các đơn đã hoàn thành chưa được đối soát.</p>
                            
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 15 }}>
                                <span>Mã nhà hàng</span>
                                <input type="number" required value={formCreate.maNhaHang} onChange={e => setFormCreate({...formCreate, maNhaHang: e.target.value})} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 15 }}>
                                <span>Từ ngày</span>
                                <input type="date" required value={formCreate.tuNgay} onChange={e => setFormCreate({...formCreate, tuNgay: e.target.value})} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 15 }}>
                                <span>Đến ngày</span>
                                <input type="date" required value={formCreate.denNgay} onChange={e => setFormCreate({...formCreate, denNgay: e.target.value})} />
                            </label>

                            <div className="promotion-edit-actions">
                                <button type="button" onClick={() => setShowCreate(false)}>Hủy</button>
                                <button type="submit" disabled={busy}>{busy ? "Đang tạo..." : "Tạo kỳ đối soát"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL CHI TIẾT & THANH TOÁN */}
            {showDetail && detailData && (
                <div className="admin-promotion-modal-overlay">
                    <div className="admin-promotion-modal">
                        <button className="admin-promotion-modal-close" onClick={() => { setShowDetail(null); setMaGiaoDich(""); }}><X size={18} /></button>
                        <h2>Chi tiết kỳ đối soát #{detailData.maDoiSoat}</h2>
                        <p style={{ marginBottom: 20 }}>Nhà hàng: {detailData.tenNhaHang}</p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 20 }}>
                            <div style={{ padding: 15, background: '#fafafa', borderRadius: 10 }}>
                                <p>Tổng tiền hàng: <strong>{formatMoney(detailData.tongTienHang)}</strong></p>
                                <p>Giảm giá NH chi trả: <strong>{formatMoney(detailData.tongGiamGiaNhaHang)}</strong></p>
                                <p>Phí nền tảng thu: <strong style={{ color: 'red' }}>{formatMoney(detailData.tongPhiNenTang)}</strong></p>
                            </div>
                            <div style={{ borderLeft: '1px solid #ddd', paddingLeft: 15 }}>
                                <p>Doanh thu thuần: <strong>{formatMoney(detailData.tongTienNhaHangNhan)}</strong></p>
                                <p>Tiền NH đã thu (COD): <strong>{formatMoney(detailData.tongTienNhaHangDaThu)}</strong></p>
                                <hr style={{ margin: '10px 0', border: '1px solid #fed7aa' }}/>
                                
                                {(() => {
                                    const value = detailData.soTienCanDoiSoat;
                                    const isPositive = value > 0;
                                    const isNegative = value < 0;
                                    const absValue = Math.abs(value);
                                    let text = "Không phát sinh công nợ:";
                                    let color = "#16805a"; // Xanh lá
                                    
                                    if (isPositive) {
                                        text = "Hệ thống cần thanh toán cho nhà hàng:";
                                        color = "#c2410c"; // Cam đậm
                                    } else if (isNegative) {
                                        text = "Nhà hàng cần nạp lại hệ thống:";
                                        color = "#dc2626"; // Đỏ
                                    }

                                    return (
                                        <p style={{ marginTop: 10 }}>
                                            {text} <br/>
                                            <strong style={{ fontSize: 18, color }}>{formatMoney(absValue)}</strong>
                                        </p>
                                    );
                                })()}
                            </div>
                        </div>

                        {detailData.trangThai === "DaXacNhan" && (
                            <div style={{ padding: 15, border: '1px solid #bde8d0', background: '#effbf4', borderRadius: 10, marginBottom: 20 }}>
                                <strong style={{ color: '#16805a' }}>Nhà hàng đã xác nhận số liệu.</strong>
                                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                                    <input 
                                        type="text" 
                                        placeholder="Nhập mã giao dịch ngân hàng..." 
                                        style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc' }}
                                        value={maGiaoDich}
                                        onChange={e => setMaGiaoDich(e.target.value)}
                                    />
                                    <button 
                                        onClick={() => void handlePay()} 
                                        disabled={busy}
                                        style={{ background: '#16805a', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}
                                    >
                                        {detailData.soTienCanDoiSoat > 0 ? "Xác nhận đã chuyển khoản" : "Xác nhận đã nhận tiền"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {detailData.trangThai === "DaThanhToan" && (
                            <p style={{ color: '#16805a', fontWeight: 'bold', marginBottom: 20 }}>Đã thanh toán (Mã GD: {detailData.maGiaoDichDoiSoat})</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}