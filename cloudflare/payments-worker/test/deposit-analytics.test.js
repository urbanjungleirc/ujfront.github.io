import { describe, it, expect, vi, afterEach } from 'vitest';
import worker from '../src/index.js';

// The deposit success URL is what the browser sees on return from Stripe. It is the only
// channel the GA4 `deposit_purchase` event has for its transaction id and value — the Sheet
// is fulfilled server-side by the webhook and never reaches the page. See deposits.html.

const ORIGIN = 'https://tools.example.com';

const ENV = {
  STRIPE_SECRET_KEY: 'sk_test_x',
  PUBLIC_BASE_URL: ORIGIN,
  ALLOWED_ORIGINS: ORIGIN,
};

const json200 = (obj) =>
  new Response(JSON.stringify(obj), { status: 200, headers: { 'Content-Type': 'application/json' } });

// Capture the form body the Worker sends to Stripe so we can read success_url back out.
function stubStripe() {
  const sent = [];
  vi.stubGlobal('fetch', vi.fn(async (url, init) => {
    const u = String(url);
    if (u.includes('api.stripe.com')) {
      sent.push(new URLSearchParams(String(init.body)));
      return json200({ id: 'cs_test_1', url: 'https://checkout.stripe.com/pay/cs_test_1' });
    }
    return new Response('unexpected fetch: ' + u, { status: 500 });
  }));
  return sent;
}

function depositReq(overrides = {}) {
  return new Request('https://worker.example.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({
      product: 'deposit',
      name: 'Test Organiser',
      email: 'organiser@example.com',
      event_date: '2030-01-01',
      event_time: '10:00',
      event_time_label: '10:00 AM',
      ...overrides,
    }),
  });
}

// Read the success_url the Worker asked Stripe for.
async function successUrl(env = ENV) {
  const sent = stubStripe();
  const res = await worker.fetch(depositReq(), env);
  expect(res.status).toBe(200);
  return new URL(sent[0].get('success_url'));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('deposit success_url — GA4 purchase payload', () => {
  it('carries the Stripe session id placeholder as the transaction id', async () => {
    const url = await successUrl();
    expect(url.pathname).toBe('/deposits.html');
    expect(url.searchParams.get('payment')).toBe('success');
    // Stripe substitutes this server-side; it must survive URL encoding intact.
    expect(url.searchParams.get('session_id')).toBe('{CHECKOUT_SESSION_ID}');
  });

  it('carries the total charged and the deposit component as dollar amounts', async () => {
    const url = await successUrl();
    // Defaults: $100.00 deposit + $2.90 processing fee.
    expect(url.searchParams.get('value')).toBe('102.90');
    expect(url.searchParams.get('deposit')).toBe('100.00');
    expect(url.searchParams.get('currency')).toBe('AUD');
  });

  it('reflects env overrides rather than hardcoded amounts', async () => {
    const url = await successUrl({
      ...ENV,
      DEPOSIT_AMOUNT_CENTS: '15000',
      DEPOSIT_FEE_CENTS: '450',
      DEPOSIT_CURRENCY: 'nzd',
    });
    expect(url.searchParams.get('value')).toBe('154.50');
    expect(url.searchParams.get('deposit')).toBe('150.00');
    expect(url.searchParams.get('currency')).toBe('NZD');
  });

  it('keeps the cancel URL free of analytics params', async () => {
    const sent = stubStripe();
    await worker.fetch(depositReq(), ENV);
    const cancel = new URL(sent[0].get('cancel_url'));
    expect(cancel.searchParams.get('payment')).toBe('cancelled');
    expect(cancel.searchParams.get('value')).toBeNull();
  });
});
