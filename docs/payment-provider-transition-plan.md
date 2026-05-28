# Payment Provider Transition Plan

Last updated: 2026-05-28

## Objective

Move online deposit payments from browser-side PayPal capture to Stripe Checkout via a Cloudflare Worker, without interrupting the current live PayPal flow.

Secondary objective: keep the Worker reusable for future payment products, especially the planned voucher rebuild with Supabase.

## Current State

- `deposits.html` is live with PayPal.
- Stripe checkout code exists in `deposits.html`, but is disabled behind:
  ```js
  const PAYMENT_PROVIDER = 'paypal';
  ```
- Cloudflare Worker scaffold exists under `cloudflare/payments-worker`.
- GAS still writes the deposit sheet and sends emails.
- GAS has a Stripe shared-secret guard for future Worker fulfillment.

## Phase 1: Foundation

- [x] Create Cloudflare Worker project structure.
- [x] Add Worker endpoint for health checks.
- [x] Add Worker endpoint for Stripe Checkout Session creation.
- [x] Add Worker endpoint for Stripe webhook handling.
- [x] Add Stripe webhook signature verification.
- [x] Add deposit fulfillment call from Worker to GAS.
- [x] Keep `deposits.html` live on PayPal during transition.
- [x] Add disabled-by-default Stripe checkout path in `deposits.html`.
- [x] Add GAS shared-secret guard for Stripe fulfillment.
- [x] Add `.gitignore` rules for env files, AI folders, GAS, clasp, Worker local state.
- [x] Add handover documentation.

## Phase 2: Local Worker Setup

- [x] Install Worker dependencies in `cloudflare/payments-worker`.
- [x] Confirm `npm run check` passes.
- [x] Run Worker locally with Wrangler.
- [x] Confirm `GET /health` returns OK.
- [x] Create local `.dev.vars` for test-only configuration.
- [x] Confirm `.dev.vars` is ignored by git.

## Phase 3: Stripe Test Configuration

- [x] Create or locate Stripe test account keys.
- [x] Set local `STRIPE_SECRET_KEY`.
- [x] Run Stripe CLI webhook forwarding to local Worker.
- [x] Set local `STRIPE_WEBHOOK_SECRET` from Stripe CLI output.
- [x] Confirm Worker rejects webhook calls with invalid signature.
- [x] Confirm Worker accepts a valid Stripe test webhook.

### Phase 3 Setup Notes

Stripe CLI is installed at `C:\Users\Jiri\Documents\stripe.exe`. PATH did not pick it up, so use the full path for now. Official install docs:

https://docs.stripe.com/stripe-cli/install

Stripe test keys are in the Stripe Dashboard under Developers/API keys. Use the sandbox/test secret key that starts with `sk_test_`.

https://docs.stripe.com/keys

For local webhook testing, run:

```bash
stripe login
stripe listen --forward-to localhost:8787/v1/webhooks/stripe
```

The `stripe listen` command prints a webhook signing secret beginning with `whsec_`. Put that value in local `.dev.vars` as `STRIPE_WEBHOOK_SECRET`.

## Phase 4: Deposit Checkout Test

- [x] Directly POST a test deposit request to `/v1/checkout/sessions`.
- [x] Confirm Stripe Checkout Session is created.
- [x] Confirm returned Checkout URL opens correctly.
- [x] Confirm line items show deposit and online processing fee.
- [x] Confirm customer email is collected by Stripe Checkout.
- [x] Confirm metadata contains deposit booking details.

## Phase 5: GAS Fulfillment Test

- [ ] Add `DEPOSIT_WORKER_SHARED_SECRET` to GAS script properties.
- [ ] Set local Worker `GAS_DEPOSIT_WEBAPP_URL`.
- [ ] Set local Worker `GAS_DEPOSIT_SHARED_SECRET`.
- [ ] Pay a Stripe test Checkout Session.
- [ ] Confirm webhook triggers Worker fulfillment.
- [ ] Confirm GAS appends a row to `deposits`.
- [ ] Confirm staff email sends.
- [ ] Confirm purchaser email sends.
- [ ] Confirm fake `payment_platform=stripe` browser POST without the shared secret is rejected.

## Phase 6: Frontend Stripe Trial

- [ ] Replace placeholder `PAYMENTS_WORKER_URL` in `deposits.html` with local or deployed Worker URL for testing.
- [ ] Temporarily set `PAYMENT_PROVIDER = 'stripe'` in a local-only test copy or branch.
- [ ] Open `deposits.html` locally.
- [ ] Confirm validation enables/disables the Stripe button correctly.
- [ ] Confirm button redirects to Stripe Checkout.
- [ ] Confirm return to `deposits.html?payment=success`.
- [ ] Add user-facing success/cancel message handling if needed.

## Phase 7: Worker Deployment

- [ ] Decide Worker production URL.
- [ ] Set Cloudflare Worker production secrets:
  ```bash
  wrangler secret put STRIPE_SECRET_KEY
  wrangler secret put STRIPE_WEBHOOK_SECRET
  wrangler secret put GAS_DEPOSIT_WEBAPP_URL
  wrangler secret put GAS_DEPOSIT_SHARED_SECRET
  ```
- [ ] Deploy Worker.
- [ ] Confirm deployed `/health`.
- [ ] Configure Stripe webhook endpoint to deployed Worker URL.
- [ ] Confirm live webhook endpoint receives test events.

## Phase 8: Production Cutover

- [ ] Keep PayPal code available as rollback.
- [ ] Update `PAYMENTS_WORKER_URL` to deployed Worker URL.
- [ ] Change:
  ```js
  const PAYMENT_PROVIDER = 'stripe';
  ```
- [ ] Update page text that mentions PayPal to payment-provider-neutral or Stripe-specific wording.
- [ ] Test one low-risk real payment or Stripe live-mode controlled payment.
- [ ] Confirm sheet row, staff email, purchaser email, and Stripe dashboard payment.
- [ ] Monitor first few real transactions.

## Phase 9: Cleanup After Stable Operation

- [ ] Remove PayPal SDK script from `deposits.html`.
- [ ] Remove PayPal-specific `initPayPalButton` code.
- [ ] Rename `paypal-button-container` to a provider-neutral ID.
- [ ] Update old PayPal wording in deposit page copy.
- [ ] Document final Stripe operation and rollback notes.

## Future Voucher Direction

- [ ] Keep voucher migration separate from deposit migration.
- [ ] Add new Worker product handler when voucher rebuild starts.
- [ ] Prefer Supabase persistence for rebuilt voucher system.
- [ ] Avoid coupling new voucher flow to current voucher GAS backend unless needed temporarily.

## Rollback

Rollback during transition is simple while PayPal code remains:

```js
const PAYMENT_PROVIDER = 'paypal';
```

Do not remove PayPal code until Stripe deposit payments have been stable for a reasonable operating period.
