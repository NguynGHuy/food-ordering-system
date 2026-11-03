import { Check, Utensils } from "lucide-react";

/** Presentation only: the existing forms own inputs, validation and requests. */
export default function CustomerAuthIntro({ restaurant = false }: { restaurant?: boolean }) {
  const steps = restaurant
    ? ["Hoàn thiện thông tin và hồ sơ nhà hàng", "Quản lý thực đơn, topping và ưu đãi", "Tiếp nhận và theo dõi các đơn đặt món"]
    : ["Khám phá nhà hàng và chọn món bạn thích", "Lưu địa chỉ, voucher và giỏ theo từng quán", "Theo dõi đơn hàng và lịch sử thanh toán"];
  return (
    <aside className="cg-auth-intro">
      <span className="cg-auth-mark" aria-hidden="true"><Utensils size={30} /></span>
      <h1>{restaurant ? "Từ căn bếp của bạn, đến bàn ăn của khách." : "Một nơi cho những bữa ăn bạn yêu thích."}</h1>
      <p>{restaurant ? "Không gian quản lý nhà hàng trên Foodie, từ thực đơn đến từng đơn đặt món." : "Đăng nhập Foodie để tiếp tục chọn món và quản lý những đơn hàng của bạn."}</p>
      <ul>{steps.map(step => <li key={step}><Check size={17} aria-hidden="true" /><span>{step}</span></li>)}</ul>
      <small>Foodie là bản demo đồ án. Thanh toán online và FoodPay là mô phỏng.</small>
    </aside>
  );
}
