# NETWORKING — business card scanner + connections (Phase 2)

## What this is

A lightweight, mobile-first rolodex for Solo customers who hold the `solo_networking`
entitlement (granted by the Networking Kit — see `docs/COMMERCE.md`, `docs/PLANS.md`). Not a
CRM: scan or manually add a connection, add private notes, set an optional follow-up date.

## Why a new table, not contactLeads

`contactLeads` (existing, free, unlimited) is **profile-scoped** — it's who contacted *a
profile* through its public page. `networkingLeads` (new, paid) is **owner-scoped** — it's who
*the owner* met, independent of which profile was involved. Different scope, different fields
(company/jobTitle/notes/followUpAt), different entitlement. They are never merged automatically.

## Entitlement, not catalog config

Every Networking route/action checks `hasEntitlement(userId, "solo_networking")`
(`src/lib/entitlements.ts`) — a durable, snapshotted grant. It never inspects the Networking
Kit product's current price/active state. A customer keeps access even if the operator later
changes or discontinues that product.

## Owner isolation

Every `repo.networkingLeads.*` query has `userId` in its `WHERE` clause, not just in the
calling code — see `src/db/repo.ts`. A lead lookup for the wrong owner returns `undefined`
(pages 404 it), never another customer's row.

## Card image privacy

The scanned photo exists only in memory for the duration of one OCR request
(`src/app/app/networking/actions.ts` `scanBusinessCard`) — it is never written to Blob storage
or the database. Only the OCR's *text* output (`rawExtraction`) is kept on the saved lead, for
debugging/recovery. OCR output is always a **candidate** — the customer reviews and can correct
every field before anything is saved (`connection-form.tsx`).

## OCR provider seam

`src/lib/providers/index.ts` exports `ocr: OCRProvider`. Real implementation uses Claude
vision via `ANTHROPIC_API_KEY` (raw `fetch`, no SDK dependency added). Without that key,
`extractBusinessCard()` throws `OCRProviderUnavailableError` and the UI offers "Try Again" /
"Enter Manually" — never a crash, never a fabricated result. No other AI/OCR infrastructure
existed in this repo before this feature.

## CMS settings

`networking_settings` is a singleton row (id `"global"`), same operator-editable-table pattern
as `pricing_plans`/`purpose_options`. Edited at `/operator/networking`. Controls: master
on/off, scanner on/off, manual-entry on/off, follow-up on/off. Provider credentials are never
stored here — environment configuration only.
