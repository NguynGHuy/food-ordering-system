import MediaImage from "../components/MediaImage";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getRestaurants } from "../services/restaurantService";
import type { Restaurant } from "../services/restaurantService";
import ScrollReveal from "../components/ScrollReveal";
import RestaurantCardSkeleton from "../components/RestaurantCardSkeleton";
import Pagination from "../components/Pagination";
import {
  CircleDot,
  Search,
  SearchX,
  ArrowRight,
  Bike,
  ImageIcon,
  MapPin,
  SlidersHorizontal,
  Star,
  Store,
  X,
} from "lucide-react";

function isRestaurantOpen(restaurant: Restaurant): boolean {
  return restaurant.dangMoCua;
}

function getRestaurantStatusLabel(restaurant: Restaurant): string {
  if (restaurant.dangMoCua) {
    return "Đang mở";
  }

  if (restaurant.cheDoHoatDong === "TamNgung") {
    return "Tạm ngưng";
  }

  if (restaurant.cheDoHoatDong === "TuDong" && restaurant.gioMoCua) {
    return `Mở lúc ${restaurant.gioMoCua.slice(0, 5)}`;
  }

  return "Đã đóng";
}

function Restaurants() {
  const PAGE_SIZE = 12;
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") || "";
  const filter = (searchParams.get("filter") as "all" | "open" | "rating") || "all";

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadRestaurants = async () => {
      try {
        const data = await getRestaurants({
          pageNumber,
          pageSize: PAGE_SIZE,
          search: search.trim() || undefined,
          sort: filter === "rating" ? "rating" : undefined,
          openOnly: filter === "open" ? true : undefined,
        });
        if (cancelled) return;

        setRestaurants(data.items);
        setTotalItems(data.totalItems);
        setTotalPages(data.totalPages);
        if (data.pageNumber !== pageNumber) setPageNumber(data.pageNumber);
        setError("");
      } catch {
        if (cancelled) return;
        setError("Không thể tải danh sách nhà hàng.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadRestaurants();
    const timer = window.setInterval(() => void loadRestaurants(), 15000);
    const refresh = () => void loadRestaurants();
    window.addEventListener("focus", refresh);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [filter, pageNumber, search]);

  const handleSearchChange = (value: string) => {
    setPageNumber(1);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value.trim()) {
          next.set("search", value.trim());
        } else {
          next.delete("search");
        }
        return next;
      },
      { replace: true }
    );
  };

  const handleFilterChange = (newFilter: "all" | "open" | "rating") => {
    setPageNumber(1);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (newFilter !== "all") {
          next.set("filter", newFilter);
        } else {
          next.delete("filter");
        }
        return next;
      },
      { replace: true }
    );
  };

  const handleResetFilters = () => {
    setPageNumber(1);
    setSearchParams({}, { replace: true });
  };

  return (
    <main className="restaurants-page">
      {/* HERO SECTION */}
      <section className="restaurants-hero">
        <div className="restaurants-hero-content">
          <div className="restaurants-eyebrow">
            <Store size={16} strokeWidth={2.2} />
            <span>Khám phá ẩm thực</span>
          </div>

          <h1>Hôm nay bạn muốn ăn gì?</h1>

          <p>
            Tìm kiếm nhà hàng yêu thích theo tên hoặc địa chỉ để bắt đầu thưởng thức món ngon.
          </p>

          <div className="restaurants-search">
            <Search
              size={19}
              strokeWidth={2.2}
              className="restaurants-search-icon"
            />

            <input
              type="text"
              placeholder="Tìm tên quán ăn, địa chỉ..."
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              aria-label="Tìm kiếm nhà hàng"
            />

            {search && (
              <button
                type="button"
                className="restaurants-search-clear"
                onClick={() => handleSearchChange("")}
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <X size={16} strokeWidth={2.2} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* CONTENT LISTING */}
      <section className="restaurants-content">
        <ScrollReveal className="restaurants-toolbar-reveal" delay={60}>
          <div className="restaurants-toolbar">
            <div className="restaurants-toolbar-left">
              <h2>Danh sách nhà hàng</h2>
              {!loading && !error && (
                <p>
                  Có <strong>{totalItems}</strong> nhà hàng
                  {search && <> phù hợp với từ khóa "<strong>{search}</strong>"</>}
                </p>
              )}
            </div>

            {/* FILTERS */}
            <div className="restaurant-filters">
              <button
                type="button"
                className={`restaurant-filter ${filter === "all" ? "active" : ""}`}
                onClick={() => handleFilterChange("all")}
              >
                <SlidersHorizontal size={14} strokeWidth={2} />
                <span>Tất cả</span>
              </button>

              <button
                type="button"
                className={`restaurant-filter ${filter === "open" ? "active" : ""}`}
                onClick={() => handleFilterChange("open")}
              >
                <CircleDot size={14} strokeWidth={2.2} className="text-emerald-500" />
                <span>Đang mở</span>
              </button>

              <button
                type="button"
                className={`restaurant-filter ${filter === "rating" ? "active" : ""}`}
                onClick={() => handleFilterChange("rating")}
              >
                <Star size={14} strokeWidth={2} className="text-amber-500" fill="currentColor" />
                <span>Đánh giá cao</span>
              </button>
            </div>
          </div>
        </ScrollReveal>

        {loading && (
          <RestaurantCardSkeleton count={PAGE_SIZE} className="restaurants-grid" />
        )}

        {/* ERROR STATE */}
        {!loading && error && (
          <div className="restaurants-error">
            <div className="restaurants-error-icon">!</div>
            <h3>Không thể tải danh sách nhà hàng</h3>
            <p>{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="restaurants-retry-btn"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && !error && restaurants.length === 0 && (
          <div className="restaurants-empty">
            <div className="restaurants-empty-icon">
              <SearchX size={32} strokeWidth={1.8} />
            </div>

            <h3>Không tìm thấy nhà hàng nào</h3>
            <p>
              {search
                ? `Không có kết quả nào cho "${search}". Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.`
                : "Hiện chưa có nhà hàng nào trong hệ thống."}
            </p>

            {(search || filter !== "all") && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="restaurants-empty-reset"
              >
                Xóa bộ lọc & xem tất cả
              </button>
            )}
          </div>
        )}

        {/* RESTAURANTS GRID */}
        {!loading && !error && restaurants.length > 0 && (
          <div className="restaurants-grid">
            {restaurants.map((restaurant, index) => {
              const isOpen = isRestaurantOpen(restaurant);
              const statusLabel = getRestaurantStatusLabel(restaurant);
              const rating = restaurant.danhGiaTrungBinh ?? 0;
              const shippingFee = restaurant.phiShipMacDinh ?? 0;

              return (
                <ScrollReveal
                  key={restaurant.maNhaHang}
                  delay={(index % 4) * 60}
                  className="restaurant-reveal-item"
                >
                  <Link
                    to={`/nha-hang/${restaurant.maNhaHang}`}
                    className="restaurant-modern-card"
                  >
                    {/* IMAGE */}
                    <div className="restaurant-card-image">
                      {restaurant.anhBia ? (
                        <MediaImage
                          kind="restaurant"
                          src={restaurant.anhBia}
                          alt={restaurant.tenNhaHang}
                        />
                      ) : (
                        <div className="restaurant-card-placeholder">
                          <ImageIcon size={44} strokeWidth={1.4} />
                          <span>Chưa có ảnh</span>
                        </div>
                      )}
                      <span className="restaurant-image-shine" aria-hidden="true" />

                      <div
                        className={
                          isOpen
                            ? "restaurant-open-badge"
                            : "restaurant-closed-badge"
                        }
                      >
                        <span className="restaurant-status-dot" />
                        {statusLabel}
                      </div>

                      <div className="restaurant-rating-badge">
                        <Star size={13} fill="currentColor" strokeWidth={1.8} />
                        {rating > 0 ? rating.toFixed(1) : "Mới"}
                      </div>
                    </div>

                    {/* INFO */}
                    <div className="restaurant-card-info">
                      <div className="restaurant-card-title-row">
                        <h3>{restaurant.tenNhaHang}</h3>
                        <span className="restaurant-arrow">
                          <ArrowRight size={15} strokeWidth={2.2} />
                        </span>
                      </div>

                      {restaurant.moTa ? (
                        <p className="restaurant-card-description">
                          {restaurant.moTa}
                        </p>
                      ) : (
                        <p className="restaurant-card-description placeholder">
                          Nhà hàng đối tác chính thức của Foodie
                        </p>
                      )}

                      <div className="restaurant-card-meta">
                        <div className="restaurant-meta-item">
                          <MapPin size={15} strokeWidth={2} />
                          <span className="restaurant-meta-text">
                            {restaurant.diaChiQuan || "Chưa cập nhật địa chỉ"}
                          </span>
                        </div>

                        <div className="restaurant-meta-item">
                          <Bike size={16} strokeWidth={2} />
                          <span>
                            {shippingFee > 0
                              ? `Phí giao: ${shippingFee.toLocaleString("vi-VN")}đ`
                              : "Freeship"}
                          </span>
                        </div>
                      </div>

                      <div className="restaurant-card-footer">
                        <span>Xem thực đơn</span>
                        <ArrowRight size={15} strokeWidth={2.2} />
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              );
            })}
          </div>
        )}

        {/* PAGINATION */}
        {!loading && !error && totalPages > 1 && (
          <Pagination
            pageNumber={pageNumber}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={setPageNumber}
          />
        )}
      </section>
    </main>
  );
}

export default Restaurants;
