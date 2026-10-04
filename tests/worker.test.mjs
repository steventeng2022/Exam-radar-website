import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../workers/index.ts';

const assets = { fetch: async () => new Response('static page') };

test('page requests use static assets without requiring API configuration', async () => {
  const response = await worker.fetch(new Request('https://website.example/compare/'), { ASSETS: assets });
  assert.equal(await response.text(), 'static page');
});

test('missing, insecure and recursive API origins fail with 503', async () => {
  for (const origin of [undefined, 'http://backend.example', 'https://website.example', 'https://backend.example/api']) {
    const response = await worker.fetch(new Request('https://website.example/api/exams'), { ASSETS: assets, API_ORIGIN: origin });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
});

test('GET preserves API path and query, strips cookies and disables API caching', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (target, init) => {
    assert.equal(target.href, 'https://backend.example/api/exams?grade=11');
    assert.equal(init.headers.get('Cookie'), null);
    assert.ok(init.signal instanceof AbortSignal);
    return Response.json({ items: [] }, { headers: { 'Set-Cookie': 'session=x' } });
  };
  const response = await worker.fetch(new Request('https://website.example/api/exams?grade=11', {
    headers: { Cookie: 'private-browser-cookie' },
  }), { ASSETS: assets, API_ORIGIN: 'https://backend.example' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Set-Cookie'), null);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('unsupported API methods fail before contacting upstream', async () => {
  const response = await worker.fetch(new Request('https://website.example/api/exams', { method: 'DELETE' }), { ASSETS: assets, API_ORIGIN: 'https://backend.example' });
  assert.equal(response.status, 405);
  assert.ok(response.headers.get('Allow').includes('POST'));
});

test('admin POST preserves bearer token and body', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (target, init) => {
    assert.equal(target.pathname, '/api/admin/review/1/approve');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.get('Authorization'), 'Bearer test-token');
    assert.equal(await new Response(init.body).text(), '{}');
    assert.equal(init.redirect, 'manual');
    return Response.json({ status: 'approved' });
  };
  const response = await worker.fetch(new Request('https://website.example/api/admin/review/1/approve', {
    method: 'POST', body: '{}', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
  }), { ASSETS: assets, API_ORIGIN: 'https://backend.example' });
  assert.equal(response.status, 200);
});

test('upstream redirects and fetch errors become 502', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  for (const fetcher of [async () => new Response(null, { status: 302, headers: { Location: 'https://other.example' } }), async () => { throw new Error('unreachable'); }]) {
    globalThis.fetch = fetcher;
    const response = await worker.fetch(new Request('https://website.example/api/health'), { ASSETS: assets, API_ORIGIN: 'https://backend.example' });
    assert.equal(response.status, 502);
  }
});
