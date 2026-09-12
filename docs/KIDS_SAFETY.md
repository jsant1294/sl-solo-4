# SNAPLINK KIDS — Safety & Privacy Architecture

SnapLink Kids is a public "tap if I need help" page for a child's NFC product
(backpack tag, bracelet, etc.). Because the page is reachable by anyone who
finds the physical object, safety is the primary design constraint — not a
feature added later.

## Threat model
A stranger — helpful or hostile — can tap/scan the tag. The page must let a
good-faith finder reach a guardian fast, while minimizing what a bad-faith
finder can harvest (name + face + a live number is a pretext-call toolkit).

## Safety defaults (enforced in code)
1. **First name only.** `kidsData.firstName` is length-capped and labeled
   "first name only" in the editor. No last name, no full legal name.
2. **No child photo by default.** `usePhoto` defaults `false`; the safe default
   is a monogram. Real photo is an explicit opt-in.
3. **Guardian numbers are never in page source.** The public HTML contains no
   phone numbers. A number is fetched from `POST /api/kids/reveal` only when a
   visitor taps a specific guardian button (explicit intent).
4. **Unguessable routing.** Kids profiles are reached via a random destination
   token (`/d/[token]`), not a guessable `/u/firstname`. The row's `username`
   is a random handle and is not advertised.
5. **`noindex`.** Kids pages set `robots: { index:false, follow:false }` so they
   never enter search engines.
6. **Emergency info is opt-in and collapsed.** `emergency.enabled` defaults
   `false`; when on, it renders as a secondary, collapsible block — never the
   primary action, and not expanded on load.
7. **Draft never exposes anything.** A profile is dark until the guardian
   explicitly activates it (`status = active`).

## What we intentionally forbid the parent from publishing
The editor never offers fields for: home address, school name, exact birthday,
daily schedule/routine, or real-time location. These are absent by design, not
hidden behind a toggle.

## Ownership
A Kids profile belongs to the guardian's account. The child is **not** an
authenticated user. All reads/writes scope through `requireOwnedProfile()`.

## Deferred (seams exist, not built)
- Relay/masked numbers at the commerce tier (reveal endpoint is the seam).
- "Your SnapLink was accessed" notifications — must stay privacy-conscious and
  must never imply location tracking unless explicit, consented location exists.
