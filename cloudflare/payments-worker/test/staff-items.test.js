import { describe, it, expect, vi, afterEach } from 'vitest';
import worker from '../src/index.js';

const ENV = {
  STAFF_SHARED_SECRET: 'test-secret',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
};

function staffReq(path, { secret = 'test-secret', method = 'GET' } = {}) {
  const headers = {};
  if (secret !== null) headers['X-Staff-Secret'] = secret;
  return new Request(`https://worker.example.com${path}`, { method, headers });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GET /v1/staff/voucher-types/:typeId/items', () => {
  it('returns all items (including inactive) and omits the is_active filter', async () => {
    let calledUrl = '';
    const items = [
      { id: 1, voucher_type: 'gift_voucher', is_active: true, display_order: 1 },
      { id: 2, voucher_type: 'gift_voucher', is_active: false, display_order: 2 },
    ];

    vi.stubGlobal('fetch', vi.fn(async (url) => {
      calledUrl = String(url);
      return new Response(JSON.stringify(items), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));

    const res = await worker.fetch(staffReq('/v1/staff/voucher-types/gift_voucher/items'), ENV);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(2);
    expect(body.some((i) => i.is_active === false)).toBe(true);
    expect(calledUrl).toContain('voucher_items?voucher_type=eq.gift_voucher');
    expect(calledUrl).not.toContain('is_active=eq.true');
    expect(calledUrl).toContain('order=display_order.asc');
  });

  it('rejects a request with no staff secret (401)', async () => {
    const res = await worker.fetch(staffReq('/v1/staff/voucher-types/gift_voucher/items', { secret: null }), ENV);
    expect(res.status).toBe(401);
  });

  it('rejects a request with a wrong staff secret (401)', async () => {
    const res = await worker.fetch(staffReq('/v1/staff/voucher-types/gift_voucher/items', { secret: 'nope' }), ENV);
    expect(res.status).toBe(401);
  });
});
