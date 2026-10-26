import MediaImage from "../components/MediaImage";
import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  Building2,
  CheckCircle2,
  Clock3,
  ImageIcon,
  MapPin,
  RotateCcw,
  Save,
  Star,
  Truck,
} from "lucide-react";
import {
  getRestaurantProfile,
  updateRestaurantProfile,
  uploadRestaurantCover,
  type Restaurant,
} from "../services/restaurantService";
import ScrollReveal from "../components/ScrollReveal";

interface RestaurantForm {
  tenNhaHang: string;
  moTa: string;
  diaChiQuan: string;
  anhBia: string;
  gioMoCua: string;
  gioDongCua: string;
  phiShipMacDinh: number;
}

const EMPTY_FORM: RestaurantForm = {
  tenNhaHang: "",
  moTa: "",
  diaChiQuan: "",
  anhBia: "",
  gioMoCua: "",
  gioDongCua: "",
  phiShipMacDinh: 0,
};

const APPROVAL_LABEL: Record<string, string> = {
  ChoDuyet: "Chờ xét duyệt",
  DaDuyet: "Đã được duyệt",
  TuChoi: "Đã bị từ chối",
};

function toForm(data: Restaurant): RestaurantForm {
  return {
    tenNhaHang: data.tenNhaHang || "",
    moTa: data.moTa || "",
    diaChiQuan: data.diaChiQuan || "",
    anhBia: data.anhBia || "",
    gioMoCua: data.gioMoCua?.slice(0, 5) || "",
    gioDongCua: data.gioDongCua?.slice(0, 5) || "",
    phiShipMacDinh: Number(data.phiShipMacDinh || 0),
  };
}

function QuanRestaurantInfo() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [form, setForm] = useState<RestaurantForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadRestaurant = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError("");

      const data = await getRestaurantProfile();
      setRestaurant(data);
      setForm(toForm(data));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể lấy thông tin nhà hàng.",
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      void loadRestaurant();
    }, 0);

    return () => window.clearTimeout(initialLoadTimer);
  }, [loadRestaurant]);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: name === "phiShipMacDinh" ? Number(value) : value,
    }));

    setMessage("");
  };

  const handleReset = () => {
    if (!restaurant || saving || uploading) return;
    setForm(toForm(restaurant));
    setMessage("");
    setError("");
  };

  const handleCoverUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || uploading || saving) return;
    setMessage("");
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024) {
      setError("Chọn ảnh JPEG, PNG hoặc WebP không quá 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const result = await uploadRestaurantCover(file);
      setForm(current => ({ ...current, anhBia: result.anhBia }));
      setMessage("Ảnh đã tải lên. Bấm Lưu thay đổi để áp dụng.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải ảnh bìa.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (uploading || saving) return;

    if (!form.tenNhaHang.trim()) {
      setError("Vui lòng nhập tên nhà hàng.");
      return;
    }

    if (!form.diaChiQuan.trim()) {
      setError("Vui lòng nhập địa chỉ nhà hàng.");
      return;
    }

    if (form.phiShipMacDinh < 0) {
      setError("Phí giao hàng không được nhỏ hơn 0.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setError("");

      await updateRestaurantProfile({
        tenNhaHang: form.tenNhaHang.trim(),
        moTa: form.moTa.trim() || null,
        diaChiQuan: form.diaChiQuan.trim(),
        anhBia: form.anhBia.trim() || null,
        gioMoCua: form.gioMoCua || null,
        gioDongCua: form.gioDongCua || null,
        phiShipMacDinh: form.phiShipMacDinh,
      });

      const updated = await getRestaurantProfile();
      setRestaurant(updated);
      setForm(toForm(updated));
      setMessage("Thông tin nhà hàng đã được cập nhật.");

      window.setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Cập nhật thông tin thất bại.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="quan-page-loading">Đang tải thông tin nhà hàng...</div>
    );
  }

  if (!restaurant) {
    return (
      <div className="quan-empty">
        {error || "Không tìm thấy thông tin nhà hàng."}
      </div>
    );
  }

  const approvalCode = restaurant.trangThaiDuyet || "";
  const approvalText =
    APPROVAL_LABEL[approvalCode] || approvalCode || "Chưa xác định";
  const isApproved = approvalCode === "DaDuyet";
  const isOpen = restaurant.dangMoCua;

  return (
    <div className="merchant-info-page">
      <ScrollReveal className="merchant-info-header-reveal" delay={40}>
        <header className="merchant-info-header">
        <div>
          <span className="merchant-info-eyebrow">HỒ SƠ NHÀ HÀNG</span>
          <h1>Thông tin quán</h1>
          <p>Quản lý thông tin được hiển thị với khách hàng.</p>
        </div>

        <div
          className={`merchant-info-approval ${
            isApproved ? "is-approved" : ""
          }`}
        >
          <CheckCircle2 size={16} />
          {approvalText}
        </div>
        </header>
      </ScrollReveal>

      {message && (
        <div className="merchant-info-notice success">
          <CheckCircle2 size={17} />
          {message}
        </div>
      )}

      {error && <div className="merchant-info-notice error">{error}</div>}

      <form className="merchant-info-layout" onSubmit={handleSubmit}>
        <div className="merchant-info-editor">
          <ScrollReveal className="merchant-info-section-reveal" delay={70}>
            <section className="merchant-info-section">
            <div className="merchant-info-section-title">
              <Building2 size={18} />
              <div>
                <h2>Thông tin cơ bản</h2>
                <p>Tên, địa chỉ và phần giới thiệu về quán.</p>
              </div>
            </div>

            {restaurant?.khoaThongTinHopDong && (
            <p className="merchant-info-contract-lock" role="status">
                Tên và địa chỉ nhà hàng đã được ghi trong hợp đồng nên
                không thể chỉnh sửa. Bạn vẫn có thể cập nhật thông tin vận hành.
            </p>
            )}

            <div className="merchant-info-fields">
              <label className="merchant-info-field">
                <span>Tên nhà hàng</span>
                <input
                  type="text"
                  name="tenNhaHang"
                  readOnly={restaurant?.khoaThongTinHopDong === true}
                  value={form.tenNhaHang}
                  onChange={handleChange}
                  placeholder="Nhập tên nhà hàng"
                  maxLength={150}
                  required
                />
              </label>

              <label className="merchant-info-field">
                <span>Địa chỉ nhà hàng</span>
                <div className="merchant-info-input-icon">
                  <MapPin size={16} />
                  <input
                    type="text"
                    name="diaChiQuan"
                    readOnly={restaurant?.khoaThongTinHopDong === true}
                    value={form.diaChiQuan}
                    onChange={handleChange}
                    placeholder="Nhập địa chỉ nhà hàng"
                    maxLength={255}
                    required
                  />
                </div>
              </label>

              <label className="merchant-info-field">
                <span>Mô tả nhà hàng</span>
                <textarea
                  name="moTa"
                  value={form.moTa}
                  onChange={handleChange}
                  placeholder="Giới thiệu ngắn về món ăn và phong cách của quán..."
                  rows={4}
                  maxLength={500}
                />
                <small>{form.moTa.length}/500 ký tự</small>
              </label>

              <label className="merchant-info-field">
                <span>Ảnh bìa nhà hàng</span>
                <div className="merchant-info-input-icon">
                  <ImageIcon size={16} />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleCoverUpload}
                    disabled={uploading || saving}
                  />
                </div>
                <small>{uploading ? "Đang tải ảnh..." : "JPEG, PNG hoặc WebP, tối đa 5 MB. Chọn ảnh ngang để bìa hiển thị đẹp."}</small>
              </label>
            </div>
            </section>
          </ScrollReveal>

          <ScrollReveal className="merchant-info-section-reveal" delay={110}>
            <section className="merchant-info-section">
            <div className="merchant-info-section-title">
              <Clock3 size={18} />
              <div>
                <h2>Vận hành và giao hàng</h2>
                <p>Thiết lập khung giờ tự động và phí giao hàng mặc định.</p>
              </div>
            </div>

            <div className="merchant-info-operation-grid">
              <label className="merchant-info-field">
                <span>Giờ mở cửa</span>
                <input
                  type="time"
                  name="gioMoCua"
                  value={form.gioMoCua}
                  onChange={handleChange}
                />
              </label>

              <label className="merchant-info-field">
                <span>Giờ đóng cửa</span>
                <input
                  type="time"
                  name="gioDongCua"
                  value={form.gioDongCua}
                  onChange={handleChange}
                />
              </label>

              <label className="merchant-info-field">
                <span>Phí giao hàng mặc định</span>
                <div className="merchant-info-price-input">
                  <Truck size={16} />
                  <input
                    type="number"
                    name="phiShipMacDinh"
                    value={form.phiShipMacDinh}
                    onChange={handleChange}
                    min={0}
                    step={1000}
                  />
                  <strong>đ</strong>
                </div>
              </label>
            </div>
            </section>
          </ScrollReveal>

          <ScrollReveal className="merchant-info-actions-reveal" delay={130}>
            <div className="merchant-info-actions">
            <button
              type="button"
              className="merchant-info-reset"
              onClick={handleReset}
              disabled={saving || uploading}
            >
              <RotateCcw size={16} />
              Khôi phục
            </button>

            <button
              type="submit"
              className="merchant-info-save"
              disabled={saving || uploading}
            >
              <Save size={16} />
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
            </div>
          </ScrollReveal>
        </div>

        <aside className="merchant-info-sidebar">
          <ScrollReveal className="merchant-info-preview-reveal" delay={90}>
            <section className="merchant-info-preview">
            <div className="merchant-info-cover">
              <div className="merchant-info-cover-empty">
                <ImageIcon size={27} />
              </div>

              {form.anhBia.trim() && (
                <MediaImage kind="restaurant"
                  key={form.anhBia}
                  src={form.anhBia}
                  alt={form.tenNhaHang || "Ảnh bìa nhà hàng"}
                />
              )}

              <span
                className={`merchant-info-open-badge ${
                  isOpen ? "open" : "closed"
                }`}
              >
                <i />
                {isOpen ? "Đang mở cửa" : "Đang đóng cửa"}
              </span>
            </div>

            <div className="merchant-info-preview-body">
              <span>XEM TRƯỚC TRÊN TRANG KHÁCH HÀNG</span>
              <h2>{form.tenNhaHang.trim() || "Tên nhà hàng"}</h2>

              <p className="merchant-info-preview-description">
                {form.moTa.trim() || "Mô tả nhà hàng sẽ xuất hiện tại đây."}
              </p>

              <div className="merchant-info-preview-line">
                <MapPin size={15} />
                <span>{form.diaChiQuan.trim() || "Chưa cập nhật địa chỉ"}</span>
              </div>

              <div className="merchant-info-preview-meta">
                <span>
                  <Star size={15} />
                  {Number(restaurant.danhGiaTrungBinh || 0).toFixed(1)}
                </span>

                <span>
                  <Clock3 size={15} />
                  {form.gioMoCua || "--:--"} – {form.gioDongCua || "--:--"}
                </span>
              </div>
            </div>
            </section>
          </ScrollReveal>

          <ScrollReveal className="merchant-info-system-reveal" delay={140}>
            <section className="merchant-info-system">
            <h3>Thông tin hệ thống</h3>

            <div>
              <span>Trạng thái duyệt</span>
              <strong>{approvalText}</strong>
            </div>

            <div>
              <span>Hoạt động hiện tại</span>
              <strong className={isOpen ? "open" : "closed"}>
                {restaurant.trangThaiHienThi ||
                  (isOpen ? "Đang mở cửa" : "Đang đóng cửa")}
              </strong>
            </div>

            <div>
              <span>Phí giao hàng</span>
              <strong>
                {Number(form.phiShipMacDinh || 0).toLocaleString("vi-VN")} đ
              </strong>
            </div>
            </section>
          </ScrollReveal>
        </aside>
      </form>
    </div>
  );
}

export default QuanRestaurantInfo;
