import { useEffect, useRef, useState } from "react";

import { Link, NavLink, useNavigate } from "react-router-dom";

import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  MapPin,
  ReceiptText,
  Store,
  Tag,
  UserRound,
  UsersRound,
  Utensils,
  WalletCards,
} from "lucide-react";

import { getCurrentUser } from "../services/userService";
import { getNotifications } from "../services/notificationService";
import { resolveMediaUrl } from "../services/api";
interface User {
  email: string;
  role: string;
  maTaiKhoan: number;
  trangThai: boolean;
  anhDaiDien?: string | null;

  khachHang?: {
    hoTen: string;
  };

  nhaHang?: {
    maNhaHang: number;
    tenNhaHang: string;
  };
}

function getUserAvatar(user: User) {
  return resolveMediaUrl(user.anhDaiDien);
}

function Header() {
  const navigate = useNavigate();

  const menuRef = useRef<HTMLDivElement | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [showMenu, setShowMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  /* =====================================================
       LẤY NGƯỜI DÙNG
    ===================================================== */

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      getCurrentUser()
        .then((data) => {
          setUser(data);
          setAvatarUrl(getUserAvatar(data));
        })
        .catch(() => {
          localStorage.removeItem("token");

          setUser(null);
          setAvatarUrl(null);
        });
    }

    const handleLoginSuccess = (event: Event) => {
      const customEvent = event as CustomEvent<User>;

      setUser(customEvent.detail);
      setAvatarUrl(getUserAvatar(customEvent.detail));
    };

    const handleProfileUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ hoTen: string }>;

      setUser((current) =>
        current?.role === "KhachHang"
          ? {
              ...current,
              khachHang: {
                ...current.khachHang,
                hoTen: customEvent.detail.hoTen,
              },
            }
          : current,
      );
    };

    const handleAvatarUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ avatarUrl: string | null }>;
      setAvatarUrl(customEvent.detail.avatarUrl);
    };

    window.addEventListener("login-success", handleLoginSuccess);
    window.addEventListener("profile-updated", handleProfileUpdated);
    window.addEventListener("avatar-updated", handleAvatarUpdated);

    return () => {
      window.removeEventListener("login-success", handleLoginSuccess);
      window.removeEventListener("profile-updated", handleProfileUpdated);
      window.removeEventListener("avatar-updated", handleAvatarUpdated);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    const loadUnreadCount = async () => {
      try {
        const data = await getNotifications({
          pageNumber: 1,
          pageSize: 1,
          filter: "unread",
        });

        if (!cancelled) {
          setUnreadCount(data.counts.unread);
        }
      } catch {
        if (!cancelled) {
          setUnreadCount(0);
        }
      }
    };

    const handleNotificationUpdate = () => {
      void loadUnreadCount();
    };

    void loadUnreadCount();

    window.addEventListener("notification-received", handleNotificationUpdate);

    window.addEventListener("notifications-updated", handleNotificationUpdate);

    return () => {
      cancelled = true;

      window.removeEventListener(
        "notification-received",
        handleNotificationUpdate,
      );

      window.removeEventListener(
        "notifications-updated",
        handleNotificationUpdate,
      );
    };
  }, [user]);
  /* =====================================================
       ĐÓNG MENU KHI CLICK RA NGOÀI HOẶC BẤM ESC
    ===================================================== */

  useEffect(() => {
    if (!showMenu) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);

      document.removeEventListener("keydown", handleEscape);
    };
  }, [showMenu]);

  /* =====================================================
       ĐĂNG XUẤT
    ===================================================== */

  const handleLogout = () => {
    localStorage.removeItem("token");

    setUser(null);
    setAvatarUrl(null);
    setUnreadCount(0);
    setShowMenu(false);
    window.dispatchEvent(new Event("logout-success"));
    navigate("/");
  };

  const userName =
    user?.role === "Quan"
      ? user.nhaHang?.tenNhaHang || user.email || "Nhà hàng"
      : user?.khachHang?.hoTen || user?.email || "Tài khoản";

  const avatarLetter = userName.charAt(0).toUpperCase();

  const closeMenu = () => {
    setShowMenu(false);
  };

  return (
    <header className="header">
      <div className="header-container">
        {/* LOGO */}

        <Link to="/" className="logo" aria-label="Về trang chủ">
          <span className="logo-icon">
            <Utensils size={20} strokeWidth={2.2} />
          </span>

          <span className="logo-text">Đặt Món Ăn</span>
        </Link>

        {/* NAVIGATION */}

        <nav className="main-nav" aria-label="Điều hướng chính">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            Trang chủ
          </NavLink>

          <NavLink
            to="/nha-hang"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            Nhà hàng
          </NavLink>
        </nav>

        {/* RIGHT */}

        <div className="header-right">
          {user ? (
            <>
              <Link
                to={user.role === "Quan" ? "/quan/thong-bao" : "/thong-bao"}
                className={`header-bell-link ${unreadCount > 0 ? "has-unread" : ""}`}
                aria-label={`Thông báo (${unreadCount} chưa đọc)`}
              >
                <Bell size={19} strokeWidth={2.1} />
                {unreadCount > 0 && (
                  <span className="header-bell-badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>

              <div className="user-menu-wrapper" ref={menuRef}>
                <button
                  type="button"
                  className={`user-menu-button ${showMenu ? "open" : ""}`}
                  onClick={() => setShowMenu((current) => !current)}
                  aria-expanded={showMenu}
                  aria-haspopup="menu"
                >
                  <span className="user-avatar">
                    {avatarUrl ? <img src={avatarUrl} alt="" /> : avatarLetter}
                    {unreadCount > 0 && (
                      <span className="user-avatar-unread-dot" aria-hidden="true" />
                    )}
                  </span>

                <span className="user-name">{userName}</span>

                <ChevronDown
                  size={16}
                  strokeWidth={2}
                  className={`user-chevron ${showMenu ? "open" : ""}`}
                />
              </button>

              {showMenu && (
                <div className="user-dropdown" role="menu">
                  <div className="dropdown-user-info">
                    <div className="dropdown-avatar">
                      {avatarUrl ? <img src={avatarUrl} alt="" /> : avatarLetter}
                    </div>

                    <div>
                      <strong>{userName}</strong>

                      <span>{user.email}</span>
                    </div>
                  </div>

                  <div className="dropdown-divider" />

                  {/* KHÁCH HÀNG */}

                  {user.role === "KhachHang" && (
                    <>
                      <Link
                        to="/ho-so"
                        className="dropdown-item"
                        onClick={closeMenu}
                      >
                        <UserRound size={18} />

                        <span>Hồ sơ</span>
                      </Link>

                      <Link
                        to="/dia-chi"
                        className="dropdown-item"
                        onClick={closeMenu}
                      >
                        <MapPin size={18} />

                        <span>Địa chỉ giao hàng</span>
                      </Link>

                      <Link
                        to="/don-hang"
                        className="dropdown-item"
                        onClick={closeMenu}
                      >
                        <ReceiptText size={18} />

                        <span>Đơn hàng của tôi</span>
                      </Link>

                      <Link
                        to="/vi"
                        className="dropdown-item"
                        onClick={closeMenu}
                      >
                        <WalletCards size={18} />

                        <span>Lịch sử giao dịch ví</span>
                      </Link>

                      <Link
                        to="/thong-bao"
                        className="dropdown-item"
                        onClick={closeMenu}
                      >
                        <Bell size={18} />

                        <span>Thông báo</span>

                        {unreadCount > 0 && (
                          <span
                            className="header-notification-count"
                            aria-label={`${unreadCount} thông báo chưa đọc`}
                          >
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </Link>
                    </>
                  )}

                  {/* QUÁN */}

                  {user.role === "Quan" && (
                    <>
                      <Link
                        to="/quan"
                        className="dropdown-item"
                        onClick={closeMenu}
                      >
                        <Store size={18} />

                        <span>Quản lý nhà hàng</span>
                      </Link>

                      <Link
                        to="/quan/khuyen-mai"
                        className="dropdown-item"
                        onClick={closeMenu}
                      >
                        <Tag size={18} />

                        <span>Khuyến mãi của quán</span>
                      </Link>

                      <Link
                        to="/quan/thong-bao"
                        className="dropdown-item"
                        onClick={closeMenu}
                      >
                        <Bell size={18} />

                        <span>Thông báo</span>

                        {unreadCount > 0 && (
                          <span
                            className="header-notification-count"
                            aria-label={`${unreadCount} thông báo chưa đọc`}
                          >
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </Link>
                    </>
                  )}

                  {/* ADMIN */}

                  {user.role === "Admin" && (
                    <>
                      <Link
                        to="/admin/tai-khoan"
                        className="dropdown-item"
                        onClick={closeMenu}
                      >
                        <UsersRound size={18} />

                        <span>Quản lý tài khoản</span>
                      </Link>

                      <Link
                        to="/admin"
                        className="dropdown-item"
                        onClick={closeMenu}
                      >
                        <LayoutDashboard size={18} />

                        <span>Trang quản trị</span>
                      </Link>
                    </>
                  )}

                  <div className="dropdown-divider" />

                  <button
                    type="button"
                    className="dropdown-item logout-item"
                    onClick={handleLogout}
                  >
                    <LogOut size={18} />

                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </>
          ) : (
            <div className="auth-area">
              <Link to="/dang-nhap" className="login-link">
                Đăng nhập
              </Link>

              <Link to="/dang-ky" className="register-button">
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
