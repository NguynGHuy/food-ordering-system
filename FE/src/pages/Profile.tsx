import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  CircleAlert,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  TicketPercent,
  Trash2,
  UserRound,
  VenusAndMars,
  WalletCards,
  X,
} from "lucide-react";

import ScrollReveal from "../components/ScrollReveal";
import { changePassword } from "../services/authService";
import {
  deleteCustomerAvatar,
  getCustomerProfile,
  getRefundHistory,
  uploadCustomerAvatar,
  updateCustomerProfile,
} from "../services/customerService";
import { resolveMediaUrl } from "../services/api";

import type { CustomerProfile, RefundHistoryItem } from "../services/customerService";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

function LichSuHoanList({ items }: { items: RefundHistoryItem[] }) {
  if (items.length === 0) {
    return <span className="profile-tool-status">Chưa có khoản hoàn tiền</span>;
  }

  return (
    <ul className="profile-refund-list">
      {items.map((item) => (
        <li key={`${item.maDonHangHienThi}-${item.thoiGianHoanThanh}`}>
          <div>
            <strong>{item.maDonHangHienThi}</strong>
            <span>{item.soTienHoan.toLocaleString("vi-VN")} đ</span>
          </div>
          <p>{item.lyDoHoan}</p>
          <time>
            {new Date(item.thoiGianHoanThanh).toLocaleString("vi-VN")}
          </time>
        </li>
      ))}
    </ul>
  );
}

function resizeAvatar(file: File) {
  return new Promise<File>((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Vui lòng chọn một tệp hình ảnh."));
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      reject(new Error("Ảnh đại diện không được lớn hơn 5 MB."));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const maxEdge = 512;
      const ratio = Math.min(maxEdge / image.width, maxEdge / image.height, 1);
      const width = Math.max(1, Math.round(image.width * ratio));
      const height = Math.max(1, Math.round(image.height * ratio));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Trình duyệt không thể xử lý ảnh này."));
        return;
      }

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Không thể xử lý ảnh đã chọn."));
            return;
          }

          resolve(new File([blob], `avatar-${Date.now()}.webp`, {
            type: "image/webp",
          }));
        },
        "image/webp",
        0.86,
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Không thể đọc ảnh đã chọn."));
    };

    image.src = objectUrl;
  });
}

function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [lichSuHoan, setLichSuHoan] = useState<RefundHistoryItem[]>([]);
  const [moLichSuHoan, setMoLichSuHoan] = useState(false);
  const [hoTen, setHoTen] = useState("");
  const [ngaySinh, setNgaySinh] = useState("");
  const [gioiTinh, setGioiTinh] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const applyAvatar = useCallback((data: CustomerProfile) => {
    setAvatarUrl(resolveMediaUrl(data.anhDaiDien));
  }, []);

  const loadProfile = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      setError("");

      const [data, refunds] = await Promise.all([
        getCustomerProfile() as Promise<CustomerProfile>,
        getRefundHistory(),
      ]);
      setProfile(data);
      setLichSuHoan(refunds);
      setHoTen(data.hoTen || "");
      setNgaySinh(data.ngaySinh || "");
      setGioiTinh(data.gioiTinh || "");
      applyAvatar(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Không thể tải hồ sơ.",
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [applyAvatar]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadProfile(true), 0);
    return () => window.clearTimeout(timeout);
  }, [loadProfile]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const notifyAvatarChange = (nextAvatar: string | null) => {
    window.dispatchEvent(
      new CustomEvent("avatar-updated", {
        detail: { avatarUrl: nextAvatar },
      }),
    );
  };

  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !profile) return;

    try {
      setAvatarBusy(true);
      setError("");
      const processedAvatar = await resizeAvatar(file);
      const response = await uploadCustomerAvatar(processedAvatar);
      const nextAvatar = resolveMediaUrl(response.anhDaiDien);
      setProfile({ ...profile, anhDaiDien: response.anhDaiDien });
      setAvatarUrl(nextAvatar);
      notifyAvatarChange(nextAvatar);
      setNotice("Ảnh đại diện đã được cập nhật.");
    } catch (avatarError) {
      setError(
        avatarError instanceof Error
          ? avatarError.message
          : "Không thể cập nhật ảnh đại diện.",
      );
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!profile) return;

    try {
      setAvatarBusy(true);
      setError("");
      await deleteCustomerAvatar();
      setProfile({ ...profile, anhDaiDien: null });
      setAvatarUrl(null);
      notifyAvatarChange(null);
      setNotice("Đã gỡ ảnh đại diện.");
    } catch (avatarError) {
      setError(
        avatarError instanceof Error
          ? avatarError.message
          : "Không thể gỡ ảnh đại diện.",
      );
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleUpdate = async () => {
    setError("");

    if (!hoTen.trim()) {
      setError("Vui lòng nhập họ tên.");
      return;
    }

    if (hoTen.trim().length < 2) {
      setError("Họ tên phải có ít nhất 2 ký tự.");
      return;
    }

    if (ngaySinh && new Date(ngaySinh) > new Date()) {
      setError("Ngày sinh không thể ở tương lai.");
      return;
    }

    try {
      setSaving(true);
      await updateCustomerProfile({
        hoTen: hoTen.trim(),
        ngaySinh: ngaySinh || null,
        gioiTinh: gioiTinh || null,
      });
      await loadProfile();
      setNotice("Thông tin hồ sơ đã được cập nhật.");
      window.dispatchEvent(
        new CustomEvent("profile-updated", {
          detail: { hoTen: hoTen.trim() },
        }),
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Cập nhật hồ sơ thất bại.",
      );
    } finally {
      setSaving(false);
    }
  };

  const closePasswordForm = () => {
    if (passwordBusy) return;
    setShowPasswordForm(false);
    setShowPasswords(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
  };

  const handleChangePassword = async () => {
    setPasswordError("");

    if (!currentPassword) {
      setPasswordError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError("Mật khẩu mới phải khác mật khẩu hiện tại.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu xác nhận không khớp.");
      return;
    }

    try {
      setPasswordBusy(true);
      await changePassword({
        matKhauCu: currentPassword,
        matKhauMoi: newPassword,
      });
      setShowPasswordForm(false);
      setShowPasswords(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      localStorage.removeItem("token");
      window.dispatchEvent(new Event("logout-success"));
      navigate("/dang-nhap?reason=password-changed", { replace: true });
    } catch (changeError) {
      setPasswordError(
        changeError instanceof Error
          ? changeError.message
          : "Không thể đổi mật khẩu lúc này.",
      );
    } finally {
      setPasswordBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="profile-page profile-page-polished profile-state-page">
        <div className="profile-loading-card">
          <LoaderCircle size={28} />
          <strong>Đang chuẩn bị hồ sơ của bạn</strong>
          <span>Chỉ mất một chút thời gian...</span>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="profile-page profile-page-polished profile-state-page">
        <div className="profile-empty-state">
          <span><CircleAlert size={30} /></span>
          <h2>Không tìm thấy hồ sơ</h2>
          <p>{error || "Không thể tải thông tin tài khoản của bạn."}</p>
          <button type="button" onClick={() => void loadProfile(true)}>
            Thử tải lại
          </button>
          <Link to="/">Về trang chủ</Link>
        </div>
      </main>
    );
  }

  const avatarName = profile.hoTen?.trim().charAt(0).toUpperCase() || "U";

  return (
    <main className="profile-page profile-page-polished">
      <div className="profile-page-glow profile-page-glow-one" aria-hidden="true" />
      <div className="profile-page-glow profile-page-glow-two" aria-hidden="true" />

      <Link to="/" className="profile-top-back">
        <ArrowLeft size={16} /> Về trang chủ
      </Link>

      <header className="profile-hero compact-account-hero">
        <div className="compact-account-title">
          <span className="compact-account-icon">
            <UserRound size={22} />
          </span>
          <div>
            <span>Hồ sơ của bạn</span>
            <h1>Hồ sơ cá nhân</h1>
            <p>Cập nhật thông tin để trải nghiệm đặt món thuận tiện hơn mỗi ngày.</p>
          </div>
        </div>
      </header>

      <div className="profile-feedback" aria-live="polite">
        {notice && (
          <div className="profile-notice profile-notice-success" role="status">
            <Check size={18} />
            <span>{notice}</span>
            <button type="button" aria-label="Đóng thông báo" onClick={() => setNotice("")}><X size={15} /></button>
          </div>
        )}
        {error && (
          <div className="profile-notice profile-notice-error" role="alert">
            <CircleAlert size={18} /> <span>{error}</span>
          </div>
        )}
      </div>

      <ScrollReveal className="profile-card-reveal" delay={70}>
        <section className="profile-main-card">
          <div className="profile-user-header">
            <div className="profile-avatar-editor">
              <button
                type="button"
                className="profile-avatar-button"
                aria-label="Chọn ảnh đại diện"
                disabled={avatarBusy}
                onClick={() => avatarInputRef.current?.click()}
              >
                <span className="profile-avatar">
                  {avatarUrl ? <img key={avatarUrl} src={avatarUrl} alt={`Ảnh đại diện của ${profile.hoTen}`} /> : avatarName}
                </span>
                <span className="profile-avatar-camera">
                  {avatarBusy ? <LoaderCircle className="profile-spin-icon" size={16} /> : <Camera size={16} />}
                </span>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={(event) => void handleAvatarChange(event)}
              />
            </div>

            <div className="profile-user-text">
              <span className="profile-account-badge"><ShieldCheck size={13} /> Tài khoản khách hàng</span>
              <h2>{profile.hoTen}</h2>
              <p>{profile.email || "Chưa có email"}</p>
              {avatarUrl && (
                <div className="profile-avatar-actions">
                  <button type="button" className="remove" onClick={handleRemoveAvatar} disabled={avatarBusy}>
                    <Trash2 size={14} /> Gỡ ảnh
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </ScrollReveal>

      <div className="profile-content-grid">
        <ScrollReveal className="profile-section-reveal" delay={90}>
          <section className="profile-panel profile-account-panel">
            <div className="profile-panel-heading">
              <span><ShieldCheck size={19} /></span>
              <div><h2>Thông tin tài khoản</h2><p>Thông tin dùng để liên hệ với bạn</p></div>
            </div>

            <div className="profile-info-grid">
              <div className="profile-info-box">
                <span className="profile-info-icon"><Mail size={18} /></span>
                <div><span className="profile-info-label">Email</span><strong>{profile.email || "Chưa có"}</strong></div>
              </div>
              <div className="profile-info-box">
                <span className="profile-info-icon"><Phone size={18} /></span>
                <div><span className="profile-info-label">Số điện thoại</span><strong>{profile.soDienThoai || "Chưa có"}</strong></div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal className="profile-section-reveal profile-form-reveal" delay={160}>
          <section className="profile-panel profile-personal-panel">
            <div className="profile-panel-heading">
              <span><UserRound size={19} /></span>
              <div><h2>Thông tin cá nhân</h2><p>Bạn có thể chỉnh sửa các thông tin bên dưới</p></div>
            </div>

            <div className="profile-form-grid">
              <label className="profile-form-group full">
                <span><UserRound size={14} /> Họ và tên</span>
                <input type="text" value={hoTen} onChange={(event) => setHoTen(event.target.value)} placeholder="Nhập họ và tên" />
              </label>
              <label className="profile-form-group">
                <span><CalendarDays size={14} /> Ngày sinh</span>
                <input type="date" value={ngaySinh} onChange={(event) => setNgaySinh(event.target.value)} />
              </label>
              <label className="profile-form-group">
                <span><VenusAndMars size={14} /> Giới tính</span>
                <select value={gioiTinh} onChange={(event) => setGioiTinh(event.target.value)}>
                  <option value="">Chưa chọn</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </label>
            </div>

            <div className="profile-save-area">
              <button className="profile-save-button" type="button" onClick={() => void handleUpdate()} disabled={saving}>
                {saving ? <LoaderCircle className="profile-spin-icon" size={17} /> : <Check size={17} />}
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </section>
        </ScrollReveal>
      </div>

      <ScrollReveal className="profile-tools-reveal" delay={130}>
        <section className="profile-tools-section" aria-labelledby="profile-tools-title">
          <div className="profile-tools-heading">
            <div>
              <span>Tiện ích của bạn</span>
              <h2 id="profile-tools-title">Ví và ưu đãi</h2>
            </div>
            <p>Tất cả quyền lợi được tập trung tại một nơi.</p>
          </div>

          <Link to="/vi" className="profile-wallet-history-link">
            <WalletCards size={16} /> Xem toàn bộ lịch sử giao dịch ví
            <ChevronRight size={16} />
          </Link>

          <div className="profile-tools-grid">
            {moLichSuHoan ? (
              <button
                type="button"
                className="profile-tool-card profile-wallet-card profile-refund-history-card"
                onClick={() => setMoLichSuHoan(false)}
              >
                <div className="profile-tool-card-top">
                  <span className="profile-tool-icon"><WalletCards size={22} /></span>
                  <span className="profile-tool-label">Lịch sử hoàn tiền</span>
                </div>
                <LichSuHoanList items={lichSuHoan} />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="profile-tool-card profile-wallet-card"
                  onClick={() => setMoLichSuHoan(true)}
                >
                  <div className="profile-tool-card-top">
                    <span className="profile-tool-icon"><WalletCards size={22} /></span>
                    <span className="profile-tool-label">Ví hoàn tiền</span>
                  </div>
                  <div className="profile-wallet-balance">
                    <strong>{(profile?.soDuVi ?? 0).toLocaleString("vi-VN")}</strong>
                    <span>đ</span>
                  </div>
                  <p>
                    Tiền từ đơn thanh toán online bị khách hàng hoặc quán hủy sẽ
                    được hoàn vào ví này.
                  </p>
                  <LichSuHoanList items={lichSuHoan.slice(0, 1)} />
                </button>

                <Link to="/kho-voucher" className="profile-tool-card profile-voucher-card">
                  <div className="profile-tool-card-top">
                    <span className="profile-tool-icon"><TicketPercent size={22} /></span>
                    <span className="profile-tool-coming">Mở kho</span>
                  </div>
                  <h3>Kho voucher</h3>
                  <p>Lưu trữ và quản lý các mã giảm giá dành riêng cho bạn.</p>
                  <span className="profile-voucher-preview">
                    <TicketPercent size={15} /> Voucher của bạn sẽ xuất hiện tại đây
                  </span>
                </Link>
              </>
            )}
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal className="profile-security-reveal" delay={150}>
        <section className={`profile-security-panel${showPasswordForm ? " is-open" : ""}`}>
          <div className="profile-security-summary">
            <span className="profile-security-icon"><KeyRound size={20} /></span>
            <div>
              <h2>Bảo mật tài khoản</h2>
              <p>Thay đổi mật khẩu định kỳ để bảo vệ tài khoản của bạn.</p>
            </div>
            <button
              type="button"
              className="profile-password-open"
              onClick={() => {
                if (showPasswordForm) closePasswordForm();
                else setShowPasswordForm(true);
              }}
              disabled={passwordBusy}
            >
              {showPasswordForm ? "Đóng" : "Đổi mật khẩu"}
            </button>
          </div>

          {showPasswordForm && (
            <div className="profile-password-form">
              <label>
                <span>Mật khẩu hiện tại</span>
                <div>
                  <input
                    type={showPasswords ? "text" : "password"}
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder="Nhập mật khẩu hiện tại"
                  />
                  <button type="button" aria-label={showPasswords ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPasswords((current) => !current)}>
                    {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <label>
                <span>Mật khẩu mới</span>
                <input
                  type={showPasswords ? "text" : "password"}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                />
              </label>

              <label>
                <span>Xác nhận mật khẩu mới</span>
                <input
                  type={showPasswords ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                />
              </label>

              {passwordError && (
                <p className="profile-password-error" role="alert">
                  <CircleAlert size={15} /> {passwordError}
                </p>
              )}

              <div className="profile-password-actions">
                <button type="button" onClick={closePasswordForm} disabled={passwordBusy}>Hủy</button>
                <button type="button" className="confirm" onClick={() => void handleChangePassword()} disabled={passwordBusy}>
                  {passwordBusy ? <LoaderCircle className="profile-spin-icon" size={16} /> : <KeyRound size={16} />}
                  {passwordBusy ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                </button>
              </div>
            </div>
          )}
        </section>
      </ScrollReveal>

      <ScrollReveal className="profile-address-reveal" delay={120}>
        <Link to="/dia-chi" className="profile-address-link">
          <span className="profile-address-icon"><MapPin size={21} /></span>
          <span className="profile-address-text">
            <strong>Địa chỉ giao hàng</strong>
            <span>Quản lý các địa chỉ nhận hàng của bạn</span>
          </span>
          <span className="profile-address-arrow"><ChevronRight size={19} /></span>
        </Link>
      </ScrollReveal>
    </main>
  );
}

export default Profile;
