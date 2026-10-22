import { useCallback, useEffect, useState, type FormEvent } from "react";
import { FolderOpen, Hash, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import {
  createDanhMuc,
  deleteDanhMuc,
  getDanhMucs,
  updateDanhMuc,
  type DanhMuc,
} from "../services/categoryService";
import { getCurrentUser } from "../services/userService";
import ScrollReveal from "../components/ScrollReveal";

interface CurrentUser {
  nhaHang?: { maNhaHang: number };
}

interface CategoryForm {
  tenDanhMuc: string;
  thuTuHienThi: number;
}

const EMPTY_FORM: CategoryForm = {
  tenDanhMuc: "",
  thuTuHienThi: 0,
};

async function getRestaurantId() {
  const user = (await getCurrentUser()) as CurrentUser;
  const maNhaHang = user.nhaHang?.maNhaHang;

  if (!maNhaHang) {
    throw new Error("Không tìm thấy thông tin nhà hàng.");
  }

  return maNhaHang;
}

function RestaurantCategory() {
  const [danhMucs, setDanhMucs] = useState<DanhMuc[]>([]);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadDanhMucs = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError("");

      const maNhaHang = await getRestaurantId();
      const data = await getDanhMucs(maNhaHang);

      setDanhMucs(
        [...data].sort((a, b) => (a.thuTuHienThi ?? 0) - (b.thuTuHienThi ?? 0)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh mục.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      void loadDanhMucs();
    }, 0);

    return () => window.clearTimeout(initialLoadTimer);
  }, [loadDanhMucs]);

  const showMessage = (message: string) => {
    setSuccess(message);
    window.setTimeout(() => setSuccess(""), 3000);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setEditorOpen(true);
    setError("");
    setSuccess("");
  };

  const openEdit = (item: DanhMuc) => {
    setEditingId(item.maDanhMuc);
    setForm({
      tenDanhMuc: item.tenDanhMuc,
      thuTuHienThi: item.thuTuHienThi ?? 0,
    });
    setEditorOpen(true);
    setError("");
    setSuccess("");
  };

  const closeEditor = () => {
    if (saving) return;
    setEditorOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.tenDanhMuc.trim()) {
      setError("Vui lòng nhập tên danh mục.");
      return;
    }

    if (form.thuTuHienThi < 0) {
      setError("Thứ tự hiển thị không được nhỏ hơn 0.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (editingId === null) {
        await createDanhMuc(form.tenDanhMuc.trim(), form.thuTuHienThi);
        showMessage("Đã thêm danh mục mới.");
      } else {
        await updateDanhMuc(
          editingId,
          form.tenDanhMuc.trim(),
          form.thuTuHienThi,
        );
        showMessage("Đã cập nhật danh mục.");
      }

      setEditorOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadDanhMucs(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu danh mục.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: DanhMuc) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa danh mục "${item.tenDanhMuc}" không?`,
    );

    if (!confirmed) return;

    try {
      setDeletingId(item.maDanhMuc);
      setError("");
      setSuccess("");

      await deleteDanhMuc(item.maDanhMuc);

      if (editingId === item.maDanhMuc) {
        setEditorOpen(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
      }

      showMessage("Đã xóa danh mục.");
      await loadDanhMucs(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa danh mục.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="quan-page-loading">Đang tải danh mục...</div>;
  }

  return (
    <div className="merchant-category-page">
      <ScrollReveal className="merchant-category-header-reveal" delay={40}>
        <header className="merchant-category-header">
        <div>
          <span className="merchant-category-eyebrow">QUẢN LÝ THỰC ĐƠN</span>
          <h1>Danh mục món ăn</h1>
          <p>Sắp xếp các nhóm món được hiển thị trong thực đơn.</p>
        </div>

        <button
          type="button"
          className="merchant-category-add"
          onClick={openCreate}
        >
          <Plus size={16} />
          Thêm danh mục
        </button>
        </header>
      </ScrollReveal>

      {error && !editorOpen && (
        <div className="merchant-category-notice error">{error}</div>
      )}

      {success && (
        <div className="merchant-category-notice success">✓ {success}</div>
      )}

      <section className="merchant-category-panel">
        <ScrollReveal className="merchant-category-panel-header-reveal" delay={80}>
          <div className="merchant-category-panel-header">
          <div>
            <h2>Danh sách danh mục</h2>
            <p>Danh mục có số thứ tự nhỏ hơn sẽ hiển thị trước.</p>
          </div>

          <span className="merchant-category-count">
            {danhMucs.length} danh mục
          </span>
          </div>
        </ScrollReveal>

        {danhMucs.length === 0 ? (
          <ScrollReveal className="merchant-category-empty-reveal" delay={110}>
            <div className="merchant-category-empty">
            <span>
              <FolderOpen size={27} />
            </span>
            <h3>Chưa có danh mục</h3>
            <p>Tạo danh mục đầu tiên để bắt đầu xây dựng thực đơn.</p>
            <button type="button" onClick={openCreate}>
              <Plus size={15} />
              Thêm danh mục
            </button>
            </div>
          </ScrollReveal>
        ) : (
          <div className="merchant-category-list">
            {danhMucs.map((item, index) => (
              <ScrollReveal
                key={item.maDanhMuc}
                className="merchant-category-row-reveal"
                delay={Math.min(index * 45, 240)}
              >
                <article className="merchant-category-row">
                <div className="merchant-category-position">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="merchant-category-icon">
                  <FolderOpen size={19} />
                </div>

                <div className="merchant-category-info">
                  <strong>{item.tenDanhMuc}</strong>
                  <span>
                    <Hash size={12} />
                    Thứ tự hiển thị: {item.thuTuHienThi ?? 0}
                  </span>
                </div>

                <div className="merchant-category-actions">
                  <button
                    type="button"
                    className="edit"
                    title="Sửa danh mục"
                    onClick={() => openEdit(item)}
                    disabled={deletingId !== null}
                  >
                    <Pencil size={15} />
                    Sửa
                  </button>

                  <button
                    type="button"
                    className="delete"
                    title="Xóa danh mục"
                    onClick={() => void handleDelete(item)}
                    disabled={deletingId !== null}
                  >
                    <Trash2 size={15} />
                    {deletingId === item.maDanhMuc ? "Đang xóa..." : "Xóa"}
                  </button>
                </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
        )}
      </section>

      {editorOpen && (
        <div className="merchant-category-overlay" onMouseDown={closeEditor}>
          <form
            className="merchant-category-dialog"
            onSubmit={handleSubmit}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="merchant-category-dialog-header">
              <div>
                <span>
                  {editingId === null ? "DANH MỤC MỚI" : "CHỈNH SỬA DANH MỤC"}
                </span>
                <h2>
                  {editingId === null ? "Thêm danh mục" : "Cập nhật danh mục"}
                </h2>
                <p>Thiết lập tên và vị trí hiển thị trong thực đơn.</p>
              </div>

              <button
                type="button"
                aria-label="Đóng"
                onClick={closeEditor}
                disabled={saving}
              >
                <X size={18} />
              </button>
            </header>

            <div className="merchant-category-dialog-body">
              <label className="merchant-category-field">
                <span>Tên danh mục</span>
                <input
                  autoFocus
                  type="text"
                  value={form.tenDanhMuc}
                  placeholder="Ví dụ: Trà sữa"
                  maxLength={100}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      tenDanhMuc: event.target.value,
                    }))
                  }
                />
                <small>Tên này sẽ hiển thị với khách hàng.</small>
              </label>

              <label className="merchant-category-field">
                <span>Thứ tự hiển thị</span>
                <input
                  type="number"
                  min={0}
                  value={form.thuTuHienThi}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      thuTuHienThi: Number(event.target.value),
                    }))
                  }
                />
                <small>Số nhỏ hơn sẽ được đặt ở phía trước.</small>
              </label>

              {error && <p className="merchant-category-form-error">{error}</p>}
            </div>

            <footer className="merchant-category-dialog-footer">
              <button
                type="button"
                className="cancel"
                onClick={closeEditor}
                disabled={saving}
              >
                Hủy
              </button>

              <button type="submit" className="save" disabled={saving}>
                <Save size={15} />
                {saving
                  ? "Đang lưu..."
                  : editingId === null
                    ? "Thêm danh mục"
                    : "Lưu thay đổi"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}

export default RestaurantCategory;
