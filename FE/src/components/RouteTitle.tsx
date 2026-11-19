import { useEffect } from "react";

const pages: Record<string, string> = {
  "/": "Trang chủ",
  "/dang-nhap": "Đăng nhập",
  "/dang-ky": "Đăng ký",
  "/dang-ky-nha-hang": "Đăng ký nhà hàng",
  "/nha-hang": "Nhà hàng",
  "/tro-giup": "Trung tâm trợ giúp",
  "/chinh-sach-bao-mat": "Chính sách bảo mật",
  "/dieu-khoan-su-dung": "Điều khoản sử dụng",
  "/chinh-sach-giao-hang": "Chính sách giao hàng",
  "/ho-so": "Hồ sơ cá nhân",
  "/dia-chi": "Địa chỉ giao hàng",
  "/kho-voucher": "Kho voucher",
  "/vi": "Ví FoodPay",
  "/gio-hang": "Giỏ hàng",
  "/thanh-toan": "Thanh toán",
  "/don-hang": "Đơn hàng",
  "/thong-bao": "Thông báo",
  "/quan": "Tổng quan quán",
  "/admin": "Tổng quan quản trị"
};

const sections: Record<string, string> = {
  "thong-tin": "Thông tin quán",
  "ho-so-phap-ly": "Hồ sơ pháp lý",
  "hop-dong": "Hợp đồng",
  "doi-soat": "Đối soát",
  "vi": "Ví nhà hàng",
  "trang-thai": "Trạng thái quán",
  "danh-muc": "Danh mục",
  "menu": "Thực đơn",
  "topping": "Topping",
  "don-hang": "Đơn hàng",
  "khuyen-mai": "Khuyến mãi",
  "thong-bao": "Thông báo",
  "tai-khoan": "Tài khoản",
  "nha-hang": "Duyệt nhà hàng",
  "tai-chinh": "Tài chính",
  "ho-tro-don-hang": "Hỗ trợ đơn hàng"
};

export default function RouteTitle({ pathname }: { pathname: string }) {
  useEffect(() => {
    const [area, section, id] = pathname.split("/").filter(Boolean);
    let title = pages[pathname];
    if (!title && (area === "admin" || area === "quan") && sections[section]) {
      const label = section === "nha-hang" && id ? "Hồ sơ nhà hàng" : sections[section];
      title = (id ? label + " #" + id : label) + (area === "admin" ? " · Admin" : " · Quán");
    } else if (!title && section && (area === "don-hang" || area === "nha-hang")) {
      title = pages["/" + area] + " #" + section;
    }
    document.title = (title || "Không tìm thấy trang") + " | Foodie";
  }, [pathname]);
  return null;
}
