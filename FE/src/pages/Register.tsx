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

  const handleRegister = async () => {
    setError("");

    // =========================
    // HỌ TÊN
    // =========================

    if (!hoTen.trim()) {
      setError("Vui lòng nhập họ tên.");
      return;
    }

    if (hoTen.trim().length < 2) {
      setError("Họ tên phải có ít nhất 2 ký tự.");
      return;
    }

    // =========================
    // EMAIL
    // =========================

    if (!email.trim()) {
      setError("Vui lòng nhập email.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      setError("Email không đúng định dạng.");
      return;
    }

    // =========================
    // MẬT KHẨU
    // =========================

    if (!matKhau) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }

    if (matKhau.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    // =========================
    // SỐ ĐIỆN THOẠI
    // =========================

    if (!soDienThoai.trim()) {
      setError("Vui lòng nhập số điện thoại.");
      return;
    }

    const phoneRegex = /^[0-9]{10,11}$/;

    if (!phoneRegex.test(soDienThoai.trim())) {
      setError("Số điện thoại phải gồm 10 hoặc 11 chữ số.");
      return;
    }

    // =========================
    // NGÀY SINH
    // =========================

    if (!ngaySinh) {
      setError("Vui lòng chọn ngày sinh.");
      return;
    }

    const selectedDate = new Date(ngaySinh);
    const today = new Date();

    if (selectedDate > today) {
      setError("Ngày sinh không thể ở tương lai.");
      return;
    }

    // =========================
    // GIỚI TÍNH
    // =========================

    if (!gioiTinh) {
      setError("Vui lòng chọn giới tính.");
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

  return (
    <main className="auth-page">
      <div className="auth-card register-card">
        <h2>Đăng ký </h2>

        <p className="auth-description">Tạo tài khoản khách hàng</p>

        <div className="form-group">
          <label>Họ tên </label>

          <input
            type="text"
            placeholder="Nhập họ tên"
            value={hoTen}
            onChange={(e) => setHoTen(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Email </label>

          <input
            type="email"
            placeholder="Nhập email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Mật khẩu </label>

          <input
            type="password"
            placeholder="Nhập mật khẩu"
            value={matKhau}
            onChange={(e) => setMatKhau(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Số điện thoại </label>

          <input
            type="tel"
            placeholder="Nhập số điện thoại"
            value={soDienThoai}
            onChange={(e) => setSoDienThoai(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Ngày sinh </label>

          <input
            type="date"
            value={ngaySinh}
            onChange={(e) => setNgaySinh(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Giới tính </label>

          <select
            value={gioiTinh}
            onChange={(e) => setGioiTinh(e.target.value)}
          >
            <option value="Nam"> Nam </option>
            <option value="Nữ"> Nữ </option>
            <option value="Khác"> Khác </option>
          </select>
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button
          className="auth-button"
          onClick={handleRegister}
          disabled={loading}
        >
          {loading ? "Đang đăng ký..." : "Đăng ký"}
        </button>

        <p className="auth-footer">
          Đã có tài khoản ? <Link to="/dang-nhap">Đăng nhập</Link>
        </p>
        <p className="auth-footer">
          Bạn là chủ nhà hàng?{" "}
          <Link to="/dang-ky-nha-hang">Đăng ký nhà hàng</Link>
        </p>
      </div>
    </main>
  );
}

export default Register;
