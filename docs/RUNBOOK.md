# RUNBOOK — Wire real commerce (Neon + Stripe + Resend + Auth.js)

Everything below runs on YOUR machine/accounts. This sandbox can't reach Neon
or Stripe, so these steps are how you reach the definition of done.

## 0. Prereqs
- Neon project (free tier fine) → copy the connection string.
- Vercel Blob store → copy its read/write token for product photos and video.
- Stripe account in TEST mode → copy `sk_test_...`.
- Resend account → API key + a verified sender (or use `onboarding@resend.dev`).
- `npm i -g stripe` (Stripe CLI) for local webhooks.

## 1. Env
```bash
cp .env.example .env
# fill in DATABASE_URL, AUTH_SECRET (openssl rand -hex 32), AUTH_RESEND_KEY,
# EMAIL_FROM, STRIPE_SECRET_KEY, OPERATOR_EMAIL, NEXT_PUBLIC_APP_URL,
# BLOB_READ_WRITE_TOKEN
```

For production also set `STRIPE_MODE=live`, `SOLO_SHIPPING_POLICY=free|rates`,
`SUPPORT_EMAIL`, and `CRON_SECRET`. Keep `PUBLIC_LIVE_PAYMENTS_ENABLED=false`
until the live evidence cycle below is complete. While it is false, production
checkout is available only to a signed-in operator so the proof cycle can run
without opening payments to public visitors.

## 2. Create tables + seed
```bash
npm run db:push        # pushes schema to Neon (or: db:generate already ran → apply drizzle/*.sql)
npm run db:seed        # inserts products + your operator user
```
Verify in Neon's SQL editor: `select name, base_price from products;` → 6 rows.

## 3. Start Stripe webhook listener (separate terminal)
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# copy the printed whsec_... into .env as STRIPE_WEBHOOK_SECRET, restart dev
```

## 4. Run
```bash
npm run dev
```

## 5. THE 8-STEP VERIFICATION (your definition of done)
1. **Restart persistence** — stop `dev`, restart. Products still show at
   `/hardware` (they're in Neon, not memory). ✓ data remains.
2. **Buy in Stripe test mode** — add a product → `/checkout` → pay with
   card `4242 4242 4242 4242`, any future date/CVC. Redirects to `/order/success`.
3. **Webhook marks paid** — the `stripe listen` terminal shows
   `checkout.session.completed → 200`. Order `paymentState` flips to `paid`
   (check Neon or `/operator/orders`).
4. **Operator sees order** — sign in at `/sign-in` with your OPERATOR_EMAIL
   (magic link via Resend), open `/operator` → the paid order is listed.
5. **Assign device** — open the order → Start production → Assign device
   (mints a real `devices` row, links it to the order item).
6. **Mark shipped** — Ready to ship → enter tracking → Mark shipped. Customer
   gets a shipped email (Resend).
7. **Customer activates** — visit `/d/<token>` for the device (or the activation
   flow) → claim → device row gets `profileId` + `activatedAt` persisted.
8. **Resolves after restart** — restart `dev` again → `/d/<token>` still
   resolves to the same profile. ✓ activation persisted.

## Deploy (Vercel)
- Add all `.env` vars in Vercel project settings.
- Add a Stripe **dashboard** webhook endpoint → `https://YOURDOMAIN/api/stripe/webhook`,
  events `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
  `checkout.session.async_payment_failed`, `checkout.session.expired`,
  `refund.updated`, and `charge.refunded`; copy its signing secret to
  `STRIPE_WEBHOOK_SECRET`.
- `db:push` runs against the same Neon DB.
- Verify `/operator/launch` has no failed configuration or operational checks.
- Complete and document one live purchase → webhook → both paid emails → operator
  production → physical device assignment → shipment → customer activation → full
  refund. Only then set `PUBLIC_LIVE_PAYMENTS_ENABLED=true` and redeploy.

## Status of wiring (honest)
- IMPLEMENTED + WIRED (given keys): Neon persistence via repo, Auth.js magic
  link, Stripe Checkout, signature-verified webhook, Resend emails, seed.
- DEMO FALLBACK: with no DATABASE_URL the app still boots on in-memory stores
  (so you can click around before wiring). Every path branches `if (db)`.
- PRODUCT STUDIO: `/operator/products` edits the Neon-backed catalog. Photos,
  galleries, video, posters, focal points and ordering use Vercel Blob plus
  Neon metadata. Upload is disabled honestly when `BLOB_READ_WRITE_TOKEN` is absent.
- DEVICE REGISTRY: `/operator/devices` exposes assignment, lifecycle status,
  lost/disabled states and replacement creation.
