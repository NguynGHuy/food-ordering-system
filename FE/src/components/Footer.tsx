import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* =========================
                    GIỚI THIỆU
                ========================= */}
        <div className="footer-column footer-brand">
          <Link to="/" className="footer-logo">
            <span className="footer-logo-icon">🍜</span>
            <span>Đặt Món Ăn</span>
          </Link>

          <p>
            Nền tảng đặt món ăn trực tuyến, giúp bạn dễ dàng tìm kiếm và đặt món
            ăn yêu thích.
          </p>
        </div>

        {/* =========================
                    VỀ CHÚNG TÔI
                ========================= */}
        <div className="footer-column">
          <h3>Về chúng tôi</h3>

          <Link to="/">Trang chủ</Link>

          <Link to="/">Nhà hàng</Link>

          <Link to="/dang-ky">Đăng ký</Link>

          <Link to="/dang-nhap">Đăng nhập</Link>
        </div>

        {/* =========================
                    KHÁCH HÀNG
                ========================= */}
        <div className="footer-column">
          <h3>Khách hàng</h3>

          <Link to="/ho-so">Hồ sơ</Link>

          <Link to="/dia-chi">Địa chỉ giao hàng</Link>

          <Link to="/don-hang">Đơn hàng của tôi</Link>

          <Link to="/thong-bao">Thông báo</Link>
        </div>

        {/* =========================
                    HỖ TRỢ
                ========================= */}
        <div className="footer-column">
          <h3>Hỗ trợ</h3>

          <Link to="/tro-giup">Trung tâm trợ giúp</Link>

          <Link to="/chinh-sach-bao-mat">Chính sách bảo mật</Link>

          <Link to="/dieu-khoan-su-dung">Điều khoản sử dụng</Link>

          <Link to="/chinh-sach-giao-hang">Chính sách giao hàng</Link>
        </div>

        {/* =========================
                    LIÊN HỆ
                ========================= */}
        <div className="footer-column">
          <h3>Liên hệ</h3>

          <p>📧 support@datmonan.com</p>

          <p>📞 0798223927</p>

          <p>📍 TP. Hồ Chí Minh, Việt Nam</p>

          <div className="footer-social">
            <a href="#" aria-label="Facebook">
              f
            </a>

            <a href="#" aria-label="Instagram">
              ◎
            </a>

            <a href="#" aria-label="TikTok">
              ♪
            </a>
          </div>
        </div>
      </div>

      {/* =========================
                BOTTOM
            ========================= */}
      <div className="footer-bottom">
        <div className="footer-bottom-container">
          <span>© 2026 Đặt Món Ăn. All rights reserved.</span>

          <span>Được xây dựng bởi nhóm 14</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
