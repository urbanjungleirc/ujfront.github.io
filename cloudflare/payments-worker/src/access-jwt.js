// Cloudflare Access JWT verification. WebCrypto only — no JWT libraries.
//
// The token arrives as the Cf-Access-Jwt-Assertion header, injected by Access
// after it authenticates the request. We verify the signature against the
// team's public JWKS before reading a single claim, because an unverified
// payload is attacker-controlled text.

const JWKS_TTL_MS = 60 * 60 * 1000;      // refresh keys hourly
const JWKS_MIN_REFETCH_MS = 60 * 1000;   // a flood of bogus kids must not hammer the JWKS
const CLOCK_SKEW_S = 60;

const jwksCache = { keys: null, fetchedAt: 0, lastAttemptAt: 0 };

export function resetJwksCache() {
  jwksCache.keys = null;
  jwksCache.fetchedAt = 0;
  jwksCache.lastAttemptAt = 0;
}

function b64urlDecode(part) {
  const pad = part.length % 4 === 0 ? '' : '='.repeat(4 - (part.length % 4));
  const bin = atob(part.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function b64urlToJson(part) {
  return JSON.parse(new TextDecoder().decode(b64urlDecode(part)));
}

async function getSigningKey(teamDomain, kid, nowMs) {
  const fresh = jwksCache.keys && nowMs - jwksCache.fetchedAt < JWKS_TTL_MS;
  if (fresh) {
    const hit = jwksCache.keys.find((k) => k.kid === kid);
    if (hit) return hit;
  }
  // Unknown kid or stale cache: refetch, but no more than once a minute.
  if (nowMs - jwksCache.lastAttemptAt < JWKS_MIN_REFETCH_MS) {
    return jwksCache.keys?.find((k) => k.kid === kid) || null;
  }
  jwksCache.lastAttemptAt = nowMs;
  try {
    const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
    if (!res.ok) return null;
    const body = await res.json();
    if (!Array.isArray(body.keys)) return null;
    jwksCache.keys = body.keys;
    jwksCache.fetchedAt = nowMs;
    return body.keys.find((k) => k.kid === kid) || null;
  } catch {
    return null;
  }
}

export async function verifyAccessJwt(token, { teamDomain, aud, jwks = null, now = Date.now() } = {}) {
  if (!token || typeof token !== 'string') return { ok: false, reason: 'missing' };

  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed' };

  let header;
  let payload;
  try {
    header = b64urlToJson(parts[0]);
    payload = b64urlToJson(parts[1]);
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  // Pin the algorithm. Reading alg from the token to pick a verifier is how
  // "alg: none" and RS256->HS256 confusion attacks work.
  if (header.alg !== 'RS256' || !header.kid) return { ok: false, reason: 'bad_alg' };

  const jwk = jwks
    ? jwks.find((k) => k.kid === header.kid) || null
    : await getSigningKey(teamDomain, header.kid, now);
  if (!jwk) return { ok: false, reason: 'unknown_kid' };

  let key;
  try {
    key = await crypto.subtle.importKey(
      'jwk',
      { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
  } catch {
    return { ok: false, reason: 'bad_key' };
  }

  let signature;
  try {
    signature = b64urlDecode(parts[2]);
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const valid = await crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, key, signature, signed);
  if (!valid) return { ok: false, reason: 'bad_signature' };

  // Signature is good — only now are the claims trustworthy.
  const nowS = Math.floor(now / 1000);
  if (payload.iss !== `https://${teamDomain}`) return { ok: false, reason: 'bad_iss' };

  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud || !auds.includes(aud)) return { ok: false, reason: 'bad_aud' };

  if (typeof payload.exp !== 'number' || payload.exp <= nowS) return { ok: false, reason: 'expired' };
  if (typeof payload.nbf === 'number' && payload.nbf > nowS + CLOCK_SKEW_S) return { ok: false, reason: 'not_yet_valid' };
  if (typeof payload.iat === 'number' && payload.iat > nowS + CLOCK_SKEW_S) return { ok: false, reason: 'not_yet_valid' };
  if (!payload.email) return { ok: false, reason: 'no_email' };

  return { ok: true, email: String(payload.email).toLowerCase(), sub: payload.sub || '' };
}
