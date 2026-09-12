# SL / SOLO — Architecture

## Product boundary
SOLO = premium lightweight identity → tap → action. NFC/QR, profiles, light
activity, contact capture, upgrade bridge. SOLO does NOT contain booking,
invoicing, estimates, CRM, Growth/Resolution, campaigns, media ops. Those are
SL / BUSINESS. The only bridge is `UpgradeIntent` capture.

## The core chain
ACCOUNT → PROFILE → DESTINATION → DEVICE/QR

- **Account** (`users`) owns everything.
- **Profile** (`profiles`) owns identity. Typed via `profileType` + `data`.
- **Destination** (`destinations`) is a stable random token. NFC/QR encode the
  destination, never a username. Re-point it or attach a replacement tag without
  reprinting hardware; change the username without breaking any device.
- **Device** (`devices`) points at a destination. It does not own identity.

Public routing: `/d/[token]?s=nfc|qr` resolves token → active profile and
records the source, then serves `/u/[username]`.

## Rendering boundary
`ProfileRenderer` dispatches by type → `StandardProfile` | `KidsProfile`.
Shared infra shared; presentation specialized. Profile Studio's live preview
reuses these exact renderers — no duplicate preview markup.

## Profile Studio
Authenticated owner editor at `/app/profiles/[profileId]`. Shared editor shell +
type-adaptive sections (Identity, Contact, Links, Appearance, Devices/QR;
Kids swaps in Guardians + Emergency). Debounced autosave with explicit
Saving/Saved/Failed state; beforeunload guard on unsaved changes. Every mutation
goes through server actions that call `requireOwnedProfile()`.

## Security
- Ownership enforced server-side (`src/lib/auth.ts`). Client never authorizes.
- Non-owned target → 404 (Studio) or `{ ok:false }` (actions), never a leak.
- Kids: numbers out of page source, noindex, unguessable routing.
- OWNER vs OPERATOR are separate. Operator support is a documented future seam,
  deliberately not mixed into Studio.

## Data layer / seams
The shell runs on `src/db/demo.ts` (in-memory, schema-shaped). Real Drizzle
client is in `src/db/index.ts`. Swap getters/action writes for Drizzle queries
scoped by userId; pages don't change. Seams are marked `// @wire`.

## i18n
True EN/ES via `src/i18n/dict.ts`. `?lang=` drives locale per page; pages are
`force-dynamic` because search params drive render.

## Stack
Next.js 15 App Router · TS · Tailwind (tokens in globals.css) · Drizzle/Postgres
(Neon) · Stripe Checkout · next/font (Fraunces / Inter Tight / JetBrains Mono).
