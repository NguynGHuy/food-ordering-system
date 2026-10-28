import { useCallback, useEffect, useState } from "react";
import {
    LockKeyhole,
    RefreshCw,
    Search,
    ShieldCheck,
    UnlockKeyhole,
    UserRound,
    UsersRound,
} from "lucide-react";
import {
    getAdminAccounts,
    lockAccount,
    unlockAccount,
} from "../services/adminService";
import type { AdminAccount } from "../services/adminService";
import Pagination from "../components/Pagination";

type StatusFilter = "all" | "active" | "locked";

const ROLE_LABEL: Record<string, string> = {
    Admin: "Quản trị viên",
    Quan: "Nhà hàng",
    KhachHang: "Khách hàng",
};

function getRoleClass(role: string) {
    if (role === "Admin") return "role-admin";
    if (role === "Quan") return "role-restaurant";
    return "role-customer";
}

function AdminAccounts() {
    const PAGE_SIZE = 10;
    const [accounts, setAccounts] = useState<AdminAccount[]>([]);
    const [keyword, setKeyword] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] =
        useState<StatusFilter>("all");
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [pageNumber, setPageNumber] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [counts, setCounts] = useState({ all: 0, active: 0, locked: 0 });

    const loadAccounts = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const result = await getAdminAccounts({
                pageNumber,
                pageSize: PAGE_SIZE,
                search: keyword.trim() || undefined,
                role: roleFilter === "all" ? undefined : roleFilter,
                trangThai:
                    statusFilter === "all"
                        ? undefined
                        : statusFilter === "active",
            });
            setAccounts(result.items);
            setTotalItems(result.totalItems);
            setTotalPages(result.totalPages);
            setCounts(result.counts);
            if (result.pageNumber !== pageNumber) setPageNumber(result.pageNumber);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Không thể tải danh sách tài khoản."
            );
        } finally {
            setLoading(false);
        }
    }, [keyword, pageNumber, roleFilter, statusFilter]);

    useEffect(() => {
        const frameId = window.requestAnimationFrame(() => {
            void loadAccounts();
        });

        return () => window.cancelAnimationFrame(frameId);
    }, [loadAccounts]);

    const handleToggle = async (account: AdminAccount) => {
        const action = account.trangThai ? "khóa" : "mở khóa";

        if (
            !window.confirm(
                `Bạn có chắc muốn ${action} tài khoản ${account.email}?`
            )
        ) {
            return;
        }

        try {
            setBusyId(account.maTaiKhoan);
            setError("");

            if (account.trangThai) {
                await lockAccount(account.maTaiKhoan);
            } else {
                await unlockAccount(account.maTaiKhoan);
            }

            await loadAccounts();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : `Không thể ${action} tài khoản.`
            );
        } finally {
            setBusyId(null);
        }
    };

    const roles = ["Admin", "Quan", "KhachHang"];

    return (
        <div className="admin-accounts-pro">
            <header className="admin-accounts-heading">
                <div>
                    <span>Người dùng hệ thống</span>
                    <h1>Quản lý tài khoản</h1>
                    <p>
                        Theo dõi và kiểm soát trạng thái tài khoản người dùng.
                    </p>
                </div>

                <button
                    type="button"
                    className="admin-accounts-refresh"
                    onClick={() => void loadAccounts()}
                    disabled={loading}
                >
                    <RefreshCw size={15} />
                    Tải lại
                </button>
            </header>

            <section className="admin-account-summary">
                <article>
                    <span className="summary-icon total">
                        <UsersRound size={18} />
                    </span>
                    <div>
                        <small>Tổng tài khoản</small>
                        <strong>{counts.all}</strong>
                    </div>
                </article>

                <article>
                    <span className="summary-icon active">
                        <ShieldCheck size={18} />
                    </span>
                    <div>
                        <small>Đang hoạt động</small>
                        <strong>{counts.active}</strong>
                    </div>
                </article>

                <article>
                    <span className="summary-icon locked">
                        <LockKeyhole size={18} />
                    </span>
                    <div>
                        <small>Đã khóa</small>
                        <strong>{counts.locked}</strong>
                    </div>
                </article>
            </section>

            <section className="admin-accounts-panel">
                <div className="admin-accounts-toolbar">
                    <label className="admin-account-search-pro">
                        <Search size={16} />
                        <input
                            type="search"
                            placeholder="Tìm email hoặc số điện thoại..."
                            aria-label="Tìm tài khoản"
                            value={keyword}
                            onChange={(event) => {
                                setKeyword(event.target.value);
                                setPageNumber(1);
                            }}
                        />
                    </label>

                    <div className="admin-account-filters">
                        <select
                            aria-label="Lọc theo vai trò"
                            value={roleFilter}
                            onChange={(event) => {
                                setRoleFilter(event.target.value);
                                setPageNumber(1);
                            }}
                        >
                            <option value="all">Tất cả vai trò</option>
                            {roles.map((role) => (
                                <option key={role} value={role}>
                                    {ROLE_LABEL[role] || role}
                                </option>
                            ))}
                        </select>

                        <select
                            aria-label="Lọc theo trạng thái"
                            value={statusFilter}
                            onChange={(event) => {
                                setStatusFilter(event.target.value as StatusFilter);
                                setPageNumber(1);
                            }}
                        >
                            <option value="all">Tất cả trạng thái</option>
                            <option value="active">Đang hoạt động</option>
                            <option value="locked">Đã khóa</option>
                        </select>
                    </div>
                </div>

                <div className="admin-accounts-result-bar">
                    <span>
                        Hiển thị <strong>{accounts.length}</strong>{" "}
                        trong tổng số <strong>{totalItems}</strong> tài khoản phù hợp
                    </span>
                </div>

                {error && (
                    <div className="admin-accounts-error" role="alert">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="admin-accounts-loading">
                        <RefreshCw size={20} />
                        <span>Đang tải tài khoản...</span>
                    </div>
                ) : accounts.length === 0 ? (
                    <div className="admin-accounts-empty">
                        <UserRound size={28} />
                        <strong>Không tìm thấy tài khoản</strong>
                        <p>Hãy thử thay đổi từ khóa hoặc bộ lọc.</p>
                    </div>
                ) : (
                    <div className="admin-account-table-scroll">
                        <table className="admin-account-table-pro">
                            <thead>
                                <tr>
                                    <th>Tài khoản</th>
                                    <th>Vai trò</th>
                                    <th>Trạng thái</th>
                                    <th>Xác thực email</th>
                                    <th>Ngày tạo</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>

                            <tbody>
                                {accounts.map((account) => {
                                    const isBusy =
                                        busyId === account.maTaiKhoan;

                                    return (
                                        <tr key={account.maTaiKhoan}>
                                            <td>
                                                <div className="admin-account-identity">
                                                    <span>
                                                        {account.email
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </span>
                                                    <div>
                                                        <strong>
                                                            {account.email}
                                                        </strong>
                                                        <small>
                                                            {account.soDienThoai ||
                                                                "Chưa cập nhật SĐT"}
                                                        </small>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>
                                                <span
                                                    className={`admin-account-role ${getRoleClass(
                                                        account.role
                                                    )}`}
                                                >
                                                    {ROLE_LABEL[
                                                        account.role
                                                    ] || account.role}
                                                </span>
                                            </td>

                                            <td>
                                                <span
                                                    className={`admin-account-state ${
                                                        account.trangThai
                                                            ? "is-active"
                                                            : "is-locked"
                                                    }`}
                                                >
                                                    <i aria-hidden="true" />
                                                    {account.trangThai
                                                        ? "Hoạt động"
                                                        : "Đã khóa"}
                                                </span>
                                            </td>

                                            <td>
                                                {account.daXacThucEmail ? "Đã xác thực" : "Chưa xác thực"}
                                            </td>

                                            <td>
                                                <time>
                                                    {new Date(
                                                        account.ngayTao
                                                    ).toLocaleDateString(
                                                        "vi-VN"
                                                    )}
                                                </time>
                                            </td>

                                            <td>
                                                <button
                                                    type="button"
                                                    className={`admin-account-toggle ${
                                                        account.trangThai
                                                            ? "lock"
                                                            : "unlock"
                                                    }`}
                                                    disabled={isBusy}
                                                    onClick={() =>
                                                        void handleToggle(
                                                            account
                                                        )
                                                    }
                                                >
                                                    {account.trangThai ? (
                                                        <LockKeyhole
                                                            size={14}
                                                        />
                                                    ) : (
                                                        <UnlockKeyhole
                                                            size={14}
                                                        />
                                                    )}

                                                    {isBusy
                                                        ? "Đang xử lý..."
                                                        : account.trangThai
                                                          ? "Khóa"
                                                          : "Mở khóa"}
                                                </button>
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
        </div>
    );
}

export default AdminAccounts;
