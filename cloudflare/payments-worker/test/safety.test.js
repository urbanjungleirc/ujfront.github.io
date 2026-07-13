import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  rpcErrorParts, staffSecretMatches, resolveStaffIdentity,
  randomVoucherCode, isUniqueViolation, insertVoucherWithRetry,
} from '../src/index.js';
import { resetJwksCache } from '../src/access-jwt.js';

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

describe('resolveStaffIdentity', () => {
  const TEAM = 'happyk.cloudflareaccess.com';
  const AUD = 'aud-tag';
  const env = { ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD, STAFF_SHARED_SECRET: 'correct-secret' };

  const b64url = (bytes) => {
    let bin = '';
    for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const b64urlJson = (o) => b64url(new TextEncoder().encode(JSON.stringify(o)));

  let keys;
  beforeEach(async () => {
    resetJwksCache();
    keys = await crypto.subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true, ['sign', 'verify'],
    );
    const jwk = await crypto.subtle.exportKey('jwk', keys.publicKey);
    const keyset = { keys: [{ kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', kid: 'k1' }] };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(keyset))));
  });
  afterEach(() => vi.unstubAllGlobals());

  async function token(over = {}) {
    const h = b64urlJson({ alg: 'RS256', kid: 'k1' });
    const p = b64urlJson({
      iss: `https://${TEAM}`, aud: AUD,
      exp: Math.floor(Date.now() / 1000) + 3600,
      email: 'mod@urbanjungleirc.com', sub: 's1', ...over,
    });
    const sig = await crypto.subtle.sign(
      { name: 'RSASSA-PKCS1-v1_5' }, keys.privateKey, new TextEncoder().encode(`${h}.${p}`),
    );
    return `${h}.${p}.${b64url(sig)}`;
  }
  const req = (headers) => new Request('https://x.test/v1/vouchers/search', { headers });

  it('accepts a valid Access JWT and returns the email', async () => {
    const r = await resolveStaffIdentity(req({ 'Cf-Access-Jwt-Assertion': await token() }), env);
    expect(r).toEqual({ ok: true, email: 'mod@urbanjungleirc.com' });
  });

  it('accepts the shared secret with a null email', async () => {
    const r = await resolveStaffIdentity(req({ 'X-Staff-Secret': 'correct-secret' }), env);
    expect(r).toEqual({ ok: true, email: null });
  });

  it('prefers the JWT when both are present', async () => {
    const r = await resolveStaffIdentity(
      req({ 'Cf-Access-Jwt-Assertion': await token(), 'X-Staff-Secret': 'correct-secret' }), env,
    );
    expect(r).toEqual({ ok: true, email: 'mod@urbanjungleirc.com' });
  });

  it('FAILS CLOSED on an invalid JWT even when a valid secret is present', async () => {
    const r = await resolveStaffIdentity(
      req({ 'Cf-Access-Jwt-Assertion': await token({ exp: 1 }), 'X-Staff-Secret': 'correct-secret' }), env,
    );
    expect(r).toEqual({ ok: false });
  });

  it('rejects a wrong secret', async () => {
    expect(await resolveStaffIdentity(req({ 'X-Staff-Secret': 'wrong' }), env)).toEqual({ ok: false });
  });

  it('rejects when neither is present', async () => {
    expect(await resolveStaffIdentity(req({}), env)).toEqual({ ok: false });
  });

  it('rejects a JWT when ACCESS_AUD is unset (misconfiguration fails closed)', async () => {
    const r = await resolveStaffIdentity(
      req({ 'Cf-Access-Jwt-Assertion': await token() }), { ...env, ACCESS_AUD: undefined },
    );
    expect(r).toEqual({ ok: false });
  });
});
