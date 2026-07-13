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
});
