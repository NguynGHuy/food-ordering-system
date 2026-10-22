import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Check,
  CircleDollarSign,
  Layers3,
  Pencil,
  Plus,
  Power,
  Save,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import {
  createNhomTopping,
  createTopping,
  deleteNhomTopping,
  deleteTopping,
  getNhomToppings,
  getToppings,
  updateNhomTopping,
  updateTopping,
  updateTrangThaiTopping,
  type NhomTopping,
  type Topping,
} from "../services/toppingService";
import { getCurrentUser } from "../services/userService";
import ScrollReveal from "../components/ScrollReveal";

interface CurrentUser {
  nhaHang?: { maNhaHang: number };
}

interface GroupForm {
  tenNhom: string;
  batBuocChon: boolean;
  chonToiDa: number | null;
}

interface ToppingForm {
  tenTopping: string;
  giaThem: number;
}

const EMPTY_GROUP: GroupForm = {
  tenNhom: "",
  batBuocChon: false,
  chonToiDa: 1,
};

const EMPTY_TOPPING: ToppingForm = {
  tenTopping: "",
  giaThem: 0,
};

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

async function getRestaurantId() {
  const user = (await getCurrentUser()) as CurrentUser;
  const maNhaHang = user.nhaHang?.maNhaHang;

  if (!maNhaHang) {
    throw new Error("Không tìm thấy thông tin nhà hàng.");
  }

  return maNhaHang;
}

function RestaurantTopping() {
  const [groups, setGroups] = useState<NhomTopping[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  const [groupEditorOpen, setGroupEditorOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [groupForm, setGroupForm] = useState<GroupForm>(EMPTY_GROUP);

  const [toppingEditorOpen, setToppingEditorOpen] = useState(false);
  const [editingToppingId, setEditingToppingId] = useState<number | null>(null);
  const [toppingForm, setToppingForm] = useState<ToppingForm>(EMPTY_TOPPING);

  const [loading, setLoading] = useState(true);
  const [loadingToppings, setLoadingToppings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyGroupId, setBusyGroupId] = useState<number | null>(null);
  const [busyToppingId, setBusyToppingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadToppings = useCallback(async (groupId: number, showLoading = true) => {
    try {
      if (showLoading) setLoadingToppings(true);
      const data = await getToppings(groupId);
      setToppings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải topping.");
      setToppings([]);
    } finally {
      if (showLoading) setLoadingToppings(false);
    }
  }, []);

  const loadGroups = useCallback(async (preferredGroupId?: number, showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError("");

      const restaurantId = await getRestaurantId();
      const data = await getNhomToppings(restaurantId);
      const nextGroups = Array.isArray(data) ? data : [];

      setGroups(nextGroups);

      if (nextGroups.length === 0) {
        setSelectedGroupId(null);
        setToppings([]);
        return;
      }

      const preferredExists =
        preferredGroupId !== undefined &&
        nextGroups.some((group) => group.maNhomTopping === preferredGroupId);

      const nextSelected = preferredExists
        ? preferredGroupId!
        : nextGroups[0].maNhomTopping;

      setSelectedGroupId(nextSelected);
      await loadToppings(nextSelected);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể tải nhóm topping.",
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [loadToppings]);

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      void loadGroups();
    }, 0);

    return () => window.clearTimeout(initialLoadTimer);
  }, [loadGroups]);

  const showMessage = (message: string) => {
    setSuccess(message);
    window.setTimeout(() => setSuccess(""), 3000);
  };

  const handleSelectGroup = async (groupId: number) => {
    if (groupId === selectedGroupId) return;

    setSelectedGroupId(groupId);
    setToppingEditorOpen(false);
    setEditingToppingId(null);
    setError("");
    await loadToppings(groupId);
  };

  const openCreateGroup = () => {
    setEditingGroupId(null);
    setGroupForm(EMPTY_GROUP);
    setGroupEditorOpen(true);
    setError("");
    setSuccess("");
  };

  const openEditGroup = (group: NhomTopping) => {
    setEditingGroupId(group.maNhomTopping);
    setGroupForm({
      tenNhom: group.tenNhom,
      batBuocChon: group.batBuocChon,
      chonToiDa: group.chonToiDa,
    });
    setGroupEditorOpen(true);
    setError("");
    setSuccess("");
  };

  const closeGroupEditor = () => {
    if (saving) return;
    setGroupEditorOpen(false);
    setEditingGroupId(null);
    setGroupForm(EMPTY_GROUP);
    setError("");
  };

  const handleGroupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!groupForm.tenNhom.trim()) {
      setError("Vui lòng nhập tên nhóm topping.");
      return;
    }

    if (groupForm.chonToiDa !== null && groupForm.chonToiDa <= 0) {
      setError("Số lựa chọn tối đa phải lớn hơn 0.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        tenNhom: groupForm.tenNhom.trim(),
        batBuocChon: groupForm.batBuocChon,
        chonToiDa: groupForm.chonToiDa,
      };

      if (editingGroupId === null) {
        await createNhomTopping(payload);
        showMessage("Đã thêm nhóm topping.");
        await loadGroups(selectedGroupId ?? undefined, false);
      } else {
        const updatedId = editingGroupId;
        await updateNhomTopping(updatedId, payload);
        showMessage("Đã cập nhật nhóm topping.");
        await loadGroups(updatedId, false);
      }

      setGroupEditorOpen(false);
      setEditingGroupId(null);
      setGroupForm(EMPTY_GROUP);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể lưu nhóm topping.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (group: NhomTopping) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa nhóm "${group.tenNhom}" không?`,
    );

    if (!confirmed) return;

    try {
      setBusyGroupId(group.maNhomTopping);
      setError("");
      setSuccess("");

      await deleteNhomTopping(group.maNhomTopping);

      if (editingGroupId === group.maNhomTopping) {
        setGroupEditorOpen(false);
        setEditingGroupId(null);
      }

      showMessage("Đã xóa nhóm topping.");
      await loadGroups(selectedGroupId ?? undefined, false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể xóa nhóm topping.",
      );
    } finally {
      setBusyGroupId(null);
    }
  };

  const openCreateTopping = () => {
    if (selectedGroupId === null) return;

    setEditingToppingId(null);
    setToppingForm(EMPTY_TOPPING);
    setToppingEditorOpen(true);
    setError("");
    setSuccess("");
  };

  const openEditTopping = (item: Topping) => {
    setEditingToppingId(item.maTopping);
    setToppingForm({
      tenTopping: item.tenTopping,
      giaThem: Number(item.giaThem),
    });
    setToppingEditorOpen(true);
    setError("");
    setSuccess("");
  };

  const closeToppingEditor = () => {
    if (saving) return;
    setToppingEditorOpen(false);
    setEditingToppingId(null);
    setToppingForm(EMPTY_TOPPING);
    setError("");
  };

  const handleToppingSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (selectedGroupId === null) {
      setError("Vui lòng chọn nhóm topping.");
      return;
    }

    if (!toppingForm.tenTopping.trim()) {
      setError("Vui lòng nhập tên topping.");
      return;
    }

    if (toppingForm.giaThem < 0) {
      setError("Giá topping không được nhỏ hơn 0.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (editingToppingId === null) {
        await createTopping({
          maNhomTopping: selectedGroupId,
          tenTopping: toppingForm.tenTopping.trim(),
          giaThem: toppingForm.giaThem,
        });
        showMessage("Đã thêm topping.");
      } else {
        await updateTopping(editingToppingId, {
          tenTopping: toppingForm.tenTopping.trim(),
          giaThem: toppingForm.giaThem,
        });
        showMessage("Đã cập nhật topping.");
      }

      setToppingEditorOpen(false);
      setEditingToppingId(null);
      setToppingForm(EMPTY_TOPPING);
      await loadToppings(selectedGroupId, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu topping.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTopping = async (item: Topping) => {
    if (selectedGroupId === null) return;

    try {
      setBusyToppingId(item.maTopping);
      setError("");
      setSuccess("");

      await updateTrangThaiTopping(item.maTopping, !item.trangThai);

      showMessage(item.trangThai ? "Đã tạm ngưng topping." : "Đã bật topping.");

      await loadToppings(selectedGroupId, false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể thay đổi trạng thái topping.",
      );
    } finally {
      setBusyToppingId(null);
    }
  };

  const handleDeleteTopping = async (item: Topping) => {
    if (selectedGroupId === null) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa topping "${item.tenTopping}" không?`,
    );

    if (!confirmed) return;

    try {
      setBusyToppingId(item.maTopping);
      setError("");
      setSuccess("");

      await deleteTopping(item.maTopping);

      if (editingToppingId === item.maTopping) {
        setToppingEditorOpen(false);
        setEditingToppingId(null);
      }

      showMessage("Đã xóa topping.");
      await loadToppings(selectedGroupId, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa topping.");
    } finally {
      setBusyToppingId(null);
    }
  };

  if (loading) {
    return <div className="quan-page-loading">Đang tải topping...</div>;
  }

  const selectedGroup =
    groups.find((group) => group.maNhomTopping === selectedGroupId) ?? null;

  const activeToppingCount = toppings.filter((item) => item.trangThai).length;

  return (
    <div className="merchant-options-page">
      <ScrollReveal className="merchant-options-header-reveal" delay={40}>
        <header className="merchant-options-header">
        <div>
          <span className="merchant-options-eyebrow">TÙY CHỌN MÓN ĂN</span>
          <h1>Topping</h1>
          <p>Quản lý nhóm tùy chọn và giá bán thêm của từng topping.</p>
        </div>

        <button
          type="button"
          className="merchant-options-add-group"
          onClick={openCreateGroup}
        >
          <Plus size={16} />
          Thêm nhóm
        </button>
        </header>
      </ScrollReveal>

      {error && !groupEditorOpen && !toppingEditorOpen && (
        <div className="merchant-options-notice error">{error}</div>
      )}

      {success && (
        <div className="merchant-options-notice success">✓ {success}</div>
      )}

      <div className="merchant-options-layout">
        <ScrollReveal className="merchant-options-groups-reveal" delay={80}>
          <aside className="merchant-options-groups">
          <div className="merchant-options-panel-title">
            <div>
              <h2>Nhóm topping</h2>
              <p>{groups.length} nhóm đang được quản lý</p>
            </div>
            <Layers3 size={18} />
          </div>

          {groups.length === 0 ? (
            <div className="merchant-options-group-empty">
              <Layers3 size={25} />
              <p>Chưa có nhóm topping.</p>
              <button type="button" onClick={openCreateGroup}>
                Tạo nhóm đầu tiên
              </button>
            </div>
          ) : (
            <div className="merchant-options-group-list">
              {groups.map((group, index) => {
                const selected = group.maNhomTopping === selectedGroupId;

                return (
                  <ScrollReveal
                    key={group.maNhomTopping}
                    className="merchant-options-group-reveal"
                    delay={Math.min(index * 40, 200)}
                  >
                    <article
                      className={`merchant-options-group ${
                        selected ? "selected" : ""
                      }`}
                    >
                    <button
                      type="button"
                      className="merchant-options-group-select"
                      onClick={() =>
                        void handleSelectGroup(group.maNhomTopping)
                      }
                    >
                      <span>
                        <Settings2 size={17} />
                      </span>

                      <div>
                        <strong>{group.tenNhom}</strong>
                        <p>
                          {group.batBuocChon ? "Bắt buộc" : "Tùy chọn"}
                          {" · "}
                          {group.chonToiDa
                            ? `Tối đa ${group.chonToiDa}`
                            : "Không giới hạn"}
                        </p>
                      </div>
                    </button>

                    <div className="merchant-options-group-actions">
                      <button
                        type="button"
                        title="Sửa nhóm"
                        onClick={() => openEditGroup(group)}
                        disabled={busyGroupId !== null}
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        type="button"
                        className="delete"
                        title="Xóa nhóm"
                        onClick={() => void handleDeleteGroup(group)}
                        disabled={busyGroupId !== null}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    </article>
                  </ScrollReveal>
                );
              })}
            </div>
          )}
          </aside>
        </ScrollReveal>

        <ScrollReveal className="merchant-options-toppings-reveal" delay={120}>
          <section className="merchant-options-toppings">
          {selectedGroup ? (
            <>
              <div className="merchant-options-topping-header">
                <div>
                  <span>NHÓM ĐANG CHỌN</span>
                  <h2>{selectedGroup.tenNhom}</h2>
                  <p>
                    {activeToppingCount} đang bán · {toppings.length} topping
                  </p>
                </div>

                <button type="button" onClick={openCreateTopping}>
                  <Plus size={15} />
                  Thêm topping
                </button>
              </div>

              <div className="merchant-options-rule">
                <div>
                  <Check size={15} />
                  <span>
                    {selectedGroup.batBuocChon
                      ? "Khách bắt buộc phải chọn"
                      : "Khách có thể bỏ qua"}
                  </span>
                </div>

                <strong>
                  {selectedGroup.chonToiDa
                    ? `Tối đa ${selectedGroup.chonToiDa} lựa chọn`
                    : "Không giới hạn lựa chọn"}
                </strong>
              </div>

              {loadingToppings ? (
                <div className="merchant-options-loading">
                  Đang tải topping...
                </div>
              ) : toppings.length === 0 ? (
                <div className="merchant-options-topping-empty">
                  <Settings2 size={27} />
                  <h3>Nhóm này chưa có topping</h3>
                  <p>
                    Thêm lựa chọn đầu tiên cho nhóm {selectedGroup.tenNhom}.
                  </p>
                  <button type="button" onClick={openCreateTopping}>
                    <Plus size={15} />
                    Thêm topping
                  </button>
                </div>
              ) : (
                <div className="merchant-options-topping-list">
                  {toppings.map((item, index) => (
                    <ScrollReveal
                      key={item.maTopping}
                      className="merchant-options-topping-row-reveal"
                      delay={Math.min(index * 40, 200)}
                    >
                      <article
                        className={`merchant-options-topping-row ${
                          item.trangThai ? "" : "is-hidden"
                        }`}
                      >
                      <div className="merchant-options-topping-icon">
                        <CircleDollarSign size={17} />
                      </div>

                      <div className="merchant-options-topping-info">
                        <strong>{item.tenTopping}</strong>
                        <span
                          className={item.trangThai ? "active" : "inactive"}
                        >
                          {item.trangThai ? "Đang bán" : "Tạm ngưng"}
                        </span>
                      </div>

                      <strong className="merchant-options-price">
                        +{formatMoney(item.giaThem)}
                      </strong>

                      <div className="merchant-options-topping-actions">
                        <button
                          type="button"
                          title="Sửa topping"
                          onClick={() => openEditTopping(item)}
                          disabled={busyToppingId !== null}
                        >
                          <Pencil size={14} />
                          Sửa
                        </button>

                        <button
                          type="button"
                          title={item.trangThai ? "Tạm ngưng" : "Bật bán"}
                          onClick={() => void handleToggleTopping(item)}
                          disabled={busyToppingId !== null}
                        >
                          <Power size={14} />
                          {item.trangThai ? "Tắt" : "Bật"}
                        </button>

                        <button
                          type="button"
                          className="delete"
                          title="Xóa topping"
                          onClick={() => void handleDeleteTopping(item)}
                          disabled={busyToppingId !== null}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      </article>
                    </ScrollReveal>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="merchant-options-no-group">
              <Layers3 size={30} />
              <h2>Chưa có nhóm topping</h2>
              <p>Hãy tạo một nhóm trước khi thêm topping.</p>
            </div>
          )}
          </section>
        </ScrollReveal>
      </div>

      {groupEditorOpen && (
        <div className="merchant-config-overlay" onMouseDown={closeGroupEditor}>
          <form
            className="merchant-config-dialog"
            onSubmit={handleGroupSubmit}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="merchant-config-header">
              <div>
                <span>THIẾT LẬP NHÓM</span>
                <h2>
                  {editingGroupId === null
                    ? "Thêm nhóm topping"
                    : "Cập nhật nhóm topping"}
                </h2>
              </div>

              <button
                type="button"
                aria-label="Đóng"
                onClick={closeGroupEditor}
                disabled={saving}
              >
                <X size={18} />
              </button>
            </header>

            <div className="merchant-config-body">
              <label className="merchant-config-field">
                <span>Tên nhóm</span>
                <input
                  autoFocus
                  type="text"
                  value={groupForm.tenNhom}
                  maxLength={100}
                  placeholder="Ví dụ: Chọn size"
                  onChange={(event) =>
                    setGroupForm((current) => ({
                      ...current,
                      tenNhom: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="merchant-config-field">
                <span>Số lựa chọn tối đa</span>
                <input
                  type="number"
                  min={1}
                  value={groupForm.chonToiDa ?? ""}
                  placeholder="Không giới hạn"
                  onChange={(event) =>
                    setGroupForm((current) => ({
                      ...current,
                      chonToiDa:
                        event.target.value === ""
                          ? null
                          : Number(event.target.value),
                    }))
                  }
                />
                <small>Để trống nếu không giới hạn.</small>
              </label>

              <label className="merchant-config-switch">
                <input
                  type="checkbox"
                  checked={groupForm.batBuocChon}
                  onChange={(event) =>
                    setGroupForm((current) => ({
                      ...current,
                      batBuocChon: event.target.checked,
                    }))
                  }
                />
                <span className="merchant-config-switch-control" />
                <div>
                  <strong>Bắt buộc lựa chọn</strong>
                  <p>Khách phải chọn topping thuộc nhóm này.</p>
                </div>
              </label>

              {error && <p className="merchant-config-error">{error}</p>}
            </div>

            <footer className="merchant-config-footer">
              <button
                type="button"
                className="cancel"
                onClick={closeGroupEditor}
                disabled={saving}
              >
                Hủy
              </button>

              <button type="submit" className="save" disabled={saving}>
                <Save size={15} />
                {saving
                  ? "Đang lưu..."
                  : editingGroupId === null
                    ? "Thêm nhóm"
                    : "Lưu thay đổi"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {toppingEditorOpen && (
        <div
          className="merchant-config-overlay"
          onMouseDown={closeToppingEditor}
        >
          <form
            className="merchant-config-dialog compact"
            onSubmit={handleToppingSubmit}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="merchant-config-header">
              <div>
                <span>THIẾT LẬP TOPPING</span>
                <h2>
                  {editingToppingId === null
                    ? "Thêm topping"
                    : "Cập nhật topping"}
                </h2>
                <p>{selectedGroup?.tenNhom}</p>
              </div>

              <button
                type="button"
                aria-label="Đóng"
                onClick={closeToppingEditor}
                disabled={saving}
              >
                <X size={18} />
              </button>
            </header>

            <div className="merchant-config-body">
              <label className="merchant-config-field">
                <span>Tên topping</span>
                <input
                  autoFocus
                  type="text"
                  value={toppingForm.tenTopping}
                  maxLength={100}
                  placeholder="Ví dụ: Trân châu đen"
                  onChange={(event) =>
                    setToppingForm((current) => ({
                      ...current,
                      tenTopping: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="merchant-config-field">
                <span>Giá bán thêm</span>
                <div className="merchant-config-price">
                  <CircleDollarSign size={16} />
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={toppingForm.giaThem}
                    onChange={(event) =>
                      setToppingForm((current) => ({
                        ...current,
                        giaThem: Number(event.target.value),
                      }))
                    }
                  />
                  <strong>đ</strong>
                </div>
              </label>

              {error && <p className="merchant-config-error">{error}</p>}
            </div>

            <footer className="merchant-config-footer">
              <button
                type="button"
                className="cancel"
                onClick={closeToppingEditor}
                disabled={saving}
              >
                Hủy
              </button>

              <button type="submit" className="save" disabled={saving}>
                <Save size={15} />
                {saving
                  ? "Đang lưu..."
                  : editingToppingId === null
                    ? "Thêm topping"
                    : "Lưu thay đổi"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}

export default RestaurantTopping;
