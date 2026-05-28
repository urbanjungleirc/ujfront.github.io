const STRIPE_API_BASE = 'https://api.stripe.com/v1';
const STRIPE_API_VERSION = '2025-08-27.basil';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    try {
      if (request.method === 'GET' && url.pathname === '/health') {
        return json({ ok: true, service: 'uj-payments' }, 200, request, env);
      }

      if (request.method === 'POST' && url.pathname === '/v1/checkout/sessions') {
        return createCheckoutSession(request, env);
      }

      if (request.method === 'POST' && url.pathname === '/v1/webhooks/stripe') {
        return handleStripeWebhook(request, env);
      }

      return json({ error: 'Not found' }, 404, request, env);
    } catch (error) {
      console.error(error);
      return json({ error: error.message || 'Internal server error' }, 500, request, env);
    }
  },
};

async function createCheckoutSession(request, env) {
  assertEnv(env, ['STRIPE_SECRET_KEY', 'PUBLIC_BASE_URL']);

  const origin = request.headers.get('Origin') || env.PUBLIC_BASE_URL;
  if (!isAllowedOrigin(origin, env)) {
    return json({ error: 'Origin not allowed' }, 403, request, env);
  }

  const data = await request.json();
  if (data.product !== 'deposit') {
    return json({ error: 'Unsupported product' }, 400, request, env);
  }

  const deposit = normalizeDepositRequest(data);
  const amountCents = parseIntegerEnv(env.DEPOSIT_AMOUNT_CENTS, 10000);
  const feeCents = parseIntegerEnv(env.DEPOSIT_FEE_CENTS, 290);
  const currency = (env.DEPOSIT_CURRENCY || 'aud').toLowerCase();
  const selectedItemDescription = `${deposit.event_date} @ ${deposit.event_time_label}`;

  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('client_reference_id', deposit.request_id);
  if (deposit.email) {
    params.set('customer_email', deposit.email);
  }
  params.set('success_url', `${origin}/deposits.html?payment=success&session_id={CHECKOUT_SESSION_ID}`);
  params.set('cancel_url', `${origin}/deposits.html?payment=cancelled`);
  params.set('line_items[0][quantity]', '1');
  params.set('line_items[0][price_data][currency]', currency);
  params.set('line_items[0][price_data][unit_amount]', String(amountCents));
  params.set('line_items[0][price_data][product_data][name]', 'Group booking deposit');
  params.set('line_items[0][price_data][product_data][description]', selectedItemDescription);
  params.set('line_items[1][quantity]', '1');
  params.set('line_items[1][price_data][currency]', currency);
  params.set('line_items[1][price_data][unit_amount]', String(feeCents));
  params.set('line_items[1][price_data][product_data][name]', 'Online processing fee');
  params.set('payment_intent_data[description]', 'Urban Jungle group booking deposit');

  const metadata = {
    product: 'deposit',
    request_id: deposit.request_id,
    name: deposit.name,
    event_date: deposit.event_date,
    event_time: deposit.event_time,
    event_time_label: deposit.event_time_label,
    deposit_amount_cents: String(amountCents),
    fee_cents: String(feeCents),
  };

  Object.keys(metadata).forEach((key) => {
    params.set(`metadata[${key}]`, metadata[key]);
    params.set(`payment_intent_data[metadata][${key}]`, metadata[key]);
  });

  const session = await stripeRequest('/checkout/sessions', params, env);
  return json({ id: session.id, url: session.url }, 200, request, env);
}

async function handleStripeWebhook(request, env) {
  assertEnv(env, [
    'STRIPE_WEBHOOK_SECRET',
    'GAS_DEPOSIT_WEBAPP_URL',
    'GAS_DEPOSIT_SHARED_SECRET',
  ]);

  const payload = await request.text();
  const signature = request.headers.get('Stripe-Signature') || '';
  const verified = await verifyStripeSignature(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  if (!verified) {
    return new Response('Invalid signature', { status: 400 });
  }

  const event = JSON.parse(payload);
  if (event.type !== 'checkout.session.completed') {
    return json({ received: true, ignored: event.type }, 200, request, env);
  }

  const session = event.data && event.data.object;
  if (!session || session.payment_status !== 'paid') {
    return json({ received: true, ignored: 'unpaid_session' }, 200, request, env);
  }

  if (session.metadata && session.metadata.product === 'deposit') {
    await fulfillDeposit(session, env);
  }

  return json({ received: true }, 200, request, env);
}

async function fulfillDeposit(session, env) {
  const metadata = session.metadata || {};
  const amountCents = Number(metadata.deposit_amount_cents || env.DEPOSIT_AMOUNT_CENTS || 10000);
  const feeCents = Number(metadata.fee_cents || env.DEPOSIT_FEE_CENTS || 290);

  const form = new FormData();
  form.set('gas_secret', env.GAS_DEPOSIT_SHARED_SECRET);
  form.set('payment_platform', 'stripe');
  form.set('id', session.id);
  form.set('paid', centsToDollarString(amountCents));
  form.set('fee', centsToDollarString(feeCents));
  form.set('email', session.customer_details?.email || session.customer_email || '');
  form.set('name', metadata.name || session.customer_details?.name || '');
  form.set('event_date', metadata.event_date || '');
  form.set('event_time', metadata.event_time || metadata.event_time_label || '');

  const response = await fetch(env.GAS_DEPOSIT_WEBAPP_URL, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GAS deposit fulfillment failed: ${response.status} ${text}`);
  }
}

function normalizeDepositRequest(data) {
  const name = cleanString(data.name, 100);
  const email = cleanString(data.email || '', 254);
  const eventDate = cleanString(data.event_date, 20);
  const eventTime = cleanString(data.event_time, 40);
  const eventTimeLabel = cleanString(data.event_time_label || eventTime, 40);

  if (!name) throw new Error('Organiser name is required');
  if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    throw new Error('Valid event date is required');
  }
  if (!isFutureDate(eventDate)) {
    throw new Error('Event date must be in the future');
  }
  if (!eventTime) throw new Error('Event time is required');

  return {
    name,
    email,
    event_date: eventDate,
    event_time: eventTime,
    event_time_label: eventTimeLabel,
    request_id: crypto.randomUUID(),
  };
}

async function stripeRequest(path, params, env) {
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': STRIPE_API_VERSION,
    },
    body: params,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(data.error?.message || `Stripe request failed: ${response.status}`);
  }
  return data;
}

async function verifyStripeSignature(payload, signatureHeader, webhookSecret) {
  const parsed = parseStripeSignature(signatureHeader);
  if (!parsed.timestamp || parsed.signatures.length === 0) return false;

  const toleranceSeconds = 300;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(parsed.timestamp)) > toleranceSeconds) return false;

  const signedPayload = `${parsed.timestamp}.${payload}`;
  const expected = await hmacSha256Hex(webhookSecret, signedPayload);
  return parsed.signatures.some((signature) => timingSafeEqualHex(signature, expected));
}

function parseStripeSignature(header) {
  return header.split(',').reduce(
    (acc, part) => {
      const [key, value] = part.split('=');
      if (key === 't') acc.timestamp = value;
      if (key === 'v1') acc.signatures.push(value);
      return acc;
    },
    { timestamp: '', signatures: [] },
  );
}

async function hmacSha256Hex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqualHex(a, b) {
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b)) return false;
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function json(data, status, request, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(request, env),
    },
  });
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin, env) ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

function isAllowedOrigin(origin, env) {
  if (!origin) return false;
  return (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .includes(origin);
}

function assertEnv(env, keys) {
  const missing = keys.filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(`Missing Worker configuration: ${missing.join(', ')}`);
  }
}

function parseIntegerEnv(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanString(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function isFutureDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  const eventDate = new Date(Date.UTC(year, month - 1, day));
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  return eventDate > todayUtc;
}

function centsToDollarString(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}
