import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request, ApiError } from '../lib/api.ts';
test('request reports stale review conflicts with their HTTP status', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (_url, init) => {
    assert.equal(init.headers.get('Authorization'), 'Bearer token');
    assert.equal(init.headers.get('Content-Type'), 'application/json');
    assert.equal(init.cache, 'no-store');
    return Response.json({ detail: 'changed' }, { status: 409 });
  };
  await assert.rejects(request('/api/admin/review/1/edit', 'token', { method: 'POST', body: '{}' }), error => error instanceof ApiError && error.status === 409 && error.message.includes('重新載入'));
});
test('caller cancellation reaches fetch and remains a cancellation', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const controller = new AbortController();
  globalThis.fetch = async (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('cancelled', 'AbortError')), { once: true }));
  const pending = request('/api/exams', undefined, { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});
test('unreachable API gives a readable retry message', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => { throw new TypeError('network error'); };
  await assert.rejects(request('/api/exams'), error => error instanceof ApiError && error.status === 0 && error.message.includes('重試'));
});
