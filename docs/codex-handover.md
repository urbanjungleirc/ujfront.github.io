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
- Verified Stripe payment posts to GAS.
- `deposits.html` includes Stripe checkout path but PayPal remains active.
- GAS guard added for Stripe fulfillment.
- Worker not deployed yet.
- Worker dependencies not installed yet.
- Stripe webhook endpoint not configured yet.
- Tickable transition plan created at `docs/payment-provider-transition-plan.md`.

## Verification Run

Both passed:

```bash
node --check cloudflare\payments-worker\src\index.js
node --check gas\online-deposit-payments\Code.js
```

## Git Notes

Current expected visible changes:

```text
M .gitignore
M deposits.html
?? cloudflare/payments-worker/README.md
?? cloudflare/payments-worker/package.json
?? cloudflare/payments-worker/src/index.js
?? cloudflare/payments-worker/wrangler.toml
?? docs/codex-handover.md
?? docs/payment-provider-transition-plan.md
?? docs/stripe-deposit-worker-plan.md
```

`gas/` is ignored by git, so GAS changes must be deployed/tracked separately with clasp.

## Next Steps

1. Install Worker dependencies in `cloudflare/payments-worker`.
2. Run Worker locally with Wrangler.
3. Configure Stripe test keys and webhook secret.
4. Test creating a Checkout Session from `deposits.html` or a direct POST.
5. Use Stripe CLI to forward webhooks locally.
6. Confirm Worker posts verified deposit data to GAS.
7. Deploy Worker.
8. Replace placeholder `PAYMENTS_WORKER_URL` in `deposits.html`.
9. Switch `PAYMENT_PROVIDER` from `paypal` to `stripe`.
10. Test with Stripe test mode end to end before live keys.

## Design Notes

- Do not put Stripe secret keys in static frontend files.
- Do not trust success redirects for fulfillment; use Stripe webhook only.
- Keep the Worker product-oriented. Future product handlers should branch by `product`, not reuse deposit-specific logic.
- For the voucher rebuild, likely use Supabase for persistence and avoid GAS where possible.
