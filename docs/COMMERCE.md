# COMMERCE + FULFILLMENT

## Golden path (wired, in-memory)
Homepage → /hardware → /hardware/[slug] (variant/color/personalization) →
add to cart (cookie) → /cart → /checkout → PaymentProvider (STUBBED →
simulated paid) → order created + operator notified (console) → /order/success.

Operator: /operator dashboard → /operator/orders → /operator/orders/[id] →
Start production → Assign device (happens in fulfillment, not at buy) →
Ready to ship → Add tracking → Mark shipped → customer shipped notification.

## Payment vs fulfillment are separate
`orders.paymentState` (pending|paid|failed|refunded) and
`orders.fulfillmentState` (unfulfilled|production|ready_to_ship|shipped|
delivered|cancelled) never conflate. A paid order starts unfulfilled.

## Provider seams (src/lib/providers)
- StorageProvider — STUBBED (no Vercel Blob). Product images use CSS
  placeholders via ProductShot; real photos drop in through the media
  contract, never hardcoded in JSX.
- PaymentProvider — STUBBED without STRIPE_SECRET_KEY (simulated success);
  real Stripe session when key present.
- NotificationProvider — STUBBED (console.log). Operator new-order +
  customer confirmation/shipped hooks fire through it.

## Device → destination invariant (preserved)
NFC encodes /d/[token] (permanent). Username is mutable and human-facing
(/u/[username]). Device assignment mints a device during fulfillment.

## Wire order
1. DATABASE_URL + db:push → swap demo getters for Drizzle.
2. STRIPE_SECRET_KEY → PaymentProvider goes live automatically.
3. Vercel Blob → StorageProvider upload/delete + product image admin.
4. Email provider → NotificationProvider.
5. Auth.js → getSessionUserId (customer) + requireOperator (staff).
