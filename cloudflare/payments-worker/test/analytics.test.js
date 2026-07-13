import { describe, it, expect, vi, afterEach } from 'vitest';
import worker from '../src/index.js';

const ENV = {
  STAFF_SHARED_SECRET: 'test-secret',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
};

function req(qs, { secret = 'test-secret' } = {}) {
  const headers = {};
  if (secret !== null) headers['X-Staff-Secret'] = secret;
  return new Request(`https://w.example.com/v1/vouchers/analytics${qs}`, { headers });
}

// Two months, one type. Liability is NOT returned by SQL — the Worker accumulates it.
const MONTHS = [
  { month: '2026-05-01', voucher_type_id: 'gift_voucher', revenue_class: 'sale',
    sold_count: 2, revenue: 150, face_value_issued: 150, redeemed_value: 50, expired_value: 0 },
  { month: '2026-06-01', voucher_type_id: 'gift_voucher', revenue_class: 'sale',
    sold_count: 1, revenue: 100, face_value_issued: 100, redeemed_value: 20, expired_value: 10 },
];

function stubRpc(months = MONTHS, opening = 0) {
  const calls = [];
  vi.stubGlobal('fetch', vi.fn(async (url, opts = {}) => {
    const u = String(url);
    calls.push({ url: u, body: opts.body ? JSON.parse(opts.body) : null });
    const ok = (b) => new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });
    // Scalar-returning RPC: PostgREST returns the bare number, not an array.
    if (u.includes('voucher_opening_liability')) return ok(opening);
    if (u.includes('voucher_monthly_stats'))   return ok(months);
    if (u.includes('voucher_window_summary'))  return ok([{ redemption_rate: 62.5, full_redemption_rate: 40, median_days_to_redeem: 34.5, avg_voucher_value: 83.33 }]);
    if (u.includes('voucher_item_mix'))        return ok([{ item_id: 'item_gv_100', item_name: '$100 Gift Certificate', units: 1, revenue: 100 }]);
    if (u.includes('voucher_cohorts'))         return ok([{ cohort_month: '2026-05-01', issued_value: 150, redeemed_by_1m: 50, redeemed_by_3m: 50, redeemed_by_6m: 50, redeemed_by_12m: 50 }]);
    return ok([]);
  }));
  return calls;
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('GET /v1/vouchers/analytics', () => {
  it('rejects an unauthenticated request', async () => {
    stubRpc();
    const res = await worker.fetch(req('?from=2026-05&to=2026-06', { secret: null }), ENV);
    expect(res.status).toBe(401);
  });

  it('returns months, summary, items and cohorts', async () => {
    stubRpc();
    const res = await worker.fetch(req('?from=2026-05&to=2026-06'), ENV);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.months).toHaveLength(2);
    expect(body.summary.redemption_rate).toBe(62.5);
    expect(body.items[0].item_name).toBe('$100 Gift Certificate');
    expect(body.cohorts[0].issued_value).toBe(150);
  });

  it('accumulates liability_close across months', async () => {
    stubRpc();
    const res = await worker.fetch(req('?from=2026-05&to=2026-06'), ENV);
    const body = await res.json();

    // May:  150 issued − 50 redeemed − 0 expired            = 100
    // June: 100 + (100 issued − 20 redeemed − 10 expired)   = 170
    expect(body.months[0].liability_close).toBe(100);
    expect(body.months[1].liability_close).toBe(170);
  });

  it('seeds liability_close from the opening balance, not from zero', async () => {
    // The window's flows are identical to the test above; only the opening differs.
    // Without seeding, a 24-month window would count redemptions of vouchers issued
    // BEFORE it while ignoring their issuance — driving the curve negative.
    stubRpc(MONTHS, 1000);
    const res = await worker.fetch(req('?from=2026-05&to=2026-06'), ENV);
    const body = await res.json();

    expect(body.opening_liability).toBe(1000);
    expect(body.months[0].liability_close).toBe(1100);   // 1000 + 100
    expect(body.months[1].liability_close).toBe(1170);   // 1100 + 70
  });

  it('passes type and class filters through to the RPC', async () => {
    const calls = stubRpc();
    await worker.fetch(req('?from=2026-05&to=2026-06&type=open_pass&class=promo_sale'), ENV);

    const monthly = calls.find((c) => c.url.includes('voucher_monthly_stats'));
    expect(monthly.body.p_type).toBe('open_pass');
    expect(monthly.body.p_class).toBe('promo_sale');
    expect(monthly.body.p_from).toBe('2026-05-01');
    expect(monthly.body.p_to).toBe('2026-06-01');
  });

  it('rejects a malformed month (400) rather than passing it to Postgres', async () => {
    stubRpc();
    const res = await worker.fetch(req('?from=last-tuesday&to=2026-06'), ENV);
    expect(res.status).toBe(400);
  });

  it('rejects an unknown revenue class (400)', async () => {
    stubRpc();
    const res = await worker.fetch(req('?from=2026-05&to=2026-06&class=free_stuff'), ENV);
    expect(res.status).toBe(400);
  });

  it('rejects from later than to (400)', async () => {
    stubRpc();
    const res = await worker.fetch(req('?from=2026-06&to=2026-05'), ENV);
    expect(res.status).toBe(400);
  });

  it('fails loudly (500) instead of silently seeding zero when opening balance is null', async () => {
    // A PostgREST hiccup / renamed RPC / function regression could return null.
    // Silently falling back to 0 would recreate the exact failure this endpoint
    // exists to prevent: the liability curve driven deeply negative.
    stubRpc(MONTHS, null);
    const res = await worker.fetch(req('?from=2026-05&to=2026-06'), ENV);
    expect(res.status).toBe(500);
  });

  it('keeps a NULL 12-month cohort figure as null, not 0', async () => {
    // A young cohort hasn't reached the 12-month mark yet — the SQL correctly
    // returns NULL. Coercing to 0 would falsely claim it had a full year to redeem.
    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async (url, opts = {}) => {
      const u = String(url);
      calls.push({ url: u, body: opts.body ? JSON.parse(opts.body) : null });
      const ok = (b) => new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (u.includes('voucher_opening_liability')) return ok(0);
      if (u.includes('voucher_monthly_stats'))   return ok(MONTHS);
      if (u.includes('voucher_window_summary'))  return ok([{ redemption_rate: 62.5, full_redemption_rate: 40, median_days_to_redeem: 34.5, avg_voucher_value: 83.33 }]);
      if (u.includes('voucher_item_mix'))        return ok([{ item_id: 'item_gv_100', item_name: '$100 Gift Certificate', units: 1, revenue: 100 }]);
      if (u.includes('voucher_cohorts'))          return ok([{ cohort_month: '2026-06-01', issued_value: 100, redeemed_by_1m: null, redeemed_by_3m: null, redeemed_by_6m: null, redeemed_by_12m: null, cohort_age_days: 12 }]);
      return ok([]);
    }));

    const res = await worker.fetch(req('?from=2026-05&to=2026-06'), ENV);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.cohorts[0].redeemed_by_12m).toBeNull();
    expect(body.cohorts[0].cohort_age_days).toBe(12);
  });

  it('passes through an all-NULL summary row without fabricating zeros', async () => {
    // voucher_window_summary returns a SINGLE all-NULL row (not zero rows)
    // when the window has no vouchers at all.
    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async (url, opts = {}) => {
      const u = String(url);
      calls.push({ url: u, body: opts.body ? JSON.parse(opts.body) : null });
      const ok = (b) => new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (u.includes('voucher_opening_liability')) return ok(0);
      if (u.includes('voucher_monthly_stats'))   return ok([]);
      if (u.includes('voucher_window_summary'))  return ok([{ redemption_rate: null, full_redemption_rate: null, median_days_to_redeem: null, avg_voucher_value: null }]);
      if (u.includes('voucher_item_mix'))        return ok([]);
      if (u.includes('voucher_cohorts'))         return ok([]);
      return ok([]);
    }));

    const res = await worker.fetch(req('?from=2026-05&to=2026-06'), ENV);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.summary).toEqual({
      redemption_rate: null,
      full_redemption_rate: null,
      median_days_to_redeem: null,
      avg_voucher_value: null,
    });
  });

  it('treats a whitespace-only type filter as unfiltered', async () => {
    const calls = stubRpc();
    const res = await worker.fetch(req('?from=2026-05&to=2026-06&type=%20'), ENV);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.type).toBeNull();
    const monthly = calls.find((c) => c.url.includes('voucher_monthly_stats'));
    expect(monthly.body.p_type).toBeNull();
  });
});
