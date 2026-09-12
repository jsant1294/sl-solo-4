# Plans — reserved, not active

`users.plan` (text, default `"free"`) and `pricing_plans` (migration `0013_pricing_plans.sql`)
exist so a future paid tier doesn't require a schema migration to introduce or a code deploy to
reprice. **No plan currently gates any feature.** Every account behaves identically regardless
of `plan`, and every feature described in [SOLO_PAYMENTS.md](SOLO_PAYMENTS.md), [COMMERCE.md](COMMERCE.md),
and the kids/leads flows works the same for every tier.

## How it's wired

- `pricing_plans` is CMS data, same pattern as `purpose_options`/`collection_options` — editable
  at `/operator/plans` with no deploy. Columns: bilingual name/tagline/features, monthly/yearly
  price in cents (`null` = "contact us", not "free"), `stripe_price_id_*` (unset until billing
  exists), `highlighted` (marketing styling only), `active` (whether it'd show on a future
  `/pricing` page — no such page exists yet), `sort_order`.
- `users.plan` is plain `text`, not a Postgres enum, specifically so operators can add or rename
  a tier from the UI without an `ALTER TYPE` migration. It softly references `pricing_plans.key`
  (no DB foreign key — a user's plan key doesn't have to resolve to a currently-active row, e.g.
  after a tier is retired).
- `users.stripe_customer_id` is nullable and unset for every user today — reserved so a future
  subscription can attach a Stripe Customer without a second migration. **Do not create Stripe
  Customers eagerly for free users** — create one lazily, only when a user starts a paid upgrade.
- The migration seeds three starter rows (`free`, `pro`, `team`) with placeholder pricing and
  feature copy — see the migration file for the exact starting copy. This was a first draft to
  fill the table, not a pricing decision; change it from `/operator/plans` immediately if it's wrong.

## What's decided

- The three-tier shape (free / pro / team) and roughly what differentiates them:
  - **Free** — the whole current product: unlimited links, free contact/lead capture, 0% fee on
    payment links, one profile. This tier is the homepage's "no monthly fee, no paywalled leads"
    pitch and must never regress — see the "Why SnapLink" section in `src/app/page.tsx`.
  - **Pro** — convenience/scale, not access: more profiles, remove SnapLink footer branding,
    lead export, priority fulfillment. Chosen specifically because none of these take away
    anything Free already has.
  - **Team** — the operator/fleet angle discussed separately: multiple seats, centralized
    device/profile management, bulk ordering. This is the tier most worth building first if/when
    billing goes live, since no competitor (Linktree/Popl/Beacons) has a real multi-seat layer.

## What's explicitly NOT decided (do not assume)

- Real prices. The seeded `$6/mo` Pro and unset Team price are placeholders, not an approved
  price point.
- Whether billing is even subscription-based. `SOLO_PAYMENTS.md` confirms Stripe subscriptions
  are not implemented anywhere in the codebase today — `stripe_price_id_*` columns exist for
  when that changes, not because it's in progress.
- Any actual feature gate. Nothing in the app reads `users.plan` to allow/deny anything yet.

## Before wiring an actual gate

1. Confirm the gate doesn't take anything away from a user already on Free — grandfather
   existing users into what they already have.
2. Add a single helper (e.g. `src/lib/plan.ts`) exporting the gate check, rather than scattering
   `user.plan === "pro"` comparisons across routes/components.
3. Cross-check against the homepage's "Why SnapLink" copy before gating leads or payment-link
   fees specifically — that's a public promise about the current free feature set.
