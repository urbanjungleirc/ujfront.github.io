# Payment Provider Transition Plan

Last updated: 2026-06-16

## Objective

Move online deposit payments from browser-side PayPal capture to Stripe Checkout via a Cloudflare Worker, without interrupting the current live PayPal flow.

Secondary objective: keep the Worker reusable for future payment products, especially the planned voucher rebuild with Supabase.

## Current State (as of 2026-06-16)

- `deposits.html` is **live on Stripe**. PayPal code is retained for rollback only.
- Worker deployed at `https://uj-payments.urbanjungle.workers.dev`.
- GAS handles deposit sheet writes and sends staff + customer emails.
- Stripe live webhook registered at the deployed Worker URL.
- Phase 9 cleanup (removing PayPal code) deferred until Stripe is stable.

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

- [x] Add `DEPOSIT_WORKER_SHARED_SECRET` to GAS script properties.
- [x] Set local Worker `GAS_DEPOSIT_WEBAPP_URL`.
- [x] Set local Worker `GAS_DEPOSIT_SHARED_SECRET`.
- [x] Pay a Stripe test Checkout Session.
- [x] Confirm webhook triggers Worker fulfillment.
- [x] Confirm GAS appends a row to `deposits`.
- [x] Confirm staff email sends.
- [x] Confirm purchaser email sends.
- [x] Confirm fake `payment_platform=stripe` browser POST without the shared secret is rejected.

## Phase 6: Frontend Stripe Trial

- [x] Replace placeholder `PAYMENTS_WORKER_URL` in `deposits.html` with local Worker URL for testing.
- [x] Set `PAYMENT_PROVIDER = 'stripe'` for local testing.
- [x] Open `deposits.html` locally.
- [x] Confirm validation enables/disables the Stripe button correctly.
- [x] Confirm button redirects to Stripe Checkout.
- [x] Confirm return to `deposits.html?payment=success`.
- [x] Add user-facing success/cancel message handling.

## Phase 7: Worker Deployment

- [x] Decide Worker production URL: `https://uj-payments.urbanjungle.workers.dev`.
- [x] Set Cloudflare Worker production secrets:
  ```bash
  wrangler secret put STRIPE_SECRET_KEY
  wrangler secret put STRIPE_WEBHOOK_SECRET
  wrangler secret put GAS_DEPOSIT_WEBAPP_URL
  wrangler secret put GAS_DEPOSIT_SHARED_SECRET
  ```
- [x] Deploy Worker.
- [x] Confirm deployed `/health`.
- [x] Configure Stripe webhook endpoint to deployed Worker URL.
- [x] Confirm live webhook endpoint receives test events.

## Phase 8: Production Cutover

- [x] Keep PayPal code available as rollback.
- [x] Update `PAYMENTS_WORKER_URL` to deployed Worker URL.
- [x] Change `PAYMENT_PROVIDER` to `'stripe'`.
- [x] Update page text — removed PayPal references, updated fee amount and email wording.
- [x] Test end-to-end with Stripe test keys on deployed Worker.
- [x] Switch to live Stripe keys.
- [ ] Monitor first few real transactions (ongoing).

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
