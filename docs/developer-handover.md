# Developer Handover — UJ Payments

Last updated: 2026-06-16

## What Is Live

Group booking deposit payments on `deposits.html` are processed via Stripe Checkout, routed through a Cloudflare Worker. PayPal code remains in the page but is inactive — it is the rollback path only.

## Architecture

```
deposits.html
  → POST /v1/checkout/sessions   (Cloudflare Worker)
  → Stripe Checkout (hosted payment page)
  → Stripe webhook /v1/webhooks/stripe   (Cloudflare Worker)
  → Worker verifies Stripe signature
  → Worker POSTs verified data to GAS web app
  → GAS writes row to deposits sheet and sends emails
```

The static site never holds Stripe secret keys. GAS receives only verified, signed fulfillment requests from the Worker.

## Key Files

| File | Purpose |
|------|---------|
| `deposits.html` | Public deposit payment page |
| `cloudflare/payments-worker/src/index.js` | Worker — checkout session creation, webhook handling, GAS fulfillment |
| `cloudflare/payments-worker/wrangler.toml` | Worker config and non-secret vars |
| `cloudflare/payments-worker/.dev.vars` | Local dev secrets — gitignored, never commit |
| `gas/online-deposit-payments/Code.js` | GAS script — gitignored, deploy via clasp |
| `docs/payment-provider-transition-plan.md` | Full phase-by-phase migration history |

## Cloudflare Worker

**Production URL:** `https://uj-payments.urbanjungle.workers.dev`

**Endpoints:**
- `GET /health` — health check
- `POST /v1/checkout/sessions` — creates a Stripe Checkout Session; accepts `product: "deposit"` currently
- `POST /v1/webhooks/stripe` — receives Stripe webhooks; verifies signature; fulfills deposit via GAS

**Non-secret vars** are in `wrangler.toml`:
- `DEPOSIT_AMOUNT_CENTS` — deposit amount in cents (currently `10000` = $100 AUD)
- `DEPOSIT_FEE_CENTS` — processing fee passed through to customer (currently `230` = $2.30 AUD)
- `DEPOSIT_CURRENCY` — `aud`
- `ALLOWED_ORIGINS` — CORS allowlist
- `PUBLIC_BASE_URL` — used as fallback origin for Stripe success/cancel URLs

**Secrets** are set via Wrangler and stored in Cloudflare:
- `STRIPE_SECRET_KEY` — live key from Stripe Dashboard → Developers → API keys
- `STRIPE_WEBHOOK_SECRET` — from Stripe Dashboard → Developers → Webhooks → the registered endpoint
- `GAS_DEPOSIT_WEBAPP_URL` — GAS web app deployment URL
- `GAS_DEPOSIT_SHARED_SECRET` — shared secret matching the GAS script property

To update a secret:
```bash
cd cloudflare/payments-worker
npx wrangler secret put SECRET_NAME
```

To deploy after code or config changes:
```bash
cd cloudflare/payments-worker
npx wrangler deploy
```

## Stripe Setup

- **Live webhook endpoint:** `https://uj-payments.urbanjungle.workers.dev/v1/webhooks/stripe`
- **Event subscribed:** `checkout.session.completed`
- Stripe sends automatic payment receipts to the customer email collected at checkout (enabled in Stripe Dashboard → Settings → Customer emails)
- Stripe fees: 1.7% + $0.30 AUD domestic, 3.5% + $0.30 AUD international

## GAS Script

**File:** `gas/online-deposit-payments/Code.js` (gitignored — push with clasp)

The `doPost` function writes a row to the `deposits` sheet and sends two emails (staff + customer) using templates from the `setting` sheet.

**Stripe guard:** if `payment_platform=stripe`, the POST must include `gas_secret` matching the script property `DEPOSIT_WORKER_SHARED_SECRET`. Calls without a valid secret return `{"result":"error","error":"Unauthorized"}` and write nothing.

**Script properties required:**
- `key` — Google Spreadsheet ID (set via `initialSetup()`)
- `DEPOSIT_WORKER_SHARED_SECRET` — must match Worker secret `GAS_DEPOSIT_SHARED_SECRET`

After any code change, deploy a **new version** in Apps Script (Deploy → Manage deployments → New version). The deployment must point to "Latest version", not a pinned number.

## Frontend — deposits.html

Two constants at the top of the inline script control the payment provider:

```js
const PAYMENT_PROVIDER = 'stripe';   // switch to 'paypal' to roll back
const PAYMENTS_WORKER_URL = 'https://uj-payments.urbanjungle.workers.dev';
```

The page handles return states from Stripe Checkout:
- `?payment=success` — hides the form, shows a success banner, cleans the URL
- `?payment=cancelled` — shows a warning banner, leaves the form usable

## Local Development

1. Install Worker dependencies:
   ```bash
   cd cloudflare/payments-worker
   npm install
   ```

2. Create `.dev.vars` in `cloudflare/payments-worker/` (gitignored):
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   GAS_DEPOSIT_WEBAPP_URL=https://script.google.com/macros/s/.../exec
   GAS_DEPOSIT_SHARED_SECRET=...
   ```

3. Run the Worker locally:
   ```bash
   npm run dev -- --port 8787
   ```

4. Forward Stripe test webhooks (Stripe CLI at `C:\Users\Jiri\Documents\stripe.exe`):
   ```bash
   stripe listen --forward-to localhost:8787/v1/webhooks/stripe
   ```

5. Create a test checkout session:
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:8787/v1/checkout/sessions" -Method POST -ContentType "application/json" -Body '{"product":"deposit","name":"Test","event_date":"2026-12-01","event_time":"10.30am","event_time_label":"10.30 am"}' | Select-Object -ExpandProperty Content
   ```

6. Open the returned URL and complete checkout with test card `4242 4242 4242 4242`.

## Rollback

Change the constant in `deposits.html` and push:

```js
const PAYMENT_PROVIDER = 'paypal';
```

Do not remove PayPal code until Stripe has been stable for a reasonable period (see Phase 9 in the transition plan).

## Next Work — Voucher System

The current voucher system uses GAS for persistence. The planned rebuild should:

- Add a new product handler to the existing Worker (`product: "voucher"` branch in `createCheckoutSession`)
- Use **Supabase** for persistence instead of GAS — do not couple the new flow to the GAS voucher backend
- Keep fulfillment in the Worker (webhook → Supabase) rather than routing through GAS
- The Worker's product-oriented design (`data.product` routing) is intentionally set up for this

The deposit product is a useful reference implementation for how the Worker → Stripe → webhook → fulfillment flow works. Model the voucher product on the same pattern with a separate fulfillment function.
