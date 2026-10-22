import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  Mail,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  login,
  requestPasswordReset,
  resetPassword,
} from "../services/authService";
import { getCurrentUser } from "../services/userService";
import { syncGuestCartsToAccount } from "../services/cartService";

type ForgotStep = "email" | "verify" | "success";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const passwordChanged = searchParams.get("reason") === "password-changed";
  const [email, setEmail] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>("email");
  const [resetEmail, setResetEmail] = useState("");
  const [resetRequestId, setResetRequestId] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [developmentCode, setDevelopmentCode] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const handleLogin = async () => {
    setError("");

    if (!email.trim()) {
      setError("Vui lòng nhập email.");
      return;
    }

    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Email không đúng định dạng.");
      return;
    }

    if (!matKhau) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }

    try {
      setLoading(true);
      const data = await login({ email: email.trim(), matKhau });
      localStorage.setItem("token", data.token);
      const user = await getCurrentUser();

      if (user.role === "KhachHang") {
        try {
          await syncGuestCartsToAccount();
        } catch (syncError) {
          throw new Error(
            syncError instanceof Error
              ? `Chưa thể đồng bộ giỏ hàng: ${syncError.message}`
              : "Chưa thể đồng bộ giỏ hàng. Vui lòng thử đăng nhập lại.",
            { cause: syncError },
          );
        }
      }

      window.dispatchEvent(
        new CustomEvent("login-success", { detail: user }),
      );

      const returnUrl = searchParams.get("returnUrl");
      const safeReturnUrl =
        returnUrl?.startsWith("/") && !returnUrl.startsWith("//")
          ? returnUrl
          : null;

      if (user.role === "KhachHang" && safeReturnUrl) {
        navigate(safeReturnUrl, { replace: true });
        return;
      }

      if (user.role === "Admin") navigate("/admin", { replace: true });
      else if (user.role === "Quan") navigate("/quan", { replace: true });
      else navigate("/", { replace: true });
    } catch (loginError) {
      localStorage.removeItem("token");
      window.dispatchEvent(new Event("logout-success"));
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Đăng nhập thất bại.",
      );
    } finally {
      setLoading(false);
    }
  };

  const openForgotPassword = () => {
    setResetEmail(email.trim());
    setForgotStep("email");
    setForgotError("");
    setForgotOpen(true);
  };

  const closeForgotPassword = () => {
    if (forgotBusy) return;
    setForgotOpen(false);
    setForgotStep("email");
    setResetRequestId("");
    setResetCode("");
    setResetNewPassword("");
    setResetConfirmPassword("");
    setDevelopmentCode("");
    setForgotError("");
  };

  const handleRequestReset = async () => {
    const normalizedEmail = resetEmail.trim();
    setForgotError("");

    if (!normalizedEmail) {
      setForgotError("Vui lòng nhập email tài khoản.");
      return;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setForgotError("Email không đúng định dạng.");
      return;
    }

    try {
      setForgotBusy(true);
      const response = await requestPasswordReset(normalizedEmail);
      setResetRequestId(response.maYeuCau);
      setDevelopmentCode(response.maXacNhanThuNghiem || "");
      setForgotStep("verify");
    } catch (requestError) {
      setForgotError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể tạo yêu cầu đặt lại mật khẩu.",
      );
    } finally {
      setForgotBusy(false);
    }
  };

  const handleResetPassword = async () => {
    setForgotError("");

    if (!/^\d{6}$/.test(resetCode.trim())) {
      setForgotError("Mã xác nhận phải gồm đúng 6 chữ số.");
      return;
    }

    if (resetNewPassword.length < 6) {
      setForgotError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setForgotError("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      setForgotBusy(true);
      await resetPassword({
        maYeuCau: resetRequestId,
        maXacNhan: resetCode.trim(),
        matKhauMoi: resetNewPassword,
      });
      setMatKhau("");
      setForgotStep("success");
    } catch (resetError) {
      setForgotError(
        resetError instanceof Error
          ? resetError.message
          : "Không thể đặt lại mật khẩu.",
      );
    } finally {
      setForgotBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h2>Đăng nhập</h2>
        <p className="auth-description">Đăng nhập để tiếp tục sử dụng dịch vụ</p>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            autoComplete="email"
            placeholder="Nhập email của bạn"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleLogin();
            }}
          />
        </div>

        <div className="form-group login-password-group">
          <div className="login-password-heading">
            <label>Mật khẩu</label>
            <button type="button" onClick={openForgotPassword}>Quên mật khẩu?</button>
          </div>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Nhập mật khẩu"
            value={matKhau}
            onChange={(event) => setMatKhau(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleLogin();
            }}
          />
        </div>

        {passwordChanged && !error && (
          <p className="auth-session-notice" role="status">
            Mật khẩu đã được thay đổi. Vui lòng đăng nhập lại trên thiết bị này.
          </p>
        )}
        {error && <p className="auth-error" role="alert">{error}</p>}

        <button className="auth-button" type="button" onClick={() => void handleLogin()} disabled={loading}>
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

        <p className="auth-footer">
          Chưa có tài khoản? <Link to="/dang-ky">Đăng ký ngay</Link>
        </p>
      </div>

      {forgotOpen && (
        <div className="forgot-password-overlay" role="dialog" aria-modal="true" aria-labelledby="forgot-password-title" onMouseDown={closeForgotPassword}>
          <section className="forgot-password-dialog" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="forgot-password-close" aria-label="Đóng" disabled={forgotBusy} onClick={closeForgotPassword}>
              <X size={18} />
            </button>

            {forgotStep === "email" && (
              <>
                <span className="forgot-password-icon"><Mail size={24} /></span>
                <h2 id="forgot-password-title">Quên mật khẩu?</h2>
                <p>Nhập email tài khoản để nhận mã xác nhận đặt lại mật khẩu.</p>

                <label className="forgot-password-field">
                  <span>Email tài khoản</span>
                  <input type="email" autoFocus autoComplete="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} placeholder="email@example.com" />
                </label>

                {forgotError && <p className="forgot-password-error" role="alert">{forgotError}</p>}

                <button type="button" className="forgot-password-primary" disabled={forgotBusy} onClick={() => void handleRequestReset()}>
                  {forgotBusy ? <LoaderCircle className="forgot-password-spin" size={17} /> : <Mail size={17} />}
                  {forgotBusy ? "Đang tạo mã..." : "Nhận mã xác nhận"}
                </button>
              </>
            )}

            {forgotStep === "verify" && (
              <>
                <button type="button" className="forgot-password-back" disabled={forgotBusy} onClick={() => { setForgotStep("email"); setForgotError(""); }}>
                  <ArrowLeft size={15} /> Đổi email
                </button>
                <span className="forgot-password-icon"><KeyRound size={24} /></span>
                <h2 id="forgot-password-title">Tạo mật khẩu mới</h2>
                <p>Mã xác nhận có hiệu lực trong 10 phút và chỉ được thử tối đa 5 lần.</p>

                {developmentCode && (
                  <div className="forgot-password-dev-code">
                    <ShieldCheck size={16} />
                    <span>Mã xác nhận Development: <strong>{developmentCode}</strong></span>
                  </div>
                )}

                <label className="forgot-password-field">
                  <span>Mã xác nhận</span>
                  <input type="text" inputMode="numeric" maxLength={6} autoFocus value={resetCode} onChange={(event) => setResetCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" />
                </label>
                <label className="forgot-password-field">
                  <span>Mật khẩu mới</span>
                  <input type="password" autoComplete="new-password" value={resetNewPassword} onChange={(event) => setResetNewPassword(event.target.value)} placeholder="Tối thiểu 6 ký tự" />
                </label>
                <label className="forgot-password-field">
                  <span>Xác nhận mật khẩu mới</span>
                  <input type="password" autoComplete="new-password" value={resetConfirmPassword} onChange={(event) => setResetConfirmPassword(event.target.value)} placeholder="Nhập lại mật khẩu mới" />
                </label>

                {forgotError && <p className="forgot-password-error" role="alert">{forgotError}</p>}

                <button type="button" className="forgot-password-primary" disabled={forgotBusy} onClick={() => void handleResetPassword()}>
                  {forgotBusy ? <LoaderCircle className="forgot-password-spin" size={17} /> : <KeyRound size={17} />}
                  {forgotBusy ? "Đang cập nhật..." : "Đặt lại mật khẩu"}
                </button>
              </>
            )}

            {forgotStep === "success" && (
              <div className="forgot-password-success">
                <span className="forgot-password-success-icon"><CheckCircle2 size={30} /></span>
                <h2 id="forgot-password-title">Đổi mật khẩu thành công</h2>
                <p>Bạn có thể sử dụng mật khẩu mới để đăng nhập ngay bây giờ.</p>
                <button type="button" className="forgot-password-primary" onClick={closeForgotPassword}>Quay lại đăng nhập</button>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

export default Login;
