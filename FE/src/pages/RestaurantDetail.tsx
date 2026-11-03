import MotionPresence from "../components/MotionPresence";
import MediaImage from "../components/MediaImage";
import { Fragment, useEffect, useCallback, useRef, useState } from "react";

import { Link, useNavigate, useParams } from "react-router-dom";

import { apiFetch } from "../services/api";

import { getDanhMucs, type DanhMuc } from "../services/categoryService";

import {
  getMonAns,
  getMonAn,
  type MonAn,
  type MonAnChiTiet,
} from "../services/menuService";
import Pagination from "../components/Pagination";
import VoucherCard from "../components/VoucherCard";
import {
  getRestaurantVouchers,
  saveVoucher,
  type CustomerVoucher,
} from "../services/promotionService";

import {
  addToCart,
  CART_TTL_MS,
  getRestaurantCart,
  type RestaurantCart,
} from "../services/cartService";

import RestaurantReviews from "../components/RestaurantReviews";
import FoodReviews from "../components/FoodReviews";
import "./RestaurantDetail.css";
import {
  ArrowLeft,
  Bike,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  MapPin,
  MessageSquareText,
  Minus,
  Plus,
  Search,
  SearchX,
  ShoppingBag,
  ChevronRight,
  ShoppingCart,
  Star,
  X,
} from "lucide-react";
interface Restaurant {
  maNhaHang: number;
  tenNhaHang: string;
  moTa?: string;
  diaChiQuan?: string;
  anhBia?: string | null;

  danhGiaTrungBinh?: number;
  phiShipMacDinh?: number;

  gioMoCua?: string | null;
  gioDongCua?: string | null;

  // Giữ tạm để tương thích dữ liệu cũ
  trangThaiHoatDong?: string;

  // Dữ liệu trạng thái mới từ backend
  cheDoHoatDong?: "TuDong" | "MoThuCong" | "TamNgung";

  dangMoCua: boolean;
  trangThaiHienThi: string;
}

/* =========================================================
   KIỂM TRA NHÀ HÀNG CÓ ĐANG MỞ CỬA
========================================================= */

function isRestaurantOpen(restaurant: Restaurant): boolean {
  return restaurant.dangMoCua;
}

/* =========================================================
   FORMAT TIỀN
========================================================= */

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
}

/* =========================================================
   COMPONENT
========================================================= */

function RestaurantDetail() {
  const MENU_PAGE_SIZE = 12;
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const menuRef = useRef<HTMLElement | null>(null);
  const foodDialogRef = useRef<HTMLElement | null>(null);
  const foodTriggerRef = useRef<HTMLButtonElement | null>(null);
  const toppingGroupRefs = useRef(new Map<number, HTMLDivElement>());
  const [showToppingValidation, setShowToppingValidation] = useState(false);

  /* =========================
       NHÀ HÀNG
    ========================= */

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  /* =========================
       MENU
    ========================= */

  const [danhMucs, setDanhMucs] = useState<DanhMuc[]>([]);

  const [monAns, setMonAns] = useState<MonAn[]>([]);

  const [menuLoading, setMenuLoading] = useState(true);

  const [menuError, setMenuError] = useState("");

  const [selectedCategory, setSelectedCategory] = useState<number>(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [menuPageNumber, setMenuPageNumber] = useState(1);
  const [menuTotalItems, setMenuTotalItems] = useState(0);
  const [menuTotalPages, setMenuTotalPages] = useState(0);

  const [restaurantVouchers, setRestaurantVouchers] = useState<CustomerVoucher[]>([]);
  const [voucherLoadedRestaurantId, setVoucherLoadedRestaurantId] = useState<number | null>(null);
  const voucherLoading =
    restaurant?.maNhaHang != null &&
    voucherLoadedRestaurantId !== restaurant.maNhaHang;
  const [voucherBusyId, setVoucherBusyId] = useState<number | null>(null);
  const [voucherMessage, setVoucherMessage] = useState("");
  const [voucherMessageKind, setVoucherMessageKind] = useState<"success" | "error">("success");

  /* =========================
       GIỎ HÀNG CỦA QUÁN
    ========================= */

  const [cart, setCart] = useState<RestaurantCart | null>(null);

  const [selectedFood, setSelectedFood] = useState<MonAnChiTiet | null>(null);

  const [selectedToppings, setSelectedToppings] = useState<number[]>([]);

  const [quantity, setQuantity] = useState(1);

  const [note, setNote] = useState("");

  const [foodModalLoading, setFoodModalLoading] = useState(false);

  const [addingToCart, setAddingToCart] = useState(false);
  const [cartError, setCartError] = useState("");
  const [cartBump, setCartBump] = useState(false);
  const [justAddedId, setJustAddedId] = useState<number | null>(null);

  /* =========================================================
       LOAD NHÀ HÀNG
    ========================================================= */

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;

    const loadRestaurant = async (showLoading = false) => {
      try {
        if (showLoading) {
          setLoading(true);
          setError("");
        }

        const data = await apiFetch(`/nha-hang/${id}`, { cache: "no-store" });

        if (!cancelled) {
          setRestaurant(data);
          setError("");
        }
      } catch (err) {
        if (!cancelled && showLoading) {
          setError(
            err instanceof Error
              ? err.message
              : "Không thể tải thông tin nhà hàng.",
          );
          setRestaurant(null);
        }
      } finally {
        if (!cancelled && showLoading) {
          setLoading(false);
        }
      }
    };

    void loadRestaurant(true);
    const timer = window.setInterval(() => void loadRestaurant(), 15000);
    const refresh = () => void loadRestaurant();
    window.addEventListener("focus", refresh);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [id]);

  /* =========================================================
       LOAD MENU + DANH MỤC
    ========================================================= */

  useEffect(() => {
    if (!restaurant?.maNhaHang) {
      return;
    }

    const loadMenu = async () => {
      try {
        setMenuLoading(true);
        setMenuError("");

        const [categoryData, menuData] = await Promise.all([
          getDanhMucs(restaurant.maNhaHang),

          getMonAns(restaurant.maNhaHang, {
            pageNumber: menuPageNumber,
            pageSize: MENU_PAGE_SIZE,
            search: searchTerm.trim() || undefined,
            maDanhMuc: selectedCategory || undefined,
          }),
        ]);

        /* =========================
                   SẮP XẾP DANH MỤC
                ========================= */

        const sortedCategories = [...categoryData].sort(
          (a, b) => (a.thuTuHienThi ?? 0) - (b.thuTuHienThi ?? 0),
        );

        setDanhMucs(sortedCategories);

        /*
                    Khách chỉ thấy món
                    đang được quán bật bán.
                */
        setMonAns(menuData.items);
        setMenuTotalItems(menuData.totalItems);
        setMenuTotalPages(menuData.totalPages);
        if (menuData.pageNumber !== menuPageNumber) {
          setMenuPageNumber(menuData.pageNumber);
        }
      } catch (err) {
        setMenuError(
          err instanceof Error ? err.message : "Không thể tải thực đơn.",
        );

        setDanhMucs([]);
        setMonAns([]);
      } finally {
        setMenuLoading(false);
      }
    };

    loadMenu();
  }, [menuPageNumber, restaurant?.maNhaHang, searchTerm, selectedCategory]);

  useEffect(() => {
    if (!restaurant?.maNhaHang) return;

    let cancelled = false;

    getRestaurantVouchers(restaurant.maNhaHang, { pageNumber: 1, pageSize: 6 })
      .then((result) => {
        if (!cancelled) setRestaurantVouchers(result.items);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setVoucherMessageKind("error");
          setVoucherMessage(
            err instanceof Error ? err.message : "Không thể tải voucher của nhà hàng.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setVoucherLoadedRestaurantId(restaurant.maNhaHang);
      });

    return () => {
      cancelled = true;
    };
  }, [restaurant?.maNhaHang]);

  const handleSaveVoucher = async (voucher: CustomerVoucher) => {
    if (!localStorage.getItem("token")) {
      navigate(
        `/dang-nhap?returnUrl=${encodeURIComponent(`/nha-hang/${restaurant?.maNhaHang ?? id}`)}`,
      );
      return;
    }

    try {
      setVoucherBusyId(voucher.maKhuyenMai);
      setVoucherMessage("");
      await saveVoucher(voucher.maKhuyenMai);
      setRestaurantVouchers((current) =>
        current.map((item) =>
          item.maKhuyenMai === voucher.maKhuyenMai
            ? { ...item, daLuu: true }
            : item,
        ),
      );
      setVoucherMessageKind("success");
      setVoucherMessage(`Đã lưu mã ${voucher.maCode} vào kho voucher.`);
    } catch (err) {
      setVoucherMessageKind("error");
      setVoucherMessage(err instanceof Error ? err.message : "Không thể lưu voucher.");
    } finally {
      setVoucherBusyId(null);
    }
  };

  const currentRestaurantId = restaurant?.maNhaHang;

  const loadCurrentRestaurantCart = useCallback(async () => {
    if (!currentRestaurantId) {
      setCart(null);
      return;
    }

    try {
      const data = await getRestaurantCart(currentRestaurantId);
      setCart(data);
    } catch {
      // Giỏ của quán chưa tồn tại hoặc không thể tải; trang vẫn hiển thị thực đơn.
    }
  }, [currentRestaurantId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCurrentRestaurantCart(), 0);

    const refreshCart = () => void loadCurrentRestaurantCart();
    window.addEventListener("cart-updated", refreshCart);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("cart-updated", refreshCart);
    };
  }, [loadCurrentRestaurantCart]);

  useEffect(() => {
    if (!cart?.chiTiet.length || !cart.ngayCapNhat) return;

    const updatedAt = Date.parse(cart.ngayCapNhat);
    if (!Number.isFinite(updatedAt)) return;

    const remainingTime = Math.max(0, updatedAt + CART_TTL_MS - Date.now());
    const timer = window.setTimeout(
      () => void loadCurrentRestaurantCart(),
      remainingTime + 50,
    );

    return () => window.clearTimeout(timer);
  }, [cart?.chiTiet.length, cart?.ngayCapNhat, loadCurrentRestaurantCart]);

  /* =========================================================
       SCROLL ĐẾN MENU
    ========================================================= */

  const handleViewMenu = () => {
    menuRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const openFoodModal = async (maMonAn: number) => {
    try {
      setFoodModalLoading(true);
      setCartError("");
      const food = await getMonAn(maMonAn);
      setSelectedFood(food);
      setSelectedToppings([]);
      setShowToppingValidation(false);
      setQuantity(1);
      setNote("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Không thể tải chi tiết món.");
    } finally {
      setFoodModalLoading(false);
    }
  };

  const closeFoodModal = () => {
    if (addingToCart) return;
    setSelectedFood(null);
    setSelectedToppings([]);
    setShowToppingValidation(false);
    setCartError("");
  };

  // Dialog focus/scroll lifecycle only. Cart and selection handlers are unchanged.
  useEffect(() => {
    if (!selectedFood) return;
    const dialog = foodDialogRef.current;
    if (!dialog) return;
    const previousFocus = foodTriggerRef.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.querySelector<HTMLButtonElement>(".rd-dialog-close")?.focus();

    const handleDialogKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        // The actual close button retains the current busy guard.
        dialog.querySelector<HTMLButtonElement>(".rd-dialog-close")?.click();
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
      )).filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleDialogKey);
    return () => {
      document.removeEventListener("keydown", handleDialogKey);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [selectedFood]);

  const toggleTopping = (
    maTopping: number,
    group: MonAnChiTiet["nhomToppings"][number],
  ) => {
    setCartError("");
    setSelectedToppings((current) => {
      if (current.includes(maTopping)) {
        return current.filter((id) => id !== maTopping);
      }

      const groupIds = group.toppings.map((tp) => tp.maTopping);
      const selectedInGroup = current.filter((id) => groupIds.includes(id));

      if (group.chonToiDa === 1) {
        return [...current.filter((id) => !groupIds.includes(id)), maTopping];
      }

      if (group.chonToiDa && selectedInGroup.length >= group.chonToiDa) {
        setCartError(
          `Nhóm ${group.tenNhom} chỉ được chọn tối đa ${group.chonToiDa} topping.`,
        );
        return current;
      }

      return [...current, maTopping];
    });
  };

  const handleAddToCart = async () => {
    if (!selectedFood || addingToCart) return;

    const missingGroups = selectedFood.nhomToppings.filter(
      (group) => group.batBuocChon &&
        !group.toppings.some((topping) => selectedToppings.includes(topping.maTopping)),
    );
    setShowToppingValidation(true);
    if (missingGroups.length) {
      setCartError("");
      const firstGroup = toppingGroupRefs.current.get(missingGroups[0].maNhomTopping);
      firstGroup?.scrollIntoView({ behavior: "instant", block: "center" });
      firstGroup?.querySelector("input")?.focus({ preventScroll: true });
      return;
    }

    try {
      setAddingToCart(true);
      setCartError("");
      await addToCart({
        maMonAn: selectedFood.maMonAn,
        soLuong: quantity,
        ghiChu: note.trim() || undefined,
        danhSachMaTopping: selectedToppings,
      });
      await loadCurrentRestaurantCart();
      window.dispatchEvent(new Event("cart-updated"));
      const addedId = selectedFood.maMonAn;
      setJustAddedId(addedId);
      setCartBump(true);
      window.setTimeout(() => setCartBump(false), 800);
      window.setTimeout(() => setJustAddedId(null), 1800);
      setSelectedFood(null);
    } catch (err) {
      setCartError(
        err instanceof Error ? err.message : "Không thể thêm món vào giỏ.",
      );
    } finally {
      setAddingToCart(false);
    }
  };

  const openRestaurantCart = () => {
    navigate(`/gio-hang?maNhaHang=${restaurant?.maNhaHang}`);
  };

  /* =========================================================
       LOADING
    ========================================================= */

  if (loading) {
    return (
      <main className="foodie-restaurant" aria-busy="true">
        <div className="rd-container rd-loading" role="status">
          <div className="rd-skeleton rd-skeleton-cover" aria-hidden="true" />
          <div className="rd-skeleton rd-skeleton-title" aria-hidden="true" />
          <p>Đang tải thông tin nhà hàng...</p>
        </div>
      </main>
    );
  }

  if (error || !restaurant) {
    return (
      <main className="foodie-restaurant">
        <div className="rd-container rd-state rd-page-error" role="alert">
          <CircleAlert size={28} aria-hidden="true" />
          <h1>Không tìm thấy nhà hàng</h1>
          <p>{error || "Nhà hàng bạn đang tìm kiếm không tồn tại hoặc đã bị xóa."}</p>
          <Link to="/nha-hang" className="rd-button rd-button-primary">
            <ArrowLeft size={16} aria-hidden="true" /> Xem danh sách nhà hàng
          </Link>
        </div>
      </main>
    );
  }

  const isOpen = isRestaurantOpen(restaurant);
  const rating = restaurant.danhGiaTrungBinh ?? 0;
  const selectedToppingTotal = selectedFood
    ? selectedFood.nhomToppings
        .flatMap((group) => group.toppings)
        .filter((tp) => selectedToppings.includes(tp.maTopping))
        .reduce((sum, tp) => sum + tp.giaThem, 0)
    : 0;

  return (
    <main className="foodie-restaurant">
      <div className="rd-container">
        <nav className="rd-breadcrumb" aria-label="Đường dẫn">
          <Link to="/nha-hang"><ArrowLeft size={16} aria-hidden="true" /> Tất cả nhà hàng</Link>
          <ChevronRight size={14} aria-hidden="true" />
          <span aria-current="page">{restaurant.tenNhaHang}</span>
        </nav>

        <section className="rd-restaurant" aria-labelledby="rd-restaurant-name">
          <div className="rd-cover">
            <MediaImage kind="restaurant" src={restaurant.anhBia} alt={restaurant.tenNhaHang} fetchPriority="high" />
          </div>
          <div className="rd-intro">
            <div className="rd-title-row">
              <div className="rd-title-block">
                <span className={`rd-opening ${isOpen ? "is-open" : "is-closed"}`}>
                  <span aria-hidden="true" />
                  {restaurant.trangThaiHienThi || (isOpen ? "Đang mở cửa" : "Đã đóng cửa")}
                </span>
                <h1 id="rd-restaurant-name">{restaurant.tenNhaHang}</h1>
              </div>
              <div className="rd-rating">
                <Star size={18} aria-hidden="true" />
                <strong>{rating > 0 ? rating.toFixed(1) : "—"}</strong>
                <span>{rating > 0 ? "Đánh giá" : "Chưa có đánh giá"}</span>
              </div>
            </div>
            <p className="rd-description">{restaurant.moTa || "Nhà hàng chưa cập nhật thông tin giới thiệu."}</p>
            <dl className="rd-facts">
              <div><dt><MapPin size={16} aria-hidden="true" /> Địa chỉ</dt><dd>{restaurant.diaChiQuan || "Chưa cập nhật địa chỉ"}</dd></div>
              <div><dt><Clock3 size={16} aria-hidden="true" /> Giờ hoạt động</dt><dd>{restaurant.gioMoCua ? restaurant.gioMoCua.slice(0, 5) : "--:--"} – {restaurant.gioDongCua ? restaurant.gioDongCua.slice(0, 5) : "--:--"}</dd></div>
              <div><dt><Bike size={16} aria-hidden="true" /> Phí giao hàng</dt><dd>{formatMoney(restaurant.phiShipMacDinh ?? 0)}</dd></div>
            </dl>
            <div className="rd-intro-footer">
              <button type="button" className="rd-menu-jump" onClick={handleViewMenu}>Xem thực đơn <ChevronDown size={16} aria-hidden="true" /></button>
              {!isOpen && <p className="rd-closed-note"><CircleAlert size={16} aria-hidden="true" /> Nhà hàng đang đóng cửa. Bạn vẫn có thể xem thực đơn nhưng hiện chưa thể đặt món.</p>}
            </div>
          </div>
        </section>

        <details className="rd-offers">
          <summary>
            <span>Ưu đãi của quán <small>{!voucherLoading && restaurantVouchers.length > 0 ? `${restaurantVouchers.length} voucher khả dụng` : "Lưu mã để dùng khi thanh toán"}</small></span>
            <ChevronDown size={18} aria-hidden="true" />
          </summary>
          <div className="rd-offers-content">
            <div className="rd-offers-help"><p>Voucher chỉ xuất hiện tại bước thanh toán sau khi bạn lưu vào kho.</p><Link to="/kho-voucher">Mở kho voucher <ChevronRight size={14} aria-hidden="true" /></Link></div>
            {voucherMessage && <p className={`rd-voucher-message ${voucherMessageKind}`} role={voucherMessageKind === "error" ? "alert" : "status"}>{voucherMessage}</p>}
            {voucherLoading ? <p role="status">Đang tải ưu đãi...</p> : restaurantVouchers.length > 0 ? (
              <div className="rd-voucher-grid">{restaurantVouchers.map((voucher) => <VoucherCard key={voucher.maKhuyenMai} voucher={voucher} compact actionLabel={voucher.daLuu ? "Đã lưu" : "Lưu voucher"} actionDisabled={voucher.daLuu || voucherBusyId !== null} onAction={(item) => void handleSaveVoucher(item)} />)}</div>
            ) : <p className="rd-muted">Nhà hàng chưa có voucher khả dụng.</p>}
          </div>
        </details>

        <section ref={menuRef} className="rd-menu-section" aria-labelledby="rd-menu-title">
          <div className="rd-section-heading">
            <h2 id="rd-menu-title">Thực đơn</h2>
            <span>{menuLoading ? "Đang tải…" : `${menuTotalItems} món`}</span>
          </div>
          <div className="rd-menu-layout">
            <nav className="rd-categories" aria-label="Danh mục món ăn">
              <h3>Danh mục</h3>
              <div className="rd-category-list">
                <button type="button" className={selectedCategory === 0 ? "is-active" : ""} aria-pressed={selectedCategory === 0} onClick={() => { setSelectedCategory(0); setMenuPageNumber(1); }}>Tất cả món</button>
                {danhMucs.map((category) => <button type="button" key={category.maDanhMuc} className={selectedCategory === category.maDanhMuc ? "is-active" : ""} aria-pressed={selectedCategory === category.maDanhMuc} onClick={() => { setSelectedCategory(category.maDanhMuc); setMenuPageNumber(1); }}>{category.tenDanhMuc}</button>)}
              </div>
            </nav>

            <div className="rd-menu-main">
              <label className="rd-search"><Search size={18} aria-hidden="true" /><span className="rd-sr-only">Tìm món trong thực đơn</span><input type="search" placeholder="Tìm món trong thực đơn…" value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setMenuPageNumber(1); }} /></label>
              {menuLoading ? (
                <div className="rd-menu-loading" role="status" aria-label="Đang tải thực đơn"><span className="rd-sr-only">Đang tải thực đơn</span>{[0, 1, 2].map((slot) => <div key={slot} className="rd-skeleton-row" aria-hidden="true"><div className="rd-skeleton" /><div><div className="rd-skeleton" /><div className="rd-skeleton" /></div></div>)}</div>
              ) : menuError ? (
                <div className="rd-state rd-error" role="alert"><CircleAlert size={26} aria-hidden="true" /><h3>Không thể tải thực đơn</h3><p>{menuError}</p></div>
              ) : monAns.length === 0 ? (
                <div className="rd-state"><SearchX size={28} aria-hidden="true" /><h3>{searchTerm ? "Không tìm thấy món phù hợp" : "Nhà hàng chưa có món ăn"}</h3><p>{searchTerm ? `Không tìm thấy món nào với từ khóa "${searchTerm}".` : "Thực đơn của quán đang được cập nhật."}</p>{searchTerm && <button type="button" className="rd-button rd-button-secondary" onClick={() => { setSearchTerm(""); setMenuPageNumber(1); }}>Xóa tìm kiếm & xem tất cả</button>}</div>
              ) : (
                <div className="rd-food-list">
                  {monAns.map((item, index) => (
                    <Fragment key={item.maMonAn}>
                    {item.tenDanhMuc && (index === 0 || item.maDanhMuc !== monAns[index - 1].maDanhMuc) && (
                      <div className="rd-menu-group-heading"><h3>{item.tenDanhMuc}</h3></div>
                    )}
                    <article className="rd-food">
                      <div className="rd-food-image"><MediaImage src={item.hinhAnh} alt={item.tenMonAn} loading="lazy" width={112} height={112} /></div>
                      <div className="rd-food-content">
                        <div className="rd-food-title"><h3>{item.tenMonAn}</h3>{item.danhGiaTrungBinh > 0 && <span className="rd-food-rating"><Star size={13} aria-hidden="true" /> {item.danhGiaTrungBinh.toFixed(1)}</span>}</div>
                        {item.tenDanhMuc && <span className="rd-food-category">{item.tenDanhMuc}</span>}
                        <p className="rd-food-description">{item.moTa || "Món ngon được chế biến tại nhà hàng."}</p>
                        <div className="rd-food-actions"><strong className="rd-money">{formatMoney(item.gia)}</strong><button type="button" className={`rd-add ${justAddedId === item.maMonAn ? "is-success" : ""}`} disabled={!isOpen || foodModalLoading} onClick={(event) => { foodTriggerRef.current = event.currentTarget; void openFoodModal(item.maMonAn); }} aria-label={`${!isOpen ? "Đóng cửa · " : "Chọn món "}${item.tenMonAn}`}>
                          {justAddedId === item.maMonAn ? <><Check size={16} aria-hidden="true" /> Đã thêm</> : foodModalLoading ? "Đang mở..." : !isOpen ? "Đóng cửa" : <><Plus size={16} aria-hidden="true" /> Thêm</>}
                        </button></div>
                        <FoodReviews maMonAn={item.maMonAn} />
                      </div>
                    </article>
                    </Fragment>
                  ))}
                </div>
              )}
              {!menuLoading && !menuError && menuTotalPages > 1 && <Pagination pageNumber={menuPageNumber} totalPages={menuTotalPages} totalItems={menuTotalItems} onPageChange={setMenuPageNumber} />}
            </div>

            <aside className="rd-cart" aria-label="Giỏ hàng của nhà hàng">
              <div className="rd-cart-title"><ShoppingBag size={20} aria-hidden="true" /><h3>Giỏ hàng của bạn</h3></div>
              <p className="rd-cart-restaurant">{restaurant.tenNhaHang}</p>
              {(cart?.soLuongMon ?? 0) > 0 ? <>
                <ul className="rd-cart-items">{cart?.chiTiet.map((item) => <li key={item.maChiTietGioHang}><span className="rd-cart-quantity">{item.soLuong}×</span><div><strong>{item.tenMonAn}</strong>{item.toppings.length > 0 && <small>{item.toppings.map((topping) => topping.tenTopping).join(", ")}</small>}{item.ghiChu && <small>{item.ghiChu}</small>}</div><span className="rd-money">{formatMoney(item.thanhTien)}</span></li>)}</ul>
                <div className="rd-cart-total"><span>Tạm tính · {cart?.soLuongMon} món</span><strong className="rd-money">{formatMoney(cart?.tongTienTamTinh ?? 0)}</strong></div>
                <p className="rd-cart-hint">Chưa bao gồm phí giao hàng và ưu đãi.</p>
              </> : <div className="rd-cart-empty"><ShoppingBag size={32} strokeWidth={1.3} aria-hidden="true" /><p>Chưa có món trong giỏ</p><span>Chọn món từ thực đơn để bắt đầu.</span></div>}
              <button type="button" className="rd-button rd-button-primary rd-cart-open" onClick={openRestaurantCart}>Xem giỏ hàng <ChevronRight size={17} aria-hidden="true" /></button>
              <p className="rd-cart-feedback" role="status">{cartBump ? "Đã cập nhật giỏ hàng" : ""}</p>
            </aside>
          </div>
        </section>

        <section className="rd-reviews"><RestaurantReviews maNhaHang={restaurant.maNhaHang} /></section>
      </div>

      <MotionPresence present={Boolean(selectedFood)}>{selectedFood && (
        <div className="rd-dialog-overlay" onMouseDown={closeFoodModal}>
          <section ref={foodDialogRef} className="rd-dialog" role="dialog" aria-modal="true" aria-labelledby="rd-food-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="rd-dialog-top"><span>Tùy chọn món</span><button type="button" className="rd-dialog-close" aria-label="Đóng form chọn món" disabled={addingToCart} onClick={closeFoodModal}><X size={20} aria-hidden="true" /></button></div>
            <div className="rd-dialog-scroll">
              <div className="rd-dialog-header"><MediaImage src={selectedFood.hinhAnh} alt={selectedFood.tenMonAn} className="rd-dialog-image" /><div><h2 id="rd-food-title">{selectedFood.tenMonAn}</h2><p>{selectedFood.moTa || "Tùy chỉnh món ăn theo sở thích của bạn."}</p><strong className="rd-money">{formatMoney(selectedFood.gia)}</strong></div></div>
              <div className="rd-dialog-body">
                {selectedFood.nhomToppings.map((group) => {
                  const missing = showToppingValidation && group.batBuocChon && !group.toppings.some((topping) => selectedToppings.includes(topping.maTopping));
                  const errorId = `topping-error-${group.maNhomTopping}`;
                  return <div key={group.maNhomTopping} ref={(element) => { if (element) toppingGroupRefs.current.set(group.maNhomTopping, element); else toppingGroupRefs.current.delete(group.maNhomTopping); }} className={`rd-topping-group${missing ? " is-invalid" : ""}`} role="group" aria-labelledby={`topping-title-${group.maNhomTopping}`} aria-invalid={missing || undefined} aria-describedby={missing ? errorId : undefined}>
                    <div className="rd-topping-heading"><div><h3 id={`topping-title-${group.maNhomTopping}`}>{group.tenNhom}</h3><p>{group.chonToiDa ? `Chọn tối đa ${group.chonToiDa} lựa chọn` : "Chọn topping bạn muốn"}</p></div><span>{group.batBuocChon ? "Bắt buộc" : "Tùy chọn"}</span></div>
                    <div className="rd-topping-options">{group.toppings.map((topping) => <label key={topping.maTopping} className="rd-topping-option"><input type="checkbox" checked={selectedToppings.includes(topping.maTopping)} aria-invalid={missing || undefined} aria-describedby={missing ? errorId : undefined} onChange={() => toggleTopping(topping.maTopping, group)} /><span>{topping.tenTopping}</span><strong className="rd-money">+{formatMoney(topping.giaThem)}</strong></label>)}</div>
                    {missing && <p id={errorId} className="rd-topping-error"><CircleAlert size={15} aria-hidden="true" /> Vui lòng chọn ít nhất một lựa chọn cho nhóm {group.tenNhom}.</p>}
                  </div>;
                })}
                <label className="rd-note"><span><MessageSquareText size={16} aria-hidden="true" /> Ghi chú cho quán <small>{note.length}/300</small></span><textarea value={note} maxLength={300} rows={3} placeholder="Ví dụ: ít cay, không hành, để sốt riêng..." onChange={(event) => setNote(event.target.value)} /></label>
              </div>
            </div>
            <div className="rd-dialog-footer">
              {(cartError || (showToppingValidation && selectedFood.nhomToppings.some((group) => group.batBuocChon && !group.toppings.some((topping) => selectedToppings.includes(topping.maTopping))))) && <p className="rd-dialog-error" role="alert"><CircleAlert size={15} aria-hidden="true" />{cartError || "Vui lòng chọn đầy đủ các nhóm bắt buộc được đánh đỏ ở trên."}</p>}
              <div className="rd-dialog-actions"><div className="rd-quantity"><span className="rd-sr-only">Số lượng</span><button type="button" aria-label="Giảm số lượng" onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus size={16} aria-hidden="true" /></button><strong aria-live="polite"><span className="rd-quantity-value" key={quantity}>{quantity}</span></strong><button type="button" aria-label="Tăng số lượng" onClick={() => setQuantity((value) => Math.min(100, value + 1))}><Plus size={16} aria-hidden="true" /></button></div><button type="button" className="rd-button rd-button-primary rd-add-confirm" disabled={addingToCart} onClick={handleAddToCart}><ShoppingBag size={17} aria-hidden="true" /><span>{addingToCart ? "Đang thêm..." : "Thêm vào giỏ"}</span>{!addingToCart && <strong className="rd-money">{formatMoney((selectedFood.gia + selectedToppingTotal) * quantity)}</strong>}</button></div>
            </div>
          </section>
        </div>
      )}</MotionPresence>

      <button type="button" className="rd-mobile-cart" aria-label={`Mở giỏ hàng của ${restaurant.tenNhaHang}`} onClick={openRestaurantCart}><ShoppingCart size={21} aria-hidden="true" /><span><strong>{(cart?.soLuongMon ?? 0) > 0 ? `${cart?.soLuongMon} món trong giỏ` : "Giỏ hàng của bạn"}</strong><small>{cartBump ? "Đã cập nhật giỏ hàng" : restaurant.tenNhaHang}</small></span><strong className="rd-money">{(cart?.soLuongMon ?? 0) > 0 ? formatMoney(cart?.tongTienTamTinh ?? 0) : "Xem giỏ"}</strong><ChevronRight size={18} aria-hidden="true" /></button>
    </main>
  );
}

export default RestaurantDetail;
