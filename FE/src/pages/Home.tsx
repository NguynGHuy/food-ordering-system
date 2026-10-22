import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRestaurants } from "../services/restaurantService";
import type { Restaurant } from "../services/restaurantService";
import ScrollReveal from "../components/ScrollReveal";
import RestaurantCardSkeleton from "../components/RestaurantCardSkeleton";
import {
  ArrowRight,
  Bike,
  Clock3,
  ImageIcon,
  MapPin,
  ShieldCheck,
  Star,
  UtensilsCrossed,
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

function Home() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadRestaurants = async () => {
      try {
        const data = await getRestaurants({
          pageNumber: 1,
          pageSize: 6,
          sort: "rating",
        });
        if (cancelled) return;

        // Sắp xếp theo đánh giá cao → thấp
        // rồi lấy tối đa 6 nhà hàng
        const featuredRestaurants = data.items;

        setRestaurants(featuredRestaurants);
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
  return (
    <main className="home-page">
      {/* =========================
                HERO
            ========================= */}
      <section className="home-hero">
        {/* NỘI DUNG */}

        <div className="home-hero-content">
          <div className="home-hero-eyebrow">
            <UtensilsCrossed size={16} strokeWidth={2} />

            <span>Món ngon quanh bạn</span>
          </div>

          <h1>
            Đặt món yêu thích,
            <span> giao tận nơi.</span>
          </h1>

          <p>
            Khám phá nhà hàng gần bạn, lựa chọn món ăn yêu thích và đặt hàng chỉ
            trong vài phút.
          </p>

          <div className="home-hero-actions">
            <Link to="/nha-hang" className="hero-button">
              Khám phá nhà hàng
              <ArrowRight size={18} strokeWidth={2} />
            </Link>
          </div>

          <div className="home-hero-benefits">
            <div>
              <Clock3 size={18} strokeWidth={2} />

              <span>Giao hàng nhanh chóng</span>
            </div>

            <div>
              <ShieldCheck size={18} strokeWidth={2} />

              <span>Thanh toán an toàn</span>
            </div>
          </div>
        </div>

        {/* HÌNH ẢNH */}

        <div className="home-hero-visual">
          <div className="home-hero-image-card">
            {heroRestaurant?.anhBia ? (
              <img
                src={heroRestaurant.anhBia}
                alt={heroRestaurant.tenNhaHang}
              />
            ) : (
              <div className="home-hero-placeholder">
                <UtensilsCrossed size={70} strokeWidth={1.25} />

                <span>Khám phá món ngon</span>
              </div>
            )}
          </div>

          <div className="hero-floating-card hero-rating-card">
            <span className="hero-floating-icon rating">
              <Star size={17} fill="currentColor" />
            </span>

            <div>
              <strong>Nhà hàng nổi bật</strong>

              <small>Được khách hàng yêu thích</small>
            </div>
          </div>

          <div className="hero-floating-card hero-time-card">
            <span className="hero-floating-icon delivery">
              <Clock3 size={18} />
            </span>

            <div>
              <strong>Giao nhanh</strong>

              <small>Theo dõi đơn dễ dàng</small>
            </div>
          </div>
        </div>
      </section>

      {/* =========================
                NHÀ HÀNG NỔI BẬT
            ========================= */}
      <section className="restaurant-section">
        <ScrollReveal className="section-heading-reveal" delay={80}>
          <div className="section-header">
            <div>
              <h2>Nhà hàng nổi bật</h2>

              <p>Những nhà hàng được đánh giá cao</p>
            </div>

            <Link to="/nha-hang" className="view-all-link">
              <span>Xem tất cả</span>

              <ArrowRight size={17} strokeWidth={2} />
            </Link>
          </div>
        </ScrollReveal>

        {loading && (
          <RestaurantCardSkeleton count={6} className="restaurant-grid" />
        )}

        {error && <p className="restaurant-error">{error}</p>}

        {!loading && !error && restaurants.length === 0 && (
          <p className="restaurant-message">Hiện chưa có nhà hàng.</p>
        )}

        {!loading && !error && restaurants.length > 0 && (
          <div className="restaurant-grid">
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
                    className="restaurant-card"
                  >
                    {/* ẢNH */}

                    <div className="restaurant-image">
                      {restaurant.anhBia ? (
                        <img
                          src={restaurant.anhBia}
                          alt={restaurant.tenNhaHang}
                        />
                      ) : (
                        <div className="restaurant-image-placeholder">
                          <ImageIcon size={46} strokeWidth={1.35} />

                          <span>Chưa có ảnh nhà hàng</span>
                        </div>
                      )}
                      <span
                        className="restaurant-image-shine"
                        aria-hidden="true"
                      />

                      <span
                        className={`restaurant-status ${
                          isOpen ? "open" : "closed"
                        }`}
                      >
                        <span className="restaurant-status-dot" />

                        {statusLabel}
                      </span>
                    </div>

                    {/* NỘI DUNG */}

                    <div className="restaurant-card-content">
                      <div className="restaurant-card-title-row">
                        <h3>{restaurant.tenNhaHang}</h3>

                        <span className="restaurant-card-rating">
                          <Star
                            size={15}
                            fill="currentColor"
                            strokeWidth={1.8}
                          />

                          {rating.toFixed(1)}
                        </span>
                      </div>

                      {restaurant.moTa && (
                        <p className="restaurant-description">
                          {restaurant.moTa}
                        </p>
                      )}

                      <div className="restaurant-card-address">
                        <MapPin size={16} strokeWidth={1.9} />

                        <span>
                          {restaurant.diaChiQuan || "Chưa cập nhật địa chỉ"}
                        </span>
                      </div>

                      <div className="restaurant-card-footer">
                        <span className="restaurant-card-shipping">
                          <Bike size={17} strokeWidth={1.9} />

                          {shippingFee > 0
                            ? `${shippingFee.toLocaleString("vi-VN")}đ`
                            : "Miễn phí giao hàng"}
                        </span>

                        <span className="restaurant-card-action">
                          Xem thực đơn
                          <ArrowRight size={16} strokeWidth={2} />
                        </span>
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

export default Home;
