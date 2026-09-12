# SL / SOLO

Premium, lightweight SnapLink identity product. Identity → Tap → Action.
Personal · Business · Kids profiles. NFC/QR, Profile Studio, upgrade bridge.

## Run locally
```bash
npm install
cp .env.example .env        # fill in Neon + Stripe when ready
npm run dev                 # http://localhost:3000
```
The app runs on an in-memory demo data layer (`src/db/demo.ts`) with no DB
required. Seams to real infrastructure are marked `// @wire`.

## Scripts
- `npm run dev` — dev server
- `npm run build` — production build (fetches fonts; needs network)
- `npm test` — vitest (28 tests: username, kids privacy, ownership, status,
  destination resolution)
- `npm run db:generate` / `db:push` — Drizzle migrations against `DATABASE_URL`

## Going live (swap the seams)
1. Provision Neon, set `DATABASE_URL`, run `npm run db:push`.
2. Replace getters in `src/db/demo.ts` and array writes in
   `src/app/app/actions.ts` with Drizzle queries scoped by userId.
3. Wire real auth: `getSessionUserId()` in `src/lib/auth.ts` (Auth.js).
4. Set Stripe keys; add the webhook to persist `HardwareOrder`.
5. Deploy to Vercel.

## Docs
`docs/ARCHITECTURE.md`, `PROFILE_TYPES.md`, `KIDS_SAFETY.md`, `DATA_MODEL.md`,
`COMMERCE_SEAM.md`, `OPERATOR_SEAM.md`.

## Key routes
Public: `/` `/hardware` `/hardware/[slug]` `/how-it-works` `/join` `/activate`
`/upgrade` `/u/[username]` `/d/[token]` (stable NFC/QR resolver).
App: `/app` (My SnapLinks) `/app/create` `/app/profiles/[profileId]` (Profile
Studio) `/app/activity` `/app/hardware` `/app/upgrade`.

## Note on fonts in CI
`next/font` fetches Google Fonts at build time. Vercel has network access so
builds succeed there. In a sandboxed CI without egress to fonts.googleapis.com,
either allow that host or self-host the fonts.
