// Built FE + synthetic APIs + real local demo assets. Never contacts source DB/API.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdtemp, stat, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { catalog, root, seedRows } from './catalog.mjs';

const dist = path.join(root, 'FE/dist');
const webroot = path.join(root, 'DatMonAnOnline.API/wwwroot');
const evidence = path.join(root, '.build-check/demo-images-browser');
await mkdir(evidence, { recursive: true });
const browserPath = process.env.FOODIE_TEST_BROWSER || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
await stat(browserPath);
await stat(path.join(dist, 'index.html'));
const imagePath = (kind, id) => catalog.find(x => x.kind === kind && x.id === id).path;
const restaurants = seedRows('nhahang').map(r => ({ maNhaHang: r[0], tenNhaHang: r[2], moTa: r[3], diaChiQuan: 'Địa chỉ demo', anhBia: imagePath('restaurants', r[0]), gioMoCua: r[6], gioDongCua: r[7], trangThaiDuyet: 'DaDuyet', trangThaiHoatDong: 'MoCua', cheDoHoatDong: 'MoThuCong', dangMoCua: true, trangThaiHienThi: 'Đang mở', danhGiaTrungBinh: 4.2, phiShipMacDinh: 15000 }));
const foods = seedRows('monan').map(r => ({ maMonAn: r[0], maNhaHang: r[1], maDanhMuc: r[2], tenMonAn: r[3], moTa: r[4], gia: r[5], hinhAnh: imagePath('foods', r[0]), trangThai: true, danhGiaTrungBinh: 4, tenDanhMuc: 'Thực đơn', nhomToppings: [] }));
const categories = seedRows('danhmuc').map(r => ({ maDanhMuc: r[0], maNhaHang: r[1], tenDanhMuc: r[2], thuTuHienThi: r[3] }));
let role = 'KhachHang', broken = false, uploadFailure = false, uploadCount = 0, saved = null;
let profile = { ...restaurants[0], khoaThongTinHopDong: false };
const cover = r => ({ ...r, anhBia: broken ? '/uploads/restaurants/missing.webp' : r.anhBia });
const food = f => ({ ...f, hinhAnh: broken ? '/uploads/foods/missing.webp' : f.hinhAnh });
const paged = (items, params) => { const pageSize = Number(params.get('pageSize') || 12); const pageNumber = Number(params.get('pageNumber') || 1); return { items: items.slice((pageNumber - 1) * pageSize, pageNumber * pageSize), totalItems: items.length, totalPages: Math.ceil(items.length / pageSize), pageSize, pageNumber, hasPreviousPage: pageNumber > 1, hasNextPage: pageNumber * pageSize < items.length, counts: { all: items.length, selling: items.length, hidden: 0, unread: 0, read: 0 } }; };
const cart = () => ({ maGioHang: 1, maNhaHang: 1, tenNhaHang: restaurants[0].tenNhaHang, ngayCapNhat: new Date().toISOString(), soLuongMon: 1, tongTienTamTinh: foods[0].gia, chiTiet: [{ maChiTietGioHang: 1, maMonAn: 1, tenMonAn: foods[0].tenMonAn, hinhAnh: food(foods[0]).hinhAnh, donGia: foods[0].gia, soLuong: 1, thanhTien: foods[0].gia, toppings: [] }] });
const requests = [];
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);
    requests.push(pathname);
    res.setHeader('Cache-Control', 'no-store');
    const json = body => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
    if (pathname.startsWith('/hubs/')) { res.writeHead(503); res.end(); return; }
    if (pathname === '/api/auth/me') return json({ maTaiKhoan: 1, email: 'demo@example.invalid', role, trangThai: true, nhaHang: { maNhaHang: 1, tenNhaHang: restaurants[0].tenNhaHang }, khachHang: { maKhachHang: 1, hoTen: 'Khách demo' } });
    if (pathname === '/api/nha-hang/ho-so') {
      if (req.method === 'PUT') { let body = ''; for await (const part of req) body += part; saved = JSON.parse(body); profile = { ...profile, ...saved }; }
      return json(profile);
    }
    if (pathname === '/api/nha-hang/anh-bia') {
      assert.match(req.headers['content-type'], /^multipart\/form-data; boundary=/);
      const chunks = []; for await (const part of req) chunks.push(part);
      const body = Buffer.concat(chunks);
      assert(body.includes(Buffer.from('name="file"')) && body.includes(Buffer.from('RIFF')));
      uploadCount++;
      if (uploadFailure) { res.statusCode = 400; return json({ message: 'Ảnh không hợp lệ (test)' }); }
      return json({ anhBia: '/uploads/restaurants/mock-upload.webp' });
    }
    if (pathname === '/api/nha-hang') return json(paged(restaurants.map(cover), url.searchParams));
    if (/^\/api\/nha-hang\/\d+$/.test(pathname)) return json(cover(restaurants.find(r => r.maNhaHang === Number(pathname.split('/').at(-1)))));
    if (pathname === '/api/mon-an' || pathname === '/api/mon-an/quan') return json(paged(foods.filter(f => f.maNhaHang === Number(url.searchParams.get('maNhaHang') || 1)).map(food), url.searchParams));
    if (/^\/api\/mon-an\/(quan\/)?\d+$/.test(pathname)) return json(food(foods.find(f => f.maMonAn === Number(pathname.split('/').at(-1)))));
    if (pathname === '/api/danh-muc') return json(categories.filter(c => c.maNhaHang === Number(url.searchParams.get('maNhaHang') || 1)));
    if (pathname.includes('/nhom-topping')) return json([]);
    if (pathname.startsWith('/api/gio-hang/')) return json(cart());
    if (pathname === '/api/dia-chi') return json([{ maDiaChi: 1, tenNguoiNhan: 'Khách demo', diaChiCuThe: 'Địa chỉ giả lập', soDienThoaiNhan: '0000000000', macDinh: true }]);
    if (pathname === '/api/thanh-toan/phuong-thuc') return json([{ maPhuongThuc: 1, tenPhuongThuc: 'COD' }]);
    if (pathname === '/api/don-hang/kiem-tra-truoc-checkout') return json({ tongTienHang: foods[0].gia, phiShip: 15000, soTienGiam: 0, thanhTien: foods[0].gia + 15000 });
    if (pathname.startsWith('/api/khach-hang')) return json({ soDuVi: 0 });
    if (pathname.startsWith('/api/')) return json(paged([], url.searchParams));
    if (pathname === '/uploads/restaurants/mock-upload.webp') pathname = imagePath('restaurants', 2);
    const base = pathname.startsWith('/uploads/') ? webroot : dist;
    const file = pathname.startsWith('/uploads/') || pathname.startsWith('/assets/') || pathname.startsWith('/images/') ? path.resolve(base, '.' + pathname) : path.join(dist, 'index.html');
    if (!file.startsWith(base + path.sep)) { res.writeHead(403); res.end(); return; }
    res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }[path.extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch (err) { res.writeHead(404); res.end(); if (err.code !== 'ENOENT') console.error(err.message); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browserProfile = await mkdtemp(path.join(tmpdir(), 'foodie-images-'));
const browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${browserProfile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, description) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) { try { if (await check()) return; } catch { /* navigating */ } await delay(100); }
  throw new Error(`Timed out: ${description}`);
}
let socket, send, evaluate;
try {
  let debugPort;
  await until(async () => { debugPort = Number((await readFile(path.join(browserProfile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); return debugPort > 0; }, 'browser startup');
  const tabs = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  socket = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  const pending = new Map(); let id = 0;
  send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(requestId, { resolve, reject, timer }); socket.send(JSON.stringify({ id: requestId, method, params }));
  });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Page.javascriptDialogOpening') {
      console.error('Browser dialog:', message.params.message);
      void send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    }
    if (message.method === 'Fetch.requestPaused') {
      const allowed = message.params.request.url.startsWith(origin + '/');
      void send(allowed ? 'Fetch.continueRequest' : 'Fetch.failRequest', { requestId: message.params.requestId, ...(!allowed ? { errorReason: 'BlockedByClient' } : {}) }).catch(() => {});
    }
    const request = pending.get(message.id);
    if (request) { clearTimeout(request.timer); pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result); }
  });
  await send('Page.enable'); await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  const desktop = { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false };
  await send('Emulation.setDeviceMetricsOverride', desktop);
  evaluate = async expression => { const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; };
  const navigate = route => send('Page.navigate', { url: origin + route });
  const imageReady = selector => evaluate(`(() => { const images = [...document.querySelectorAll(${JSON.stringify(selector)})]; images.forEach(i => i.loading = 'eager'); return images.length > 0 && images.every(i => i.complete && i.naturalWidth > 0); })()`);
  const screenshot = async name => {
    await evaluate('document.fonts.ready.then(() => true)');
    await delay(1600); // Let existing entrance animations finish before visual inspection.
    await writeFile(path.join(evidence, name + '.png'), Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  };
  await navigate('/');
  await until(() => imageReady('.home-page img'), 'home images');
  console.log('PASS home covers');
  await navigate('/nha-hang');
  await until(() => imageReady('img[src*="/uploads/restaurants/"]'), 'restaurant listing');
  console.log('PASS restaurant listing');
  for (const restaurant of restaurants) {
    await navigate('/nha-hang/' + restaurant.maNhaHang);
    await until(() => imageReady('.customer-food-image img'), `restaurant ${restaurant.maNhaHang} menu`);
    assert(await imageReady('img[src*="/uploads/restaurants/"]'));
  }
  console.log('PASS 10 restaurant details and menu images');
  await navigate('/nha-hang/1');
  await until(() => imageReady('.customer-food-image img'), 'first menu');
  await evaluate('document.querySelector(".customer-add-cart-button").click()');
  await until(() => imageReady('.food-option-image'), 'dish detail image');
  await screenshot('dish-desktop');
  console.log('PASS dish detail image');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert(await imageReady('.food-option-image'));
  assert(await evaluate('document.querySelector(".food-option-image").getBoundingClientRect().width <= innerWidth'));
  await screenshot('dish-mobile');
  await send('Emulation.setDeviceMetricsOverride', desktop);
  broken = true;
  await navigate('/nha-hang/1');
  await until(() => imageReady('.customer-food-image img[data-fallback="true"]'), 'food fallback');
  await until(() => imageReady('img[src$="restaurant-fallback.svg"]'), 'restaurant fallback');
  await evaluate('document.querySelector(".customer-add-cart-button").click()');
  await until(() => imageReady('.food-option-image[data-fallback="true"]'), 'dish fallback');
  console.log('PASS local 404 fallbacks and mobile sizing');
  broken = false;
  await evaluate('localStorage.setItem("token", "fixture-token")');
  await navigate('/gio-hang?maNhaHang=1');
  await until(() => imageReady('img[src*="/uploads/foods/"]'), 'cart image');
  await navigate('/thanh-toan?maGioHang=1');
  await until(() => imageReady('.checkout-compact-item-image img'), 'checkout image');
  console.log('PASS cart and checkout images');
  role = 'Quan';
  await navigate('/quan/menu');
  await until(() => imageReady('img[src*="/uploads/foods/"]'), 'owner menu');
  await navigate('/quan/thong-tin');
  await until(() => evaluate('!!document.querySelector("input[type=file]")'), 'cover upload form');
  assert.equal(await evaluate('!!document.querySelector("input[name=anhBia]")'), false);
  const selectCover = async () => { const document = await send('DOM.getDocument'); const { nodeId } = await send('DOM.querySelector', { nodeId: document.root.nodeId, selector: 'input[type=file]' }); await send('DOM.setFileInputFiles', { nodeId, files: [path.join(webroot, imagePath('restaurants', 2))] }); };
  uploadFailure = true;
  await selectCover();
  await until(() => evaluate('document.body.innerText.includes("Ảnh không hợp lệ (test)")'), 'upload error');
  assert.equal(profile.anhBia, imagePath('restaurants', 1));
  uploadFailure = false;
  await selectCover();
  await until(() => imageReady('img[src$="mock-upload.webp"]'), 'uploaded preview');
  assert.equal(profile.anhBia, imagePath('restaurants', 1), 'upload alone must not save profile');
  await evaluate('document.querySelector("button[type=submit]").click()');
  await until(() => saved?.anhBia === '/uploads/restaurants/mock-upload.webp', 'save uploaded cover');
  await until(() => evaluate('document.body.innerText.includes("Thông tin nhà hàng đã được cập nhật.") && !document.querySelector("button[type=submit]").disabled'), 'profile save completed');
  assert(await imageReady('.merchant-info-cover img[src$="mock-upload.webp"]'));
  assert.equal(uploadCount, 2);
  await screenshot('cover-upload');
  console.log('PASS cover upload error, retry, preview and Save');
  // Decode every demo asset in the browser while all external network is blocked.
  const allLoaded = await evaluate(`Promise.all(${JSON.stringify(catalog.map(x => x.path))}.map(src => new Promise(resolve => { const image = new Image(); image.onload = () => resolve(image.naturalWidth > 0); image.onerror = () => resolve(false); image.src = src; })))`);
  assert.equal(allLoaded.length, 134); assert(allLoaded.every(Boolean));
  console.log('PASS 134/134 WebP assets decoded offline');
  await writeFile(path.join(evidence, 'requests.json'), JSON.stringify([...new Set(requests)], null, 2));
} catch (error) {
  await writeFile(path.join(evidence, 'failed-requests.json'), JSON.stringify([...new Set(requests)], null, 2));
  if (evaluate) {
    const state = await evaluate('JSON.stringify({path: location.pathname, text: document.body.innerText})').catch(() => null);
    if (state) await writeFile(path.join(evidence, 'failed-page.json'), state);
  }
  throw error;
} finally {
  if (send) await send('Browser.close').catch(() => {});
  socket?.close(); if (browser.exitCode === null) browser.kill();
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
}
