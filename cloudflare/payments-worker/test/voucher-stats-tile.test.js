import { describe, it, expect, vi, afterEach } from 'vitest';
import worker from '../src/index.js';

// GET /v1/vouchers/stats — the staff dashboard's summary tiles.
//
// The bug this pins down: `status` is a STORED column that nothing flips when a
// voucher's expiry date passes, so the book is full of rows still marked 'active'
// that expired years ago. Summing their balance as outstanding liability overstated
// it by ~$11.4k in production ($42,496.77 against a real $30,881.39) and directly
// contradicted the stats page, which correctly writes those dollars off as breakage.
//
// Second thing pinned here: "today" is a PERTH day. Perth is UTC+8, so for the first
// eight hours of every Perth day the UTC date is still yesterday — which used to make
// a voucher that expired yesterday-in-Perth still count as live all morning.

const ENV = {
  STAFF_SHARED_SECRET: 'test-secret',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
};

function stubVouchers(activeRows) {
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    const u = String(url);
    const ok = (b) => new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (u.includes('status=eq.active')) return ok(activeRows);
    return ok([]);   // today_issued / today_redeemed — not what these tests are about
  }));
}

function statsReq({ secret = 'test-secret' } = {}) {
  const headers = {};
  if (secret !== null) headers['X-Staff-Secret'] = secret;
  return new Request('https://w.example.com/v1/vouchers/stats', { headers });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('GET /v1/vouchers/stats — expired vouchers are not live liability', () => {
  it('excludes past-expiry vouchers from active_total_value and active_count', async () => {
    // 10:00 on 14 July 2026, Perth time.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-14T02:00:00Z'));

    stubVouchers([
      { balance: 100, expiry_date: '2026-12-31' },   // live
      { balance: 50,  expiry_date: '2026-01-01' },   // EXPIRED — still status 'active' in the DB
      { balance: 25,  expiry_date: '2026-07-14' },   // expires today: still redeemable all day
      { balance: 10,  expiry_date: null },           // never expires
    ]);

    const res = await worker.fetch(statsReq(), ENV);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.active_total_value).toBe(135);   // 100 + 25 + 10 — the $50 has expired
    expect(body.active_count).toBe(3);
    // A voucher expiring today is inside the 30-day window, so it is also "expiring soon".
    expect(body.expiring_soon_count).toBe(1);
  });

  it('treats a voucher expiring TODAY as live (boundary — it is redeemable all day)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-14T02:00:00Z'));

    stubVouchers([{ balance: 40, expiry_date: '2026-07-14' }]);

    const res = await worker.fetch(statsReq(), ENV);
    const body = await res.json();

    expect(body.active_total_value).toBe(40);
    expect(body.active_count).toBe(1);
  });

  it('expires on the PERTH day, not the UTC one', async () => {
    // 01:00 on 14 July in Perth — but still 13 July in UTC. A voucher whose expiry
    // was 13 July is done: yesterday, in the only timezone the gym operates in.
    // Reading the date in UTC would have called it live for another seven hours.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-13T17:00:00Z'));

    stubVouchers([
      { balance: 70, expiry_date: '2026-07-13' },   // expired yesterday, Perth
      { balance: 30, expiry_date: '2026-07-14' },   // expires today, Perth
    ]);

    const res = await worker.fetch(statsReq(), ENV);
    const body = await res.json();

    expect(body.active_total_value).toBe(30);
    expect(body.active_count).toBe(1);
  });

  it('rejects an unauthenticated request', async () => {
    stubVouchers([]);
    const res = await worker.fetch(statsReq({ secret: null }), ENV);
    expect(res.status).toBe(401);
  });
});
