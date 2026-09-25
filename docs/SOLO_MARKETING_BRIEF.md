# SnapLink SOLO — product audit and image-generation brief

Audit date: September 24, 2026. Based on the local working tree, homepage copy, product catalog fixtures, profile renderers, feature documentation, and existing images. This is a product/creative audit, not confirmation that every feature or catalog item is deployed, configured, or available for purchase. The repository is actively changing.

## What SOLO is

**SnapLink SOLO is a personal digital identity connected to physical NFC and QR products.** A person carries or wears a SnapLink, or places one where people can interact with it. A compatible phone taps the NFC product or scans its QR code to open a browser-based profile. That profile gives the visitor a useful next action: save a contact, call, message, explore work, watch a reel, open a website, or reach a designated guardian or representative.

The physical product is the entry point. The editable profile is the lasting value. Owners can change their information and links while keeping the same hardware.

The existing architectural shorthand is **Identity → Tap → Action**. The strongest current consumer headline is **“Tap into who you are.”**

SOLO serves individuals showing up in different roles: everyday people, independent professionals, entrepreneurs, creators, athletes, performers, and families. Its personality should communicate self-expression, confidence, useful connection, and care.

## Paste-ready brand description

SnapLink SOLO brings your identity into the real world. A stylish NFC card, phone tag, bracelet, keychain, or other SnapLink product connects people to a digital profile with a tap or QR scan. Share who you are, how to reach you, and the work that matters to you. Your profile can bring together contact details, social links, a portfolio, professional credentials, or a talent showcase. Guardian-managed profiles give families a way for someone to reach the right adult. The visitor opens the experience in a phone browser, with no dedicated app required. Update what you share as your life and work evolve while keeping the same SnapLink. The visual identity combines warm ivory, obsidian black, restrained gold, and expressive color with clear typography and a human, approachable feel.

## Audiences and the story each image should tell

| Audience | What they want to communicate | Useful visual story |
| --- | --- | --- |
| Personal | “Here is who I am and how to reach me.” | A natural introduction; a card or phone tag opens a clean profile. |
| Professional / entrepreneur | “Remember me, see my work, and follow up.” | An independent professional sharing a card at a meeting or work setting. |
| Creator | “Explore what I make.” | A real creative setting with a portfolio or social destination visible on the phone. |
| Athlete / cheer athlete | “See my ability and reach the right person.” | Training or competition context, then a highlight reel and explicit recruiting contact. |
| Actor / dancer | “See my reel, credits, and experience.” | Rehearsal or backstage context, with a portfolio or reel on the receiving phone. |
| Family / Protect | “If someone needs to reach us, here is the right adult.” | A calm everyday family moment with a backpack tag or bracelet and guardian contact. |
| Small-business touchpoint | “Take the next step with my business.” | A counter stand opening contact, a review destination, or an external link. |

Use audience-specific campaign assets. The main hero can express the broad brand through one clear human interaction; it does not need every audience and product in one frame.

## What the repository supports

### Core experience

- Physical NFC/QR product catalog, personalization options, purchasing and activation flows.
- Editable identity pages, profile themes, links, public contact actions, contact saving/sharing, and inbound contact capture.
- Stable device destinations so profile updates do not require replacing the hardware.
- English and Spanish copy and UI support.
- Public draft/active lifecycle and owner editing.

### Additional product areas

- **Networking:** business-card scanning, reviewed extraction, saved connections, private notes, and optional follow-up dates. Access uses purchase-granted capabilities and configuration.
- **Professional Resume:** structured professional identity/resume routes, publishing controls, and document-related flows. Availability depends on configuration and access.
- **Talent Profile:** local implementation for athletes, cheer athletes, actors, dancers, and overlapping disciplines; reel, media, typed facts, credits, documents, and explicit opportunity contacts. Treat this as evolving local functionality until release verification is complete.
- **Protect / Kids:** guardian-managed contact experience. Market the contact function without implying tracking or guaranteed safety.

### SnapTrack

Athlete and cheer Talent Profiles are sold as **SnapTrack**: "Your journey. Your record. One tap." It is an owner-updated reel, stats, and milestones, **not** automatic stat collection or tracking. Never pair SnapTrack with maps, location, monitoring, or "NFC tracking" imagery or copy; many users are minors. The earlier "Snap Track — NFC tracking, coming soon" footer teaser has been removed. See `SOLO_AUDIENCE_BRIEF.md` for wording rules.

### Positioning and claim boundaries

The homepage positions the core profile as included with the hardware, with no recurring fee to keep it live. Networking and Resume use separate capability/configuration checks; avoid claiming that every advanced feature is included with every product.

The repository's Business bridge describes operations, customers, and growth tools as a broader offering. Keep the SOLO hero centered on identity, hardware, and connection.

For marketing accuracy:

- Prefer **“Tap or scan. Opens in your browser.”** over “works on every phone.” NFC depends on a compatible device; QR is an alternate path.
- “No app required” describes the visitor's browser experience.
- Payment links lead to external destinations. A statement about SnapLink taking no cut does not mean payment providers charge no fees.
- Show booking as an external link where applicable; do not imply an included scheduling platform.
- Avoid imagery suggesting GPS tracking, location monitoring, a medical device, guaranteed rescue, automated recruiting, verified talent rankings, a full CRM, or an integrated payments terminal.
- Do not use fixture prices, sample testimonials, fictional achievements, or fabricated usage counts as marketing proof.
- Use approved product photography for exact dimensions, materials, logos, colors, and variants. The existing raster images are creative references; their depicted hardware is not independent confirmation of manufactured product specifications.

## Visual audit

Existing assets inspected:

- `public/media/hero-solo.png`: a broad lifestyle composition with adults, children, wearable/tag products, foreground hardware, warm sunlight, gold trails, and dark space on the left.
- `public/media/solo-nfc-card.png`: an obsidian-and-gold card, packaging, and a phone displaying a profile. This communicates the physical-product-to-digital-profile relationship more clearly.

What works:

- Warm light, black/ivory/gold, tactile surfaces, and strong foreground product detail.
- People and everyday use contexts make the product approachable.
- Dark negative space supports readable homepage text.

What to improve:

- The broad hero contains many people and products, competing for attention.
- A viewer can see accessories without immediately understanding the tap-to-profile behavior.
- Gold light trails suggest abstract technology more than the simple real-world interaction.
- The composed group and hardware assortment can imply specific products or finishes that need catalog verification.

**Recommended direction:** one recognizable SnapLink product, one receiving phone, one believable moment of connection. Keep a small supporting human context. Let the website's headline explain the promise.

## Brand appearance

Grounded in `src/app/globals.css` and `src/lib/collections.ts`:

- Obsidian black: `#14120F`.
- Warm ivory: `#F8F6F1`.
- Muted warm gold: `#B78A32`.
- Supporting expressive collections: coral, violet, aqua, blue, green, pink, and yellow.
- Typography: Fraunces for display, Inter Tight for body, JetBrains Mono for small utility/eyebrow text.
- Tone: confident, warm, personal, refined, practical.
- Materials in imagery: believable matte surfaces, restrained metallic accents, natural skin and fabric texture. Match real SKU references for final advertisements.

The signature palette is a strong default. Color, Patterns, and Kids collections justify more playful campaigns without changing the underlying brand promise.

## Main hero prompt for the Codex imagegen skill

Use case: ads-marketing

Asset type: responsive homepage hero background for SnapLink SOLO; wide landscape, approximately 16:9.

Brand context: SnapLink SOLO connects a physical NFC/QR product to an editable personal digital profile. The image should make the act of sharing an identity immediately understandable.

Primary request: Create a photorealistic editorial campaign image of a natural introduction between two adults. Feature one person holding a SnapLink NFC card near the top edge of the other person's smartphone, suggesting the moment of tapping to open a digital profile. Show a believable, simple profile layout on the receiving phone: a portrait area, identity, and a few contact actions. Use the supplied approved card and screen references for exact product and UI appearance. If exact references are unavailable, keep those surfaces visually simple and treat the result as concept art.

Scene/backdrop: a warm contemporary everyday meeting space with subtle architectural depth and a softly blurred background. The interaction and product remain the focus.

Composition/framing: position the card, hands, and phone in the right half of the wide frame. Preserve approximately the left 40–45% as quiet, dark negative space for the existing website headline, supporting copy, and buttons. Keep the important product interaction within a safe crop for narrower screens. Natural anatomy, credible device scale, realistic card thickness.

Lighting/mood: soft directional daylight with restrained warm highlights, approachable confidence, a candid moment of connection.

Color palette: obsidian black, warm ivory, and muted warm gold, with natural skin tones. Gold appears as a small material accent.

Materials/textures: realistic skin, fabric, phone glass, and product surface texture; match the actual card reference.

Text: no baked-in headline, slogans, URLs, prices, or marketing badges. Preserve an approved product logo only when provided as a reference. Keep the phone interface faithful to an approved screenshot rather than inventing detailed claims.

Constraints: one clear interaction; one featured card; one receiving phone; no additional hardware assortment. No glow beams, floating UI, holograms, GPS maps, payment terminal cues, fictional certifications, invented product variants, duplicated fingers, or distorted logos. The result should feel usable for an actual product campaign.

## Companion assets

1. **Product detail:** card and phone on a warm neutral surface, enough screen visibility to show the profile relationship. Use exact hardware and UI references.
2. **Professional campaign:** a natural introduction in a professional setting; maintain the same palette and light.
3. **Talent campaign:** an athlete or performer shares a reel after practice or rehearsal; use the appropriate talent page reference. No invented achievements or recruiting endorsement.
4. **Protect campaign:** calm guardian/child everyday setting, one approved tag or bracelet, guardian-contact screen. No distress, rescue promise, tracking map, or public medical details.
5. **Mobile hero:** a separate 4:5 composition with the product interaction in the lower half and quiet space above for copy. The homepage already supports distinct desktop and mobile media.

## Copy to place in the website or design editor

Existing brand headline:

> Tap into who you are.

Existing supporting copy:

> Choose your SnapLink, make it yours, and connect with one tap.

Short functional line:

> Tap or scan. No app required. Update anytime.

Existing CTA:

> Choose your SnapLink

Additional proposed campaign line:

> Your identity. Your work. Your next connection.

Keep copy editable outside the generated background image so it stays readable, translatable, and responsive.

## Source map

- `README.md`: product identity and Identity → Tap → Action framing; infrastructure notes are older than some current implementations.
- `src/i18n/dict.ts`: homepage promise, process, browser/no-app copy, bilingual content, SOLO/Business distinction.
- `src/app/page.tsx`: current homepage composition, desktop/mobile hero treatment, core pricing promise, contact capture, payment-link copy.
- `src/lib/purpose.ts`: audience/use-case positioning; CMS content may differ from code defaults.
- `src/db/commerce-demo.ts`: illustrative catalog shapes; prices and inventory are not production verification.
- `src/lib/collections.ts`, `src/app/globals.css`, `src/app/layout.tsx`: collections, palette, and fonts.
- `src/components/renderers/standard-profile.tsx`: profile content and actions.
- `src/components/renderers/kids-profile.tsx`: guardian-contact experience.
- `docs/NETWORKING.md`, `src/lib/entitlement-registry.ts`, `src/app/app/resume/`: networking and professional features/access.
- `docs/PLANS.md`, `docs/SOLO_PAYMENTS.md`: plan/capability distinctions and payments implementation.
- `src/lib/talent/`, `src/components/talent/`: evolving Talent Profile implementation.

No image was generated for this audit. The prompt and references are prepared for the next imagegen request.
