import MediaImage from "../components/MediaImage";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getRestaurants } from "../services/restaurantService";
import type { Restaurant } from "../services/restaurantService";
import ScrollReveal from "../components/ScrollReveal";
import RestaurantCardSkeleton from "../components/RestaurantCardSkeleton";
import {
  ArrowRight,
  Bike,
  ImageIcon,
  MapPin,
  Search,
  Star,
  Store,
  UtensilsCrossed,
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

const POPULAR_SEARCH_TAGS = [
  "Cơm tấm",
  "Trà sữa",
  "Bún",
  "Phở",
  "Bánh mì",
  "Gà rán",
  "Ăn vặt",
];

type HomeFilter = "all" | "open" | "rating" | "freeship";

function Home() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [heroSearch, setHeroSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<HomeFilter>("all");

  useEffect(() => {
    let cancelled = false;

    const loadRestaurants = async () => {
      try {
        const data = await getRestaurants({
          pageNumber: 1,
          pageSize: 8,
          sort: "rating",
        });
        if (cancelled) return;

        setRestaurants(data.items);
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
  }, []);

  const heroRestaurant = restaurants.find((restaurant) =>
    Boolean(restaurant.anhBia),
  );

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      navigate(`/nha-hang?search=${encodeURIComponent(heroSearch.trim())}`);
    } else {
      navigate("/nha-hang");
    }
  };

  const handleTagClick = (tag: string) => {
    navigate(`/nha-hang?search=${encodeURIComponent(tag)}`);
  };

  const filteredRestaurants = useMemo(() => {
    switch (activeFilter) {
      case "open":
        return restaurants.filter((r) => r.dangMoCua);
      case "rating":
        return restaurants.filter((r) => (r.danhGiaTrungBinh ?? 0) >= 4.5);
      case "freeship":
        return restaurants.filter((r) => (r.phiShipMacDinh ?? 0) === 0);
      case "all":
      default:
        return restaurants;
    }
  }, [activeFilter, restaurants]);

  return (
    <main className="home-page">
      {/* =========================
          1. HERO BANNER
      ========================= */}
      <section className="home-hero">
        <div className="home-hero-content">


          <h1>
            Mỗi bữa ăn,
            <span className="home-hero-highlight"> một lựa chọn ngon.</span>
          </h1>

          <p className="home-hero-lead">
            Tìm quán quen, khám phá thực đơn mới và chọn món theo khẩu vị.
            Kiểm tra giá, ưu đãi và theo dõi đơn ngay trên Foodie.
          </p>

          {/* Quick Hero Search Input */}
          <form onSubmit={handleHeroSearchSubmit} className="home-hero-search-box">
            <div className="home-hero-search-input-wrap">
              <Search size={19} className="home-hero-search-icon" />
              <input
                type="text"
                placeholder="Bạn muốn ăn gì hôm nay? (VD: Cơm tấm, Trà sữa...)"
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                className="home-hero-search-input"
                aria-label="Tìm kiếm món ăn hoặc nhà hàng"
              />
            </div>
            <button type="submit" className="home-hero-search-btn">
              Tìm kiếm
              <ArrowRight size={17} strokeWidth={2.2} />
            </button>
          </form>

          {/* Popular Tag Chips */}
          <div className="home-hero-tags">
            <span className="home-hero-tags-label">Gợi ý nhanh:</span>
            <div className="home-hero-tags-list">
              {POPULAR_SEARCH_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagClick(tag)}
                  className="home-hero-tag-pill"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Trust Value Props */}

        </div>

        {/* HERO VISUAL */}
        <div className="home-hero-visual">
          {heroRestaurant?.anhBia ? (
            <Link
              to={`/nha-hang/${heroRestaurant.maNhaHang}`}
              className="home-hero-restaurant-link"
              aria-label={`Xem thực đơn ${heroRestaurant.tenNhaHang}`}
            >
              <div className="home-hero-image-card">
                <MediaImage
                  kind="restaurant"
                  src={heroRestaurant.anhBia}
                  alt={heroRestaurant.tenNhaHang}
                />
              </div>
              <p className="cg-hero-caption">Thực đơn từ <strong>{heroRestaurant.tenNhaHang}</strong><ArrowRight size={16} aria-hidden="true" /></p>
            </Link>
          ) : (
            <div className="home-hero-image-card">
              <div className="home-hero-placeholder">
                <UtensilsCrossed size={64} strokeWidth={1.5} />
                <span>Món ngon đang chờ bạn</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =========================
          2. VOUCHER & PROMO HIGHLIGHT
      ========================= */}
      <section className="home-promo-strip">
        <div className="home-promo-strip-card">
          <div className="home-promo-strip-left">

            <h3>Thu thập voucher giảm giá cho bữa ăn của bạn</h3>
            <p>Lưu ưu đãi từ hệ thống và nhà hàng, xem điều kiện trước khi áp dụng.</p>
          </div>
          <Link to="/kho-voucher" className="home-promo-strip-cta">
            <span>Mở kho Voucher</span>
            <ArrowRight size={16} strokeWidth={2.2} />
          </Link>
        </div>
      </section>

      {/* =========================
          3. FEATURED RESTAURANTS
      ========================= */}
      <section className="restaurant-section">
        <div className="section-header">
          <div>

            <h2>Nhà hàng nổi bật</h2>
            <p>Khám phá thực đơn, đánh giá và thông tin nhận đơn của từng quán.</p>
          </div>

          <Link to="/nha-hang" className="view-all-link">
            <span>Xem tất cả nhà hàng</span>
            <ArrowRight size={17} strokeWidth={2} />
          </Link>
        </div>

        {/* Quick Filter Tabs */}
        <div className="home-restaurant-filter-tabs">
          <button
            type="button"
            className={`home-filter-tab ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            Tất cả ({restaurants.length})
          </button>
          <button
            type="button"
            className={`home-filter-tab ${activeFilter === "open" ? "active" : ""}`}
            onClick={() => setActiveFilter("open")}
          >
            <span className="status-dot-mini open" />
            Đang mở cửa
          </button>
          <button
            type="button"
            className={`home-filter-tab ${activeFilter === "rating" ? "active" : ""}`}
            onClick={() => setActiveFilter("rating")}
          >
            <Star size={13} fill="currentColor" />
            Đánh giá 4.5+
          </button>
          <button
            type="button"
            className={`home-filter-tab ${activeFilter === "freeship" ? "active" : ""}`}
            onClick={() => setActiveFilter("freeship")}
          >
            <Bike size={14} />
            Freeship
          </button>
        </div>

        {loading && (
          <RestaurantCardSkeleton count={8} className="restaurant-grid" />
        )}

        {error && <p className="restaurant-error">{error}</p>}

        {!loading && !error && filteredRestaurants.length === 0 && (
          <div className="restaurant-empty-card">
            <Store size={44} strokeWidth={1.5} />
            <h3>Không có nhà hàng phù hợp</h3>
            <p>Hiện chưa có nhà hàng nào theo bộ lọc này. Hãy thử chọn bộ lọc khác.</p>
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className="restaurant-empty-reset"
            >
              Xem tất cả quán
            </button>
          </div>
        )}

        {!loading && !error && filteredRestaurants.length > 0 && (
          <div className="restaurant-grid">
            {filteredRestaurants.map((restaurant) => {
              const isOpen = isRestaurantOpen(restaurant);
              const statusLabel = getRestaurantStatusLabel(restaurant);
              const rating = restaurant.danhGiaTrungBinh ?? 0;
              const shippingFee = restaurant.phiShipMacDinh ?? 0;

              return (
                <ScrollReveal
                  key={restaurant.maNhaHang}
                  className="restaurant-reveal-item"
                >
                  <Link
                    to={`/nha-hang/${restaurant.maNhaHang}`}
                    className="restaurant-card"
                  >
                    {/* COVER IMAGE */}
                    <div className="restaurant-image">
                      {restaurant.anhBia ? (
                        <MediaImage
                          kind="restaurant"
                          src={restaurant.anhBia}
                          alt={restaurant.tenNhaHang}
                        />
                      ) : (
                        <div className="restaurant-image-placeholder">
                          <ImageIcon size={44} strokeWidth={1.4} />
                          <span>Chưa có ảnh nhà hàng</span>
                        </div>
                      )}
                      <span className="restaurant-image-shine" aria-hidden="true" />

                      {/* Status Badge */}
                      <span
                        className={`restaurant-status ${
                          isOpen ? "open" : "closed"
                        }`}
                      >
                        <span className="restaurant-status-dot" />
                        {statusLabel}
                      </span>
                    </div>

                    {/* CARD CONTENT */}
                    <div className="restaurant-card-content">
                      <div className="restaurant-card-title-row">
                        <h3>{restaurant.tenNhaHang}</h3>
                        <span className="restaurant-card-rating">
                          <Star
                            size={14}
                            fill="currentColor"
                            strokeWidth={1.8}
                          />
                          {rating > 0 ? rating.toFixed(1) : "Mới"}
                        </span>
                      </div>

                      {restaurant.moTa ? (
                        <p className="restaurant-description">
                          {restaurant.moTa}
                        </p>
                      ) : (
                        <p className="restaurant-description placeholder">
                          Nhà hàng tuyển chọn trên Foodie
                        </p>
                      )}

                      <div className="restaurant-card-address">
                        <MapPin size={15} strokeWidth={2} />
                        <span>
                          {restaurant.diaChiQuan || "Chưa cập nhật địa chỉ"}
                        </span>
                      </div>

                      <div className="restaurant-card-footer">
                        <span className="restaurant-card-shipping">
                          <Bike size={16} strokeWidth={2} />
                          {shippingFee > 0
                            ? `${shippingFee.toLocaleString("vi-VN")}đ`
                            : "Freeship"}
                        </span>

                        <span className="restaurant-card-action">
                          Xem quán
                          <ArrowRight size={15} strokeWidth={2.2} />
                        </span>
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              );
            })}
          </div>
        )}

        <div className="home-explore-more">
          <Link to="/nha-hang" className="home-explore-more-btn">
            <span>Khám phá toàn bộ danh sách nhà hàng</span>
            <ArrowRight size={17} strokeWidth={2.2} />
          </Link>
        </div>
      </section>

      {/* =========================
          4. BRAND TRUST PILLARS
      ========================= */}

    </main>
  );
}

export default Home;
