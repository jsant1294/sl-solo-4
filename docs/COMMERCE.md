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

## Bundles — multi-item kits (e.g. the Networking Kit)

A bundle is a normal `products` row (`productType: "bundle"`) composed of **slots**
(`product_bundle_slots` + `product_bundle_slot_options`) — e.g. `phone_tag`, `nfc_card`,
`wearable`. Each slot resolves to one component product/variant; a slot with one option has
no customer choice, a slot with multiple options (e.g. bracelet material) does. This is
generic — a future kit just needs new slot rows, no schema change.

`addBundleToCart` (`src/app/(shop)/cart-actions.ts`) writes one ordinary `CartLine` per slot,
all sharing a `bundleGroupId`. **`priceCart` never trusts the cart cookie for a bundle's
price or entitlements** — it re-fetches the bundle's slot definitions fresh from the DB, verifies
the group's lines are a valid combination, then prices the bundle's full `basePrice` onto the
first slot and 0 onto the rest (so `orderItems.unitPrice` still sums to the bundle price, and
each physical component still gets its own `orderItem` for normal per-item device fulfillment —
nothing about `assignDevice`/`claimDevice` changes). The bundle's **full capability set** is
snapshotted the same way, onto that same first `orderItem` — see "Entitlements — multi-capability
commerce architecture" below for the pipeline this feeds.

Bundles require a database (`repo.products.bundleSlots`) — like physical device provisioning,
there's no in-memory demo-mode equivalent.

## Entitlements — multi-capability commerce architecture (FROZEN)

**Status: frozen as of the multi-entitlement foundation build.** This is the accepted shape of
the entitlement system. Do not add tables, columns, or registry entries beyond what's described
here without a fresh design pass — new *products* built on top of it (see "What's next" below)
are the expected next step, not more infrastructure.

The pipeline has exactly four stages, and each stage only ever talks to its neighbors:

```
PRODUCT → CAPABILITY SET
  a product/bundle declares which capabilities buying it unlocks

ORDER → IMMUTABLE CAPABILITY SNAPSHOT
  checkout resolves that set server-side and freezes it onto the order

PAYMENT → MATERIALIZED USER ENTITLEMENTS
  a successful webhook turns the frozen snapshot into per-user grants

FEATURE → hasEntitlement(userId, capability)
  every gated feature asks this one question and nothing else
```

### 1. PRODUCT → CAPABILITY SET

- `product_entitlement_grants` (`product_id`, `entitlement_key`, unique on the pair) is the
  **canonical, editable** source of what a product/bundle currently grants. A product can carry
  zero, one, or several capabilities. Read/write via `repo.products.entitlementGrants` /
  `replaceEntitlementGrants` (validates every key against the registry, replaces the full set
  transactionally — never a partial update) / `effectiveEntitlementGrants` (unions the join-table
  rows with the legacy scalar below, deduped).
- `products.grantsEntitlement` (text, nullable) is the **legacy scalar** from before multi-grant
  support existed. It still works and is still honored by `effectiveEntitlementGrants` — it is
  never altered, migrated, or deleted by the new system. The operator product editor
  (`/operator/products/[id]`) shows it read-only if present; the only way to *change* what a
  product grants going forward is the "Grants capabilities" checkbox list, which writes
  exclusively to `product_entitlement_grants`.
- The capability vocabulary itself lives in `src/lib/entitlement-registry.ts`
  (`KNOWN_ENTITLEMENTS`) — currently exactly `solo_networking` and `solo_resume`. This file is
  deliberately commerce-free: no prices, no product/bundle IDs, no hardware assumptions, just
  "what capability is this." `isKnownEntitlementKey()` is the only gate on what an operator can
  select or a caller can persist. Adding a future capability is one entry here; it does not
  imply a product exists yet that sells it.

### 2. ORDER → IMMUTABLE CAPABILITY SNAPSHOT

- `order_item_entitlement_grants` (`order_item_id`, `entitlement_key`) is purchase-time truth,
  frozen at checkout and never re-derived afterward. `repo.orders.create()` resolves each line's
  capability set server-side and inserts these rows in the **same transaction** as the order and
  its `orderItems` — a partial write (order created, grants missing) cannot happen.
  `orderItems.grantsEntitlement` (legacy scalar snapshot) keeps working the same way for orders
  created before this table existed and for any order that only ever needed one capability.
- **Bundle carrier-line invariant**: a bundle's capability set is stamped on exactly one physical
  line (the first slot) — never duplicated across every component line. A 3-line, $99 Networking
  Kit purchase produces one `solo_networking` grant, not three. This is enforced in
  `priceBundleGroup` (`src/lib/cart.ts`) and must hold for any future multi-line bundle.
- Nothing about entitlements is ever trusted from the browser/cart cookie — `priceCart` re-fetches
  `effectiveEntitlementGrants` from the DB on every checkout, exactly like it re-fetches price.

### 3. PAYMENT → MATERIALIZED USER ENTITLEMENTS

- The Stripe webhook (`src/app/api/stripe/webhook/route.ts`) calls
  `repo.orders.markPaidOnce()` (idempotent) then `repo.entitlements.grantForPaidOrder(orderId,
  userId)`. That function computes the **union** of the legacy per-item scalar and the new
  `order_item_entitlement_grants` rows for that order, dedupes, and grants each key independently
  via `entitlements` (`userId`, `key`, unique pair, `sourceOrderId`, `revoked`). An order with two
  capabilities materializes two independent entitlement rows — no feature needs to know which
  product or line item supplied either one.
- Historical orders are never backfilled into the new table — their legacy scalar is already
  complete purchase-time truth, and the union naturally degrades to exactly today's single-key
  behavior for them.
- Guest checkout (`userId` null) grants nothing at checkout time — documented Phase 1 limitation,
  unchanged by this work; the buyer must sign in / link the order later.

### 4. FEATURE → hasEntitlement(userId, capability)

- `hasEntitlement(userId, key)` / `grantEntitlement(userId, key, sourceOrderId)`
  (`src/lib/entitlements.ts`) remain the **only** choke point a feature ever calls. There is no
  `hasPurchasedNetworkingKit()`, no `hasProfessionalProduct()`, and there must never be one —
  products sell capabilities, features check capabilities, and that separation is what lets
  future commerce recombine capabilities freely without touching feature code.
- Resume's gate (`resumeSettings.requiredEntitlement`, nullable) and any future gate both just
  call `hasEntitlement` with a key — neither the feature nor the gate cares which product,
  bundle, or future package happens to grant that key.

### What's next (not this system)

This architecture is capability-agnostic on purpose: it does not know or care that
`solo_networking` currently only comes from the Networking Kit, or that `solo_resume` currently
comes from nothing (Resume is free — `resumeSettings.requiredEntitlement` is `NULL`). Building a
**Professional product/package** that sells one or both capabilities together is pure product/
commerce design on top of this — a new `products` row (optionally a new bundle), its
`product_entitlement_grants` rows, and (only if a deliberate paywall decision is made) flipping
`resumeSettings.requiredEntitlement` to `solo_resume`. None of that requires touching this
pipeline. See `docs/RESUME.md` and `docs/NETWORKING.md` for the two features that currently sit
behind it.

## Wire order
1. DATABASE_URL + db:push → swap demo getters for Drizzle.
2. STRIPE_SECRET_KEY → PaymentProvider goes live automatically.
3. Vercel Blob → StorageProvider upload/delete + product image admin.
4. Email provider → NotificationProvider.
5. Auth.js → getSessionUserId (customer) + requireOperator (staff).
