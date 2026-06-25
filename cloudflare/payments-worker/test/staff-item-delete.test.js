import { describe, it, expect, vi, afterEach } from 'vitest';
import worker from '../src/index.js';

const ENV = {
  STAFF_SHARED_SECRET: 'test-secret',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
};

function delReq(id, { secret = 'test-secret' } = {}) {
  const headers = {};
  if (secret !== null) headers['X-Staff-Secret'] = secret;
  return new Request(`https://worker.example.com/v1/staff/voucher-items/${id}`, { method: 'DELETE', headers });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DELETE /v1/staff/voucher-items/:id', () => {
  it('deletes an item that has never been used', async () => {
    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async (url, opts = {}) => {
      calls.push({ url: String(url), method: opts.method || 'GET' });
      // First call: usage lookup → no vouchers reference this item
      if (String(url).includes('vouchers?voucher_item_id=eq.')) {
        return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      // Second call: the DELETE
      return new Response(null, { status: 204 });
    }));

    const res = await worker.fetch(delReq('item-abc'), ENV);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.deleted).toBe(true);
    // Confirms the usage check ran before the delete, and the delete actually fired
    expect(calls.some((c) => c.url.includes('vouchers?voucher_item_id=eq.item-abc'))).toBe(true);
    expect(calls.some((c) => c.method === 'DELETE' && c.url.includes('voucher_items?id=eq.item-abc'))).toBe(true);
  });

  it('refuses (409) to delete an item that has been issued, and does not call DELETE', async () => {
    const methods = [];
    vi.stubGlobal('fetch', vi.fn(async (url, opts = {}) => {
      methods.push(opts.method || 'GET');
      if (String(url).includes('vouchers?voucher_item_id=eq.')) {
        return new Response(JSON.stringify([{ voucher_id: 'UJ-AAAA-BBBB' }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(null, { status: 204 });
    }));

    const res = await worker.fetch(delReq('item-used'), ENV);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.used).toBe(true);
    expect(methods).not.toContain('DELETE');
  });

  it('rejects a request with no staff secret (401)', async () => {
    const res = await worker.fetch(delReq('item-abc', { secret: null }), ENV);
    expect(res.status).toBe(401);
  });

  it('rejects a request with a wrong staff secret (401)', async () => {
    const res = await worker.fetch(delReq('item-abc', { secret: 'nope' }), ENV);
    expect(res.status).toBe(401);
  });
});
