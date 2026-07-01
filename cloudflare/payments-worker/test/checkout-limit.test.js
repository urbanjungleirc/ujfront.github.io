import { describe, it, expect, vi, afterEach } from 'vitest';
import worker from '../src/index.js';

const ENV = {
  STRIPE_SECRET_KEY: 'sk_test_x',
  PUBLIC_BASE_URL: 'https://vouchers.example.com',
  VOUCHER_BASE_URL: 'https://vouchers.example.com',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  ALLOWED_ORIGINS: 'https://vouchers.example.com',
};

const json200 = (obj) =>
  new Response(JSON.stringify(obj), { status: 200, headers: { 'Content-Type': 'application/json' } });

// Stub fetch for the three Supabase reads + the Stripe session create.
// `priorCount` = how many purchase_tracking rows already exist for this buyer.
function stubFetch({ priorCount = 0, type = {} } = {}) {
  const calls = [];
  const vt = {
    type_id: 'gift',
    display_name: 'Gift Certificate',
    is_active: true,
    availability: 'both',
    max_per_customer: 1,
    limit_period: 'lifetime',
    expiry_months: 12,
    ...type,
  };
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    const u = String(url);
    calls.push(u);
    if (u.includes('voucher_types?type_id=eq.')) return json200([vt]);
    if (u.includes('voucher_items?id=eq.')) {
      return json200([{ id: 'item-1', name: '$50 Gift Certificate', value: 50, is_active: true }]);
    }
    if (u.includes('purchase_tracking')) {
      return json200(Array.from({ length: priorCount }, (_, i) => ({ id: 'pt-' + i })));
    }
    if (u.includes('api.stripe.com')) {
      return json200({ id: 'cs_test_1', url: 'https://checkout.stripe.com/pay/cs_test_1' });
    }
    return new Response('unexpected fetch: ' + u, { status: 500 });
  }));
  return calls;
}

function checkoutReq(body, { origin = 'https://vouchers.example.com' } = {}) {
  return new Request('https://worker.example.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(body),
  });
}

const base = { product: 'voucher', voucher_type_id: 'gift', voucher_item_id: 'item-1' };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('POST /v1/checkout/sessions — per-customer purchase limit', () => {
  it('creates a Stripe session when the customer is under the limit', async () => {
    const calls = stubFetch({ priorCount: 0 });
    const res = await worker.fetch(checkoutReq({ ...base, customer_email: 'A@Example.com' }), ENV);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toContain('checkout.stripe.com');
    expect(calls.some((u) => u.includes('api.stripe.com'))).toBe(true);
  });

  it('blocks with 409 when the lifetime limit is reached and never calls Stripe', async () => {
    const calls = stubFetch({ priorCount: 1 }); // max_per_customer is 1
    const res = await worker.fetch(checkoutReq({ ...base, customer_email: 'a@example.com' }), ENV);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.code).toBe('purchase_limit_reached');
    expect(calls.some((u) => u.includes('api.stripe.com'))).toBe(false);
  });

  it('requires an email when the type is limited (400, no Stripe call)', async () => {
    const calls = stubFetch({ priorCount: 0 });
    const res = await worker.fetch(checkoutReq({ ...base }), ENV); // no customer_email
    expect(res.status).toBe(400);
    expect(calls.some((u) => u.includes('api.stripe.com'))).toBe(false);
  });

  it('skips the limit check entirely for unlimited types (max_per_customer null)', async () => {
    const calls = stubFetch({ priorCount: 5, type: { max_per_customer: null, limit_period: null } });
    const res = await worker.fetch(checkoutReq({ ...base, customer_email: 'a@example.com' }), ENV);

    expect(res.status).toBe(200);
    expect(calls.some((u) => u.includes('purchase_tracking'))).toBe(false);
    expect(calls.some((u) => u.includes('api.stripe.com'))).toBe(true);
  });
});
