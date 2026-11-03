import RestaurantCardSkeleton from "./RestaurantCardSkeleton";

/** Reserves the public page structure while HomeEntry checks the existing session. */
export default function HomeSkeleton() {
  return (
    <main className="home-page home-loading" role="status" aria-label="Đang tải trang chủ">
      <section className="home-hero" aria-hidden="true">
        <div className="home-hero-content">
          <h1>Mỗi bữa ăn,<span className="home-hero-highlight"> một lựa chọn ngon.</span></h1>
          <p className="home-hero-lead">Tìm quán quen, khám phá thực đơn mới và chọn món theo khẩu vị. Kiểm tra giá, ưu đãi và theo dõi đơn ngay trên Foodie.</p>
          <div className="home-skeleton-search" />
          <div className="home-skeleton-tags"><span /><span /><span /><span /><span /><span /></div>
        </div>
        <div className="home-hero-visual">
          <div className="home-hero-image-card" />
          <p className="cg-hero-caption" />
        </div>
      </section>
      <section className="home-promo-strip" aria-hidden="true">
        <div className="home-promo-strip-card home-skeleton-promo"><span /><span /></div>
      </section>
      <section className="restaurant-section" aria-hidden="true">
        <div className="home-skeleton-copy"><span /><span /></div>
        <RestaurantCardSkeleton className="restaurant-grid" count={3} />
      </section>
    </main>
  );
}
