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

const EMPTY_FORM: AddressRequest = {
  tenNguoiNhan: "",
  soDienThoaiNhan: "",
  diaChiCuThe: "",
  ghiChu: "",
  macDinh: false,
};

interface AddressFormEditorProps {
  initialData: AddressRequest;
  isEditing: boolean;
  saving: boolean;
  onSubmit: (formData: AddressRequest) => Promise<void>;
  onClose: () => void;
}

/**
 * Form nhập liệu địa chỉ tách biệt để cách ly state nhập gõ phím.
 * Gõ từng ký tự KHÔNG gây re-render toàn bộ trang và danh sách card.
 */
function AddressFormEditor({
  initialData,
  isEditing,
  saving,
  onSubmit,
  onClose,
}: AddressFormEditorProps) {
  const [form, setForm] = useState<AddressRequest>(initialData);
  const [localError, setLocalError] = useState("");
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Focus ngay vào ô tên người nhận mà không giật cuộn trang
    nameInputRef.current?.focus({ preventScroll: true });
  }, []);

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
    if (localError) setLocalError("");
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.tenNguoiNhan.trim()) {
      setLocalError("Vui lòng nhập tên người nhận.");
      nameInputRef.current?.focus();
      return;
    }
    if (!form.soDienThoaiNhan.trim()) {
      setLocalError("Vui lòng nhập số điện thoại.");
      return;
    }
    if (!/^[0-9]{10,11}$/.test(form.soDienThoaiNhan.trim())) {
      setLocalError("Số điện thoại phải có 10-11 chữ số.");
      return;
    }
    if (!form.diaChiCuThe.trim()) {
      setLocalError("Vui lòng nhập địa chỉ cụ thể.");
      return;
    }

    void onSubmit({
      ...form,
      tenNguoiNhan: form.tenNguoiNhan.trim(),
      soDienThoaiNhan: form.soDienThoaiNhan.trim(),
      diaChiCuThe: form.diaChiCuThe.trim(),
      ghiChu: form.ghiChu?.trim() || null,
    });
  };

  return (
    <form className="address-form" onSubmit={handleSubmit} aria-labelledby="address-form-title">
      <div className="address-form-heading">
        <span><Home size={21} /></span>
        <div>
          <h2 id="address-form-title">
            {isEditing ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ mới"}
          </h2>
          <p>Điền thông tin để tài xế có thể giao món chính xác.</p>
        </div>
        <button type="button" aria-label="Đóng biểu mẫu" onClick={onClose} disabled={saving}>
          <X size={19} />
        </button>
      </div>

      {localError && (
        <div className="address-notice address-notice-error" role="alert" style={{ marginBottom: "16px" }}>
          <CircleAlert size={18} />
          <span>{localError}</span>
        </div>
      )}

      <div className="address-form-grid">
        <label className="address-field">
          <span><UserRound size={15} /> Tên người nhận</span>
          <input
            ref={nameInputRef}
            type="text"
            name="tenNguoiNhan"
            autoComplete="name"
            placeholder="Ví dụ: Nguyễn Văn An"
            value={form.tenNguoiNhan}
            onChange={handleChange}
          />
        </label>
        <label className="address-field">
          <span><Phone size={15} /> Số điện thoại</span>
          <input
            type="tel"
            inputMode="numeric"
            name="soDienThoaiNhan"
            autoComplete="tel"
            placeholder="Ví dụ: 0901234567"
            value={form.soDienThoaiNhan}
            onChange={handleChange}
          />
        </label>
        <label className="address-field address-field-full">
          <span><MapPin size={15} /> Địa chỉ cụ thể</span>
          <input
            type="text"
            name="diaChiCuThe"
            autoComplete="street-address"
            placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
            value={form.diaChiCuThe}
            onChange={handleChange}
          />
        </label>
        <label className="address-field address-field-full">
          <span><MessageSquareText size={15} /> Ghi chú cho tài xế</span>
          <textarea
            name="ghiChu"
            rows={3}
            placeholder="Ví dụ: Gọi trước khi giao, giao tại sảnh..."
            value={form.ghiChu || ""}
            onChange={handleChange}
          />
        </label>
      </div>

      <label className="address-default-toggle">
        <input
          type="checkbox"
          name="macDinh"
          checked={form.macDinh}
          onChange={handleChange}
        />
        <span className="address-toggle-box"><Check size={13} /></span>
        <span>
          <strong>Đặt làm địa chỉ mặc định</strong>
          <small>Địa chỉ này sẽ được ưu tiên khi bạn thanh toán.</small>
        </span>
      </label>

      <div className="address-form-actions">
        <button type="button" className="address-secondary-button" onClick={onClose} disabled={saving}>
          Hủy
        </button>
        <button type="submit" className="address-primary-button" disabled={saving}>
          {saving ? <LoaderCircle className="address-spin" size={17} /> : <Check size={17} />}
          {saving ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Lưu địa chỉ"}
        </button>
      </div>
    </form>
  );
}

function AddressPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const formSectionRef = useRef<HTMLDivElement | null>(null);
  const formScrollFrameRef = useRef<number | null>(null);

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
    const timer = window.setTimeout(() => {
      void loadAddresses(true);
    }, 0);

    const handleAddressSync = () => {
      void loadAddresses(false);
    };
    window.addEventListener("address-updated", handleAddressSync);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("address-updated", handleAddressSync);
    };
  }, [loadAddresses]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => () => {
    if (formScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(formScrollFrameRef.current);
    }
  }, []);

  const revealFormIfNeeded = useCallback(() => {
    if (formScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(formScrollFrameRef.current);
    }

    formScrollFrameRef.current = window.requestAnimationFrame(() => {
      formScrollFrameRef.current = null;
      const formSection = formSectionRef.current;
      if (!formSection) return;

      const rect = formSection.getBoundingClientRect();
      if (rect.top < 70 || rect.bottom > window.innerHeight) {
        formSection.scrollIntoView({ behavior: "auto", block: "nearest" });
      }
    });
  }, []);

  const openCreateForm = () => {
    setEditingAddress(null);
    setError("");
    setShowForm(true);
    revealFormIfNeeded();
  };

  const handleEdit = useCallback((address: Address) => {
    setEditingAddress(address);
    setError("");
    setShowForm(true);
    revealFormIfNeeded();
  }, [revealFormIfNeeded]);

  const closeForm = useCallback(() => {
    if (saving) return;
    setShowForm(false);
    setEditingAddress(null);
    setError("");
  }, [saving]);

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

  const handleSaveAddress = async (formData: AddressRequest) => {
    setError("");
    try {
      setSaving(true);
      const isEditing = editingAddress !== null;

      if (isEditing) {
        await updateAddress(editingAddress.maDiaChi, formData);
      } else {
        await createAddress(formData);
      }

      setShowForm(false);
      setEditingAddress(null);
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
          : editingAddress !== null
            ? "Không thể cập nhật địa chỉ."
            : "Không thể thêm địa chỉ.",
      );
    } finally {
      setSaving(false);
    }
  };

  const initialFormData = useMemo<AddressRequest>(() => {
    if (!editingAddress) return EMPTY_FORM;
    return {
      tenNguoiNhan: editingAddress.tenNguoiNhan,
      soDienThoaiNhan: editingAddress.soDienThoaiNhan,
      diaChiCuThe: editingAddress.diaChiCuThe,
      ghiChu: editingAddress.ghiChu || "",
      macDinh: editingAddress.macDinh,
    };
  }, [editingAddress]);

  // Card danh sách địa chỉ hiển thị tức thì, không bị ScrollReveal và delay animation trì hoãn
  const addressCards = useMemo(() => addresses.map((address) => (
    <article
      key={address.maDiaChi}
      className={`address-card${address.macDinh ? " is-default" : ""}`}
    >
      <div className="address-card-accent" aria-hidden="true" />
      <div className="address-card-main">
        <span className="address-card-marker"><MapPin size={22} /></span>
        <div className="address-card-content">
          <div className="address-card-header">
            <div>
              <strong>{address.tenNguoiNhan}</strong>
              <span className="address-phone"><Phone size={14} /> {address.soDienThoaiNhan}</span>
            </div>
            {address.macDinh && (
              <span className="default-badge">
                <Star size={13} fill="currentColor" /> Mặc định
              </span>
            )}
          </div>
          <p className="address-text">{address.diaChiCuThe}</p>
          {address.ghiChu && (
            <p className="address-note"><MessageSquareText size={14} /> {address.ghiChu}</p>
          )}
        </div>
      </div>

      <footer className="address-actions">
        {!address.macDinh && (
          <button
            type="button"
            className="address-action-default"
            onClick={() => void handleSetDefault(address.maDiaChi)}
            disabled={busyAction !== null}
          >
            {busyAction === `default-${address.maDiaChi}` ? (
              <LoaderCircle className="address-spin" size={15} />
            ) : (
              <Star size={15} />
            )}
            Đặt mặc định
          </button>
        )}
        <span className="address-actions-spacer" />
        <button
          type="button"
          onClick={() => handleEdit(address)}
          disabled={busyAction !== null}
        >
          <Pencil size={15} /> Sửa
        </button>
        <button
          type="button"
          className="address-action-delete"
          onClick={() => void handleDelete(address.maDiaChi)}
          disabled={busyAction !== null}
        >
          {busyAction === `delete-${address.maDiaChi}` ? (
            <LoaderCircle className="address-spin" size={15} />
          ) : (
            <Trash2 size={15} />
          )}
          Xóa
        </button>
      </footer>
    </article>
  )), [addresses, busyAction, handleDelete, handleEdit, handleSetDefault]);

  return (
    <main className="address-page address-page-polished">
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
          <div ref={formSectionRef}>
            <AddressFormEditor
              key={editingAddress ? `edit-${editingAddress.maDiaChi}` : "create-new"}
              initialData={initialFormData}
              isEditing={editingAddress !== null}
              saving={saving}
              onSubmit={handleSaveAddress}
              onClose={closeForm}
            />
          </div>
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
