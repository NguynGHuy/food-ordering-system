import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronRight,
  ClipboardList,
  CupSoda,
  Folders,
  LayoutDashboard,
  LogOut,
  Menu,
  Power,
  ShieldCheck,
  Store,
  TicketPercent,
  UtensilsCrossed,
  X,
  FileText,
  Wallet,
  Landmark
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getCurrentUser } from "../services/userService";
import { getNotifications } from "../services/notificationService";

interface User {
  email: string;
  role: string;
  maTaiKhoan: number;
  trangThai: boolean;
  nhaHang?: {
    maNhaHang: number;
    tenNhaHang: string;
  };
}

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV_GROUPS: {
  label: string;
  items: NavItem[];
}[] = [
  {
    label: "Vận hành",
    items: [
      {
        to: "/quan",
        label: "Tổng quan",
        icon: LayoutDashboard,
        end: true,
      },
      {
        to: "/quan/don-hang",
        label: "Đơn hàng",
        icon: ClipboardList,
      },
      {
        to: "/quan/trang-thai",
        label: "Trạng thái quán",
        icon: Power,
      },
      {
        to: "/quan/thong-tin",
        label: "Thông tin quán",
        icon: Store,
      },
      {
         to: "/quan/ho-so-phap-ly",
         label: "Hồ sơ pháp lý",
         icon: ShieldCheck,
      },
      {
         to: "/quan/hop-dong",
         label: "Hợp đồng",
         icon: FileText,
      },

    ],
  },
  {
    label: "Sản phẩm",
    items: [
      {
        to: "/quan/danh-muc",
        label: "Danh mục",
        icon: Folders,
      },
      {
        to: "/quan/menu",
        label: "Thực đơn",
        icon: UtensilsCrossed,
      },
      {
        to: "/quan/topping",
        label: "Topping",
        icon: CupSoda,
      },
      {
        to: "/quan/khuyen-mai",
        label: "Khuyến mãi",
        icon: TicketPercent,
      },
    ],
  },
  {
    label: "Khác",
    items: [
      {
        to: "/quan/doi-soat",
        label: "Đối soát",
        icon: Wallet,
      },
      {
        to: "/quan/vi",
        label: "Ví nhà hàng",
        icon: Landmark,
      },
      {
        to: "/quan/thong-bao",
        label: "Thông báo",
        icon: Bell,
      },
    ],
  },
];

function QuanLayout() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/dang-nhap");
      return;
    }

    let cancelled = false;

    getCurrentUser()
      .then((data) => {
        if (cancelled) return;

        if (data.role !== "Quan") {
          navigate("/");
          return;
        }

        setUser(data);
      })
      .catch(() => {
        if (cancelled) return;

        localStorage.removeItem("token");
        navigate("/dang-nhap");
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

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

  const handleLogout = () => {
    localStorage.removeItem("token");

    setUnreadCount(0);
    setUser(null);
    setSidebarOpen(false);

    window.dispatchEvent(new Event("logout-success"));

    navigate("/dang-nhap");
  };

  if (!user) {
    return (
      <div className="quan-layout-loading">
        <div className="loading-spinner" />
        <p>Đang mở khu vực quản lý...</p>
      </div>
    );
  }

  const restaurantName = user.nhaHang?.tenNhaHang || "Quản lý nhà hàng";

  const avatarLetter = restaurantName.charAt(0).toUpperCase();

  return (
    <div className="quan-layout">
      <button
        type="button"
        className={`quan-sidebar-overlay ${sidebarOpen ? "is-visible" : ""}`}
        aria-label="Đóng menu"
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`quan-sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="quan-sidebar-brand">
          <span className="quan-brand-icon">
            <UtensilsCrossed size={21} />
          </span>

          <div>
            <strong>Foodie</strong>
            <small>Restaurant Center</small>
          </div>

          <button
            type="button"
            aria-label="Đóng menu"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="quan-restaurant-card">
          <span className="quan-restaurant-avatar">{avatarLetter}</span>

          <div>
            <strong>{restaurantName}</strong>

            <span>
              <ShieldCheck size={11} />
              Chủ nhà hàng
            </span>
          </div>
        </div>

        <nav className="quan-nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="quan-nav-group">
              <p>{group.label}</p>

              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `quan-nav-item${isActive ? " active" : ""}`
                    }
                  >
                    <Icon size={17} />
                    <span>{item.label}</span>

                    {item.to === "/quan/thong-bao" && unreadCount > 0 && (
                      <span
                        className="quan-nav-notification-count"
                        aria-label={`${unreadCount} thông báo chưa đọc`}
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}

                    <ChevronRight className="quan-nav-arrow" size={14} />
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="quan-sidebar-bottom">
          <div className="quan-sidebar-account">
            <span>{avatarLetter}</span>

            <div>
              <strong>{restaurantName}</strong>
              <small>{user.email}</small>
            </div>
          </div>

          <button type="button" className="quan-logout" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="quan-main">
        <header className="quan-topbar">
          <div className="quan-topbar-left">
            <button
              type="button"
              className="quan-mobile-menu"
              aria-label="Mở menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>

            <div>
              <span>Khu vực quản lý</span>
              <h2>{restaurantName}</h2>
            </div>
          </div>

          <div className="quan-topbar-user">
            <span className="quan-topbar-avatar">{avatarLetter}</span>

            <div>
              <strong>{restaurantName}</strong>
              <small>{user.email}</small>
            </div>
          </div>
        </header>

        <section className="quan-content">
          <Outlet />
        </section>
      </div>
    </div>
  );
}

export default QuanLayout;
