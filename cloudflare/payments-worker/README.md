# Urban Jungle Payments Worker

Cloudflare Worker (`uj-payments`) — payment gateway and voucher API for Urban
Jungle's public payment pages. Handles two products end to end:

- **Group booking deposits** — paid from `tools.urbanjungleirc.com/deposits.html`,
  recorded in a Google Sheet via a GAS web app.
- **Gift vouchers (v3 voucher system)** — sold from `vouchers.urbanjungleirc.com`,
  stored in Supabase, delivered as HTML email via Resend, managed by staff
  through the staff portal.

## Architecture

```
tools.urbanjungleirc.com/deposits.html ──┐
vouchers.urbanjungleirc.com ─────────────┤ POST /v1/checkout/sessions
staff portal (vouchers admin) ───────────┤ /v1/vouchers*, /v1/staff/*  (X-Staff-Secret)
                                         ▼
                              uj-payments (this Worker)
                                         │
        ┌────────────────┬───────────────┼────────────────────┐
        ▼                ▼               ▼                    ▼
     Stripe           Supabase         Resend          GAS web app (deposits only)
 (Checkout sessions  (voucher DB:    (voucher HTML    (writes booking row to the
  + webhook events)   types, items,   emails)          deposits Google Sheet
                      vouchers,                        and sends emails)
                      audit log)
```

The Worker is deployed on Urban Jungle's Cloudflare account (workers.dev
subdomain `urbanjungle`). Deploying requires access to that account — run
`npx wrangler deploy` from this directory. Operational details (accounts,
dashboards, secrets inventory, incident history) are documented in the private
project hub, not in this public repo.

## Endpoints

Public:

- `GET /health`
- `POST /v1/checkout/sessions` — create Stripe Checkout (deposit or voucher)
- `POST /v1/webhooks/stripe` — Stripe webhook (fulfilment for both products)
- `GET /v1/voucher-types`, `GET /v1/voucher-types/:typeId/items`

Staff (require `X-Staff-Secret` header):

- `GET /v1/vouchers/search|report|stats`, `GET /v1/vouchers/:code`
- `POST /v1/vouchers` (create physical/staff voucher)
- `POST /v1/vouchers/:code/redeem|undo-redemption|resend-email`
- `GET|POST /v1/staff/voucher-types`, `POST /v1/staff/voucher-types/preview`
- `POST /v1/staff/voucher-items`, `DELETE /v1/staff/voucher-items/:id`

## Payment flows

Both products share one flow shape:

1. The frontend posts details to `/v1/checkout/sessions`; the Worker creates a
   Stripe Checkout Session with `metadata.product` = `deposit` | `voucher`.
2. The customer pays on Stripe Checkout.
3. Stripe sends `checkout.session.completed` to `/v1/webhooks/stripe`.
4. The Worker verifies the Stripe signature, then fulfils by product:
   - **deposit** → posts payment details to the GAS web app, which writes the
     sheet row and sends emails.
   - **voucher** → inserts the voucher (+ purchase tracking + audit log) into
     Supabase, then sends the voucher email via Resend.

Voucher fulfilment is **idempotent** on the Checkout Session id
(`payment_reference`) — redelivering a webhook event never creates a duplicate,
so Stripe's "Resend" button is always safe for vouchers.

## Stripe webhook — configuration rules

- There must be **exactly one** webhook endpoint in Stripe pointing at
  `/v1/webhooks/stripe`, subscribed to `checkout.session.completed`.
- Each Stripe endpoint has its **own signing secret**. The Worker can only
  verify one (`STRIPE_WEBHOOK_SECRET`), so a second endpoint pointing at the
  same URL will fail every delivery with `400 Invalid signature`, and Stripe
  will eventually threaten to disable it (this happened June 2026 — a duplicate
  endpoint created during the voucher v3 go-live).
- If the Stripe dashboard shows `Invalid signature` failures: first check for a
  duplicate endpoint, then check that the deployed `STRIPE_WEBHOOK_SECRET`
  matches the endpoint's `whsec_…` signing secret.

## Secrets

Set with `wrangler secret put <NAME>` (never commit values — this repo is public):

| Secret | Used for |
|--------|----------|
| `STRIPE_SECRET_KEY` | Creating Checkout Sessions |
| `STRIPE_WEBHOOK_SECRET` | Verifying webhook signatures (endpoint's `whsec_…`) |
| `GAS_DEPOSIT_WEBAPP_URL` | Deposit fulfilment target |
| `GAS_DEPOSIT_SHARED_SECRET` | Deposit GAS auth |
| `SUPABASE_URL` | Voucher database |
| `SUPABASE_SERVICE_ROLE_KEY` | Voucher database auth |
| `RESEND_API_KEY` | Voucher emails |
| `STAFF_SHARED_SECRET` | Staff endpoint auth (`X-Staff-Secret`) |

## Local dev

```bash
npm install
npm run dev
```

Use Stripe CLI webhook forwarding during local testing:

```bash
stripe listen --forward-to localhost:8787/v1/webhooks/stripe
```

Put the `whsec_…` value that `stripe listen` prints into your **local**
`.dev.vars` only. It is a CLI-session secret — never `wrangler secret put` it
to the deployed Worker, or live webhook verification will break.
