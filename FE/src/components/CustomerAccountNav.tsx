import { NavLink } from "react-router-dom";

/** Existing destinations only; no account fetching or permission changes. */
export default function CustomerAccountNav() {
  return (
    <nav className="cg-account-nav" aria-label="Tài khoản của bạn">
      <NavLink to="/ho-so" end>Hồ sơ</NavLink>
      <NavLink to="/dia-chi">Địa chỉ</NavLink>
      <NavLink to="/vi">Ví & giao dịch</NavLink>
      <NavLink to="/kho-voucher">Kho voucher</NavLink>
    </nav>
  );
}
