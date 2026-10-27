import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) {
    if (specifier.startsWith('./') && context.parentURL?.endsWith('.ts') && !specifier.endsWith('.ts'))
        return next(specifier + '.ts', context);
    return next(specifier, context);
} });
class Storage {
    getItem(k) { return this[k] ?? null; }
    setItem(k, v) { this[k] = String(v); }
    removeItem(k) { delete this[k]; }
}
const { beginCheckout, getPendingCheckout, submitCheckout } = await import('../src/services/checkoutAttempt.ts');
const payload = { maGioHang: 1, maDiaChi: 2, maPhuongThuc: 5, maKhuyenMai: null, ghiChu: 'Không cay' };
beforeEach(() => {
    globalThis.localStorage = new Storage(); globalThis.sessionStorage = new Storage();
    localStorage.setItem('token', 'test-session-only');
});
const success = () => new Response(JSON.stringify({ maDonHang: 9, maThanhToan: 10 }), { status: 201 });
test('persist minimal payload/key before request, never JWT/address text/balance', async () => {
    const a = await beginCheckout(payload);
    assert.deepEqual((await getPendingCheckout()).payload, payload);
    assert.match(a.key, /^[0-9a-f-]{36}$/);
    assert.ok(!JSON.stringify(sessionStorage).includes('test-session-only'));
    assert.deepEqual(Object.keys(a).sort(), ['createdAt', 'key', 'payload']);
});
test('lost response retains exact payload/key; recovery succeeds and clears pending + legacy key', async () => {
    const a = await beginCheckout(payload); const sent = [];
    globalThis.fetch = async (_, options) => { sent.push(options); if (sent.length === 1) throw new TypeError('Failed to fetch'); return success(); };
    await assert.rejects(submitCheckout(a));
    const retry = await beginCheckout({ ...payload, maPhuongThuc: 1 });
    assert.deepEqual(retry, a);
    assert.equal((await submitCheckout(retry)).maDonHang, 9);
    assert.equal(sent[0].body, sent[1].body);
    assert.equal(sent[0].headers['Idempotency-Key'], sent[1].headers['Idempotency-Key']);
    assert.equal(await getPendingCheckout(), null);
    assert.deepEqual(Object.keys(sessionStorage), []);
    assert.notEqual((await beginCheckout(payload)).key, a.key, 'a resolved attempt must not reuse its key for a new checkout');
});
test('400/409/500 do not discard an unresolved attempt or mint a new key', async () => {
    const a = await beginCheckout(payload);
    for (const status of [400, 409, 500]) {
        globalThis.fetch = async () => new Response(JSON.stringify({ message: 'Test rejection' }), { status });
        await assert.rejects(submitCheckout(a));
        assert.deepEqual(await getPendingCheckout(), a);
    }
});
test('simultaneous replay in one page shares a single request', async () => {
    const a = await beginCheckout(payload); let finish, count = 0;
    globalThis.fetch = () => { count++; return new Promise(resolve => { finish = resolve; }); };
    const first = submitCheckout(a), second = submitCheckout(a);
    await new Promise(resolve => setTimeout(resolve, 20)); finish(success());
    assert.deepEqual(await first, await second); assert.equal(count, 1);
});
test('expired pending is pruned; another session cannot recover it', async () => {
    const a = await beginCheckout(payload); const key = Object.keys(sessionStorage).find(k => k.startsWith('foodie:'));
    localStorage.setItem('token', 'another-test-session');
    assert.equal(await getPendingCheckout(), null);
    localStorage.setItem('token', 'test-session-only');
    sessionStorage.setItem(key, JSON.stringify({ ...a, createdAt: Date.now() - 86400001 }));
    assert.equal(await getPendingCheckout(), null); assert.equal(sessionStorage.getItem(key), null);
});
test('malformed pending is rejected instead of sent', async () => {
    await beginCheckout(payload); const key = Object.keys(sessionStorage).find(k => k.startsWith('foodie:'));
    sessionStorage.setItem(key, JSON.stringify({ key: 'wrong', createdAt: Date.now(), payload }));
    await assert.rejects(getPendingCheckout()); assert.equal(sessionStorage.getItem(key), null);
});
test('storage cleanup failure does not turn a verified order into a checkout error', async () => {
    const a = await beginCheckout(payload);
    globalThis.fetch = async () => success();
    sessionStorage.removeItem = () => { throw new Error('Storage unavailable'); };
    assert.equal((await submitCheckout(a)).maDonHang, 9);
    assert.equal((await getPendingCheckout()).key, a.key);
});
