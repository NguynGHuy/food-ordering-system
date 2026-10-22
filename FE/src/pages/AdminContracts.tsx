import { useCallback, useEffect, useState } from "react";
import type { SyntheticEvent } from "react";
import { Link } from "react-router-dom";
import { FileText, RefreshCw, Search } from "lucide-react";
import Pagination from "../components/Pagination";
import {
    getAdminContracts,
    type AdminContractItem,
} from "../services/adminContractService";
import type { PagedResult } from "../services/api";
import useRealtimeRefresh from "../hooks/useRealtimeRefresh";

const STATUS_LABELS: Record<string, string> = {
    Nhap: "Bản nháp",
    ChoKy: "Chờ ký",
    DaKy: "Đã ký",
    ChoDuyet: "Chờ duyệt",
    HieuLuc: "Có hiệu lực",
    HetHan: "Hết hạn",
    TuChoi: "Bị từ chối",
    ChamDut: "Đã chấm dứt",
};

function formatDate(value: string) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
}

function AdminContracts() {
    const [searchInput, setSearchInput] = useState("");
    const [query, setQuery] = useState({
        search: "",
        state: "",
        pageNumber: 1,
        version: 0,
    });

    const queryKey = JSON.stringify(query);

    const [result, setResult] = useState<{
        key: string;
        data: PagedResult<AdminContractItem> | null;
        error: string;
    } | null>(null);

    useEffect(() => {
        let cancelled = false;

        getAdminContracts({
            pageNumber: query.pageNumber,
            pageSize: 10,
            search: query.search || undefined,
            state: query.state || undefined,
        })
            .then((data) => {
                if (!cancelled) {
                    setResult({ key: queryKey, data, error: "" });
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setResult({
                        key: queryKey,
                        data: null,
                        error: err instanceof Error
                            ? err.message
                            : "Không tải được danh sách hợp đồng.",
                    });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [
        query.pageNumber,
        query.search,
        query.state,
        query.version,
        queryKey,
    ]);

    const refreshRealtime = useCallback(() => {
        setQuery((previous) => ({
            ...previous,
            version: previous.version + 1,
        }));
    }, []);

    useRealtimeRefresh(["hopDong", "nhaHang"], refreshRealtime);

    const loading = result?.key !== queryKey;
    const data = loading ? null : result?.data;
    const error = loading ? "" : result?.error;

    const handleSearch = (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();

        setQuery((previous) => ({
            ...previous,
            search: searchInput.trim(),
            pageNumber: 1,
            version: previous.version + 1,
        }));
    };

    return (
        <div className="admin-restaurants-pro">
            <header className="admin-restaurants-heading">
                <div>
                    <span>Quản lý đối tác</span>
                    <h1>Hợp đồng nhà hàng</h1>
                    <p>
                        Theo dõi hợp đồng mới nhất của từng nhà hàng,
                        thời hạn và trạng thái hợp tác.
                    </p>
                </div>

                <button
                    type="button"
                    className="admin-restaurants-refresh"
                    disabled={loading}
                    onClick={() => setQuery((previous) => ({
                        ...previous,
                        version: previous.version + 1,
                    }))}
                >
                    <RefreshCw size={16} />
                    Tải lại
                </button>
            </header>

            <section className="admin-contracts-panel">
                <form
                    className="admin-contracts-toolbar"
                    onSubmit={handleSearch}
                >
                    <div className="admin-contracts-search">
                        <Search size={18} />
                        <input
                            aria-label="Tìm hợp đồng"
                            placeholder="Số hợp đồng hoặc tên nhà hàng..."
                            value={searchInput}
                            maxLength={150}
                            onChange={(event) =>
                                setSearchInput(event.target.value)
                            }
                        />
                    </div>

                    <select
                        aria-label="Trạng thái hợp đồng"
                        value={query.state}
                        onChange={(event) => {
                            const state = event.target.value;

                            setQuery((previous) => ({
                                ...previous,
                                state,
                                pageNumber: 1,
                            }));
                        }}
                    >
                        <option value="">Tất cả trạng thái</option>
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>

                    <button type="submit">Tìm kiếm</button>
                </form>

                {loading ? (
                    <p className="admin-contracts-feedback">
                        Đang tải hợp đồng...
                    </p>
                ) : error ? (
                    <p className="auth-error" role="alert">{error}</p>
                ) : data?.items.length === 0 ? (
                    <div className="admin-pending-empty">
                        <FileText size={32} />
                        <h2>Không có hợp đồng phù hợp</h2>
                        <p>Thử thay đổi từ khóa hoặc trạng thái.</p>
                    </div>
                ) : data ? (
                    <>
                        <p className="admin-contracts-count">
                            {data.totalItems} hợp đồng phù hợp
                        </p>

                        <div className="admin-contracts-table-scroll">
                            <table className="admin-contracts-table">
                                <thead>
                                    <tr>
                                        <th>Hợp đồng / nhà hàng</th>
                                        <th>Người đại diện</th>
                                        <th>Thời hạn</th>
                                        <th>Phí nền tảng</th>
                                        <th>Trạng thái</th>
                                        <th>Chi tiết</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((item) => (
                                        <tr key={item.maHopDong}>
                                            <td>
                                                <strong>{item.tenNhaHang}</strong>
                                                <small>{item.soHopDong}</small>
                                            </td>
                                            <td>{item.nguoiDaiDien}</td>
                                            <td>
                                                {formatDate(item.ngayBatDau)}
                                                <small>
                                                    đến {formatDate(item.ngayKetThuc)}
                                                </small>
                                            </td>
                                            <td>{item.tyLePhiNenTang}%</td>
                                            <td>
                                                <span
                                                    className={`admin-contracts-status state-${item.trangThai}`}
                                                >
                                                    {STATUS_LABELS[item.trangThai]
                                                        ?? item.trangThai}
                                                </span>
                                            </td>
                                            <td>
                                                <Link
                                                    className="admin-contracts-detail"
                                                    to={`/admin/nha-hang/${item.maNhaHang}/ho-so`}
                                                >
                                                    Xem hồ sơ →
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <Pagination
                            pageNumber={data.pageNumber}
                            totalPages={data.totalPages}
                            totalItems={data.totalItems}
                            onPageChange={(pageNumber) =>
                                setQuery((previous) => ({
                                    ...previous,
                                    pageNumber,
                                }))
                            }
                        />
                    </>
                ) : null}
            </section>
        </div>
    );
}

export default AdminContracts;
