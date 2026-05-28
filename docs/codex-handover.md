# Codex Handover

Last updated: 2026-05-28

## Current Goal

Move Urban Jungle online deposit payments from PayPal to Stripe using a Cloudflare Worker as the secure payment gateway.

Deposits are the first product. The Worker should stay product-oriented so a future voucher rebuild can use the same payment gateway without being tightly coupled to the current voucher GAS system.

## Current Architecture Direction

```text
deposits.html
  -> Cloudflare Worker /v1/checkout/sessions
  -> Stripe Checkout
  -> Stripe webhook /v1/webhooks/stripe
  -> Worker verifies Stripe signature
  -> Worker posts verified payment data to GAS
  -> GAS writes deposits row and sends emails
```

GAS remains temporarily responsible for the current deposit Google Sheet and Markdown email flow. The Worker handles Stripe secrets and webhook verification.

## Important Files

- `docs/payment-provider-transition-plan.md`
  - Tickable transition plan for moving deposits from PayPal to Stripe.
  - Keep this updated as work progresses.

- `deposits.html`
  - Still live on PayPal.
  - Has a disabled-by-default Stripe path.
  - Switch is currently:
    ```js
    const PAYMENT_PROVIDER = 'paypal';
    ```
  - Later change to `'stripe'` after Worker deployment/testing.

- `cloudflare/payments-worker/src/index.js`
  - Main Worker implementation.
  - Endpoints:
    - `GET /health`
    - `POST /v1/checkout/sessions`
    - `POST /v1/webhooks/stripe`
  - Supports `product: "deposit"` currently.
  - Verifies Stripe webhook signatures manually using Web Crypto and raw request body.

- `cloudflare/payments-worker/wrangler.toml`
  - Worker config and non-secret vars.
  - Secrets are intentionally not stored here.

- `cloudflare/payments-worker/README.md`
  - Worker setup notes and required secrets.

- `docs/stripe-deposit-worker-plan.md`
  - Architecture notes.

- `gas/online-deposit-payments/Code.js`
  - Ignored by git.
  - Added a Stripe fulfillment guard:
    - `payment_platform=stripe` requires GAS script property `DEPOSIT_WORKER_SHARED_SECRET`.
    - Existing PayPal path remains unaffected.

- `.gitignore`
  - Updated to ignore AI-local folders/files, GAS, clasp settings, env/secrets, Cloudflare local state.

## Worker Secrets Needed

Set with Wrangler:

```bash
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put GAS_DEPOSIT_WEBAPP_URL
wrangler secret put GAS_DEPOSIT_SHARED_SECRET
```

Also set the same shared secret in the deposit GAS project script properties:

```text
DEPOSIT_WORKER_SHARED_SECRET
```

## Current Status

- Worker scaffold created.
- Deposit Stripe checkout-session creation implemented.
- Stripe webhook handler implemented.
- Stripe signature verification implemented.
- Worker is implemented to post verified Stripe deposit payments to GAS.
- `deposits.html` includes Stripe checkout path but PayPal remains active.
- GAS guard added for Stripe fulfillment.
- Worker not deployed yet.
- Worker dependencies installed in `cloudflare/payments-worker`.
- Local `.dev.vars` created with placeholder test values and confirmed ignored by git.
- `npm run check` passed in the Worker folder.
- `npm run dev -- --port 8787` started Wrangler locally.
- `GET http://127.0.0.1:8787/health` returned `{ ok: true, service: "uj-payments" }`.
- Worker rejected a fake Stripe webhook with an invalid signature with HTTP 400.
- Stripe CLI is installed at `C:\Users\Jiri\Documents\stripe.exe`; PATH did not pick it up, so use the full path for now.
- Local Stripe test secret and webhook signing secret are present in `.dev.vars`.
- `stripe listen --forward-to localhost:8787/v1/webhooks/stripe` successfully forwarded valid Stripe test events.
- Worker accepted valid Stripe CLI test webhooks with HTTP 200.
- Direct POST to local `/v1/checkout/sessions` created a Stripe test Checkout Session.
- User opened the returned Stripe Checkout URL successfully in browser.
- User completed a Stripe test Checkout payment successfully.
- Retrieved paid session confirmed `customer_details.email` was collected.
- Test session status was `complete` and `payment_status` was `paid`.
- Retrieved Stripe session confirmed line items:
  - `Group booking deposit`, AUD 100.00
  - `Online processing fee`, AUD 2.90
- Retrieved Stripe session confirmed deposit metadata: product, request ID, organiser name, event date, event time, deposit amount, and fee.
- Stripe webhook endpoint is configured locally only; production webhook endpoint not configured yet.
- Tickable transition plan created at `docs/payment-provider-transition-plan.md`.

## Verification Run

Both passed:

```bash
node --check cloudflare\payments-worker\src\index.js
node --check gas\online-deposit-payments\Code.js
```

Phase 2 local setup also passed:

```bash
cd cloudflare\payments-worker
npm install
npm run check
npm run dev -- --port 8787
```

`GET http://127.0.0.1:8787/health` returned OK.

## Git Notes

Current expected visible changes:

```text
M docs/codex-handover.md
M docs/payment-provider-transition-plan.md
?? cloudflare/payments-worker/package-lock.json
```

`gas/` is ignored by git, so GAS changes must be deployed/tracked separately with clasp.

## Next Steps

1. Configure Stripe test keys and webhook secret.
2. Test creating a Checkout Session from `deposits.html` or a direct POST.
3. Use Stripe CLI to forward webhooks locally.
4. Confirm Worker posts verified deposit data to GAS.
5. Deploy Worker.
6. Replace placeholder `PAYMENTS_WORKER_URL` in `deposits.html`.
7. Switch `PAYMENT_PROVIDER` from `paypal` to `stripe`.
8. Test with Stripe test mode end to end before live keys.

## Design Notes

- Do not put Stripe secret keys in static frontend files.
- Do not trust success redirects for fulfillment; use Stripe webhook only.
- Keep the Worker product-oriented. Future product handlers should branch by `product`, not reuse deposit-specific logic.
- For the voucher rebuild, likely use Supabase for persistence and avoid GAS where possible.
