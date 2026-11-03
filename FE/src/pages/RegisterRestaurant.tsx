import CustomerAuthIntro from "../components/CustomerAuthIntro";
import { useState } from "react";
import type { ChangeEvent, SyntheticEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerRestaurant } from "../services/authService";

function RegisterRestaurant() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        tenNhaHang: "",
        email: "",
        matKhau: "",
        soDienThoai: "",
        diaChiQuan: "",
    });

    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const handleSubmit = async (
        event: SyntheticEvent<HTMLFormElement>
    ) => {
        event.preventDefault();
        if (busy) return;

        setError("");

        const payload = {
            tenNhaHang: form.tenNhaHang.trim(),
            email: form.email.trim(),
            matKhau: form.matKhau,
            soDienThoai: form.soDienThoai.trim(),
            diaChiQuan: form.diaChiQuan.trim(),
        };

        if (
            !payload.tenNhaHang ||
            !payload.email ||
            !payload.soDienThoai ||
            !payload.diaChiQuan
        ) {
            setError("Vui lòng điền đầy đủ thông tin.");
            return;
        }

        if (payload.matKhau.length < 6) {
            setError("Mật khẩu phải có ít nhất 6 ký tự.");
            return;
        }

        try {
            setBusy(true);
            await registerRestaurant(payload);

            alert(
                "Đăng ký thành công. Vui lòng đăng nhập để hoàn thiện hồ sơ và ký hợp đồng."
            );

            navigate("/dang-nhap");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Đăng ký nhà hàng thất bại."
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <main className="auth-page">
      <CustomerAuthIntro restaurant />
            <div className="auth-card register-card">
                <h2>Đăng ký nhà hàng</h2>

                <p className="auth-description">
                    Tạo tài khoản trước, sau đó hoàn thiện hồ sơ pháp lý
                    và ký hợp đồng để gửi xét duyệt.
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="restaurant-name">Tên nhà hàng</label>
                        <input
                            id="restaurant-name"
                            name="tenNhaHang"
                            required
                            maxLength={150}
                            value={form.tenNhaHang}
                            onChange={handleChange}
                            disabled={busy}
                            placeholder="Nhập tên nhà hàng"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="restaurant-email">Email</label>
                        <input
                            id="restaurant-email"
                            type="email"
                            name="email"
                            required
                            maxLength={100}
                            autoComplete="email"
                            value={form.email}
                            onChange={handleChange}
                            disabled={busy}
                            placeholder="Email đăng nhập"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="restaurant-password">Mật khẩu</label>
                        <input
                            id="restaurant-password"
                            type="password"
                            name="matKhau"
                            required
                            minLength={6}
                            maxLength={100}
                            autoComplete="new-password"
                            value={form.matKhau}
                            onChange={handleChange}
                            disabled={busy}
                            placeholder="Ít nhất 6 ký tự"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="restaurant-phone">Số điện thoại</label>
                        <input
                            id="restaurant-phone"
                            type="tel"
                            name="soDienThoai"
                            required
                            maxLength={15}
                            autoComplete="tel"
                            value={form.soDienThoai}
                            onChange={handleChange}
                            disabled={busy}
                            placeholder="Số điện thoại liên hệ"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="restaurant-address">Địa chỉ quán</label>
                        <input
                            id="restaurant-address"
                            name="diaChiQuan"
                            required
                            maxLength={255}
                            autoComplete="street-address"
                            value={form.diaChiQuan}
                            onChange={handleChange}
                            disabled={busy}
                            placeholder="Địa chỉ nhà hàng"
                        />
                    </div>

                    {error && (
                        <p className="auth-error" role="alert">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="auth-button"
                        disabled={busy}
                    >
                        {busy ? "Đang đăng ký..." : "Tạo tài khoản nhà hàng"}
                    </button>
                </form>

                <p className="auth-footer">
                    Đã có tài khoản? <Link to="/dang-nhap">Đăng nhập</Link>
                </p>

                <p className="auth-footer">
                    Đăng ký khách hàng? <Link to="/dang-ky">Tại đây</Link>
                </p>
            </div>
        </main>
    );
}

export default RegisterRestaurant;