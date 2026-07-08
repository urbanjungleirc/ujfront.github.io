import { encode as qrEncode } from 'uqr';
import { renderVoucherEmail } from './email.js';

const STRIPE_API_BASE = 'https://api.stripe.com/v1';
const STRIPE_API_VERSION = '2025-08-27.basil';
const SUPABASE_REST = (url) => `${url}/rest/v1`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    try {
      // ── Health ──────────────────────────────────────────────────────────
      if (request.method === 'GET' && url.pathname === '/health') {
        return json({ ok: true, service: 'uj-payments', products: ['deposit', 'voucher'] }, 200, request, env);
      }

      // ── Stripe webhook (shared — handles both deposits and vouchers) ────
      if (request.method === 'POST' && url.pathname === '/v1/webhooks/stripe') {
        return await handleStripeWebhook(request, env);
      }

      // ── Checkout session creation ────────────────────────────────────────
      if (request.method === 'POST' && url.pathname === '/v1/checkout/sessions') {
        return await createCheckoutSession(request, env);
      }

      // ── Public voucher endpoints ─────────────────────────────────────────
      if (request.method === 'GET' && url.pathname === '/v1/voucher-types') {
        return await getVoucherTypes(request, env);
      }

      if (request.method === 'GET' && url.pathname.startsWith('/v1/voucher-types/') && url.pathname.endsWith('/items')) {
        const typeId = url.pathname.split('/')[3];
        return await getVoucherItems(typeId, request, env);
      }

      // ── Staff endpoints (require X-Staff-Secret header) ──────────────────
      if (url.pathname.startsWith('/v1/vouchers') || url.pathname.startsWith('/v1/staff/')) {
        return await handleStaffRequest(request, env, url);
      }

      return json({ error: 'Not found' }, 404, request, env);
    } catch (error) {
      console.error(error);
      const status = (error && error.status >= 400 && error.status < 600) ? error.status : 500;
      return json({ error: error.message || 'Internal server error' }, status, request, env);
    }
  },
};

// ════════════════════════════════════════════════════════════════════════════
// Staff request router
// ════════════════════════════════════════════════════════════════════════════

async function handleStaffRequest(request, env, url) {
  assertStaffAuth(request, env);

  const method = request.method;
  const path = url.pathname;

  // GET /v1/vouchers/search?q=...&status=...
  if (method === 'GET' && path === '/v1/vouchers/search') {
    return searchVouchers(url.searchParams, request, env);
  }

  // GET /v1/vouchers/report?type=today|week|month
  if (method === 'GET' && path === '/v1/vouchers/report') {
    return getReport(url.searchParams, request, env);
  }

  // GET /v1/vouchers/stats  (dashboard summary)
  if (method === 'GET' && path === '/v1/vouchers/stats') {
    return getVoucherStats(request, env);
  }

  // GET /v1/vouchers/:code
  if (method === 'GET' && path.startsWith('/v1/vouchers/')) {
    const code = path.split('/')[3];
    return getVoucher(code, request, env);
  }

  // POST /v1/vouchers  (create physical)
  if (method === 'POST' && path === '/v1/vouchers') {
    return createPhysicalVoucher(request, env);
  }

  // POST /v1/vouchers/:code/redeem
  if (method === 'POST' && path.match(/^\/v1\/vouchers\/[^/]+\/redeem$/)) {
    const code = path.split('/')[3];
    return redeemVoucher(code, request, env);
  }

  // POST /v1/vouchers/:code/notes  (add/edit free-form staff notes)
  if (method === 'POST' && path.match(/^\/v1\/vouchers\/[^/]+\/notes$/)) {
    const code = path.split('/')[3];
    return updateVoucherNotes(code, request, env);
  }

  // POST /v1/vouchers/:code/undo-redemption
  if (method === 'POST' && path.match(/^\/v1\/vouchers\/[^/]+\/undo-redemption$/)) {
    const code = path.split('/')[3];
    return undoRedemption(code, request, env);
  }

  // POST /v1/vouchers/:code/resend-email
  if (method === 'POST' && path.match(/^\/v1\/vouchers\/[^/]+\/resend-email$/)) {
    const code = path.split('/')[3];
    return resendVoucherEmail(code, request, env);
  }

  // POST /v1/staff/voucher-types/preview — render the email for a draft type
  if (method === 'POST' && path === '/v1/staff/voucher-types/preview') {
    return await previewVoucherType(request, env);
  }

  // POST /v1/staff/voucher-types  (create/update)
  if (method === 'POST' && path === '/v1/staff/voucher-types') {
    return upsertVoucherType(request, env);
  }

  // POST /v1/staff/voucher-items  (create/update)
  if (method === 'POST' && path === '/v1/staff/voucher-items') {
    return upsertVoucherItem(request, env);
  }

  // DELETE /v1/staff/voucher-items/:id  (delete if never used, else 409 → archive)
  if (method === 'DELETE' && path.startsWith('/v1/staff/voucher-items/')) {
    const id = decodeURIComponent(path.split('/')[4] || '');
    return deleteVoucherItem(id, request, env);
  }

  // GET /v1/staff/voucher-types — all types, including inactive, full fields
  if (method === 'GET' && path === '/v1/staff/voucher-types') {
    return await getVoucherTypesStaff(request, env);
  }

  // GET /v1/staff/voucher-types/:typeId/items — all items, including inactive
  if (method === 'GET' && path.startsWith('/v1/staff/voucher-types/') && path.endsWith('/items')) {
    const typeId = path.split('/')[4];
    return await getVoucherItemsStaff(typeId, request, env);
  }

  return json({ error: 'Not found' }, 404, request, env);
}

// ════════════════════════════════════════════════════════════════════════════
// Checkout session (deposits + vouchers)
// ════════════════════════════════════════════════════════════════════════════

async function createCheckoutSession(request, env) {
  assertEnv(env, ['STRIPE_SECRET_KEY', 'PUBLIC_BASE_URL']);

  const origin = request.headers.get('Origin') || env.PUBLIC_BASE_URL;
  if (!isAllowedOrigin(origin, env)) {
    return json({ error: 'Origin not allowed' }, 403, request, env);
  }

  const data = await request.json();

  if (data.product === 'deposit') {
    return createDepositSession(data, origin, request, env);
  }

  if (data.product === 'voucher') {
    return createVoucherSession(data, origin, request, env);
  }

  return json({ error: 'Unsupported product' }, 400, request, env);
}

async function createDepositSession(data, origin, request, env) {
  const deposit = normalizeDepositRequest(data);
  const amountCents = parseIntegerEnv(env.DEPOSIT_AMOUNT_CENTS, 10000);
  const feeCents = parseIntegerEnv(env.DEPOSIT_FEE_CENTS, 290);
  const currency = (env.DEPOSIT_CURRENCY || 'aud').toLowerCase();
  const selectedItemDescription = `${deposit.event_date} @ ${deposit.event_time_label}`;

  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('client_reference_id', deposit.request_id);
  if (deposit.email) params.set('customer_email', deposit.email);
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

async function createVoucherSession(data, origin, request, env) {
  assertEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

  const voucherBaseUrl = env.VOUCHER_BASE_URL || origin;
  const typeId = cleanString(data.voucher_type_id, 100);
  const itemId = cleanString(data.voucher_item_id, 100);
  const promoId = cleanString(data.promo_id || '', 100);

  if (!typeId || !itemId) {
    return json({ error: 'voucher_type_id and voucher_item_id are required' }, 400, request, env);
  }

  // Validate type exists and is available online
  const type = await sbGet(env, `voucher_types?type_id=eq.${encodeURIComponent(typeId)}&select=*`);
  if (!type.length) return json({ error: 'Voucher type not found' }, 404, request, env);
  const vt = type[0];
  if (!vt.is_active) return json({ error: 'Voucher type is not available' }, 400, request, env);
  if (vt.availability === 'staff_only') return json({ error: 'Voucher type is not available online' }, 400, request, env);

  // Validate item belongs to type
  const items = await sbGet(env, `voucher_items?id=eq.${encodeURIComponent(itemId)}&voucher_type=eq.${encodeURIComponent(typeId)}&select=*`);
  if (!items.length) return json({ error: 'Voucher item not found' }, 404, request, env);
  const item = items[0];
  if (!item.is_active) return json({ error: 'Voucher item is not available' }, 400, request, env);

  // ── Per-customer purchase limit (enforced server-side) ──────────────────────
  // max_per_customer null ⇒ unlimited. When a limit is set we count the buyer's
  // prior *completed* purchases (purchase_tracking rows are written at
  // fulfilment). We need their email to do that, so a limited type requires one.
  if (vt.max_per_customer != null && vt.limit_period) {
    const email = cleanString(data.customer_email || '', 254).trim().toLowerCase();
    if (!email) {
      return json({ error: 'An email address is required to purchase this voucher.' }, 400, request, env);
    }
    let trackQuery = `purchase_tracking?email_address=eq.${encodeURIComponent(email)}`
      + `&voucher_type_id=eq.${encodeURIComponent(typeId)}&select=id`;
    if (vt.limit_period === 'annual') {
      // Rolling 12 months. For a calendar-year reset instead, swap this cutoff
      // for `${new Date().getFullYear()}-01-01`.
      const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      trackQuery += `&purchase_date=gte.${encodeURIComponent(since)}`;
    }
    const prior = await sbGet(env, trackQuery);
    if (prior.length >= vt.max_per_customer) {
      const scope = vt.limit_period === 'annual' ? 'per year' : 'per customer';
      const noun = vt.max_per_customer === 1 ? 'voucher' : 'vouchers';
      return json({
        error: `Purchase limit reached — only ${vt.max_per_customer} ${vt.display_name} ${noun} allowed ${scope}.`,
        code: 'purchase_limit_reached',
      }, 409, request, env);
    }
  }

  const amountCents = chargeAmountCents(item);
  const currency = 'aud';

  const params = new URLSearchParams();
  params.set('mode', 'payment');
  if (data.customer_email) params.set('customer_email', cleanString(data.customer_email, 254));
  params.set('success_url', `${voucherBaseUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`);
  params.set('cancel_url', `${voucherBaseUrl}/?payment=cancelled`);
  params.set('line_items[0][quantity]', '1');
  params.set('line_items[0][price_data][currency]', currency);
  params.set('line_items[0][price_data][unit_amount]', String(amountCents));
  params.set('line_items[0][price_data][product_data][name]', item.name);
  if (item.description) {
    params.set('line_items[0][price_data][product_data][description]', item.description);
  }
  params.set('payment_intent_data[description]', `Urban Jungle ${vt.display_name}`);

  const metadata = {
    product: 'voucher',
    voucher_type_id: typeId,
    voucher_item_id: itemId,
    voucher_value: String(item.value),
    promo_id: promoId,
    customer_name: cleanString(data.customer_name || '', 200),
    customer_phone: cleanString(data.customer_phone || '', 30),
    gift_from: cleanString(data.gift_from || '', 200),
    gift_to: cleanString(data.gift_to || '', 200),
    gift_message: cleanString(data.gift_message || '', 500),
  };
  Object.keys(metadata).forEach((key) => {
    params.set(`metadata[${key}]`, metadata[key]);
    params.set(`payment_intent_data[metadata][${key}]`, metadata[key]);
  });

  const session = await stripeRequest('/checkout/sessions', params, env);
  return json({ id: session.id, url: session.url }, 200, request, env);
}

// ════════════════════════════════════════════════════════════════════════════
// Stripe webhook
// ════════════════════════════════════════════════════════════════════════════

async function handleStripeWebhook(request, env) {
  assertEnv(env, ['STRIPE_WEBHOOK_SECRET']);

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

  const product = session.metadata && session.metadata.product;

  if (product === 'deposit') {
    assertEnv(env, ['GAS_DEPOSIT_WEBAPP_URL', 'GAS_DEPOSIT_SHARED_SECRET']);
    await fulfillDeposit(session, env);
  } else if (product === 'voucher') {
    assertEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY']);
    await fulfillVoucher(session, env);
  }

  return json({ received: true }, 200, request, env);
}

// ════════════════════════════════════════════════════════════════════════════
// Fulfillment
// ════════════════════════════════════════════════════════════════════════════

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

  const response = await fetch(env.GAS_DEPOSIT_WEBAPP_URL, { method: 'POST', body: form });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GAS deposit fulfillment failed: ${response.status} ${text}`);
  }
}

async function fulfillVoucher(session, env) {
  const metadata = session.metadata || {};
  const paymentReference = session.id;

  // Idempotency: skip if already fulfilled
  const existing = await sbGet(env, `vouchers?payment_reference=eq.${encodeURIComponent(paymentReference)}&select=voucher_id`);
  if (existing.length) {
    console.log(`Voucher already fulfilled for session ${paymentReference}`);
    return;
  }

  // Fetch voucher type for expiry and email template
  const typeId = metadata.voucher_type_id;
  const types = await sbGet(env, `voucher_types?type_id=eq.${encodeURIComponent(typeId)}&select=*`);
  if (!types.length) throw new Error(`Voucher type not found: ${typeId}`);
  const vt = types[0];

  const value = Number(metadata.voucher_value || 0);
  const customerEmail = session.customer_details?.email || session.customer_email || '';
  const customerName = metadata.customer_name || session.customer_details?.name || '';

  // Calculate expiry date
  const expiryDate = vt.expiry_months ? addMonths(new Date(), vt.expiry_months) : null;

  // Generate unique voucher code
  const voucherCode = await generateUniqueCode(env);

  const now = new Date().toISOString();

  // Insert voucher
  await sbPost(env, 'vouchers', {
    voucher_id: voucherCode,
    voucher_type_id: typeId,
    voucher_item_id: metadata.voucher_item_id || null,
    value,
    balance: value,
    status: 'active',
    issued_date: now,
    expiry_date: expiryDate ? expiryDate.toISOString().slice(0, 10) : null,
    issued_by: 'customer_purchase',
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: metadata.customer_phone || null,
    is_physical: false,
    gift_from: metadata.gift_from || null,
    gift_to: metadata.gift_to || null,
    gift_message: metadata.gift_message || null,
    promo_code_used: metadata.promo_id || null,
    payment_reference: paymentReference,
    payment_platform: 'stripe',
    email_sent: false,
    purchase_source: 'online',
    created_timestamp: now,
  });

  // Insert purchase tracking (for purchase limit enforcement).
  // Store the email lowercased so the limit count in createVoucherSession
  // matches regardless of the casing the customer typed.
  if (customerEmail) {
    await sbPost(env, 'purchase_tracking', {
      email_address: customerEmail.trim().toLowerCase(),
      voucher_type_id: typeId,
      purchase_date: now,
      voucher_id: voucherCode,
      reason: 'online_purchase',
    });
  }

  // Audit log
  await sbPost(env, 'audit_log', {
    timestamp: now,
    action: 'voucher_created',
    voucher_id: voucherCode,
    voucher_type_id: typeId,
    user_id: 'customer_purchase',
    data: { payment_platform: 'stripe', payment_reference: paymentReference, value, customer_email: customerEmail },
  });

  // Send email
  if (customerEmail) {
    let itemName = null;
    if (metadata.voucher_item_id) {
      const itemRows = await sbGet(env, `voucher_items?id=eq.${encodeURIComponent(metadata.voucher_item_id)}&select=name`);
      itemName = itemRows[0]?.name || null;
    }
    await sendVoucherEmail(env, {
      to: customerEmail,
      customerName,
      voucherCode,
      value,
      expiryDate: expiryDate ? expiryDate.toISOString().slice(0, 10) : null,
      typeName: vt.display_name,
      itemName,
      emailSubject: vt.email_subject,
      emailBody: vt.email_body,
      accentColor: vt.accent_color,
      voucherLabel: vt.voucher_label,
      redemptionInstructions: vt.redemption_instructions,
      usageInfo: vt.usage_info,
      showQr: vt.show_qr,
      showValue: vt.show_value,
      termsConditions: vt.terms_conditions,
      giftFrom: metadata.gift_from || null,
      giftTo: metadata.gift_to || null,
      giftMessage: metadata.gift_message || null,
    });

    await sbPatch(env, `vouchers?voucher_id=eq.${encodeURIComponent(voucherCode)}`, { email_sent: true });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Public endpoints
// ════════════════════════════════════════════════════════════════════════════

async function getVoucherTypes(request, env) {
  assertEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

  const url = new URL(request.url);
  const promoId = url.searchParams.get('promo_id') || '';
  const staffMode = isStaffAuthed(request, env);

  let query = 'voucher_types?is_active=eq.true&order=sort_order.asc&select=type_id,display_name,description,is_physical,expiry_months,availability,max_per_customer,limit_period,promo_id,terms_conditions,sort_order';

  if (!staffMode) {
    // Public: only online-available types
    query += '&availability=in.(online,both)';
  }

  if (promoId && !staffMode) {
    // Promo filter: show only types matching this promo_id
    query += `&promo_id=eq.${encodeURIComponent(promoId)}`;
  }

  const types = await sbGet(env, query);
  return json(types, 200, request, env);
}

async function getVoucherItems(typeId, request, env) {
  assertEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

  const items = await sbGet(env, `voucher_items?voucher_type=eq.${encodeURIComponent(typeId)}&is_active=eq.true&order=display_order.asc&select=*`);
  return json(items, 200, request, env);
}

async function getVoucherItemsStaff(typeId, request, env) {
  assertEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

  const items = await sbGet(env, `voucher_items?voucher_type=eq.${encodeURIComponent(typeId)}&order=display_order.asc&select=*`);
  return json(items, 200, request, env);
}

async function getVoucherTypesStaff(request, env) {
  assertEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

  const types = await sbGet(env, 'voucher_types?order=sort_order.asc&select=*');
  return json(types, 200, request, env);
}

// Built-in sample per-voucher data for the live email preview. The draft
// voucher-type supplies the type-driven fields (wording/branding); these
// supply the per-voucher fields so the preview shows a faithful rendering.
const PREVIEW_SAMPLE = {
  customerName: 'Sarah Chen',
  voucherCode: 'UJ-7K4M-9XQP',
  value: 100,
  expiryDate: '2027-06-22',
  itemName: 'Family Pass (2 adults, 2 children)',
  giftFrom: 'Sarah',
  giftTo: 'Dad',
  giftMessage: 'Happy birthday! Time to finally try that overhang. Love you x',
};

async function previewVoucherType(request, env) {
  const t = await request.json();

  // Per-voucher data: built-in sample, optionally overridden by `_sample` so the
  // staff create form can preview the email with the real customer/gift details.
  const s = { ...PREVIEW_SAMPLE, ...(t._sample || {}) };

  const html = renderVoucherEmail({
    // per-voucher sample data
    customerName: s.customerName,
    voucherCode: s.voucherCode,
    value: s.value,
    expiryDate: s.expiryDate,
    itemName: s.itemName,
    giftFrom: s.giftFrom,
    giftTo: s.giftTo,
    giftMessage: s.giftMessage,
    // type-driven fields from the draft (snake_case DB columns)
    typeName: t.display_name || 'Sample Voucher',
    emailBody: t.email_body ?? null,
    termsConditions: t.terms_conditions ?? null,
    usageInfo: t.usage_info ?? null,
    accentColor: t.accent_color,            // safeColor() inside the renderer validates/defaults
    voucherLabel: t.voucher_label,          // renderer defaults to 'Your Voucher' when falsy
    redemptionInstructions: t.redemption_instructions, // renderer defaults when falsy
    showQr: t.show_qr ?? true,
    showValue: t.show_value ?? true,
  });

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders(request, env) },
  });
}

// ════════════════════════════════════════════════════════════════════════════
// Staff endpoints
// ════════════════════════════════════════════════════════════════════════════

async function getVoucher(code, request, env) {
  assertEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

  const vouchers = await sbGet(env, `vouchers?voucher_id=eq.${encodeURIComponent(code)}&select=*`);
  if (!vouchers.length) return json({ error: 'Voucher not found' }, 404, request, env);

  const voucher = vouchers[0];

  // Attach the type's staff-facing fields (e.g. redemption warning for credits)
  const types = await sbGet(env, `voucher_types?type_id=eq.${encodeURIComponent(voucher.voucher_type_id)}&select=redemption_warning,usage_info,voucher_label`);
  voucher._redemption_warning = types[0]?.redemption_warning ?? null;
  voucher._usage_info = types[0]?.usage_info ?? null;
  voucher._voucher_label = types[0]?.voucher_label ?? null;

  // Attach recent audit history
  const history = await sbGet(env, `audit_log?voucher_id=eq.${encodeURIComponent(code)}&order=timestamp.desc&limit=20&select=*`);
  voucher._history = history;

  return json(voucher, 200, request, env);
}

async function searchVouchers(params, request, env) {
  assertEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

  const q = cleanString(params.get('q') || '', 200);
  const status = cleanString(params.get('status') || '', 20);
  const limit = Math.min(Number(params.get('limit') || 100), 500);

  let query = `vouchers?order=created_timestamp.desc&limit=${limit}&select=voucher_id,voucher_type_id,customer_name,customer_email,value,balance,status,issued_date,expiry_date,is_physical,email_sent`;

  if (status && ['active', 'redeemed', 'expired', 'cancelled'].includes(status)) {
    query += `&status=eq.${status}`;
  }

  if (q) {
    // PostgREST OR filter: match on code, name, or email
    const enc = encodeURIComponent(q);
    query += `&or=(voucher_id.ilike.*${enc}*,customer_name.ilike.*${enc}*,customer_email.ilike.*${enc}*)`;
  }

  const results = await sbGet(env, query);
  return json(results, 200, request, env);
}

async function getReport(params, request, env) {
  assertEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

  const type = params.get('type') || 'today';
  const now = new Date();
  let startDate;

  if (type === 'today') {
    startDate = new Date(now.toISOString().slice(0, 10) + 'T00:00:00.000Z');
  } else if (type === 'week') {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 7);
  } else if (type === 'month') {
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 30);
  } else {
    return json({ error: 'type must be today, week, or month' }, 400, request, env);
  }

  const startStr = startDate.toISOString();

  // Issued in period
  const issued = await sbGet(env, `vouchers?issued_date=gte.${startStr}&order=issued_date.desc&select=*`);

  // Redeemed in period
  const redeemed = await sbGet(env, `vouchers?last_redeemed_date=gte.${startStr}&order=last_redeemed_date.desc&select=voucher_id,voucher_type_id,customer_name,customer_email,value,balance,status,last_redeemed_date,last_redeemed_by,last_redeemed_amount,clubworx_receipt`);

  return json({ type, start: startStr, issued, redeemed }, 200, request, env);
}

async function getVoucherStats(request, env) {
  assertEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const todayStart = todayStr + 'T00:00:00.000Z';
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [activeVouchers, todayIssued, todayRedeemed] = await Promise.all([
    sbGet(env, `vouchers?status=eq.active&select=balance,expiry_date`),
    sbGet(env, `vouchers?issued_date=gte.${todayStart}&select=voucher_id`),
    sbGet(env, `vouchers?last_redeemed_date=gte.${todayStart}&select=voucher_id`),
  ]);

  const activeTotalValue = activeVouchers.reduce((s, v) => s + Number(v.balance || 0), 0);
  const expiringSoonCount = activeVouchers.filter(v =>
    v.expiry_date && v.expiry_date >= todayStr && v.expiry_date <= in30Days
  ).length;

  return json({
    active_count: activeVouchers.length,
    expiring_soon_count: expiringSoonCount,
    active_total_value: activeTotalValue,
    today_issued: todayIssued.length,
    today_redeemed: todayRedeemed.length,
  }, 200, request, env);
}

async function createPhysicalVoucher(request, env) {
  assertEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

  const data = await request.json();
  const typeId = cleanString(data.voucher_type_id || '', 100);
  const itemId = cleanString(data.voucher_item_id || '', 100);
  const customerName = cleanString(data.customer_name || '', 200);
  const staffId = cleanString(data.issued_by || 'staff', 100);
  const customerEmail = data.customer_email ? cleanString(data.customer_email, 254) : null;
  const giftFrom = data.gift_from ? cleanString(data.gift_from, 200) : null;
  const giftTo = data.gift_to ? cleanString(data.gift_to, 200) : null;
  const giftMessage = data.gift_message ? cleanString(data.gift_message, 500) : null;
  const reason = data.reason ? cleanString(data.reason, 500) : null;

  if (!typeId || !customerName) {
    return json({ error: 'voucher_type_id and customer_name are required' }, 400, request, env);
  }

  // Fetch type
  const types = await sbGet(env, `voucher_types?type_id=eq.${encodeURIComponent(typeId)}&select=*`);
  if (!types.length) return json({ error: 'Voucher type not found' }, 404, request, env);
  const vt = types[0];
  const isPhysical = vt.is_physical;

  if (!isPhysical && !customerEmail) {
    return json({ error: 'customer_email is required for non-physical vouchers' }, 400, request, env);
  }

  // Catch a malformed address before creating the voucher, so the send can't
  // fail after the fact with an unfriendly provider error.
  if (!isPhysical && customerEmail && !isValidEmail(customerEmail)) {
    return json({ error: `“${customerEmail}” doesn’t look like a valid email address. Please check it and try again.` }, 400, request, env);
  }

  // Determine value
  let value;
  let itemName = null;
  if (itemId) {
    const items = await sbGet(env, `voucher_items?id=eq.${encodeURIComponent(itemId)}&select=*`);
    if (!items.length) return json({ error: 'Voucher item not found' }, 404, request, env);
    value = items[0].value;
    itemName = items[0].name || null;
  } else {
    value = Number(data.value || 0);
    if (!value) return json({ error: 'value or voucher_item_id is required' }, 400, request, env);
  }

  const expiryDate = vt.expiry_months ? addMonths(new Date(), vt.expiry_months) : null;
  const voucherCode = await generateUniqueCode(env);
  const now = new Date().toISOString();

  await sbPost(env, 'vouchers', {
    voucher_id: voucherCode,
    voucher_type_id: typeId,
    voucher_item_id: itemId || null,
    value,
    balance: value,
    status: 'active',
    issued_date: now,
    expiry_date: expiryDate ? expiryDate.toISOString().slice(0, 10) : null,
    issued_by: staffId,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: data.customer_phone ? cleanString(data.customer_phone, 30) : null,
    reason,
    is_physical: isPhysical,
    gift_from: giftFrom,
    gift_to: giftTo,
    gift_message: giftMessage,
    payment_platform: 'cash',
    email_sent: false,
    purchase_source: 'staff',
    created_timestamp: now,
  });

  await sbPost(env, 'audit_log', {
    timestamp: now,
    action: 'voucher_created',
    voucher_id: voucherCode,
    voucher_type_id: typeId,
    user_id: staffId,
    data: { is_physical: isPhysical, value, customer_name: customerName, reason },
  });

  if (!isPhysical && customerEmail) {
    await sendVoucherEmail(env, {
      to: customerEmail,
      customerName,
      voucherCode,
      value,
      expiryDate,
      typeName: vt.display_name || 'Voucher',
      itemName,
      emailSubject: vt.email_subject,
      emailBody: vt.email_body,
      accentColor: vt.accent_color,
      voucherLabel: vt.voucher_label,
      redemptionInstructions: vt.redemption_instructions,
      usageInfo: vt.usage_info,
      showQr: vt.show_qr,
      showValue: vt.show_value,
      termsConditions: vt.terms_conditions,
      giftFrom,
      giftTo,
      giftMessage,
    });
    const emailNow = new Date().toISOString();
    await sbPatch(env, `vouchers?voucher_id=eq.${encodeURIComponent(voucherCode)}`, { email_sent: true });
    await sbPost(env, 'audit_log', {
      timestamp: emailNow,
      action: 'email_sent',
      voucher_id: voucherCode,
      voucher_type_id: typeId,
      user_id: staffId,
      data: { to: customerEmail },
    });
  }

  const voucher = await sbGet(env, `vouchers?voucher_id=eq.${encodeURIComponent(voucherCode)}&select=*`);
  return json(voucher[0], 201, request, env);
}

async function redeemVoucher(code, request, env) {
  assertEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

  const data = await request.json();
  const amount = Number(data.amount);
  const staffId = cleanString(data.redeemed_by || 'staff', 100);
  const clubworxReceipt = cleanString(data.clubworx_receipt || '', 100);
  const notes = cleanString(data.notes || '', 500);

  if (!amount || amount <= 0) return json({ error: 'amount must be a positive number' }, 400, request, env);

  const result = await sbRpc(env, 'redeem_voucher', {
    p_code: code,
    p_amount: amount,
    p_staff: staffId,
    p_receipt: clubworxReceipt,
    p_notes: notes,
  });

  const errorResponse = rpcErrorToResponse(result, request, env);
  if (errorResponse) return errorResponse;
  return json(result.voucher, 200, request, env);
}

async function updateVoucherNotes(code, request, env) {
  assertEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

  const data = await request.json();
  const notes = cleanString(data.staff_notes || '', 2000);
  const staffId = cleanString(data.updated_by || 'staff', 100);

  const vouchers = await sbGet(env, `vouchers?voucher_id=eq.${encodeURIComponent(code)}&select=*`);
  if (!vouchers.length) return json({ error: 'Voucher not found' }, 404, request, env);
  const voucher = vouchers[0];

  const previous = voucher.staff_notes || '';
  const now = new Date().toISOString();

  // Store empty string as null so "no note" is consistent regardless of how it got there.
  await sbPatch(env, `vouchers?voucher_id=eq.${encodeURIComponent(code)}`, {
    staff_notes: notes || null,
  });

  await sbPost(env, 'audit_log', {
    timestamp: now,
    action: 'voucher_notes_updated',
    voucher_id: code,
    voucher_type_id: voucher.voucher_type_id,
    user_id: staffId,
    data: { previous_notes: previous, new_notes: notes },
  });

  const updated = await sbGet(env, `vouchers?voucher_id=eq.${encodeURIComponent(code)}&select=*`);
  return json(updated[0], 200, request, env);
}

async function undoRedemption(code, request, env) {
  assertEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

  const data = await request.json();
  const staffId = cleanString(data.undone_by || 'staff', 100);

  const result = await sbRpc(env, 'undo_redemption', {
    p_code: code,
    p_staff: staffId,
  });

  const errorResponse = rpcErrorToResponse(result, request, env);
  if (errorResponse) return errorResponse;
  return json(result.voucher, 200, request, env);
}

async function resendVoucherEmail(code, request, env) {
  assertEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY']);

  const data = await request.json();
  const staffId = cleanString(data.resent_by || 'staff', 100);
  const rawOverride = data.override_email ? cleanString(data.override_email, 254) : null;

  const vouchers = await sbGet(env, `vouchers?voucher_id=eq.${encodeURIComponent(code)}&select=*`);
  if (!vouchers.length) return json({ error: 'Voucher not found' }, 404, request, env);
  const voucher = vouchers[0];

  if (voucher.is_physical) return json({ error: 'Physical vouchers do not have emails' }, 400, request, env);
  if (!voucher.customer_email && !rawOverride) return json({ error: 'Voucher has no email address' }, 400, request, env);

  const sendTo = rawOverride || voucher.customer_email;
  const overridden = !!(rawOverride && rawOverride !== voucher.customer_email);

  if (!isValidEmail(sendTo)) {
    return json({ error: `“${sendTo}” doesn’t look like a valid email address. Please check it and try again.` }, 400, request, env);
  }

  const types = await sbGet(env, `voucher_types?type_id=eq.${encodeURIComponent(voucher.voucher_type_id)}&select=*`);
  const vt = types[0] || {};

  let itemName = null;
  if (voucher.voucher_item_id) {
    const itemRows = await sbGet(env, `voucher_items?id=eq.${encodeURIComponent(voucher.voucher_item_id)}&select=name`);
    itemName = itemRows[0]?.name || null;
  }

  await sendVoucherEmail(env, {
    to: sendTo,
    customerName: voucher.customer_name || '',
    voucherCode: code,
    value: voucher.value,
    expiryDate: voucher.expiry_date,
    typeName: vt.display_name || 'Voucher',
    itemName,
    emailSubject: vt.email_subject,
    emailBody: vt.email_body,
    accentColor: vt.accent_color,
    voucherLabel: vt.voucher_label,
    redemptionInstructions: vt.redemption_instructions,
    usageInfo: vt.usage_info,
    showQr: vt.show_qr,
    showValue: vt.show_value,
    termsConditions: vt.terms_conditions,
    giftFrom: voucher.gift_from,
    giftTo: voucher.gift_to,
    giftMessage: voucher.gift_message,
  });

  const now = new Date().toISOString();
  await sbPost(env, 'audit_log', {
    timestamp: now,
    action: 'resend_email',
    voucher_id: code,
    voucher_type_id: voucher.voucher_type_id,
    user_id: staffId,
    data: { to: sendTo, original_email: voucher.customer_email, overridden },
  });

  return json({ ok: true }, 200, request, env);
}

async function upsertVoucherType(request, env) {
  assertEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  const data = await request.json();
  // Upsert via PostgREST on-conflict
  await sbUpsert(env, 'voucher_types', data, 'type_id');
  return json({ ok: true }, 200, request, env);
}

async function upsertVoucherItem(request, env) {
  assertEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  const data = await request.json();
  await sbUpsert(env, 'voucher_items', data, 'id');
  return json({ ok: true }, 200, request, env);
}

// Delete an item only when it has never been issued on a voucher. If any voucher
// references it, deleting would orphan that record, so we refuse with 409 and the
// UI offers to archive (is_active=false) instead.
async function deleteVoucherItem(id, request, env) {
  assertEnv(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  if (!id) return json({ error: 'Item id is required' }, 400, request, env);

  const used = await sbGet(env, `vouchers?voucher_item_id=eq.${encodeURIComponent(id)}&select=voucher_id&limit=1`);
  if (used.length) {
    return json({
      error: 'This item has already been issued on a voucher and cannot be deleted. Archive it instead.',
      used: true,
    }, 409, request, env);
  }

  await sbDelete(env, `voucher_items?id=eq.${encodeURIComponent(id)}`);
  return json({ ok: true, deleted: true }, 200, request, env);
}

// ════════════════════════════════════════════════════════════════════════════
// Email
// ════════════════════════════════════════════════════════════════════════════

async function sendVoucherEmail(env, opts) {
  const { to, customerName, voucherCode, value, expiryDate, typeName, emailSubject, emailBody, termsConditions, giftFrom, giftTo, giftMessage, accentColor, voucherLabel, redemptionInstructions, usageInfo, showQr, showValue, itemName } = opts;

  const subject = emailSubject || `Your Urban Jungle ${typeName}`;
  const html = renderVoucherEmail({ customerName, voucherCode, value, expiryDate, typeName, emailBody, termsConditions, giftFrom, giftTo, giftMessage, accentColor, voucherLabel, redemptionInstructions, usageInfo, showQr, showValue, itemName });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Urban Jungle IRC <no-reply@urbanjungleirc.com>',
      reply_to: 'frontdesk@urbanjungleirc.com',
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    // Translate the provider's response into something a staff member can act on,
    // instead of surfacing the raw 422/JSON payload.
    let friendly = 'The voucher email could not be sent. Please try again, or check the address.';
    try {
      const body = JSON.parse(text);
      if (res.status === 422 || /invalid .*`?to`?/i.test(body.message || '')) {
        friendly = `The email address (${to}) was rejected as invalid. Please check it and try again.`;
      } else if (body.message) {
        friendly = `The voucher email could not be sent: ${body.message}`;
      }
    } catch { /* non-JSON provider error — keep the generic message */ }
    const err = new Error(friendly);
    err.status = 400;
    throw err;
  }
}

// Basic email shape check — mirrors the staff UI's client-side validation.
function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());
}

// ════════════════════════════════════════════════════════════════════════════
// QR code — inline SVG via uqr (pure ESM, no Node.js deps)
// Encodes the voucher code string only (not a URL) so staff can decode it
// even without an internet connection.
// ════════════════════════════════════════════════════════════════════════════

function generateQrSvg(text) {
  const { size, data } = qrEncode(text, { ecc: 'M' });
  const cell = 4;
  const quiet = 2; // quiet zone in cells
  const dim = (size + quiet * 2) * cell;

  const rects = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (data[row * size + col]) {
        rects.push(`<rect x="${(col + quiet) * cell}" y="${(row + quiet) * cell}" width="${cell}" height="${cell}"/>`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="140" height="140" style="display:block;"><rect width="${dim}" height="${dim}" fill="#fff"/><g fill="#000">${rects.join('')}</g></svg>`;
}

// ════════════════════════════════════════════════════════════════════════════
// Supabase helpers
// ════════════════════════════════════════════════════════════════════════════

function sbHeaders(env) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

async function sbGet(env, query) {
  const res = await fetch(`${SUPABASE_REST(env.SUPABASE_URL)}/${query}`, {
    headers: sbHeaders(env),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase GET failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function sbPost(env, table, data) {
  const res = await fetch(`${SUPABASE_REST(env.SUPABASE_URL)}/${table}`, {
    method: 'POST',
    headers: sbHeaders(env),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase POST ${table} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function sbPatch(env, query, data) {
  const res = await fetch(`${SUPABASE_REST(env.SUPABASE_URL)}/${query}`, {
    method: 'PATCH',
    headers: sbHeaders(env),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase PATCH failed (${res.status}): ${text}`);
  }
}

async function sbDelete(env, query) {
  const res = await fetch(`${SUPABASE_REST(env.SUPABASE_URL)}/${query}`, {
    method: 'DELETE',
    headers: sbHeaders(env),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase DELETE failed (${res.status}): ${text}`);
  }
}

async function sbUpsert(env, table, data, onConflict) {
  const res = await fetch(`${SUPABASE_REST(env.SUPABASE_URL)}/${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: { ...sbHeaders(env), Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase upsert ${table} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function sbRpc(env, fn, args) {
  const res = await fetch(`${SUPABASE_REST(env.SUPABASE_URL)}/rpc/${fn}`, {
    method: 'POST',
    headers: sbHeaders(env),
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase RPC ${fn} failed (${res.status}): ${text}`);
  }
  return res.json();
}

// ════════════════════════════════════════════════════════════════════════════
// Utilities
// ════════════════════════════════════════════════════════════════════════════

async function generateUniqueCode(env) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1
  for (let attempt = 0; attempt < 5; attempt++) {
    const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const code = `UJ-${seg()}-${seg()}`;
    const existing = await sbGet(env, `vouchers?voucher_id=eq.${encodeURIComponent(code)}&select=voucher_id`);
    if (!existing.length) return code;
  }
  throw new Error('Failed to generate unique voucher code after 5 attempts');
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
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
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqualHex(a, b) {
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b)) return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

// Maps an RPC result's error code to HTTP parts. Message texts must match the
// pre-RPC API exactly — the staff UI displays them verbatim.
export function rpcErrorParts(result) {
  if (!result || !result.error) return null;
  const d = result.detail || {};
  switch (result.error) {
    case 'VOUCHER_NOT_FOUND':
      return { status: 404, message: 'Voucher not found' };
    case 'VOUCHER_NOT_ACTIVE':
      return { status: 400, message: `Cannot redeem voucher with status: ${d.status}` };
    case 'VOUCHER_EXPIRED':
      return { status: 400, message: `Voucher expired on ${d.expiry_date}` };
    case 'INVALID_AMOUNT':
      return { status: 400, message: 'amount must be a positive number' };
    case 'INSUFFICIENT_BALANCE':
      return { status: 400, message: `Amount ${d.amount} exceeds balance ${d.balance}` };
    case 'NOTHING_TO_UNDO':
      return { status: 400, message: 'No redemption to undo' };
    default:
      return { status: 400, message: `Redemption failed: ${result.error}` };
  }
}

function rpcErrorToResponse(result, request, env) {
  const parts = rpcErrorParts(result);
  if (!parts) return null;
  return json({ error: parts.message }, parts.status, request, env);
}

function json(data, status, request, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(request, env) },
  });
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin, env) ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Staff-Secret',
    Vary: 'Origin',
  };
}

function isAllowedOrigin(origin, env) {
  if (!origin) return false;
  // Allow any localhost / 127.0.0.1 origin in development (any port)
  try {
    const u = new URL(origin);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true;
  } catch { /* invalid URL — fall through to list check */ }
  return (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean).includes(origin);
}

function isStaffAuthed(request, env) {
  const secret = env.STAFF_SHARED_SECRET;
  if (!secret) return false;
  return request.headers.get('X-Staff-Secret') === secret;
}

function assertStaffAuth(request, env) {
  if (!isStaffAuthed(request, env)) {
    throw Object.assign(new Error('Unauthorised'), { status: 401 });
  }
}

export function chargeAmountCents(item) {
  const dollars = item.price === null || item.price === undefined ? item.value : item.price;
  return Math.round(Number(dollars) * 100);
}

function assertEnv(env, keys) {
  const missing = keys.filter((key) => !env[key]);
  if (missing.length) throw new Error(`Missing Worker configuration: ${missing.join(', ')}`);
}

function parseIntegerEnv(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanString(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeDepositRequest(data) {
  const name = cleanString(data.name, 100);
  const email = cleanString(data.email || '', 254);
  const eventDate = cleanString(data.event_date, 20);
  const eventTime = cleanString(data.event_time, 40);
  const eventTimeLabel = cleanString(data.event_time_label || eventTime, 40);

  if (!name) throw new Error('Organiser name is required');
  if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) throw new Error('Valid event date is required');
  if (!isFutureDate(eventDate)) throw new Error('Event date must be in the future');
  if (!eventTime) throw new Error('Event time is required');

  return { name, email, event_date: eventDate, event_time: eventTime, event_time_label: eventTimeLabel, request_id: crypto.randomUUID() };
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
