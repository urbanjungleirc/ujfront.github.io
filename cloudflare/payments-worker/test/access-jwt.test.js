import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyAccessJwt, resetJwksCache } from '../src/access-jwt.js';

const TEAM = 'happyk.cloudflareaccess.com';
const AUD = 'test-aud-tag';
const KID = 'test-kid-1';

function b64url(bytes) {
  let bin = '';
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const b64urlJson = (obj) => b64url(new TextEncoder().encode(JSON.stringify(obj)));

async function makeKeypair() {
  return crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['sign', 'verify'],
  );
}
async function jwkOf(publicKey, kid = KID) {
  const jwk = await crypto.subtle.exportKey('jwk', publicKey);
  return { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', kid };
}
async function signJwt(privateKey, payload, header = { alg: 'RS256', kid: KID }) {
  const h = b64urlJson(header);
  const p = b64urlJson(payload);
  const sig = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' }, privateKey, new TextEncoder().encode(`${h}.${p}`),
  );
  return `${h}.${p}.${b64url(sig)}`;
}

const NOW_S = 1_800_000_000;
const NOW_MS = NOW_S * 1000;
const basePayload = (over = {}) => ({
  iss: `https://${TEAM}`,
  aud: AUD,
  exp: NOW_S + 3600,
  iat: NOW_S - 10,
  email: 'Staff@UrbanJungleIRC.com',
  sub: 'user-123',
  ...over,
});

let keys, jwks;
beforeEach(async () => {
  resetJwksCache();
  keys = await makeKeypair();
  jwks = [await jwkOf(keys.publicKey)];
});
afterEach(() => vi.unstubAllGlobals());

const verify = (token, over = {}) =>
  verifyAccessJwt(token, { teamDomain: TEAM, aud: AUD, jwks, now: NOW_MS, ...over });

describe('verifyAccessJwt — happy path', () => {
  it('accepts a valid token and lowercases the email', async () => {
    const r = await verify(await signJwt(keys.privateKey, basePayload()));
    expect(r).toEqual({ ok: true, email: 'staff@urbanjungleirc.com', sub: 'user-123' });
  });

  it('accepts aud as an array containing our tag', async () => {
    const r = await verify(await signJwt(keys.privateKey, basePayload({ aud: ['other', AUD] })));
    expect(r.ok).toBe(true);
  });
});

describe('verifyAccessJwt — rejects', () => {
  it('an expired token', async () => {
    const r = await verify(await signJwt(keys.privateKey, basePayload({ exp: NOW_S - 1 })));
    expect(r).toEqual({ ok: false, reason: 'expired' });
  });

  it('a not-yet-valid token beyond the 60s skew', async () => {
    const r = await verify(await signJwt(keys.privateKey, basePayload({ nbf: NOW_S + 120 })));
    expect(r).toEqual({ ok: false, reason: 'not_yet_valid' });
  });

  it('an aud array that does not contain our tag', async () => {
    const r = await verify(await signJwt(keys.privateKey, basePayload({ aud: ['someone-else'] })));
    expect(r).toEqual({ ok: false, reason: 'bad_aud' });
  });

  it('a wrong issuer', async () => {
    const r = await verify(await signJwt(keys.privateKey, basePayload({ iss: 'https://evil.cloudflareaccess.com' })));
    expect(r).toEqual({ ok: false, reason: 'bad_iss' });
  });

  it('alg: none', async () => {
    const h = b64urlJson({ alg: 'none', kid: KID });
    const p = b64urlJson(basePayload());
    const r = await verify(`${h}.${p}.`);
    expect(r).toEqual({ ok: false, reason: 'bad_alg' });
  });

  it('an HS256 token forged with the public modulus as the HMAC key (algorithm confusion)', async () => {
    const h = b64urlJson({ alg: 'HS256', kid: KID });
    const p = b64urlJson(basePayload());
    const hmacKey = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(jwks[0].n), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(`${h}.${p}`));
    const r = await verify(`${h}.${p}.${b64url(sig)}`);
    expect(r).toEqual({ ok: false, reason: 'bad_alg' });
  });

  it('a signature from a different keypair', async () => {
    const other = await makeKeypair();
    const r = await verify(await signJwt(other.privateKey, basePayload()));
    expect(r).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('a tampered payload', async () => {
    const token = await signJwt(keys.privateKey, basePayload());
    const [h, , s] = token.split('.');
    const r = await verify(`${h}.${b64urlJson(basePayload({ email: 'attacker@evil.com' }))}.${s}`);
    expect(r).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('an unknown kid', async () => {
    const r = await verify(await signJwt(keys.privateKey, basePayload(), { alg: 'RS256', kid: 'nope' }));
    expect(r).toEqual({ ok: false, reason: 'unknown_kid' });
  });

  it('a token with no email claim', async () => {
    const r = await verify(await signJwt(keys.privateKey, basePayload({ email: undefined })));
    expect(r).toEqual({ ok: false, reason: 'no_email' });
  });

  it('malformed input without throwing', async () => {
    for (const bad of ['', 'a.b', 'a.b.c.d', 'not-base64!.x.y', null, undefined, 123]) {
      const r = await verify(bad);
      expect(r.ok).toBe(false);
    }
  });
});

describe('verifyAccessJwt — JWKS fetching', () => {
  it('fetches the JWKS when none is injected, and caches it', async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ keys: jwks })));
    vi.stubGlobal('fetch', fetchSpy);
    const token = await signJwt(keys.privateKey, basePayload());

    const a = await verifyAccessJwt(token, { teamDomain: TEAM, aud: AUD, now: NOW_MS });
    const b = await verifyAccessJwt(token, { teamDomain: TEAM, aud: AUD, now: NOW_MS });

    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe(`https://${TEAM}/cdn-cgi/access/certs`);
  });

  it('rate-limits refetches triggered by unknown kids to one per 60s', async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ keys: jwks })));
    vi.stubGlobal('fetch', fetchSpy);
    const bogus = await signJwt(keys.privateKey, basePayload(), { alg: 'RS256', kid: 'unknown' });

    await verifyAccessJwt(bogus, { teamDomain: TEAM, aud: AUD, now: NOW_MS });
    await verifyAccessJwt(bogus, { teamDomain: TEAM, aud: AUD, now: NOW_MS + 1000 });
    await verifyAccessJwt(bogus, { teamDomain: TEAM, aud: AUD, now: NOW_MS + 30_000 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await verifyAccessJwt(bogus, { teamDomain: TEAM, aud: AUD, now: NOW_MS + 61_000 });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('rejects when the JWKS endpoint fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    const token = await signJwt(keys.privateKey, basePayload());
    const r = await verifyAccessJwt(token, { teamDomain: TEAM, aud: AUD, now: NOW_MS });
    expect(r).toEqual({ ok: false, reason: 'unknown_kid' });
  });
});
