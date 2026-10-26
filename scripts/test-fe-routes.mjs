// Browser smoke tests of built FE only. All APIs are synthetic; external requests blocked.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdtemp, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { tmpdir } from 'node:os';

const root = fileURLToPath(new URL('../FE/dist/', import.meta.url));
const browserPath = process.env.FOODIE_TEST_BROWSER || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
await stat(browserPath);
await stat(path.join(root, 'index.html'));
const requested = [];
let failLoginChunk = false;
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    requested.push(pathname);
    res.setHeader('Cache-Control', 'no-store');
    if (failLoginChunk && /\/assets\/Login-[^/]+\.js$/.test(pathname)) { res.writeHead(503); res.end('synthetic chunk failure'); return; }
    if (pathname.startsWith('/api/') || pathname.startsWith('/hubs/')) {
      res.setHeader('Content-Type', 'application/json');
      if (pathname === '/api/auth/me') { res.writeHead(401); res.end('{"message":"Synthetic unauthorized"}'); }
      else res.end(JSON.stringify({ items: [], totalItems: 0, totalPages: 0, pageNumber: 1, pageSize: 12 }));
      return;
    }
    const asset = pathname.startsWith('/assets/');
    const target = asset ? path.resolve(root, '.' + pathname) : path.join(root, 'index.html');
    if (!target.startsWith(root)) { res.writeHead(403); res.end(); return; }
    const extension = path.extname(target);
    res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.woff': 'font/woff', '.woff2': 'font/woff2' }[extension] || 'application/octet-stream');
    res.end(await readFile(target));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const profile = await mkdtemp(path.join(tmpdir(), 'foodie-fe-audit-'));
const browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, description) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) { try { if (await check()) return; } catch { /* page may be navigating */ } await delay(100); }
  throw new Error(`Timed out: ${description}`);
}
let socket;
let send;
try {
  let debugPort;
  await until(async () => { debugPort = Number((await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); return debugPort > 0; }, 'headless browser startup');
  const tabs = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  const pending = new Map();
  let id = 0;
  send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`CDP timeout: ${method}`)); }, 5000);
    pending.set(requestId, { resolve, reject, timer });
    socket.send(JSON.stringify({ id: requestId, method, params }));
  });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Fetch.requestPaused') {
      const allowed = message.params.request.url.startsWith(origin + '/');
      void send(allowed ? 'Fetch.continueRequest' : 'Fetch.failRequest', { requestId: message.params.requestId, ...(!allowed ? { errorReason: 'BlockedByClient' } : {}) }).catch(() => {});
    }
    const request = pending.get(message.id);
    if (request) { clearTimeout(request.timer); pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result); }
  });
  await send('Page.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  const evaluate = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true })).result.value;
  const navigate = route => send('Page.navigate', { url: origin + route });

  await navigate('/');
  await until(() => evaluate('document.querySelector("h1") !== null'), 'home renders');
  assert(!requested.some(value => /\/assets\/(Admin|RestaurantLayout|Checkout|Login)-/.test(value)), 'home must not eagerly fetch management/checkout/login chunks');
  console.log('PASS home renders without protected-page chunks');

  await navigate('/dang-nhap');
  await until(() => evaluate('!!document.querySelector("input[type=password]")'), 'lazy login');
  console.log('PASS lazy login renders');

  await navigate('/admin/doi-soat');
  await until(() => evaluate('document.body.innerText.includes("Bạn không có quyền truy cập")'), 'admin denial');
  assert(!requested.some(value => value.startsWith('/api/admin/doi-soat')), 'denied layout must not render reconciliation API consumer');
  console.log('PASS unauthenticated admin remains denied');

  await navigate('/quan/doi-soat');
  await until(() => evaluate('location.pathname === "/dang-nhap" && !!document.querySelector("input[type=password]")'), 'restaurant guard');
  console.log('PASS unauthenticated restaurant redirects');

  failLoginChunk = true;
  await navigate('/dang-nhap');
  await until(() => evaluate('!!document.querySelector("[role=alert]")'), 'chunk-error boundary');
  assert(await evaluate('document.body.innerText.includes("Không thể tải trang")'));
  console.log('PASS failed chunk has recoverable error UI');
  failLoginChunk = false;
  await evaluate('[...document.querySelectorAll("button")].find(button => button.textContent === "Tải lại trang").click()');
  await until(() => evaluate('!!document.querySelector("input[type=password]")'), 'reload retry');
  console.log('PASS reload recovers after chunk failure');
} finally {
  if (send) await send('Browser.close').catch(() => {});
  socket?.close();
  if (browser.exitCode === null) browser.kill();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
