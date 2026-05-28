# Urban Jungle Payments Worker

Cloudflare Worker payment gateway for Urban Jungle public payment pages.

The first supported product is `deposit`. The Worker is structured so future payment products, such as rebuilt vouchers, can add their own Checkout and fulfillment handlers without relying on the old voucher GAS code.

## Endpoints

- `GET /health`
- `POST /v1/checkout/sessions`
- `POST /v1/webhooks/stripe`

## Deposit Flow

1. `deposits.html` posts booking details to `/v1/checkout/sessions`.
2. Worker creates a Stripe Checkout Session.
3. Customer pays on Stripe Checkout.
4. Stripe sends `checkout.session.completed` to `/v1/webhooks/stripe`.
5. Worker verifies the Stripe signature.
6. Worker posts verified payment details to the deposit GAS web app.
7. GAS writes the sheet row and sends emails.

## Secrets

Set these with `wrangler secret put`:

```bash
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put GAS_DEPOSIT_WEBAPP_URL
wrangler secret put GAS_DEPOSIT_SHARED_SECRET
```

## Local Dev

```bash
npm install
npm run dev
```

Use Stripe CLI webhook forwarding during local testing:

```bash
stripe listen --forward-to localhost:8787/v1/webhooks/stripe
```

Then copy the `whsec_...` value into `STRIPE_WEBHOOK_SECRET` for local Worker vars/secrets.
