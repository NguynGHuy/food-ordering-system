import MediaImage from "../components/MediaImage";
import { useEffect, useCallback, useRef, useState } from "react";

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
import ScrollReveal from "../components/ScrollReveal";
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
  UtensilsCrossed,
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
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

/* =========================================================
   COMPONENT
========================================================= */

function RestaurantDetail() {
  const MENU_PAGE_SIZE = 12;
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const menuRef = useRef<HTMLElement | null>(null);

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
    setCartError("");
  };

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

    for (const group of selectedFood.nhomToppings) {
      const groupIds = group.toppings.map((tp) => tp.maTopping);
      const count = selectedToppings.filter((id) =>
        groupIds.includes(id),
      ).length;

      if (group.batBuocChon && count === 0) {
        setCartError(`Vui lòng chọn topping cho nhóm ${group.tenNhom}.`);
        return;
      }
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
      <main className="restaurant-detail-page">
        <div className="detail-loading">
          <div className="loading-spinner" />

          <p>Đang tải thông tin nhà hàng...</p>
        </div>
      </main>
    );
  }

  /* =========================================================
       ERROR
    ========================================================= */

  if (error || !restaurant) {
    return (
      <main className="restaurant-detail-page">
        <div className="detail-error">
          <div className="detail-error-icon">!</div>

          <h2>Không tìm thấy nhà hàng</h2>

          <p>
            {error ||
              "Nhà hàng bạn đang tìm kiếm không tồn tại hoặc đã bị xóa."}
          </p>

          <Link to="/nha-hang" className="detail-back-button">
            ← Xem danh sách nhà hàng
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

  /* =========================================================
       RENDER
    ========================================================= */

  return (
    <main className="restaurant-detail-page">
      <div className="restaurant-detail-container">
        {/* =========================
                    BACK
                ========================= */}
        <Link to="/nha-hang" className="restaurant-detail-back">
          <ArrowLeft size={16} />
          <span>Tất cả nhà hàng</span>
        </Link>

        <section className="restaurant-detail-hero">
          <div className="restaurant-detail-image">
            {restaurant.anhBia ? (
              <MediaImage kind="restaurant" src={restaurant.anhBia} alt={restaurant.tenNhaHang} />
            ) : (
              <div className="restaurant-detail-placeholder">
                <UtensilsCrossed size={64} strokeWidth={1.5} />
              </div>
            )}

            <div
              className={
                isOpen
                  ? "restaurant-detail-status open"
                  : "restaurant-detail-status closed"
              }
            >
              <span className="restaurant-status-dot" />

              {restaurant.trangThaiHienThi ||
                (isOpen ? "Đang mở cửa" : "Đã đóng cửa")}
            </div>
          </div>

          <div className="restaurant-detail-main">
            <div className="restaurant-detail-heading">
              <div className="restaurant-detail-title">
                <span className="restaurant-detail-eyebrow">
                  Nhà hàng đối tác
                </span>

                <h1>{restaurant.tenNhaHang}</h1>
              </div>

              <div className="restaurant-detail-rating">
                <Star size={16} fill="currentColor" />

                <strong>{rating > 0 ? rating.toFixed(1) : "—"}</strong>

                <span>{rating > 0 ? "Đánh giá" : "Chưa có đánh giá"}</span>
              </div>
            </div>

            <p className="restaurant-detail-summary">
              {restaurant.moTa ||
                "Nhà hàng chưa cập nhật thông tin giới thiệu."}
            </p>

            <div className="restaurant-detail-quick-info">
              <div className="restaurant-quick-item">
                <div className="restaurant-quick-icon">
                  <MapPin size={18} />
                </div>

                <div>
                  <span>Địa chỉ</span>

                  <strong>
                    {restaurant.diaChiQuan || "Chưa cập nhật địa chỉ"}
                  </strong>
                </div>
              </div>

              <div className="restaurant-quick-item">
                <div className="restaurant-quick-icon">
                  <Clock3 size={18} />
                </div>

                <div>
                  <span>Giờ hoạt động</span>

                  <strong>
                    {restaurant.gioMoCua
                      ? restaurant.gioMoCua.slice(0, 5)
                      : "--:--"}

                    {" – "}

                    {restaurant.gioDongCua
                      ? restaurant.gioDongCua.slice(0, 5)
                      : "--:--"}
                  </strong>
                </div>
              </div>

              <div className="restaurant-quick-item">
                <div className="restaurant-quick-icon">
                  <Bike size={18} />
                </div>

                <div>
                  <span>Phí giao hàng</span>

                  <strong>{formatMoney(restaurant.phiShipMacDinh ?? 0)}</strong>
                </div>
              </div>
            </div>

            <div className="restaurant-detail-action">
              <button
                type="button"
                className="restaurant-detail-menu-button"
                onClick={handleViewMenu}
              >
                <UtensilsCrossed size={17} />
                <span>Xem thực đơn</span>
                <ChevronDown size={17} />
              </button>

              {!isOpen && (
                <p className="customer-menu-closed-note">
                  Nhà hàng đang đóng cửa. Bạn vẫn có thể xem thực đơn nhưng hiện
                  chưa thể đặt món.
                </p>
              )}
            </div>
          </div>
        </section>

        <ScrollReveal delay={90}>
          <section className="restaurant-voucher-section">
            <div className="restaurant-voucher-heading">
              <div>
                <span className="customer-menu-eyebrow">Ưu đãi của quán</span>
                <h2>Lưu voucher, dùng khi thanh toán</h2>
                <p>
                  Voucher chỉ xuất hiện tại bước thanh toán sau khi bạn lưu vào kho.
                </p>
              </div>

              <Link to="/kho-voucher" className="restaurant-voucher-wallet-link">
                Mở kho voucher
                <ChevronRight size={16} />
              </Link>
            </div>

            {voucherMessage && (
              <p className={`restaurant-voucher-message ${voucherMessageKind}`}>
                {voucherMessage}
              </p>
            )}

            {voucherLoading ? (
              <div className="restaurant-voucher-loading">Đang tải ưu đãi...</div>
            ) : restaurantVouchers.length > 0 ? (
              <div className="restaurant-voucher-grid">
                {restaurantVouchers.map((voucher) => (
                  <VoucherCard
                    key={voucher.maKhuyenMai}
                    voucher={voucher}
                    compact
                    actionLabel={voucher.daLuu ? "Đã lưu" : "Lưu voucher"}
                    actionDisabled={voucher.daLuu || voucherBusyId !== null}
                    onAction={(item) => void handleSaveVoucher(item)}
                  />
                ))}
              </div>
            ) : (
              <div className="restaurant-voucher-empty">
                Nhà hàng chưa có voucher khả dụng.
              </div>
            )}
          </section>
        </ScrollReveal>

        {/* =================================================
                    MENU KHÁCH HÀNG
                ================================================= */}

        <section ref={menuRef} className="customer-menu-section">
          <div className="customer-menu-heading">
            <div>
              <span className="customer-menu-eyebrow">Thực đơn</span>

              <h2>Món ngon tại {restaurant.tenNhaHang}</h2>

              <p>
                Chọn món yêu thích và tùy chỉnh topping theo khẩu vị của bạn.
              </p>
            </div>

            <div className="customer-menu-count">
              {menuTotalItems} món
            </div>
          </div>

          <div className="customer-menu-controls">
            <div className="customer-menu-search">
              <Search size={18} />

              <input
                type="text"
                placeholder="Tìm kiếm món ăn..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setMenuPageNumber(1);
                }}
              />
            </div>

            <div className="customer-menu-categories">
              <button
                type="button"
                className={
                  selectedCategory === 0
                    ? "customer-category-button active"
                    : "customer-category-button"
                }
                onClick={() => {
                  setSelectedCategory(0);
                  setMenuPageNumber(1);
                }}
              >
                Tất cả
              </button>

              {danhMucs.map((category) => (
                <button
                  type="button"
                  key={category.maDanhMuc}
                  className={
                    selectedCategory === category.maDanhMuc
                      ? "customer-category-button active"
                      : "customer-category-button"
                  }
                  onClick={() => {
                    setSelectedCategory(category.maDanhMuc);
                    setMenuPageNumber(1);
                  }}
                >
                  {category.tenDanhMuc}
                </button>
              ))}
            </div>
          </div>

          {menuLoading ? (
            <div className="customer-menu-state">
              <div className="loading-spinner" />

              <h3>Đang chuẩn bị thực đơn</h3>
              <p>Vui lòng chờ trong giây lát.</p>
            </div>
          ) : menuError ? (
            <div className="customer-menu-state error">
              <div className="customer-menu-empty-icon">
                <CircleAlert size={28} />
              </div>

              <h3>Không thể tải thực đơn</h3>
              <p>{menuError}</p>
            </div>
          ) : monAns.length === 0 ? (
            <div className="customer-menu-state">
              <div className="customer-menu-empty-icon">
                {searchTerm ? <SearchX size={30} /> : <UtensilsCrossed size={30} />}
              </div>

              <h3>{searchTerm ? "Không tìm thấy món phù hợp" : "Nhà hàng chưa có món ăn"}</h3>
              <p>
                {searchTerm
                  ? `Không tìm thấy món nào với từ khóa "${searchTerm}".`
                  : "Thực đơn của quán đang được cập nhật."}
              </p>
              {searchTerm && (
                <button
                  type="button"
                  className="customer-menu-reset-search"
                  onClick={() => {
                    setSearchTerm("");
                    setMenuPageNumber(1);
                  }}
                >
                  Xóa tìm kiếm & xem tất cả
                </button>
              )}
            </div>
          ) : (
            <div className="customer-menu-grid">
              {monAns.map((item, index) => (
                <ScrollReveal
                  key={item.maMonAn}
                  className="customer-food-reveal-item"
                  delay={(index % 3) * 90}
                >
                  <article className="customer-food-card">
                    <div className="customer-food-image">
                      {item.hinhAnh ? (
                        <MediaImage
                          src={item.hinhAnh}
                          alt={item.tenMonAn}
                          loading="lazy"
                        />
                      ) : (
                        <div className="customer-food-placeholder">
                          <UtensilsCrossed size={40} strokeWidth={1.4} />
                        </div>
                      )}

                      <span
                        className="customer-food-image-shine"
                        aria-hidden="true"
                      />

                      {item.tenDanhMuc && (
                        <span className="customer-food-category">
                          {item.tenDanhMuc}
                        </span>
                      )}
                    </div>

                    <div className="customer-food-content">
                      <div className="customer-food-top">
                        <h3>{item.tenMonAn}</h3>

                        {item.danhGiaTrungBinh > 0 && (
                          <span className="customer-food-rating">
                            <Star size={13} fill="currentColor" />

                            {item.danhGiaTrungBinh.toFixed(1)}
                          </span>
                        )}
                      </div>

                      <p className="customer-food-description">
                        {item.moTa || "Món ngon được chế biến tại nhà hàng."}
                      </p>

                      <div className="customer-food-bottom">
                        <div>
                          <span className="customer-food-price-label">
                            Giá món
                          </span>

                          <strong className="customer-food-price">
                            {formatMoney(item.gia)}
                          </strong>
                        </div>

                        <button
                          type="button"
                          className={`customer-add-cart-button ${
                            justAddedId === item.maMonAn ? "is-success" : ""
                          }`}
                          disabled={!isOpen || foodModalLoading}
                          onClick={() => openFoodModal(item.maMonAn)}
                        >
                          {justAddedId === item.maMonAn ? (
                            <>
                              <Check size={16} />
                              <span>Đã thêm</span>
                            </>
                          ) : foodModalLoading ? (
                            "Đang mở..."
                          ) : !isOpen ? (
                            "Đóng cửa"
                          ) : (
                            <>
                              <Plus size={16} />
                              <span>Thêm</span>
                            </>
                          )}
                        </button>
                      </div>

                      <FoodReviews maMonAn={item.maMonAn} />
                    </div>
                  </article>
                </ScrollReveal>
              ))}
            </div>
          )}

          {!menuLoading && !menuError && menuTotalPages > 1 && (
            <Pagination
              pageNumber={menuPageNumber}
              totalPages={menuTotalPages}
              totalItems={menuTotalItems}
              onPageChange={setMenuPageNumber}
            />
          )}
        </section>

        {/* =================================================
                    REVIEWS
                ================================================= */}

        <ScrollReveal className="restaurant-reviews-reveal" delay={100}>
          <section className="restaurant-detail-reviews">
            <RestaurantReviews maNhaHang={restaurant.maNhaHang} />
          </section>
        </ScrollReveal>
      </div>

      {selectedFood && (
        <div className="food-option-overlay" onMouseDown={closeFoodModal}>
          <section
            className="food-option-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="food-option-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="food-option-close"
              aria-label="Đóng form chọn món"
              onClick={closeFoodModal}
            >
              <X size={18} />
            </button>

            <div className="food-option-header">
              <MediaImage
                src={selectedFood.hinhAnh}
                alt={selectedFood.tenMonAn}
                className="food-option-image"
              />
              <span className="food-option-eyebrow">Tùy chọn món</span>

              <h2 id="food-option-title">{selectedFood.tenMonAn}</h2>

              <p>
                {selectedFood.moTa || "Tùy chỉnh món ăn theo sở thích của bạn."}
              </p>

              <div className="food-option-price">
                {formatMoney(selectedFood.gia)}
              </div>
            </div>

            <div className="food-option-body">
              {selectedFood.nhomToppings.map((group) => (
                <div key={group.maNhomTopping} className="topping-group">
                  <div className="topping-group-title">
                    <div>
                      <h3>{group.tenNhom}</h3>

                      {group.chonToiDa ? (
                        <p>Chọn tối đa {group.chonToiDa} lựa chọn</p>
                      ) : (
                        <p>Chọn topping bạn muốn</p>
                      )}
                    </div>

                    <span
                      className={group.batBuocChon ? "required" : "optional"}
                    >
                      {group.batBuocChon ? "Bắt buộc" : "Tùy chọn"}
                    </span>
                  </div>

                  <div className="topping-options">
                    {group.toppings.map((topping) => (
                      <label key={topping.maTopping} className="topping-option">
                        <input
                          type="checkbox"
                          checked={selectedToppings.includes(topping.maTopping)}
                          onChange={() =>
                            toggleTopping(topping.maTopping, group)
                          }
                        />

                        <span className="topping-option-name">
                          {topping.tenTopping}
                        </span>

                        <strong>+{formatMoney(topping.giaThem)}</strong>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <label className="food-note-field">
                <div className="food-note-heading">
                  <span>
                    <MessageSquareText size={16} />
                    Ghi chú cho quán
                  </span>

                  <small>{note.length}/300</small>
                </div>

                <textarea
                  value={note}
                  maxLength={300}
                  rows={3}
                  placeholder="Ví dụ: ít cay, không hành, để sốt riêng..."
                  onChange={(event) => setNote(event.target.value)}
                />
              </label>

              {cartError && (
                <p className="food-option-error">
                  <CircleAlert size={15} />
                  <span>{cartError}</span>
                </p>
              )}
            </div>

            <div className="food-option-footer">
              <div className="food-quantity-wrapper">
                <span>Số lượng</span>

                <div className="food-quantity-control">
                  <button
                    type="button"
                    aria-label="Giảm số lượng"
                    onClick={() =>
                      setQuantity((value) => Math.max(1, value - 1))
                    }
                  >
                    <Minus size={16} />
                  </button>

                  <strong>{quantity}</strong>

                  <button
                    type="button"
                    aria-label="Tăng số lượng"
                    onClick={() =>
                      setQuantity((value) => Math.min(100, value + 1))
                    }
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <button
                type="button"
                className="food-add-confirm"
                disabled={addingToCart}
                onClick={handleAddToCart}
              >
                <ShoppingBag size={17} />

                <span>{addingToCart ? "Đang thêm..." : "Thêm vào giỏ"}</span>

                {!addingToCart && (
                  <strong>
                    {formatMoney(
                      (selectedFood.gia + selectedToppingTotal) * quantity,
                    )}
                  </strong>
                )}
              </button>
            </div>
          </section>
        </div>
      )}

      <button
        type="button"
        className={`restaurant-floating-cart ${
          (cart?.soLuongMon ?? 0) > 0 ? "has-items" : "empty"
        } ${cartBump ? "is-bumped" : ""}`}
        aria-label={`Mở giỏ hàng của ${restaurant.tenNhaHang}`}
        onClick={openRestaurantCart}
      >
        {cartBump && <span className="cart-bump-float-tag">+1 món</span>}
        <span key={cart?.soLuongMon ?? 0} className="floating-cart-icon">
          <ShoppingCart size={21} />

          {(cart?.soLuongMon ?? 0) > 0 && <b>{cart?.soLuongMon}</b>}
        </span>

        <span className="floating-cart-info">
          <small>Giỏ hàng tại</small>

          <strong>{restaurant.tenNhaHang}</strong>
        </span>

        {(cart?.soLuongMon ?? 0) > 0 ? (
          <span className="floating-cart-summary">
            <small>{cart?.soLuongMon} món</small>

            <strong>{formatMoney(cart?.tongTienTamTinh ?? 0)}</strong>
          </span>
        ) : (
          <span className="floating-cart-empty-text">Chưa có món</span>
        )}

        <span className="floating-cart-arrow">
          <ChevronRight size={18} />
        </span>
      </button>
    </main>
  );
}

export default RestaurantDetail;
