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

describe('GET /v1/staff/voucher-types', () => {
  it('returns all types (including inactive), full fields, and omits the is_active filter', async () => {
    let calledUrl = '';
    const types = [
      { type_id: 'gift_voucher', display_name: 'Gift', is_active: true, sort_order: 0, email_body: 'hi', accent_color: '#ae222a' },
      { type_id: 'old_promo', display_name: 'Old', is_active: false, sort_order: 1, email_body: null, accent_color: '#123456' },
    ];

    vi.stubGlobal('fetch', vi.fn(async (url) => {
      calledUrl = String(url);
      return new Response(JSON.stringify(types), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));

    const res = await worker.fetch(staffReq('/v1/staff/voucher-types'), ENV);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(2);
    expect(body.some((t) => t.is_active === false)).toBe(true);
    expect(calledUrl).toContain('voucher_types?');
    expect(calledUrl).not.toContain('is_active=eq.true');
    expect(calledUrl).toContain('select=*');
    expect(calledUrl).toContain('order=sort_order.asc');
  });

  it('rejects a request with no staff secret (401)', async () => {
    const res = await worker.fetch(staffReq('/v1/staff/voucher-types', { secret: null }), ENV);
    expect(res.status).toBe(401);
  });

  it('rejects a request with a wrong staff secret (401)', async () => {
    const res = await worker.fetch(staffReq('/v1/staff/voucher-types', { secret: 'nope' }), ENV);
    expect(res.status).toBe(401);
  });
});
