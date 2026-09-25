# Talent Profile

A shareable showcase for athletes, cheer athletes, actors, dancers, and multidisciplinary
performers: identity → proof (reel, facts, credits) → an explicit contact route.

**SnapTrack:** Talent Profiles whose primary discipline is athlete or cheer are branded SnapTrack (`talentBrand()` in the model). This covers the profile header and footer, the Studio title, the homepage Sports purpose card, and the sample badges. It is a brand only; the data model is the same. The legacy `snap_track_signups` table (from the old "NFC tracking" teaser) is unused.

## Model (`src/lib/talent/model.ts`)

Stored inside the existing `profiles.data` JSON as `data.talent` — no migration:

```
{ revision, draft: Talent, published: Talent | null }
```

- **Disciplines** (multi-select + primary), **goals** (multi-select + primary), and
  **presentation** (theme + section order/visibility) are independent. Changing any one never
  erases content from another; inactive discipline modules are kept but not rendered.
- No universal sport/GPA/measurement fields. Discipline details live in optional `modules`;
  facts are typed (`text | number+unit | date`) and may be scoped to a discipline.
- Every row (media, facts, credits, contacts, documents, links) defaults to `visible: false`.
- `youth: true` forbids the talent themself as a public contact (guardian/agent/etc. only).

## Public boundary

`projectProfile` (called by `data.profileByUsername` / `data.resolveDestination`) is the single
read boundary for HTML, metadata, OG image, vCard, and QR. It fails closed:

- profile not `active`, or corrupt `talent` payload → not found;
- Talent exists but never published → `talent` is stripped and the **existing standard profile
  keeps serving** (a draft never takes a live page/NFC tag offline);
- published → only the `projectTalent` allowlist is exposed; legacy email/phone/links/channels
  are blanked.

## Editing (`/app/profiles/[profileId]/talent`)

`saveTalent` is the only writer of `data.talent` (`updateProfileData` preserves it untouched).
Server-side: ownership via `requireOwnedProfile`, Protect (`kids`) profiles refused, zod
validation, and optimistic concurrency on `revision` (row locked `FOR UPDATE`).

| Operation | Draft | Published snapshot | Profile status |
|---|---|---|---|
| draft | replaced | unchanged | unchanged |
| publish | replaced | = draft | `active` |
| unpublish | replaced | `null` | `draft` (page offline) |

## Landing entry points

- Talent lives inside the homepage Purpose Finder ("What's your SnapLink for?"), not a separate
  block: Personal · Sports · Performing arts · Creator · Professional · Share · Protect · Kids.
  Cards are image-first; each image comes from Operator → Purposes (drag-and-drop upload or media
  library pick), falling back to the top matched product photo.
- Purposes with `startHref` / `exampleHref` show "Create yours" / "See an example" in their modal
  (above recommended hardware). Professionals (nurses, realtors…) route to Resume, not Talent.
- The operator Purposes page seeds default rows for any missing purpose key
  (`repo.purposes.seedMissing`, never overwrites edits); the homepage merges defaults for keys
  with no row (`purposesWithDefaults`).
- Every "Create yours" goes to `/get-started?path=<discipline|professional>`: signed out →
  sign-in → back; no profile → `/app/create?next=` → back; one profile → Talent Studio
  (`?discipline=` seeds a *new* draft only) or `/app/resume`; several → a chooser.
- Sample pages carry a sticky "All profile types / Create yours" bar back to `/#find-your-fit`.

## Samples & import

- Eight storefront samples (`src/lib/samples.ts`): talent (athlete, cheer, actor, dancer,
  multi-talent → `TalentView`) and professional (nurse, realtor →
  `src/lib/pro-samples.ts`, rendered with the real `StandardProfile`). All fictional: 555
  numbers, example.com links. Full pages at `/examples/[key]`; `/talent/examples/*` 308-redirects.
- Each sample has a story line (the moment someone taps) that is shown with it on the homepage
  and on its example page, with "Get your SnapLink" (→ /hardware) and "Build mine"
  (→ /get-started) buttons.
- Homepage "profile demo" phone = tabbed `SampleGallery`: live personal profile + visible samples.
- Operator → Demo samples (`demo_samples` table): photo for every sample, reel for talent samples,
  visibility and order. Copy stays in code. `loadSamples()` falls back to placeholders if the table
  is missing.
- `scripts/talent-import.ts` / `src/lib/talent/import.ts` — dry-run report mapping legacy athlete
  fields into a draft (collisions, missing assets, ambiguous measurements, unmapped values).
  Never deletes source records and never publishes.

## Deferred

Uploads (media/documents are external URLs — hiding one does not make the hosted file private),
inquiry inbox, analytics per section, resume/PDF integration with the Resume module, booking,
discovery/marketplace, and recruiting/casting workflows. Visual/keyboard review in a real browser
has not been done yet.
