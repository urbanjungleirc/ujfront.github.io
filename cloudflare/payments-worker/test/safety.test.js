import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  rpcErrorParts, staffSecretMatches,
  randomVoucherCode, isUniqueViolation, insertVoucherWithRetry,
} from '../src/index.js';

describe('randomVoucherCode', () => {
  it('always matches UJ-XXXX-XXXX with the unambiguous alphabet', () => {
    for (let i = 0; i < 200; i++) {
      expect(randomVoucherCode()).toMatch(/^UJ-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    }
  });
});

describe('isUniqueViolation', () => {
  it('detects a 23505 on the named constraint', () => {
    const err = new Error('Supabase POST vouchers failed (409): {"code":"23505","message":"duplicate key value violates unique constraint \\"vouchers_pkey\\""}');
    expect(isUniqueViolation(err, 'vouchers_pkey')).toBe(true);
    expect(isUniqueViolation(err, 'vouchers_payment_reference_key')).toBe(false);
  });
  it('ignores non-unique errors', () => {
    expect(isUniqueViolation(new Error('Supabase POST vouchers failed (500): boom'), 'vouchers_pkey')).toBe(false);
  });
});

describe('insertVoucherWithRetry', () => {
  const env = { SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_ROLE_KEY: 'k' };
  afterEach(() => vi.unstubAllGlobals());

  it('retries once with a fresh code on a PK collision', async () => {
    const bodies = [];
    let postCount = 0;
    vi.stubGlobal('fetch', vi.fn(async (url, opts = {}) => {
      if (!opts.method) return { ok: true, json: async () => [] }; // GET: code is unused
      postCount += 1;
      bodies.push(JSON.parse(opts.body));
      if (postCount === 1) {
        return { ok: false, status: 409, text: async () => '{"code":"23505","message":"duplicate key value violates unique constraint \\"vouchers_pkey\\""}' };
      }
      return { ok: true, json: async () => [{}] };
    }));

    const code = await insertVoucherWithRetry(env, (c) => ({ voucher_id: c, value: 50 }));
    expect(postCount).toBe(2);
    expect(code).toBe(bodies[1].voucher_id);
    expect(bodies[0].voucher_id).not.toBe(bodies[1].voucher_id);
  });

  it('rethrows a payment_reference conflict without retrying', async () => {
    let postCount = 0;
    vi.stubGlobal('fetch', vi.fn(async (url, opts = {}) => {
      if (!opts.method) return { ok: true, json: async () => [] };
      postCount += 1;
      return { ok: false, status: 409, text: async () => '{"code":"23505","message":"duplicate key value violates unique constraint \\"vouchers_payment_reference_key\\""}' };
    }));

    await expect(insertVoucherWithRetry(env, (c) => ({ voucher_id: c })))
      .rejects.toThrow(/vouchers_payment_reference_key/);
    expect(postCount).toBe(1);
  });
});

describe('staffSecretMatches', () => {
  it('accepts the exact secret', async () => {
    expect(await staffSecretMatches('hunter2-secret', 'hunter2-secret')).toBe(true);
  });
  it('rejects a wrong secret of the same length', async () => {
    expect(await staffSecretMatches('hunter2-secreT', 'hunter2-secret')).toBe(false);
  });
  it('rejects different lengths', async () => {
    expect(await staffSecretMatches('short', 'a-much-longer-secret')).toBe(false);
  });
  it('rejects empty input', async () => {
    expect(await staffSecretMatches('', 'a-secret')).toBe(false);
  });
});

describe('rpcErrorParts', () => {
  it('returns null for success results', () => {
    expect(rpcErrorParts({ voucher: { voucher_id: 'UJ-TEST-CODE' } })).toBeNull();
    expect(rpcErrorParts(null)).toBeNull();
  });

  it('maps VOUCHER_NOT_FOUND to 404', () => {
    expect(rpcErrorParts({ error: 'VOUCHER_NOT_FOUND' }))
      .toEqual({ status: 404, message: 'Voucher not found' });
  });

  it('maps VOUCHER_NOT_ACTIVE with status detail', () => {
    expect(rpcErrorParts({ error: 'VOUCHER_NOT_ACTIVE', detail: { status: 'cancelled' } }))
      .toEqual({ status: 400, message: 'Cannot redeem voucher with status: cancelled' });
  });

  it('maps VOUCHER_EXPIRED with expiry date', () => {
    expect(rpcErrorParts({ error: 'VOUCHER_EXPIRED', detail: { expiry_date: '2026-01-31' } }))
      .toEqual({ status: 400, message: 'Voucher expired on 2026-01-31' });
  });

  it('maps INVALID_AMOUNT', () => {
    expect(rpcErrorParts({ error: 'INVALID_AMOUNT' }))
      .toEqual({ status: 400, message: 'amount must be a positive number' });
  });

  it('maps INSUFFICIENT_BALANCE with amounts', () => {
    expect(rpcErrorParts({ error: 'INSUFFICIENT_BALANCE', detail: { amount: 60, balance: 42.5 } }))
      .toEqual({ status: 400, message: 'Amount 60 exceeds balance 42.5' });
  });

  it('maps NOTHING_TO_UNDO', () => {
    expect(rpcErrorParts({ error: 'NOTHING_TO_UNDO' }))
      .toEqual({ status: 400, message: 'No redemption to undo' });
  });

  it('maps unknown codes to a generic 400', () => {
    expect(rpcErrorParts({ error: 'SOMETHING_NEW' }))
      .toEqual({ status: 400, message: 'Redemption failed: SOMETHING_NEW' });
  });
});
