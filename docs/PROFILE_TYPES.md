# PROFILE TYPES — Architecture Decision

## Decision
SL / SOLO supports multiple lightweight identity types through **one `profiles`
table** with:
- a `profileType` enum column (`personal | business | kids`, plus reserved
  `pet | property | event | creator | other` not built yet), and
- a typed `data` JSONB column holding type-specific fields.

We did **not** create a table per type, and did **not** build a general
polymorphic framework. This is the smallest change that supports today's three
types and tomorrow's without schema surgery.

## Why JSONB over columns-per-type
Kids needs guardians (array), emergency info (optional object), a help message,
and a photo opt-in flag. Personal/Business don't. Putting those as nullable
columns on `profiles` would scatter Kids-only nulls across every row and grow
every time a vertical is added. JSONB keeps the core row stable; each type's
payload is validated in `src/lib/profile-data.ts` before every write.

## Why not full polymorphism
A polymorphic entity framework (separate typed tables, a resolver layer, joins)
is more than three verticals justify. The JSON payload is understandable, typed
in TypeScript via `ProfileData`, and validated with Zod. If a future type needs
relational depth (e.g. a marketplace), it earns its own table then — not now.

## Validation boundary
`validateProfileData(type, data)` dispatches to a per-type Zod schema and throws
on invalid input. Server actions call it on every `data` write. The public
renderer reads Kids data through `asKidsData()`, which returns `null` on invalid
payloads so a malformed Kids profile renders nothing rather than leaking a
half-built page.

## Rendering
`ProfileRenderer` (src/components/renderers/index.tsx) dispatches on type:
- `personal | business` → `StandardProfile`
- `kids` → `KidsProfile`
Shared infra (routing, destination, theme, contact sheet, events) stays shared;
only presentation branches.
