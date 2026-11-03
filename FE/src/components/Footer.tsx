import { Utensils } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer cg-footer">
      <div className="footer-container">
        <div className="footer-column footer-brand">
          <Link to="/" className="footer-logo"><Utensils size={23} aria-hidden="true" /><span>Foodie</span></Link>
          <p>Món ăn từ nhiều nhà hàng, trong một không gian để khám phá, lựa chọn và theo dõi đơn hàng.</p>
          <small>Bản demo đồ án · Nhóm 14</small>
        </div>
        <div className="footer-column"><h3>Khám phá</h3><Link to="/">Trang chủ</Link><Link to="/nha-hang">Nhà hàng</Link><Link to="/dang-ky">Đăng ký</Link><Link to="/dang-nhap">Đăng nhập</Link></div>
        <div className="footer-column"><h3>Tài khoản của bạn</h3><Link to="/ho-so">Hồ sơ</Link><Link to="/dia-chi">Địa chỉ giao hàng</Link><Link to="/don-hang">Đơn hàng của tôi</Link><Link to="/thong-bao">Thông báo</Link></div>
        <div className="footer-column"><h3>Thông tin & hỗ trợ</h3><Link to="/tro-giup">Trung tâm trợ giúp</Link><Link to="/chinh-sach-bao-mat">Chính sách bảo mật</Link><Link to="/dieu-khoan-su-dung">Điều khoản sử dụng</Link><Link to="/chinh-sach-giao-hang">Chính sách giao hàng</Link></div>
      </div>
      <div className="footer-bottom"><div className="footer-bottom-container"><span>© 2026 Foodie · Đồ án đặt món trực tuyến</span><span>FoodPay, thanh toán online và đối soát đều mô phỏng.</span></div></div>
    </footer>
  );
}
