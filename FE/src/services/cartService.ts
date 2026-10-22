import { apiFetch } from "./api";
import { getMonAn } from "./menuService";
import { getRestaurantById } from "./restaurantService";

export interface ThemMonRequest {
  maMonAn: number;
  soLuong: number;
  ghiChu?: string;
  danhSachMaTopping?: number[];
}

export interface CapNhatTuyChonRequest {
  ghiChu?: string;
  danhSachMaTopping?: number[];
}

export interface CartTopping {
  maTopping: number;
  tenTopping: string;
  giaThem: number;
  soLuong: number;
}

export interface CartItem {
  maChiTietGioHang: number;
  maMonAn: number;
  tenMonAn: string;
  hinhAnh?: string | null;
  donGia: number;
  soLuong: number;
  ghiChu?: string | null;
  toppings: CartTopping[];
  thanhTien: number;
}

export interface RestaurantCart {
  maGioHang: number | null;
  maNhaHang: number;
  tenNhaHang: string;
  anhBia?: string | null;
  ngayCapNhat?: string | null;
  soLuongMon: number;
  tongTienTamTinh: number;
  chiTiet: CartItem[];
  canLamMoi?: boolean;
  giuCheckoutDenUtc?: string | null;
}

const GUEST_CARTS_KEY = "guest-restaurant-carts-v1";
export const CART_TTL_MS = 5 * 60 * 1000;

function hasCustomerSession() {
  return Boolean(localStorage.getItem("token"));
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

function normalizeNote(note?: string | null) {
  return note?.trim() || "";
}

function getGuestItemSignature(item: CartItem) {
  const toppingIds = item.toppings
    .map((topping) => topping.maTopping)
    .sort((left, right) => left - right);

  return JSON.stringify([
    item.maMonAn,
    normalizeNote(item.ghiChu),
    toppingIds,
  ]);
}

function mergeGuestCartItems(items: CartItem[]) {
  const mergedItems: CartItem[] = [];

  for (const item of items) {
    const signature = getGuestItemSignature(item);
    const matchingItem = mergedItems.find(
      (candidate) =>
        getGuestItemSignature(candidate) === signature &&
        candidate.soLuong + item.soLuong <= 100,
    );

    if (matchingItem) {
      matchingItem.soLuong += item.soLuong;
      continue;
    }

    mergedItems.push({
      ...item,
      ghiChu: normalizeNote(item.ghiChu) || null,
      toppings: item.toppings.map((topping) => ({ ...topping })),
    });
  }

  return mergedItems;
}

function readGuestCarts(): RestaurantCart[] {
  try {
    const raw = localStorage.getItem(GUEST_CARTS_KEY);
    if (!raw) return [];

    const carts = JSON.parse(raw) as RestaurantCart[];
    if (!Array.isArray(carts)) return [];

    const normalizedCarts = carts.map((cart) =>
      normalizeGuestCart({
        ...cart,
        chiTiet: mergeGuestCartItems(cart.chiTiet),
      }),
    );
    const hasMergedItems = normalizedCarts.some(
      (cart, index) => cart.chiTiet.length !== carts[index].chiTiet.length,
    );

    if (hasMergedItems) {
      localStorage.setItem(GUEST_CARTS_KEY, JSON.stringify(normalizedCarts));
    }

    return normalizedCarts;
  } catch {
    return [];
  }
}

function writeGuestCarts(carts: RestaurantCart[]) {
  localStorage.setItem(GUEST_CARTS_KEY, JSON.stringify(carts));
}

function calculateItemTotal(item: CartItem) {
  const toppingTotal = item.toppings.reduce(
    (total, topping) => total + Number(topping.giaThem || 0) * Number(topping.soLuong || 1),
    0,
  );
  return (Number(item.donGia || 0) + toppingTotal) * Number(item.soLuong || 0);
}

function normalizeGuestCart(
  cart: RestaurantCart,
  refreshActivity = false,
): RestaurantCart {
  const chiTiet = mergeGuestCartItems(cart.chiTiet).map((item) => ({
    ...item,
    thanhTien: calculateItemTotal(item),
  }));
  const updatedAt = Date.parse(cart.ngayCapNhat ?? "");
  const canLamMoi = chiTiet.length > 0 && (
    !Number.isFinite(updatedAt) || Date.now() - updatedAt >= CART_TTL_MS
  );

  return {
    ...cart,
    maGioHang: null,
    chiTiet,
    soLuongMon: chiTiet.reduce((total, item) => total + item.soLuong, 0),
    tongTienTamTinh: chiTiet.reduce((total, item) => total + item.thanhTien, 0),
    ngayCapNhat: refreshActivity
      ? new Date().toISOString()
      : cart.ngayCapNhat,
    canLamMoi: refreshActivity ? false : canLamMoi,
  };
}

function createGuestItemId() {
  return -Math.floor(Date.now() * 1000 + Math.random() * 1000);
}

function updateGuestCartByItem(
  itemId: number,
  updater: (item: CartItem) => CartItem | null,
) {
  const carts = readGuestCarts();
  const cartIndex = carts.findIndex((cart) =>
    cart.chiTiet.some((item) => item.maChiTietGioHang === itemId),
  );

  if (cartIndex < 0) throw new Error("Không tìm thấy món trong giỏ khách.");

  const cart = carts[cartIndex];
  cart.chiTiet = cart.chiTiet.flatMap((item) => {
    if (item.maChiTietGioHang !== itemId) return [item];
    const nextItem = updater(item);
    return nextItem ? [nextItem] : [];
  });
  carts[cartIndex] = normalizeGuestCart(cart, true);
  writeGuestCarts(carts);
}

async function addToServerCart(data: ThemMonRequest) {
  return apiFetch("/gio-hang/them-mon", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
}

export async function getRestaurantCart(maNhaHang: number): Promise<RestaurantCart> {
  if (hasCustomerSession()) {
    return apiFetch(`/gio-hang/nha-hang/${maNhaHang}`, {
      method: "GET",
      headers: authHeaders(),
    });
  }

  const savedCart = readGuestCarts().find((cart) => cart.maNhaHang === maNhaHang);
  if (savedCart) return normalizeGuestCart(savedCart);

  const restaurant = await getRestaurantById(maNhaHang);
  return {
    maGioHang: null,
    maNhaHang,
    tenNhaHang: restaurant.tenNhaHang,
    anhBia: restaurant.anhBia,
    ngayCapNhat: null,
    soLuongMon: 0,
    tongTienTamTinh: 0,
    chiTiet: [],
    canLamMoi: false,
  };
}

export async function getLatestCart(): Promise<RestaurantCart | null> {
  if (hasCustomerSession()) {
    return apiFetch("/gio-hang/gan-nhat", {
      method: "GET",
      headers: authHeaders(),
    });
  }

  const [latestCart] = readGuestCarts()
    .filter((cart) => cart.chiTiet.length > 0)
    .sort(
      (left, right) =>
        new Date(right.ngayCapNhat || 0).getTime() -
        new Date(left.ngayCapNhat || 0).getTime(),
    );

  return latestCart ? normalizeGuestCart(latestCart) : null;
}

export async function getCart(maGioHang: number): Promise<RestaurantCart> {
  return apiFetch(`/gio-hang/${maGioHang}`, {
    method: "GET",
    headers: authHeaders(),
  });
}

export async function reserveCartForCheckout(maGioHang: number) {
  return apiFetch(`/gio-hang/${maGioHang}/giu-checkout`, {
    method: "POST",
    headers: authHeaders(),
  }) as Promise<{ message: string; expiresAtUtc: string }>;
}

export async function addToCart(data: ThemMonRequest) {
  if (hasCustomerSession()) return addToServerCart(data);

  const food = await getMonAn(data.maMonAn);
  const restaurant = await getRestaurantById(food.maNhaHang);
  const selectedToppingIds = new Set(data.danhSachMaTopping ?? []);
  const toppings = food.nhomToppings
    .flatMap((group) => group.toppings)
    .filter((topping) => selectedToppingIds.has(topping.maTopping))
    .map((topping) => ({
      maTopping: topping.maTopping,
      tenTopping: topping.tenTopping,
      giaThem: topping.giaThem,
      soLuong: 1,
    }));
  const carts = readGuestCarts();
  const cartIndex = carts.findIndex((cart) => cart.maNhaHang === food.maNhaHang);
  const cart: RestaurantCart =
    cartIndex >= 0
      ? carts[cartIndex]
      : {
          maGioHang: null,
          maNhaHang: food.maNhaHang,
          tenNhaHang: restaurant.tenNhaHang,
          anhBia: restaurant.anhBia,
          ngayCapNhat: null,
          soLuongMon: 0,
          tongTienTamTinh: 0,
          chiTiet: [],
        };

  const item: CartItem = {
    maChiTietGioHang: createGuestItemId(),
    maMonAn: food.maMonAn,
    tenMonAn: food.tenMonAn,
    hinhAnh: food.hinhAnh,
    donGia: food.gia,
    soLuong: data.soLuong,
    ghiChu: data.ghiChu?.trim() || null,
    toppings,
    thanhTien: 0,
  };

  const matchingItem = cart.chiTiet.find(
    (candidate) => getGuestItemSignature(candidate) === getGuestItemSignature(item),
  );

  if (matchingItem) {
    if (matchingItem.soLuong + item.soLuong > 100) {
      throw new Error("Số lượng tối đa cho cùng một món và tùy chọn là 100.");
    }

    matchingItem.soLuong += item.soLuong;
  } else {
    cart.chiTiet.push(item);
  }

  const normalizedCart = normalizeGuestCart(cart, true);

  if (cartIndex >= 0) carts[cartIndex] = normalizedCart;
  else carts.push(normalizedCart);

  writeGuestCarts(carts);
  return {
    message: "Đã thêm món vào giỏ khách.",
    maGioHang: null,
    maNhaHang: food.maNhaHang,
  };
}

export async function updateCartItemQty(id: number, soLuong: number) {
  if (id >= 0 && hasCustomerSession()) {
    return apiFetch(`/gio-hang/chi-tiet/${id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ soLuong }),
    });
  }

  updateGuestCartByItem(id, (item) => ({ ...item, soLuong }));
  return { message: "Cập nhật số lượng thành công." };
}

export async function updateCartItemOptions(
  id: number,
  data: CapNhatTuyChonRequest,
) {
  if (id >= 0 && hasCustomerSession()) {
    return apiFetch(`/gio-hang/chi-tiet/${id}/tuy-chon`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
  }

  const carts = readGuestCarts();
  const item = carts.flatMap((cart) => cart.chiTiet).find((entry) => entry.maChiTietGioHang === id);
  if (!item) throw new Error("Không tìm thấy món trong giỏ khách.");

  const food = await getMonAn(item.maMonAn);
  const selectedIds = new Set(data.danhSachMaTopping ?? []);
  const toppings = food.nhomToppings
    .flatMap((group) => group.toppings)
    .filter((topping) => selectedIds.has(topping.maTopping))
    .map((topping) => ({
      maTopping: topping.maTopping,
      tenTopping: topping.tenTopping,
      giaThem: topping.giaThem,
      soLuong: 1,
    }));

  updateGuestCartByItem(id, (current) => ({
    ...current,
    ghiChu: data.ghiChu?.trim() || null,
    toppings,
  }));
  return { message: "Đã cập nhật topping và ghi chú." };
}

export async function removeCartItem(id: number) {
  if (id >= 0 && hasCustomerSession()) {
    return apiFetch(`/gio-hang/chi-tiet/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
  }

  updateGuestCartByItem(id, () => null);
  return { message: "Đã xóa món khỏi giỏ hàng." };
}

export async function clearCart(maGioHang: number | null, maNhaHang?: number) {
  if (maGioHang && maGioHang > 0 && hasCustomerSession()) {
    return apiFetch(`/gio-hang/${maGioHang}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
  }

  if (!maNhaHang) throw new Error("Không xác định được giỏ hàng cần xóa.");
  writeGuestCarts(readGuestCarts().filter((cart) => cart.maNhaHang !== maNhaHang));
  return { message: "Đã xóa các món trong giỏ khách." };
}

export async function syncGuestCartsToAccount() {
  if (!hasCustomerSession()) return;

  const carts = readGuestCarts();
  const items = carts.flatMap((cart) =>
    cart.chiTiet.map((item) => ({
        maMonAn: item.maMonAn,
        soLuong: item.soLuong,
        ghiChu: item.ghiChu || undefined,
        danhSachMaTopping: item.toppings.map((topping) => topping.maTopping),
      })),
  );

  if (items.length === 0) return;

  await apiFetch("/gio-hang/dong-bo-khach", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ cacMon: items }),
  });

  writeGuestCarts([]);
}
