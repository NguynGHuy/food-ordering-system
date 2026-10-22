import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
// interface Restaurant {
//     maNhaHang: number;
//     tenNhaHang: string;
//     moTa?: string;
//     diaChiQuan?: string;
//     anhBia?: string | null;
//     danhGiaTrungBinh?: number;
//     phiShipMacDinh?: number;
//     gioMoCua?: string;
//     gioDongCua?: string;
//     trangThaiHoatDong?: string;
// }

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
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState<"all" | "open" | "rating">("all");

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

  return (
    <main className="restaurants-page">
      {/* HERO */}
      <section className="restaurants-hero">
        <div className="restaurants-hero-content">
          <div className="restaurants-eyebrow">
            <Store size={16} strokeWidth={2} />

            <span>Khám phá nhà hàng</span>
          </div>

          <h1>Hôm nay bạn muốn ăn gì?</h1>

          <p>
            Tìm kiếm nhà hàng yêu thích theo tên hoặc địa chỉ và bắt đầu đặt
            món.
          </p>

          <div className="restaurants-search">
            <Search
              size={20}
              strokeWidth={2}
              className="restaurants-search-icon"
            />

            <input
              type="text"
              placeholder="Tìm tên nhà hàng hoặc địa chỉ..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            {search && (
              <button
                type="button"
                className="restaurants-search-clear"
                onClick={() => setSearch("")}
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <X size={17} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="restaurants-content">
        <ScrollReveal className="restaurants-toolbar-reveal" delay={80}>
          <div className="restaurants-toolbar">
            <div>
              <h2>Nhà hàng dành cho bạn</h2>

              {!loading && !error && (
                <p>
                  {totalItems} nhà hàng
                  {search && <> phù hợp với "{search}"</>}
                </p>
              )}
            </div>

            <div className="restaurant-filters">
              <button
                type="button"
                className={`restaurant-filter ${
                  filter === "all" ? "active" : ""
                }`}
                onClick={() => {
                  setFilter("all");
                  setPageNumber(1);
                }}
              >
                <SlidersHorizontal size={15} strokeWidth={2} />

                <span>Tất cả</span>
              </button>

              <button
                type="button"
                className={`restaurant-filter ${
                  filter === "open" ? "active" : ""
                }`}
                onClick={() => {
                  setFilter("open");
                  setPageNumber(1);
                }}
              >
                <CircleDot size={15} strokeWidth={2} />

                <span>Đang mở</span>
              </button>

              <button
                type="button"
                className={`restaurant-filter ${
                  filter === "rating" ? "active" : ""
                }`}
                onClick={() => {
                  setFilter("rating");
                  setPageNumber(1);
                }}
              >
                <Star size={15} strokeWidth={2} />

                <span>Đánh giá cao</span>
              </button>
            </div>
          </div>
        </ScrollReveal>

        {loading && (
          <RestaurantCardSkeleton count={9} className="restaurants-grid" />
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="restaurants-error">
            <div className="restaurants-error-icon">!</div>

            <h3>Không thể tải nhà hàng</h3>

            <p>{error}</p>
          </div>
        )}

        {/* EMPTY */}
        {!loading && !error && restaurants.length === 0 && (
          <div className="restaurants-empty">
            <div className="restaurants-empty-icon">
              <SearchX size={28} strokeWidth={1.8} />
            </div>

            <h3>Không tìm thấy nhà hàng</h3>

            <p>Thử tìm kiếm bằng tên nhà hàng hoặc địa chỉ khác.</p>

            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
              >
                Xem tất cả nhà hàng
              </button>
            )}
          </div>
        )}

        {/* RESTAURANTS */}
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
                  delay={(index % 4) * 70}
                  className="restaurant-reveal-item"
                >
                  <Link
                    to={`/nha-hang/${restaurant.maNhaHang}`}
                    className="restaurant-modern-card"
                  >
                    {/* IMAGE */}

                    <div className="restaurant-card-image">
                      {restaurant.anhBia ? (
                        <img
                          src={restaurant.anhBia}
                          alt={restaurant.tenNhaHang}
                        />
                      ) : (
                        <div className="restaurant-card-placeholder">
                          <ImageIcon size={48} strokeWidth={1.3} />

                          <span>Chưa có ảnh</span>
                        </div>
                      )}
                      <span
                        className="restaurant-image-shine"
                        aria-hidden="true"
                      />

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
                        <Star size={15} fill="currentColor" strokeWidth={1.8} />

                        {rating.toFixed(1)}
                      </div>
                    </div>

                    {/* INFO */}

                    <div className="restaurant-card-info">
                      <div className="restaurant-card-title-row">
                        <h3>{restaurant.tenNhaHang}</h3>

                        <span className="restaurant-arrow">
                          <ArrowRight size={16} strokeWidth={2} />
                        </span>
                      </div>

                      {restaurant.moTa && (
                        <p className="restaurant-card-description">
                          {restaurant.moTa}
                        </p>
                      )}

                      <div className="restaurant-card-meta">
                        <div className="restaurant-meta-item">
                          <MapPin size={16} strokeWidth={1.9} />

                          <span className="restaurant-meta-text">
                            {restaurant.diaChiQuan || "Chưa cập nhật địa chỉ"}
                          </span>
                        </div>

                        <div className="restaurant-meta-item">
                          <Bike size={17} strokeWidth={1.9} />

                          <span>
                            {shippingFee > 0
                              ? `Phí giao hàng ${shippingFee.toLocaleString(
                                  "vi-VN",
                                )}đ`
                              : "Miễn phí giao hàng"}
                          </span>
                        </div>
                      </div>

                      <div className="restaurant-card-footer">
                        <span>Xem thực đơn</span>

                        <ArrowRight size={16} strokeWidth={2} />
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              );
            })}
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
    </main>
  );
}

export default Restaurants;
