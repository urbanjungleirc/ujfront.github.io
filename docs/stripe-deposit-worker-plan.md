# Stripe Deposit Worker Plan

## Architecture

```text
deposits.html
  -> Cloudflare Worker /v1/checkout/sessions
  -> Stripe Checkout
  -> Stripe webhook /v1/webhooks/stripe
  -> Worker verifies Stripe signature
  -> Worker posts verified payment data to GAS
  -> GAS writes deposits row and sends emails
```

## Why This Boundary

The static site must not hold Stripe secret keys. GAS remains useful for the current deposit sheet and email workflow, but it is not ideal for Stripe webhook verification. The Worker handles payment-sensitive work and GAS receives only verified fulfillment requests.

## Future Products

The Worker accepts `product` in checkout requests. `deposit` is currently implemented. A rebuilt voucher product can later use the same Worker with a separate fulfillment path, likely to Supabase rather than GAS.

## Required Runtime Configuration

Worker vars in `wrangler.toml`:

- `ALLOWED_ORIGINS`
- `PUBLIC_BASE_URL`
- `DEPOSIT_AMOUNT_CENTS`
- `DEPOSIT_FEE_CENTS`
- `DEPOSIT_CURRENCY`

Worker secrets:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `GAS_DEPOSIT_WEBAPP_URL`
- `GAS_DEPOSIT_SHARED_SECRET`

## GAS Change

The deposit GAS script should reject `payment_platform=stripe` unless the POST includes the matching shared secret. This keeps existing PayPal behavior during transition while preventing fake Stripe fulfillment calls.
