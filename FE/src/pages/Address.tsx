import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Home,
  LoaderCircle,
  MapPin,
  MapPinned,
  MessageSquareText,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Star,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import {
  createAddress,
  deleteAddress,
  getAddresses,
  setDefaultAddress,
  updateAddress,
} from "../services/addressService";

import type { Address, AddressRequest } from "../services/addressService";
import ScrollReveal from "../components/ScrollReveal";

const EMPTY_FORM: AddressRequest = {
  tenNguoiNhan: "",
  soDienThoaiNhan: "",
  diaChiCuThe: "",
  ghiChu: "",
  macDinh: false,
};

function AddressPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [form, setForm] = useState<AddressRequest>(EMPTY_FORM);
  const formRef = useRef<HTMLElement | null>(null);
  const formScrollFrame = useRef<number | null>(null);

  const loadAddresses = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      setError("");
      const data = await getAddresses();
      setAddresses(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải danh sách địa chỉ.",
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadAddresses(true), 0);

    return () => window.clearTimeout(timeout);
  }, [loadAddresses]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const cancelFormScroll = useCallback(() => {
    if (formScrollFrame.current !== null) {
      window.cancelAnimationFrame(formScrollFrame.current);
      formScrollFrame.current = null;
    }
  }, []);

  useEffect(() => cancelFormScroll, [cancelFormScroll]);

  const scrollToForm = useCallback(() => {
    cancelFormScroll();
    formScrollFrame.current = window.requestAnimationFrame(() => {
      formScrollFrame.current = null;
      // Wait for React to mount the form, without a long animated page scroll.
      formRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
      // Focus the section without opening the mobile keyboard or scrolling again.
      formRef.current?.focus({ preventScroll: true });
    });
  }, [cancelFormScroll]);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
    scrollToForm();
  };

  const closeForm = () => {
    if (saving) return;
    cancelFormScroll();
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = event.target;
    setForm((current) => ({
      ...current,
      [name]:
        type === "checkbox"
          ? (event.target as HTMLInputElement).checked
          : value,
    }));
  };

  const handleSetDefault = useCallback(async (id: number) => {
    try {
      setBusyAction(`default-${id}`);
      setError("");
      await setDefaultAddress(id);
      await loadAddresses();
      window.dispatchEvent(new Event("address-updated"));
      setNotice("Đã đặt địa chỉ giao hàng mặc định.");
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Không thể đặt địa chỉ mặc định.",
      );
    } finally {
      setBusyAction(null);
    }
  }, [loadAddresses]);

  const handleDelete = useCallback(async (id: number) => {
    if (!window.confirm("Bạn có chắc muốn xóa địa chỉ này không?")) return;

    try {
      setBusyAction(`delete-${id}`);
      setError("");
      await deleteAddress(id);
      await loadAddresses();
      window.dispatchEvent(new Event("address-updated"));
      setNotice("Địa chỉ đã được xóa thành công.");
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Không thể xóa địa chỉ.",
      );
    } finally {
      setBusyAction(null);
    }
  }, [loadAddresses]);

  const handleEdit = useCallback((address: Address) => {
    setEditingId(address.maDiaChi);
    setForm({
      tenNguoiNhan: address.tenNguoiNhan,
      soDienThoaiNhan: address.soDienThoaiNhan,
      diaChiCuThe: address.diaChiCuThe,
      ghiChu: address.ghiChu || "",
      macDinh: address.macDinh,
    });
    setShowForm(true);
    setError("");
    scrollToForm();
  }, [scrollToForm]);

  const handleSave = async () => {
    setError("");

    if (!form.tenNguoiNhan.trim()) {
      setError("Vui lòng nhập tên người nhận.");
      return;
    }
    if (!form.soDienThoaiNhan.trim()) {
      setError("Vui lòng nhập số điện thoại.");
      return;
    }
    if (!/^[0-9]{10,11}$/.test(form.soDienThoaiNhan.trim())) {
      setError("Số điện thoại phải có 10-11 chữ số.");
      return;
    }
    if (!form.diaChiCuThe.trim()) {
      setError("Vui lòng nhập địa chỉ cụ thể.");
      return;
    }

    try {
      setSaving(true);
      const request: AddressRequest = {
        ...form,
        tenNguoiNhan: form.tenNguoiNhan.trim(),
        soDienThoaiNhan: form.soDienThoaiNhan.trim(),
        diaChiCuThe: form.diaChiCuThe.trim(),
        ghiChu: form.ghiChu?.trim() || null,
      };
      const isEditing = editingId !== null;

      if (isEditing) await updateAddress(editingId, request);
      else await createAddress(request);

      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadAddresses();
      window.dispatchEvent(new Event("address-updated"));
      setNotice(
        isEditing
          ? "Địa chỉ đã được cập nhật thành công."
          : "Địa chỉ mới đã được thêm thành công.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : editingId !== null
            ? "Không thể cập nhật địa chỉ."
            : "Không thể thêm địa chỉ.",
      );
    } finally {
      setSaving(false);
    }
  };

  // Editing a field must not rerender every saved address and its icons.
  const addressCards = useMemo(() => addresses.map((address, index) => (
    <ScrollReveal
      key={address.maDiaChi}
      className="address-card-reveal"
      delay={(index % 4) * 70}
    >
      <article className={`address-card${address.macDinh ? " is-default" : ""}`}>
        <div className="address-card-accent" aria-hidden="true" />
        <div className="address-card-main">
          <span className="address-card-marker"><MapPin size={22} /></span>
          <div className="address-card-content">
            <div className="address-card-header">
              <div>
                <strong>{address.tenNguoiNhan}</strong>
                <span className="address-phone"><Phone size={14} /> {address.soDienThoaiNhan}</span>
              </div>
              {address.macDinh && <span className="default-badge"><Star size={13} fill="currentColor" /> Mặc định</span>}
            </div>
            <p className="address-text">{address.diaChiCuThe}</p>
            {address.ghiChu && <p className="address-note"><MessageSquareText size={14} /> {address.ghiChu}</p>}
          </div>
        </div>

        <footer className="address-actions">
          {!address.macDinh && (
            <button type="button" className="address-action-default" onClick={() => void handleSetDefault(address.maDiaChi)} disabled={busyAction !== null}>
              {busyAction === `default-${address.maDiaChi}` ? <LoaderCircle className="address-spin" size={15} /> : <Star size={15} />} Đặt mặc định
            </button>
          )}
          <span className="address-actions-spacer" />
          <button type="button" onClick={() => handleEdit(address)} disabled={busyAction !== null}><Pencil size={15} /> Sửa</button>
          <button type="button" className="address-action-delete" onClick={() => void handleDelete(address.maDiaChi)} disabled={busyAction !== null}>
            {busyAction === `delete-${address.maDiaChi}` ? <LoaderCircle className="address-spin" size={15} /> : <Trash2 size={15} />} Xóa
          </button>
        </footer>
      </article>
    </ScrollReveal>
  )), [addresses, busyAction, handleDelete, handleEdit, handleSetDefault]);

  return (
    <main className="address-page address-page-polished">
      <div className="address-page-glow address-page-glow-one" aria-hidden="true" />
      <div className="address-page-glow address-page-glow-two" aria-hidden="true" />

      <div className="address-container">
        <Link to="/ho-so" className="address-top-back">
          <ArrowLeft size={16} /> Hồ sơ của tôi
        </Link>

        <header className="address-hero compact-account-hero">
          <div className="compact-account-title">
            <span className="compact-account-icon">
              <MapPinned size={22} />
            </span>
            <div>
              <span>Địa chỉ của bạn</span>
              <h1>Địa chỉ giao hàng</h1>
              <p>Lưu và quản lý những địa chỉ nhận món quen thuộc của bạn.</p>
            </div>
          </div>

          <div className="compact-account-total">
            <strong>{addresses.length}</strong>
            <span>địa chỉ</span>
          </div>
        </header>

        <div className="address-feedback-stack" aria-live="polite">
          {notice && (
            <div className="address-notice address-notice-success" role="status">
              <CheckCircle2 size={19} />
              <span>{notice}</span>
              <button type="button" aria-label="Đóng thông báo" onClick={() => setNotice("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {error && (
            <div className="address-notice address-notice-error" role="alert">
              <CircleAlert size={19} />
              <span>{error}</span>
              {!showForm && (
                <button type="button" onClick={() => void loadAddresses(true)}>
                  <RotateCcw size={15} /> Thử lại
                </button>
              )}
            </div>
          )}
        </div>

        {showForm && (
          <section ref={formRef} className="address-form" tabIndex={-1} aria-labelledby="address-form-title">
            <div className="address-form-heading">
              <span><Home size={21} /></span>
              <div>
                <h2 id="address-form-title">
                  {editingId !== null ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ mới"}
                </h2>
                <p>Điền thông tin để tài xế có thể giao món chính xác.</p>
              </div>
              <button type="button" aria-label="Đóng biểu mẫu" onClick={closeForm} disabled={saving}>
                <X size={19} />
              </button>
            </div>

            <div className="address-form-grid">
              <label className="address-field">
                <span><UserRound size={15} /> Tên người nhận</span>
                <input type="text" name="tenNguoiNhan" autoComplete="name" placeholder="Ví dụ: Nguyễn Văn An" value={form.tenNguoiNhan} onChange={handleChange} />
              </label>
              <label className="address-field">
                <span><Phone size={15} /> Số điện thoại</span>
                <input type="tel" inputMode="numeric" name="soDienThoaiNhan" autoComplete="tel" placeholder="Ví dụ: 0901234567" value={form.soDienThoaiNhan} onChange={handleChange} />
              </label>
              <label className="address-field address-field-full">
                <span><MapPin size={15} /> Địa chỉ cụ thể</span>
                <input type="text" name="diaChiCuThe" autoComplete="street-address" placeholder="Số nhà, tên đường, phường/xã, quận/huyện..." value={form.diaChiCuThe} onChange={handleChange} />
              </label>
              <label className="address-field address-field-full">
                <span><MessageSquareText size={15} /> Ghi chú cho tài xế</span>
                <textarea name="ghiChu" rows={3} placeholder="Ví dụ: Gọi trước khi giao, giao tại sảnh..." value={form.ghiChu || ""} onChange={handleChange} />
              </label>
            </div>

            <label className="address-default-toggle">
              <input type="checkbox" name="macDinh" checked={form.macDinh} onChange={handleChange} />
              <span className="address-toggle-box"><Check size={13} /></span>
              <span>
                <strong>Đặt làm địa chỉ mặc định</strong>
                <small>Địa chỉ này sẽ được ưu tiên khi bạn thanh toán.</small>
              </span>
            </label>

            <div className="address-form-actions">
              <button type="button" className="address-secondary-button" onClick={closeForm} disabled={saving}>Hủy</button>
              <button type="button" className="address-primary-button" onClick={() => void handleSave()} disabled={saving}>
                {saving ? <LoaderCircle className="address-spin" size={17} /> : <Check size={17} />}
                {saving ? "Đang lưu..." : editingId !== null ? "Lưu thay đổi" : "Lưu địa chỉ"}
              </button>
            </div>
          </section>
        )}

        <section className="address-saved-section" aria-labelledby="saved-address-title">
          <div className="address-section-heading">
            <div>
              <span>Danh sách của bạn</span>
              <h2 id="saved-address-title">Địa chỉ đã lưu</h2>
            </div>
            {!loading && addresses.length > 0 && (
              <div className="address-section-tools">
                <span className="address-section-count">{addresses.length} địa chỉ</span>
                {!showForm && (
                  <button type="button" className="address-list-add-button" onClick={openCreateForm}>
                    <Plus size={16} /> Thêm địa chỉ
                  </button>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <div className="address-skeleton-list" aria-label="Đang tải địa chỉ">
              {[0, 1].map((item) => <div className="address-skeleton" key={item} />)}
            </div>
          ) : addresses.length === 0 ? (
            <div className="empty-address">
              <div className="empty-address-illustration"><MapPin size={34} /><span /></div>
              <h3>Chưa có địa chỉ nào</h3>
              <p>Thêm địa chỉ đầu tiên để việc đặt món lần sau nhanh hơn nhé.</p>
              {!showForm && (
                <button type="button" onClick={openCreateForm}><Plus size={17} /> Thêm địa chỉ đầu tiên</button>
              )}
            </div>
          ) : (
            <div className="address-list">
              {addressCards}
            </div>
          )}
        </section>

        <Link to="/ho-so" className="address-bottom-back">
          <ArrowLeft size={16} /> Quay lại hồ sơ <ChevronRight size={15} />
        </Link>
      </div>
    </main>
  );
}

export default AddressPage;
