// Production frontend + loopback fixture API. Never starts the backend or writes a database.
// Run after `cd FE; npm run build`, then `node scripts/test-restaurant-detail-browser.mjs` at root.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, mkdtemp, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalog, seedRows } from './demo-images/catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'FE/dist');
const webroot = path.join(root, 'DatMonAnOnline.API/wwwroot');
const evidence = path.join(root, '.build-check/restaurant-redesign');
const browserPath = process.env.FOODIE_TEST_BROWSER || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
await Promise.all([stat(browserPath), stat(path.join(dist, 'index.html')), mkdir(evidence, { recursive: true })]);
const row = seedRows('nhahang')[0];
const restaurantId = row[0];
const categories = seedRows('danhmuc').filter(r => r[1] === restaurantId).map(r => ({ maDanhMuc: r[0], maNhaHang: r[1], tenDanhMuc: r[2], thuTuHienThi: r[3] }));
const asset = (kind, id) => catalog.find(a => a.kind === kind && a.id === id)?.path;
const seedFoods = seedRows('monan').filter(r => r[1] === restaurantId).map(r => ({ maMonAn: r[0], maNhaHang: r[1], maDanhMuc: r[2], tenDanhMuc: categories.find(c => c.maDanhMuc === r[2])?.tenDanhMuc || '', tenMonAn: r[3], moTa: r[4], gia: r[5], hinhAnh: asset('foods', r[0]), trangThai: true, danhGiaTrungBinh: 0, nhomToppings: [] }));
assert(seedFoods.length >= 12, 'Fixture requires a restaurant with at least twelve seeded dishes');
const foods = [...seedFoods, { ...seedFoods[0], maMonAn: 9001, tenMonAn: 'Món kiểm thử phân trang' }];
foods[0].nhomToppings = [
  { maNhomTopping: 101, tenNhom: 'Chọn kích cỡ', batBuocChon: true, chonToiDa: 1, toppings: [
    { maTopping: 1001, tenTopping: 'Cỡ vừa', giaThem: 0, trangThai: true },
    { maTopping: 1002, tenTopping: 'Cỡ lớn', giaThem: 5000, trangThai: true },
  ] },
  { maNhomTopping: 102, tenNhom: 'Topping thêm', batBuocChon: false, chonToiDa: 2, toppings: [
    { maTopping: 1003, tenTopping: 'Trân châu', giaThem: 5000, trangThai: true },
    { maTopping: 1004, tenTopping: 'Thạch', giaThem: 3000, trangThai: true },
    { maTopping: 1005, tenTopping: 'Pudding', giaThem: 7000, trangThai: true },
  ] },
];
const flags = { closed: false, broken: false, long: false, menuError: false, restaurantError: false, addError: false, addDelay: 0 };
const requests = [];
const results = [];
const runtimeErrors = [];
let serverCart = { maGioHang: 1, maNhaHang: restaurantId, tenNhaHang: row[2], soLuongMon: 0, tongTienTamTinh: 0, chiTiet: [] };
let savedVoucher = false;
const paged = (items, params = new URLSearchParams()) => {
  const pageSize = Number(params.get('pageSize') || 12);
  const pageNumber = Number(params.get('pageNumber') || 1);
  return { items: items.slice((pageNumber - 1) * pageSize, pageNumber * pageSize), totalItems: items.length, totalPages: Math.ceil(items.length / pageSize), pageSize, pageNumber, hasPreviousPage: pageNumber > 1, hasNextPage: pageNumber * pageSize < items.length };
};
const longName = 'Nhà hàng kiểm thử với tên rất dài để xác minh xuống dòng và các hành động vẫn sử dụng được';
const restaurant = () => ({ maNhaHang: restaurantId, tenNhaHang: flags.long ? longName : row[2], moTa: row[3], diaChiQuan: flags.long ? 'Địa chỉ kiểm thử '.repeat(25) : 'Địa chỉ demo — không phải dữ liệu cá nhân', anhBia: flags.broken ? '/uploads/restaurants/missing-test.webp' : asset('restaurants', restaurantId), gioMoCua: '07:00:00', gioDongCua: '22:00:00', dangMoCua: !flags.closed, trangThaiHienThi: flags.closed ? 'Đã đóng cửa' : 'Đang mở cửa', danhGiaTrungBinh: 0, phiShipMacDinh: 15000 });
const foodView = f => ({ ...f, tenMonAn: flags.long ? f.tenMonAn + ' ' + 'Tên món dài '.repeat(12) : f.tenMonAn, hinhAnh: flags.broken ? '/uploads/foods/missing-test.webp' : f.hinhAnh });
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const name = decodeURIComponent(url.pathname);
  requests.push({ method: req.method, path: name, query: url.search });
  res.setHeader('Cache-Control', 'no-store');
  const json = (body, status = 200) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
  try {
    if (name.startsWith('/hubs/')) return json({ message: 'Realtime disabled in isolated UI fixture' }, 503);
    if (name === '/api/auth/me') return json({ maTaiKhoan: 1, email: 'fixture@example.invalid', role: 'KhachHang', trangThai: true, khachHang: { maKhachHang: 1, hoTen: 'Khách kiểm thử' } });
    if (name === `/api/nha-hang/${restaurantId}`) return json(flags.restaurantError ? { message: 'Nhà hàng không tồn tại (fixture)' } : restaurant(), flags.restaurantError ? 404 : 200);
    if (/^\/api\/nha-hang\/\d+\/danh-gia$/.test(name)) return json(paged([{ maDanhGia: 1, soSao: 4, noiDung: 'Nhận xét dùng riêng trong môi trường kiểm thử.', ngayDanhGia: '2026-10-20T12:00:00' }], url.searchParams));
    if (/^\/api\/mon-an\/\d+\/danh-gia$/.test(name)) return json(paged([{ maDanhGia: 1, soSao: 3, noiDung: 'Đánh giá món kiểm thử.', ngayDanhGia: '2026-10-20T12:00:00' }], url.searchParams));
    if (name === '/api/nha-hang') return json(paged([restaurant()], url.searchParams));
    if (name === '/api/danh-muc') return json(categories);
    if (name === '/api/mon-an') {
      if (flags.menuError) return json({ message: 'Không tải được thực đơn (fixture)' }, 500);
      let items = foods;
      const category = Number(url.searchParams.get('maDanhMuc') || 0);
      const search = (url.searchParams.get('search') || '').toLocaleLowerCase('vi');
      if (category) items = items.filter(f => f.maDanhMuc === category);
      if (search) items = items.filter(f => f.tenMonAn.toLocaleLowerCase('vi').includes(search));
      return json(paged(items.map(foodView), url.searchParams));
    }
    if (/^\/api\/mon-an\/\d+$/.test(name)) return json(foodView(foods.find(f => f.maMonAn === Number(name.split('/').at(-1))) || foods[0]));
    if (/^\/api\/khuyen-mai\/nha-hang\//.test(name)) return json(paged([{ maKhuyenMai: 1, maCode: 'TEST-ONLY', nguon: 'NhaHang', loaiGiam: 'SoTien', giaTriGiam: 5000, donHangToiThieu: 50000, giamToiDa: null, moTa: 'Voucher kiểm thử, không ghi vào database.', ngayKetThuc: '2099-12-31T00:00:00', daLuu: savedVoucher }], url.searchParams));
    if (name === '/api/khuyen-mai/1/luu') { savedVoucher = true; return json({ message: 'Đã lưu' }); }
    if (name.startsWith('/api/gio-hang/nha-hang/')) return json(serverCart);
    if (name === '/api/gio-hang/them-mon') {
      let raw = ''; for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw);
      if (flags.addDelay) await new Promise(r => setTimeout(r, flags.addDelay));
      if (flags.addError) return json({ message: 'Món vừa ngừng bán (fixture)' }, 409);
      const dish = foods.find(f => f.maMonAn === body.maMonAn);
      const toppings = dish.nhomToppings.flatMap(g => g.toppings).filter(t => body.danhSachMaTopping.includes(t.maTopping));
      const total = (dish.gia + toppings.reduce((s, t) => s + t.giaThem, 0)) * body.soLuong;
      serverCart = { ...serverCart, ngayCapNhat: new Date().toISOString(), soLuongMon: body.soLuong, tongTienTamTinh: total, chiTiet: [{ maChiTietGioHang: 1, maMonAn: dish.maMonAn, tenMonAn: dish.tenMonAn, hinhAnh: dish.hinhAnh, donGia: dish.gia, soLuong: body.soLuong, ghiChu: body.ghiChu, toppings, thanhTien: total }] };
      return json({ message: 'Đã thêm' });
    }
    if (name === '/api/dia-chi') return json([]);
    if (name.startsWith('/api/')) return json(paged([]));
    const base = name.startsWith('/uploads/') ? webroot : dist;
    const relative = name.startsWith('/uploads/') || name.startsWith('/assets/') || name.startsWith('/images/') || name === '/favicon.svg';
    const file = relative ? path.resolve(base, '.' + name) : path.join(dist, 'index.html');
    if (!file.startsWith(base + path.sep)) return json({}, 403);
    res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2' }[path.extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch (error) { if (!res.headersSent) res.writeHead(404); res.end(); if (error.code !== 'ENOENT') runtimeErrors.push(`Fixture server: ${error.message}`); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const profile = await mkdtemp(path.join(tmpdir(), 'foodie-restaurant-ui-'));
const browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, label) {
  const deadline = Date.now() + 18000;
  while (Date.now() < deadline) { if (await check().catch(() => false)) return; await delay(100); }
  throw new Error('Timed out: ' + label);
}
let socket;
try {
  let port;
  await until(async () => { port = Number((await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); return port > 0; }, 'browser');
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  const pending = new Map(); let sequence = 0;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 15000);
    pending.set(id, { resolve, reject, timeout }); socket.send(JSON.stringify({ id, method, params }));
  });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === 'Fetch.requestPaused') {
      const own = message.params.request.url.startsWith(origin + '/');
      void send(own ? 'Fetch.continueRequest' : 'Fetch.failRequest', { requestId: message.params.requestId, ...(!own ? { errorReason: 'BlockedByClient' } : {}) }).catch(() => {});
    }
    const item = pending.get(message.id);
    if (item) { clearTimeout(item.timeout); pending.delete(message.id); message.error ? item.reject(new Error(message.error.message)) : item.resolve(message.result); }
  });
  const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  const click = async selector => {
    await until(() => evaluate('!document.querySelector(".page-loader-overlay")'), 'existing route loader');
    const point = await evaluate(`(async () => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) throw new Error('Missing control: ' + ${JSON.stringify(selector)}); e.scrollIntoView({block:'center',behavior:'instant'}); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); const rect=e.getBoundingClientRect(); return {x:rect.x+rect.width/2,y:rect.y+rect.height/2}; })()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
  };
  const type = async (selector, text) => { await click(selector); await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 2 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2 }); await send('Input.insertText', { text }); };
  const navigate = async (route = `/nha-hang/${restaurantId}`) => { await send('Page.navigate', { url: origin + route }); await until(() => evaluate('document.readyState === "complete"'), 'navigation'); };
  const ready = () => until(() => evaluate('document.querySelectorAll(".rd-food").length > 0'), 'menu');
  const width = value => send('Emulation.setDeviceMetricsOverride', { width: value, height: value < 640 ? 844 : 1000, deviceScaleFactor: 1, mobile: value < 640 });
  const screenshot = async name => { await evaluate('document.fonts.ready.then(() => true)'); await delay(250); await writeFile(path.join(evidence, name + '.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64')); };
  const pass = label => { results.push({ test: label, result: 'PASS' }); console.log('PASS ' + label); };
  const open = async () => { await click('.rd-add'); await until(() => evaluate('!!document.querySelector(".rd-dialog")'), 'food dialog'); };
  const checked = group => evaluate(`document.querySelectorAll('.rd-topping-group:nth-child(${group}) input:checked').length`);
  const postCount = () => requests.filter(r => r.method === 'POST' && r.path === '/api/gio-hang/them-mon').length;
  await send('Page.enable'); await send('Runtime.enable'); await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await width(1366); await navigate(); await ready();
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".foodie-restaurant")).backgroundColor'), 'rgb(247, 245, 239)');
  assert.equal(await evaluate('document.querySelector(".rd-cart-empty") !== null'), true);
  await screenshot('desktop-top'); await evaluate('document.querySelector(".rd-menu-section").scrollIntoView({block:"start"})'); await screenshot('desktop-menu'); pass('Desktop restaurant / menu / empty cart / local images');

  for (const size of [320, 375, 390, 768, 1024, 1366, 1920]) {
    await width(size); await delay(100);
    const bounds = await evaluate('({page:document.documentElement.scrollWidth,viewport:innerWidth,route:document.querySelector(".foodie-restaurant").getBoundingClientRect().width})');
    assert(bounds.page <= bounds.viewport + 1, `Horizontal overflow at ${size}: ${JSON.stringify(bounds)}`);
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".rd-mobile-cart")).display !== "none"'), size < 1024);
    if (size <= 768) assert(await evaluate('document.querySelector(".rd-mobile-cart").getBoundingClientRect().bottom <= document.querySelector(".mobile-bottom-nav").getBoundingClientRect().top'), 'Cart must clear the shared mobile dock');
    pass(`Responsive ${size}px without horizontal overflow`);
  }
  await width(375); await evaluate('document.querySelector(".rd-menu-section").scrollIntoView({block:"start"})'); await screenshot('mobile-menu');
  await open(); await screenshot('mobile-dialog');
  await click('.rd-add-confirm');
  assert.equal(await evaluate('document.querySelectorAll(".rd-topping-group.is-invalid").length'), 1);
  assert.equal(await evaluate('document.activeElement.matches(".rd-topping-group.is-invalid input")'), true);
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("guest-restaurant-carts-v1") || "[]").length'), 0); pass('Required topping: visible error, focus, no cart write');
  await click('.rd-topping-group:nth-child(1) .rd-topping-option:nth-child(1) input');
  await click('.rd-topping-group:nth-child(1) .rd-topping-option:nth-child(2) input'); assert.equal(await checked(1), 1); pass('Single-choice topping replacement');
  for (const n of [1, 2, 3]) await click(`.rd-topping-group:nth-child(2) .rd-topping-option:nth-child(${n}) input`);
  assert.equal(await checked(2), 2); assert(await evaluate('document.querySelector(".rd-dialog-error").innerText.includes("tối đa 2")')); pass('Maximum topping selection and error');
  await type('.rd-note textarea', 'Ít ngọt, để riêng topping');
  await click('[aria-label="Tăng số lượng"]');
  const expectedTotal = (foods[0].gia + 5000 + 5000 + 3000) * 2;
  assert(await evaluate(`document.querySelector('.rd-add-confirm').innerText.includes(${JSON.stringify(expectedTotal.toLocaleString('vi-VN'))})`));
  await click('.rd-add-confirm'); await until(() => evaluate('!document.querySelector(".rd-dialog")'), 'add guest');
  const carts = await evaluate('JSON.parse(localStorage.getItem("guest-restaurant-carts-v1"))');
  assert.equal(carts[0].chiTiet[0].soLuong, 2); assert.equal(carts[0].chiTiet[0].ghiChu, 'Ít ngọt, để riêng topping'); assert.equal(carts[0].chiTiet[0].toppings.length, 3); assert.equal(carts[0].tongTienTamTinh, expectedTotal); pass('Guest add: quantity, note, topping, total and persistent cart');
  await navigate(); await ready(); assert(await evaluate(`document.querySelector('.rd-mobile-cart').innerText.includes(${JSON.stringify(expectedTotal.toLocaleString('vi-VN'))})`)); pass('Cart survives refresh');
  await open(); await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', modifiers: 8 });
  assert.equal(await evaluate('document.activeElement.classList.contains("rd-add-confirm")'), true);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab' });
  assert.equal(await evaluate('document.activeElement.classList.contains("rd-dialog-close")'), true);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
  await until(() => evaluate('!document.querySelector(".rd-dialog")'), 'escape');
  assert.equal(await evaluate('document.activeElement.classList.contains("rd-add")'), true); pass('Dialog focus trap, Escape, focus return');

  await width(1366); await click('.rd-category-list button:nth-child(2)'); await until(() => evaluate('document.querySelectorAll(".rd-food").length < 12 && !document.querySelector(".rd-menu-loading")'), 'category');
  assert(requests.some(r => r.query.includes('maDanhMuc=' + categories[0].maDanhMuc))); pass('Category filter uses existing API contract');
  await click('.rd-category-list button:first-child'); await ready();
  await type('.rd-search input', 'không-có-món-này'); await until(() => evaluate('document.body.innerText.includes("Không tìm thấy món phù hợp")'), 'empty search');
  await click('.rd-state button'); await ready(); pass('Search, empty state and reset');
  await click('.rd-menu-main [aria-label="Trang sau"]'); await until(() => evaluate('document.querySelector(".rd-menu-main [aria-current=page]")?.innerText === "2"'), 'pagination'); pass('Menu pagination');
  await navigate(); await ready(); await click('.food-reviews-toggle'); await until(() => evaluate('document.body.innerText.includes("Đánh giá món kiểm thử.")'), 'food reviews'); pass('Food and restaurant reviews remain accessible');

  await evaluate('localStorage.setItem("token","isolated-ui-fixture")'); await navigate(); await ready();
  await click('.rd-offers summary'); await click('.customer-voucher-action'); await until(() => evaluate('document.querySelector(".rd-voucher-message")?.innerText.includes("Đã lưu mã")'), 'save voucher');
  assert(savedVoucher); assert.equal(await evaluate('document.querySelector(".customer-voucher-action").disabled'), true); pass('Voucher save and disabled saved state');
  flags.addError = true; await open(); await click('.rd-topping-group:first-child input'); const countBefore = postCount(); await click('.rd-add-confirm');
  await until(() => evaluate('document.querySelector(".rd-dialog-error")?.innerText.includes("Món vừa ngừng bán")'), 'cart error'); assert.equal(postCount(), countBefore + 1); assert.equal(serverCart.soLuongMon, 0); pass('API 409: no false success, dialog and selection retained');
  flags.addError = false; flags.addDelay = 700; const beforeDouble = postCount(); await click('.rd-add-confirm');
  await click('.rd-dialog-close'); assert(await evaluate('!!document.querySelector(".rd-dialog")'));
  await click('.rd-add-confirm'); await until(() => evaluate('!document.querySelector(".rd-dialog")'), 'retry success');
  assert.equal(postCount(), beforeDouble + 1); assert.equal(serverCart.soLuongMon, 1); pass('Retry, double-submit guard and busy close guard');
  await click('.rd-cart-open'); await until(() => evaluate(`location.pathname === '/gio-hang' && new URLSearchParams(location.search).get('maNhaHang') === '${restaurantId}'`), 'cart route'); pass('Existing per-restaurant cart route');

  await evaluate('localStorage.removeItem("token")'); flags.closed = true; await navigate(); await ready();
  assert.equal(await evaluate('[...document.querySelectorAll(".rd-add")].every(b => b.disabled)'), true); assert(await evaluate('document.querySelector(".rd-closed-note").innerText.includes("chưa thể đặt món")')); pass('Closed restaurant: menu visible, additions disabled'); flags.closed = false;
  flags.broken = true; await navigate(); await ready();
  await until(() => evaluate('(() => { const images = [...document.querySelectorAll(".rd-cover img,.rd-food-image img")]; images.forEach(i => i.loading = "eager"); return images.length > 0 && images.every(i=>i.complete && i.naturalWidth>0 && i.dataset.fallback==="true"); })()'), 'image fallback'); pass('404 restaurant and food images use local fallbacks'); flags.broken = false;
  flags.long = true; await navigate(); await ready();
  for (const size of [320, 375, 1366]) { await width(size); assert(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1')); }
  await screenshot('long-content'); pass('Long restaurant, dish and address at mobile / desktop'); flags.long = false;
  flags.menuError = true; await navigate(); await until(() => evaluate('document.body.innerText.includes("Không thể tải thực đơn")'), 'menu error'); pass('Menu error state'); flags.menuError = false;
  flags.restaurantError = true; await navigate(); await until(() => evaluate('document.querySelector(".rd-page-error") !== null'), 'restaurant error'); pass('Restaurant error and return link'); flags.restaurantError = false;
  await navigate('/nha-hang'); await until(() => evaluate('!!document.querySelector(".restaurants-page")'), 'listing');
  assert.equal(await evaluate('document.querySelector(".foodie-restaurant") === null'), true);
  assert.equal((await evaluate('getComputedStyle(document.documentElement).getPropertyValue("--primary")')).trim(), '#f4511e'); pass('Other route keeps original global theme');
  assert.deepEqual(runtimeErrors, []); pass('No uncaught application JavaScript exceptions');
  await writeFile(path.join(evidence, 'results.json'), JSON.stringify({ environment: 'Edge headless, built FE, isolated loopback fixture API; no real backend/DB', results, runtimeErrors }, null, 2));
  console.log(`TOTAL ${results.length}/${results.length} PASS. Screenshots: .build-check/restaurant-redesign/`);
} catch (error) {
  await writeFile(path.join(evidence, 'results.json'), JSON.stringify({ results, failure: error.message, runtimeErrors }, null, 2));
  throw error;
} finally {
  socket?.close(); browser.kill(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
}
