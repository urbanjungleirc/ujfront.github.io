import { describe, it, expect, vi, afterEach } from 'vitest';
import worker from '../src/index.js';

const ENV = {
  STAFF_SHARED_SECRET: 'test-secret',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

// Capture the body of the POST to the `vouchers` table.
function stubSupabase({ type, item }) {
  const inserted = [];
  vi.stubGlobal('fetch', vi.fn(async (url, opts = {}) => {
    const u = String(url);
    const ok = (body) => new Response(JSON.stringify(body), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });

    if (u.includes('/voucher_types?')) return ok([type]);
    if (u.includes('/voucher_items?')) return ok([item]);
    if (u.includes('/vouchers?')) return ok([]);          // code-collision check: free
    if (u.includes('/vouchers') && opts.method === 'POST') {
      const body = JSON.parse(opts.body);
      inserted.push(Array.isArray(body) ? body[0] : body);
      return ok([Array.isArray(body) ? body[0] : body]);
    }
    if (u.includes('/audit_log')) return ok([]);
    return ok([]);
  }));
  return inserted;
}

describe('amount_paid on staff-created vouchers', () => {
  it('records the item value as amount_paid for a revenue-class type', async () => {
    const inserted = stubSupabase({
      type: { type_id: 'physical_voucher', display_name: 'Physical', revenue_class: 'sale', expiry_months: 12, is_physical: true },
      item: { id: 'item_pv_cust', name: 'Custom', value: 75 },
    });

    const res = await worker.fetch(new Request('https://w.example.com/v1/vouchers', {
      method: 'POST',
      headers: { 'X-Staff-Secret': 'test-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voucher_type_id: 'physical_voucher',
        voucher_item_id: 'item_pv_cust',
        customer_name: 'Test Customer',
        issued_by: 'staff',
      }),
    }), ENV);

    expect(res.status).toBe(201);
    expect(inserted[0].amount_paid).toBe(75);
    expect(inserted[0].value).toBe(75);
  });

  it('records amount_paid as 0 for a credit-class type (no money changed hands)', async () => {
    const inserted = stubSupabase({
      type: { type_id: 'account_credit', display_name: 'Credit', revenue_class: 'credit', expiry_months: 12, is_physical: false },
      item: null,
    });

    const res = await worker.fetch(new Request('https://w.example.com/v1/vouchers', {
      method: 'POST',
      headers: { 'X-Staff-Secret': 'test-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voucher_type_id: 'account_credit',
        value: 50,
        customer_name: 'Test Customer',
        customer_email: 'test@example.com',
        issued_by: 'staff',
      }),
    }), ENV);

    expect(res.status).toBe(201);
    expect(inserted[0].amount_paid).toBe(0);
    expect(inserted[0].value).toBe(50);   // face value unchanged — it is still $50 of liability
  });

  it('records the item price (not face value) as amount_paid when the item is sold below face value', async () => {
    const inserted = stubSupabase({
      type: { type_id: 'physical_voucher', display_name: 'Physical', revenue_class: 'sale', expiry_months: 12, is_physical: true },
      item: { id: 'item_pv_promo', name: 'Promo item', value: 100, price: 80 },
    });

    const res = await worker.fetch(new Request('https://w.example.com/v1/vouchers', {
      method: 'POST',
      headers: { 'X-Staff-Secret': 'test-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voucher_type_id: 'physical_voucher',
        voucher_item_id: 'item_pv_promo',
        customer_name: 'Test Customer',
        issued_by: 'staff',
      }),
    }), ENV);

    expect(res.status).toBe(201);
    expect(inserted[0].amount_paid).toBe(80);   // what staff actually took
    expect(inserted[0].value).toBe(100);        // face value the customer can still spend
    expect(inserted[0].balance).toBe(100);       // liability tracks face value, not the discount
  });

  it('records the charged price as amount_paid for a promo_sale-class type (not 0, not face value)', async () => {
    const inserted = stubSupabase({
      type: { type_id: 'promo_voucher', display_name: 'Promo', revenue_class: 'promo_sale', expiry_months: 12, is_physical: true },
      item: { id: 'item_promo', name: 'Promo item', value: 100, price: 60 },
    });

    const res = await worker.fetch(new Request('https://w.example.com/v1/vouchers', {
      method: 'POST',
      headers: { 'X-Staff-Secret': 'test-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voucher_type_id: 'promo_voucher',
        voucher_item_id: 'item_promo',
        customer_name: 'Test Customer',
        issued_by: 'staff',
      }),
    }), ENV);

    expect(res.status).toBe(201);
    expect(inserted[0].amount_paid).toBe(60);   // what staff actually took
    expect(inserted[0].amount_paid).not.toBe(0);
    expect(inserted[0].value).toBe(100);        // face value the customer can still spend
  });

  it('records amount_paid as 0 for a genuinely free item (price = 0), not the face value', async () => {
    const inserted = stubSupabase({
      type: { type_id: 'physical_voucher', display_name: 'Physical', revenue_class: 'sale', expiry_months: 12, is_physical: true },
      item: { id: 'item_free', name: 'Free promo item', value: 100, price: 0 },
    });

    const res = await worker.fetch(new Request('https://w.example.com/v1/vouchers', {
      method: 'POST',
      headers: { 'X-Staff-Secret': 'test-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voucher_type_id: 'physical_voucher',
        voucher_item_id: 'item_free',
        customer_name: 'Test Customer',
        issued_by: 'staff',
      }),
    }), ENV);

    expect(res.status).toBe(201);
    expect(inserted[0].amount_paid).toBe(0);    // genuinely free — price=0 must not fall back to face value
    expect(inserted[0].value).toBe(100);        // face value the customer can still spend
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Stripe webhook path (fulfillVoucher) — the arithmetic that actually decides
// revenue. Not reachable through the staff-vouchers route above, so it needs
// its own request against /v1/webhooks/stripe with a real HMAC signature.
// ────────────────────────────────────────────────────────────────────────────

async function stripeSignatureHeader(secret, payload, timestamp = Math.floor(Date.now() / 1000)) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `t=${timestamp},v1=${hex}`;
}

// Stub the Supabase calls fulfillVoucher makes: the payment_reference
// idempotency check, the voucher_types lookup, the voucher_id code-collision
// check inside insertVoucherWithRetry, the vouchers insert, and audit_log.
function stubSupabaseForWebhook({ type }) {
  const inserted = [];
  vi.stubGlobal('fetch', vi.fn(async (url, opts = {}) => {
    const u = String(url);
    const method = opts.method || 'GET';
    const ok = (body) => new Response(JSON.stringify(body), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });

    if (u.includes('/voucher_types?')) return ok([type]);
    if (u.includes('/vouchers?payment_reference=')) return ok([]); // not yet fulfilled
    if (u.includes('/vouchers?voucher_id=')) return ok([]);        // code-collision check: free
    if (u.includes('/vouchers') && method === 'POST') {
      const body = JSON.parse(opts.body);
      inserted.push(Array.isArray(body) ? body[0] : body);
      return ok([Array.isArray(body) ? body[0] : body]);
    }
    if (u.includes('/audit_log')) return ok([]);
    return ok([]);
  }));
  return inserted;
}

const WEBHOOK_ENV = {
  ...ENV,
  STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
  RESEND_API_KEY: 'resend-test-key',
};

function makeCheckoutSession(overrides = {}) {
  return {
    id: `cs_test_${Math.random().toString(36).slice(2)}`,
    payment_status: 'paid',
    amount_total: 10000,
    metadata: {
      product: 'voucher',
      voucher_type_id: 'physical_voucher',
      voucher_item_id: 'item_1',
      voucher_value: '100',
    },
    ...overrides,
  };
}

async function postStripeWebhook(session) {
  const payload = JSON.stringify({ type: 'checkout.session.completed', data: { object: session } });
  const signature = await stripeSignatureHeader(WEBHOOK_ENV.STRIPE_WEBHOOK_SECRET, payload);
  return worker.fetch(new Request('https://w.example.com/v1/webhooks/stripe', {
    method: 'POST',
    headers: { 'Stripe-Signature': signature, 'Content-Type': 'application/json' },
    body: payload,
  }), WEBHOOK_ENV);
}

describe('amount_paid on Stripe-fulfilled vouchers (fulfillVoucher)', () => {
  it('records what Stripe actually charged, not the face value, on a promo-priced item', async () => {
    const inserted = stubSupabaseForWebhook({
      type: { type_id: 'physical_voucher', display_name: 'Physical', revenue_class: 'sale', expiry_months: 12 },
    });

    const res = await postStripeWebhook(makeCheckoutSession({ amount_total: 8000 }));

    expect(res.status).toBe(200);
    expect(inserted[0].amount_paid).toBe(80);
    expect(inserted[0].value).toBe(100);
  });

  it('falls back to the face value when amount_total is absent', async () => {
    const inserted = stubSupabaseForWebhook({
      type: { type_id: 'physical_voucher', display_name: 'Physical', revenue_class: 'sale', expiry_months: 12 },
    });

    const res = await postStripeWebhook(makeCheckoutSession({ amount_total: null }));

    expect(res.status).toBe(200);
    expect(inserted[0].amount_paid).toBe(100);
    expect(inserted[0].value).toBe(100);
  });

  it('records revenue for a promo_sale type, not just a plain sale', async () => {
    const inserted = stubSupabaseForWebhook({
      type: { type_id: 'physical_voucher', display_name: 'Physical', revenue_class: 'promo_sale', expiry_months: 12 },
    });

    const res = await postStripeWebhook(makeCheckoutSession({ amount_total: 5000 }));

    expect(res.status).toBe(200);
    expect(inserted[0].amount_paid).toBe(50);
    expect(inserted[0].amount_paid).not.toBe(0);
  });
});
