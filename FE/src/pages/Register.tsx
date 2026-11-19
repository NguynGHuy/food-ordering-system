import CustomerAuthIntro from "../components/CustomerAuthIntro";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../services/authService";

function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [soDienThoai, setSoDienThoai] = useState("");
  const [hoTen, setHoTen] = useState("");
  const [ngaySinh, setNgaySinh] = useState("");
  const [gioiTinh, setGioiTinh] = useState("Nam");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [invalidField, setInvalidField] = useState("");
  function fieldError(field: string, message: string) {
    setInvalidField(field);
    setError(message);
    document.getElementById(field)?.focus();
  }

  const handleRegister = async () => {
    setError("");
    setInvalidField("");

    // =========================
    // HỌ TÊN
    // =========================

    if (!hoTen.trim()) {
      fieldError("cg-register-1", "Vui lòng nhập họ tên.");
      return;
    }

    if (hoTen.trim().length < 2) {
      fieldError("cg-register-1", "Họ tên phải có ít nhất 2 ký tự.");
      return;
    }

    // =========================
    // EMAIL
    // =========================

    if (!email.trim()) {
      fieldError("cg-register-2", "Vui lòng nhập email.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      fieldError("cg-register-2", "Email không đúng định dạng.");
      return;
    }

    // =========================
    // MẬT KHẨU
    // =========================

    if (!matKhau) {
      fieldError("cg-register-3", "Vui lòng nhập mật khẩu.");
      return;
    }

    if (matKhau.length < 6) {
      fieldError("cg-register-3", "Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    // =========================
    // SỐ ĐIỆN THOẠI
    // =========================

    if (!soDienThoai.trim()) {
      fieldError("cg-register-4", "Vui lòng nhập số điện thoại.");
      return;
    }

    const phoneRegex = /^[0-9]{10,11}$/;

    if (!phoneRegex.test(soDienThoai.trim())) {
      fieldError("cg-register-4", "Số điện thoại phải gồm 10 hoặc 11 chữ số.");
      return;
    }

    // =========================
    // NGÀY SINH
    // =========================

    if (!ngaySinh) {
      fieldError("cg-register-5", "Vui lòng chọn ngày sinh.");
      return;
    }

    const selectedDate = new Date(ngaySinh);
    const today = new Date();

    if (selectedDate > today) {
      fieldError("cg-register-5", "Ngày sinh không thể ở tương lai.");
      return;
    }

    // =========================
    // GIỚI TÍNH
    // =========================

    if (!gioiTinh) {
      fieldError("cg-register-6", "Vui lòng chọn giới tính.");
      return;
    }

    try {
      setLoading(true);

      await register({
        email: email.trim(),
        matKhau,
        soDienThoai: soDienThoai.trim(),
        hoTen: hoTen.trim(),
        ngaySinh,
        gioiTinh,
      });

      alert("Đăng ký tài khoản thành công!");

      navigate("/dang-nhap");
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Đăng ký thất bại.");
      }
    } finally {
      setLoading(false);
    }
  };

  const errorMessage = error && <p id="register-error" role="alert" className="auth-error">{error}</p>;

  return (
    <main className="auth-page">
      <CustomerAuthIntro />
      <form className="auth-card register-card" noValidate onSubmit={event => { event.preventDefault(); void handleRegister(); }}>
        <h1>Đăng ký </h1>

        <p className="auth-description">Tạo tài khoản khách hàng</p>

        <div className="form-group">
          <label htmlFor="cg-register-1">Họ tên </label>

          <input id="cg-register-1" aria-invalid={invalidField === "cg-register-1"} aria-describedby={invalidField === "cg-register-1" ? "register-error" : undefined}
            type="text"
            placeholder="Nhập họ tên"
            value={hoTen}
            onChange={(e) => setHoTen(e.target.value)}
          />
          {invalidField === "cg-register-1" && errorMessage}
        </div>

        <div className="form-group">
          <label htmlFor="cg-register-2">Email </label>

          <input id="cg-register-2" aria-invalid={invalidField === "cg-register-2"} aria-describedby={invalidField === "cg-register-2" ? "register-error" : undefined}
            type="email"
            placeholder="Nhập email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {invalidField === "cg-register-2" && errorMessage}
        </div>

        <div className="form-group">
          <label htmlFor="cg-register-3">Mật khẩu </label>

          <input id="cg-register-3" aria-invalid={invalidField === "cg-register-3"} aria-describedby={invalidField === "cg-register-3" ? "register-error" : undefined}
            type="password"
            placeholder="Nhập mật khẩu"
            value={matKhau}
            onChange={(e) => setMatKhau(e.target.value)}
          />
          {invalidField === "cg-register-3" && errorMessage}
        </div>

        <div className="form-group">
          <label htmlFor="cg-register-4">Số điện thoại </label>

          <input id="cg-register-4" aria-invalid={invalidField === "cg-register-4"} aria-describedby={invalidField === "cg-register-4" ? "register-error" : undefined}
            type="tel"
            placeholder="Nhập số điện thoại"
            value={soDienThoai}
            onChange={(e) => setSoDienThoai(e.target.value)}
          />
          {invalidField === "cg-register-4" && errorMessage}
        </div>

        <div className="form-group">
          <label htmlFor="cg-register-5">Ngày sinh </label>

          <input id="cg-register-5" aria-invalid={invalidField === "cg-register-5"} aria-describedby={invalidField === "cg-register-5" ? "register-error" : undefined}
            type="date"
            value={ngaySinh}
            onChange={(e) => setNgaySinh(e.target.value)}
          />
          {invalidField === "cg-register-5" && errorMessage}
        </div>

        <div className="form-group">
          <label htmlFor="cg-register-6">Giới tính </label>

          <select id="cg-register-6" aria-invalid={invalidField === "cg-register-6"} aria-describedby={invalidField === "cg-register-6" ? "register-error" : undefined}
            value={gioiTinh}
            onChange={(e) => setGioiTinh(e.target.value)}
          >
            <option value="Nam"> Nam </option>
            <option value="Nữ"> Nữ </option>
            <option value="Khác"> Khác </option>
          </select>
          {invalidField === "cg-register-6" && errorMessage}
        </div>

        {!invalidField && errorMessage}

        <button
          className="auth-button"
          type="submit"
          disabled={loading}
        >
          {loading ? "Đang đăng ký..." : "Đăng ký"}
        </button>

        <p className="auth-footer">
          Đã có tài khoản? <Link to="/dang-nhap">Đăng nhập</Link>
        </p>
        <p className="auth-footer">
          Bạn là chủ nhà hàng?{" "}
          <Link to="/dang-ky-nha-hang">Đăng ký nhà hàng</Link>
        </p>
      </form>
    </main>
  );
}

export default Register;
