import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  MapPin,
  ReceiptText,
  Search,
  Store,
  Tag,
  UserRound,
  UsersRound,
  Utensils,
  WalletCards,
  X,
} from "lucide-react";

import { getCurrentUser } from "../services/userService";
import { getNotifications } from "../services/notificationService";
import { getAddresses, type Address } from "../services/addressService";
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
  const [defaultAddress, setDefaultAddress] = useState<Address | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");



  // Load current user
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

  // Load addresses when user is customer
  useEffect(() => {
    let cancelled = false;
    const loadAddress = async () => {
      if (user?.role !== "KhachHang") {
        if (!cancelled) setDefaultAddress(null);
        return;
      }
      try {
        const addresses: Address[] = await getAddresses();
        if (!cancelled && Array.isArray(addresses) && addresses.length > 0) {
          const primary = addresses.find((a) => a.macDinh) || addresses[0];
          setDefaultAddress(primary);
        } else if (!cancelled) {
          setDefaultAddress(null);
        }
      } catch {
        if (!cancelled) setDefaultAddress(null);
      }
    };

    void loadAddress();
    window.addEventListener("address-updated", loadAddress);

    return () => {
      cancelled = true;
      window.removeEventListener("address-updated", loadAddress);
    };
  }, [user]);

  // Load unread notification count
  useEffect(() => {
    if (!user) return;

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
      window.removeEventListener("notification-received", handleNotificationUpdate);
      window.removeEventListener("notifications-updated", handleNotificationUpdate);
    };
  }, [user]);

  // Close menu on click outside or Esc
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setAvatarUrl(null);
    setUnreadCount(0);
    setDefaultAddress(null);
    setShowMenu(false);
    window.dispatchEvent(new Event("logout-success"));
    navigate("/");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchKeyword.trim();
    if (!q) {
      navigate("/nha-hang");
    } else {
      navigate(`/nha-hang?search=${encodeURIComponent(q)}`);
    }
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
    <>
      <header className="header">
        <div className="header-container">
          {/* 1. BRAND LOGO */}
          <Link to="/" className="logo" aria-label="Foodie - Về trang chủ">
            <span className="logo-icon">
              <Utensils size={20} strokeWidth={2.2} />
            </span>
            <span className="logo-text">Foodie</span>
          </Link>

          {/* 2. DELIVERY ADDRESS PILL (Khách hàng) */}
          {user?.role === "KhachHang" && (
            <Link
              to="/dia-chi"
              className="header-delivery-pill"
              title="Địa chỉ nhận hàng"
            >
              <div className="header-delivery-icon">
                <MapPin size={15} strokeWidth={2.2} />
              </div>
              <div className="header-delivery-info">
                <span className="header-delivery-label">Giao đến</span>
                <strong className="header-delivery-value">
                  {defaultAddress ? defaultAddress.diaChiCuThe : "Chọn địa chỉ"}
                </strong>
              </div>
              <ChevronDown size={14} className="header-delivery-arrow" />
            </Link>
          )}

          {/* 3. SEARCH BAR */}
          <form
            onSubmit={handleSearchSubmit}
            className="header-search-form"
            role="search"
          >
            <Search size={16} strokeWidth={2.2} className="header-search-icon" />
            <input
              type="search"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm nhà hàng, món ngon..."
              className="header-search-input"
              aria-label="Tìm kiếm nhà hàng hoặc món ăn"
            />
            {searchKeyword && (
              <button
                type="button"
                className="header-search-clear"
                onClick={() => setSearchKeyword("")}
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <X size={14} />
              </button>
            )}
          </form>

          {/* 4. MAIN NAV LINKS */}
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
            {user?.role === "KhachHang" && (
              <NavLink
                to="/kho-voucher"
                className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              >
                Voucher
              </NavLink>
            )}
          </nav>

          {/* 5. RIGHT ACTIONS */}
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
                      size={15}
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
                            <UserRound size={17} />
                            <span>Hồ sơ cá nhân</span>
                          </Link>

                          <Link
                            to="/dia-chi"
                            className="dropdown-item"
                            onClick={closeMenu}
                          >
                            <MapPin size={17} />
                            <span>Địa chỉ giao hàng</span>
                          </Link>

                          <Link
                            to="/don-hang"
                            className="dropdown-item"
                            onClick={closeMenu}
                          >
                            <ReceiptText size={17} />
                            <span>Đơn hàng của tôi</span>
                          </Link>

                          <Link
                            to="/kho-voucher"
                            className="dropdown-item"
                            onClick={closeMenu}
                          >
                            <Tag size={17} />
                            <span>Kho Voucher Foodie</span>
                          </Link>

                          <Link
                            to="/vi"
                            className="dropdown-item"
                            onClick={closeMenu}
                          >
                            <WalletCards size={17} />
                            <span>Lịch sử ví Foodie</span>
                          </Link>

                          <Link
                            to="/thong-bao"
                            className="dropdown-item"
                            onClick={closeMenu}
                          >
                            <Bell size={17} />
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
                            <Store size={17} />
                            <span>Quản lý nhà hàng</span>
                          </Link>

                          <Link
                            to="/quan/khuyen-mai"
                            className="dropdown-item"
                            onClick={closeMenu}
                          >
                            <Tag size={17} />
                            <span>Khuyến mãi của quán</span>
                          </Link>

                          <Link
                            to="/quan/thong-bao"
                            className="dropdown-item"
                            onClick={closeMenu}
                          >
                            <Bell size={17} />
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
                            <UsersRound size={17} />
                            <span>Quản lý tài khoản</span>
                          </Link>

                          <Link
                            to="/admin"
                            className="dropdown-item"
                            onClick={closeMenu}
                          >
                            <LayoutDashboard size={17} />
                            <span>Trang quản trị Admin</span>
                          </Link>
                        </>
                      )}

                      <div className="dropdown-divider" />

                      <button
                        type="button"
                        className="dropdown-item logout-item"
                        onClick={handleLogout}
                      >
                        <LogOut size={17} />
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

      {/* 6. MOBILE BOTTOM NAVIGATION (CHỈ HIỂN THỊ TRÊN MÀN HÌNH NHỎ <= 768px) */}
      <nav className="mobile-bottom-nav" aria-label="Thanh điều hướng dưới cùng">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `mobile-bottom-item ${isActive ? "active" : ""}`}
        >
          <Utensils size={20} strokeWidth={2} />
          <span>Trang chủ</span>
        </NavLink>

        <NavLink
          to="/nha-hang"
          className={({ isActive }) => `mobile-bottom-item ${isActive ? "active" : ""}`}
        >
          <Store size={20} strokeWidth={2} />
          <span>Nhà hàng</span>
        </NavLink>

        {user?.role === "KhachHang" ? (
          <NavLink
            to="/don-hang"
            className={({ isActive }) => `mobile-bottom-item ${isActive ? "active" : ""}`}
          >
            <ReceiptText size={20} strokeWidth={2} />
            <span>Đơn hàng</span>
          </NavLink>
        ) : (
          <NavLink
            to="/dang-ky-nha-hang"
            className={({ isActive }) => `mobile-bottom-item ${isActive ? "active" : ""}`}
          >
            <Store size={20} strokeWidth={2} />
            <span>Mở quán</span>
          </NavLink>
        )}

        <NavLink
          to={user?.role === "Quan" ? "/quan/thong-bao" : "/thong-bao"}
          className={({ isActive }) => `mobile-bottom-item ${isActive ? "active" : ""}`}
        >
          <div className="mobile-bottom-icon-wrap">
            <Bell size={20} strokeWidth={2} />
            {unreadCount > 0 && (
              <span className="mobile-bottom-badge">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <span>Thông báo</span>
        </NavLink>

        <NavLink
          to={user ? "/ho-so" : "/dang-nhap"}
          className={({ isActive }) => `mobile-bottom-item ${isActive ? "active" : ""}`}
        >
          <UserRound size={20} strokeWidth={2} />
          <span>{user ? "Tôi" : "Đăng nhập"}</span>
        </NavLink>
      </nav>
    </>
  );
}

export default Header;
