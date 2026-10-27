import { ArrowLeft, House } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./InformationPage.css";

type Section = "help" | "privacy" | "terms" | "delivery";

const CONTENT: Record<Section, { title: string; sections: { title: string; text: string }[] }> = {
  help: {
    title: "Trung tâm trợ giúp",
    sections: [
      { title: "Bắt đầu đặt món", text: "Đăng nhập tài khoản khách, chọn nhà hàng đang nhận đơn, chọn món và topping rồi thêm vào giỏ. Mỗi giỏ thuộc một nhà hàng. Tại bước thanh toán, kiểm tra địa chỉ, voucher, phương thức và tổng tiền trước khi xác nhận." },
      { title: "Thanh toán trong bản demo", text: "FoodPay là ví mô phỏng nội bộ. MoMo, VNPay và ZaloPay chỉ mô phỏng kết quả thanh toán; không chuyển tiền thật. Không nhập thông tin thẻ, tài khoản ngân hàng hoặc chuyển tiền bên ngoài để dùng bản demo." },
      { title: "Theo dõi và hủy đơn", text: "Xem trạng thái và lịch sử tại Đơn hàng của tôi. Khả năng hủy phụ thuộc trạng thái và kiểm tra của hệ thống. Đơn đã thanh toán được hủy hợp lệ sẽ hoàn vào FoodPay theo nghiệp vụ hiện tại; COD chưa thu tiền không được hoàn ví." },
      { title: "Khi thao tác gặp lỗi", text: "Đọc thông báo trên màn hình, kiểm tra kết nối và tải lại dữ liệu. Trước khi thử thanh toán lại, xem chi tiết đơn và lịch sử FoodPay để biết kết quả đã được ghi nhận hay chưa. Nếu vẫn gặp lỗi, gửi mã đơn và mô tả thao tác cho nhóm thực hiện đồ án; không gửi mật khẩu hoặc giấy tờ cá nhân thật." },
    ],
  },
  privacy: {
    title: "Chính sách bảo mật",
    sections: [
      { title: "Phạm vi của bản dự thảo", text: "Trang này mô tả dữ liệu và chức năng của bản demo Foodie, chưa phải chính sách bảo mật chính thức đã được chủ dự án phê duyệt. Chỉ sử dụng thông tin và tài liệu giả lập khi trình diễn." },
      { title: "Dữ liệu trong luồng sử dụng", text: "Các chức năng hiện tại sử dụng thông tin tài khoản, hồ sơ, địa chỉ giao hàng, đơn hàng, đánh giá, thông báo và lịch sử giao dịch mô phỏng. Khu vực Quán/Admin còn xử lý hồ sơ và hợp đồng demo theo quyền truy cập của tài khoản." },
      { title: "Thông tin cần được chủ dự án duyệt", text: "Mục đích xử lý chi tiết, thời hạn lưu trữ, quy trình yêu cầu truy cập/xóa dữ liệu, bên nhận dữ liệu và đầu mối liên hệ chính thức cần được xác định và phê duyệt trước khi công bố chính sách áp dụng thực tế. Bản dự thảo này không xác lập các cam kết đó." },
    ],
  },
  terms: {
    title: "Điều khoản sử dụng",
    sections: [
      { title: "Môi trường đồ án", text: "Foodie là nền tảng đặt món được xây dựng để minh họa luồng Khách hàng, Quán và Admin. FoodPay, thanh toán trực tuyến và thanh toán đối soát đều là mô phỏng; không có giao dịch tiền thật hoặc tích hợp ngân hàng thật trong phạm vi này." },
      { title: "Luồng chức năng hiện có", text: "Hệ thống kiểm tra quyền tài khoản, điều kiện nhận đơn của nhà hàng, voucher và trạng thái đơn. Giá trị thanh toán được backend xác định. Hoàn tiền hợp lệ được ghi vào FoodPay. Hồ sơ pháp lý/hợp đồng chỉ mô phỏng quy trình, không phải xác thực pháp lý hoặc chữ ký số thật." },
      { title: "Chưa phải thỏa thuận chính thức", text: "Các nội dung về trách nhiệm các bên, giải quyết khiếu nại, giới hạn trách nhiệm và hiệu lực áp dụng cần chủ dự án quyết định và duyệt riêng. Trang này không thiết lập một thỏa thuận thương mại hoặc cam kết pháp lý chính thức." },
    ],
  },
  delivery: {
    title: "Chính sách giao hàng",
    sections: [
      { title: "Giao hàng trong bản demo", text: "Trạng thái xác nhận, chuẩn bị, đang giao và hoàn thành do Quán cập nhật theo luồng của hệ thống. Đồ án không có tài xế hoặc định vị GPS; dữ liệu giao hàng phục vụ trình diễn, không tổ chức dịch vụ giao nhận thực tế." },
      { title: "Địa chỉ, phí và thời gian", text: "Khách chọn địa chỉ và kiểm tra phí giao hàng cùng tổng tiền tại checkout. Thời gian dự kiến trong bản demo chỉ là thông tin minh họa, không phải cam kết giao đúng giờ. Theo dõi trạng thái hiện tại trong chi tiết đơn." },
      { title: "Nội dung còn chờ phê duyệt", text: "Khu vực phục vụ thực tế, thời hạn giao, xử lý giao thất bại và trách nhiệm bồi hoàn chưa được xác lập bởi bản dự thảo này. Chủ dự án cần phê duyệt các nội dung đó trước khi cung cấp dịch vụ thật." },
    ],
  },
};

export default function InformationPage({ section }: { section: Section }) {
  const navigate = useNavigate();
  const location = useLocation();
  const content = CONTENT[section];
  return (
    <main className="foodie-information-page">
      <article className="foodie-information-card" aria-labelledby="information-title">
        <span className="foodie-information-eyebrow">FOODIE · THÔNG TIN BẢN DEMO</span>
        <h1 id="information-title">{content.title}</h1>
        {section !== "help" && (
          <p className="foodie-information-draft" role="note">
            Bản dự thảo — cần chủ dự án phê duyệt. Chưa phải chính sách hoặc điều khoản chính thức.
          </p>
        )}
        {content.sections.map(item => (
          <section key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
          </section>
        ))}
        {section === "help" && <p><Link to="/nha-hang">Khám phá nhà hàng</Link> · <Link to="/don-hang">Đơn hàng của tôi</Link></p>}
        <div className="not-found-actions">
          <button type="button" onClick={() => location.key === "default" ? navigate("/") : navigate(-1)}>
            <ArrowLeft size={18} /> Quay lại
          </button>
          <Link to="/"><House size={18} /> Về trang chủ</Link>
        </div>
      </article>
    </main>
  );
}
