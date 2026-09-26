import {
  pgTable, text, timestamp, integer, boolean, jsonb, pgEnum, uniqueIndex, index,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import type { ProfileData } from "@/lib/profile-data";

const id = () => text("id").primaryKey().$defaultFn(() => nanoid(16));
const now = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

/* — enums — */
export const localeEnum = pgEnum("locale", ["en", "es"]);
export const themeEnum = pgEnum("theme", ["obsidian", "ivory", "signature_gold"]);
export const deviceTypeEnum = pgEnum("device_type", [
  "phone_plate", "card", "stand", "sticker", "bracelet", "keychain",
  // "bundle" is a products.productType value only — a multi-item kit (e.g. the
  // Networking Kit) that expands into several ordinary devices at fulfillment.
  // Never a real devices.type.
  "bundle",
]);
export const deviceStatusEnum = pgEnum("device_status", ["unclaimed", "assigned", "paired", "disabled", "lost", "replaced"]);
export const linkTypeEnum = pgEnum("link_type", [
  "website", "instagram", "facebook", "tiktok", "linkedin", "youtube",
  "whatsapp", "x", "custom",
]);
export const activityTypeEnum = pgEnum("activity_type", [
  "tap", "qr_scan", "profile_view", "contact", "guardian_call_click",
]);
/**
 * pingSource — physical touchpoint provenance for a real device tap. Distinct from
 * activity_type (what happened) and from the legacy overloaded `source` text column.
 * NULL on every non-physical event, which is what makes "is this a Ping?" answerable.
 */
export const pingSourceEnum = pgEnum("ping_source", ["nfc", "qr", "unknown"]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending", "paid", "fulfilled", "canceled",
]);
export const upgradeStatusEnum = pgEnum("upgrade_status", ["open", "contacted", "converted", "dismissed"]);

/**
 * profileType — decided: single profiles table + typed `data` JSON, NOT
 * one table per type and NOT a full polymorphic framework. Adding a type
 * here + a validated JSON payload is the smallest change that supports
 * personal/business/kids today and pet/property/event/creator later
 * without schema surgery. See docs/PROFILE_TYPES.md.
 */
export const profileTypeEnum = pgEnum("profile_type", [
  "personal", "professional", "creator", "business", "kids",
  // reserved for later — NOT built this pass:
  "pet", "property", "event", "other",
]);

/** Simple lifecycle. Draft never renders public. */
export const profileStatusEnum = pgEnum("profile_status", ["draft", "active", "disabled"]);

/** How a visitor arrived — kept on events, never changes the destination. */
export const sourceEnum = pgEnum("source", ["nfc", "qr", "link", "direct"]);

/* — Commerce enums — */
export const stockStatusEnum = pgEnum("stock_status", ["in_stock", "made_to_order", "out_of_stock"]);
export const inventoryModeEnum = pgEnum("inventory_mode", ["infinite", "tracked"]);
/** Payment state and fulfillment state are SEPARATE (directive §9). */
export const paymentStateEnum = pgEnum("payment_state", ["pending", "paid", "failed", "refunded"]);
export const fulfillmentStateEnum = pgEnum("fulfillment_state", [
  "unfulfilled", "production", "ready_to_ship", "shipped", "delivered", "cancelled",
]);
/** Physical device lifecycle through fulfillment (directive §8). */
export const deviceFulfillmentEnum = pgEnum("device_fulfillment", [
  "unassigned", "assigned", "shipped", "activated", "disabled", "lost", "replaced",
]);

/* — User — */
export const roleEnum = pgEnum("role", ["customer", "operator"]);
export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name"),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  role: roleEnum("role").default("customer").notNull(),
  locale: localeEnum("locale").default("en").notNull(),
  // References pricingPlans.key — a plain text column (not an enum) on purpose: an operator
  // can add/rename/retire a tier from the /operator/plans UI without a schema migration.
  // No plan currently gates any feature. See docs/PLANS.md before wiring a check against this.
  plan: text("plan").default("free").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: now(),
});

/* — Auth.js tables (accounts, sessions, verification tokens) — */
export const accounts = pgTable("accounts", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (t) => ({ pk: uniqueIndex("accounts_provider_pk").on(t.provider, t.providerAccountId) }));

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
}, (t) => ({ pk: uniqueIndex("vt_pk").on(t.identifier, t.token) }));

/* — Profile — */
export const profiles = pgTable("profiles", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: profileTypeEnum("type").default("personal").notNull(),
  status: profileStatusEnum("status").default("draft").notNull(),
  username: text("username").notNull(),
  displayName: text("display_name").notNull(),
  headline: text("headline"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  location: text("location"),
  accent: text("accent"),
  theme: themeEnum("theme").default("ivory").notNull(),
  locale: localeEnum("locale").default("en").notNull(),
  /**
   * Type-specific payload. Validated per-type in src/lib/profile-data.ts
   * before write. Kids guardians + emergency info live here — NOT as
   * columns on this table, and NEVER surfaced to public HTML on load.
   */
  data: jsonb("data").$type<ProfileData>().default({}).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: now(),
}, (t) => ({
  usernameIdx: uniqueIndex("profiles_username_idx").on(t.username),
  userIdx: index("profiles_user_idx").on(t.userId),
  typeIdx: index("profiles_type_idx").on(t.type),
}));

/* — ProfileLink — */
export const profileLinks = pgTable("profile_links", {
  id: id(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  type: linkTypeEnum("type").notNull(),
  label: text("label"),
  url: text("url").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  visible: boolean("visible").default(true).notNull(),
}, (t) => ({ profileIdx: index("links_profile_idx").on(t.profileId) }));

/**
 * — Destination — the stable redirect layer —
 * ACCOUNT → PROFILE → DESTINATION → DEVICE/QR
 * Physical NFC tags and QR codes encode a destination token, never a
 * username. Re-point a destination to a new profile, or move a lost tag's
 * replacement onto the same destination, without reprinting hardware.
 * The token is random + unguessable (safe for Kids public routing).
 */
export const destinations = pgTable("destinations", {
  id: id(),
  token: text("token").notNull().$defaultFn(() => nanoid(12)),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  active: boolean("active").default(true).notNull(),
  createdAt: now(),
}, (t) => ({ tokenIdx: uniqueIndex("destinations_token_idx").on(t.token) }));

/* — Device — points at a destination, does NOT own identity — */
export const devices = pgTable("devices", {
  id: id(),
  deviceCode: text("device_code").notNull(),
  label: text("label"),
  type: deviceTypeEnum("type").notNull(),
  status: deviceStatusEnum("status").default("unclaimed").notNull(),
  destinationId: text("destination_id").references(() => destinations.id, { onDelete: "set null" }),
  profileId: text("profile_id").references(() => profiles.id, { onDelete: "set null" }),
  productId: text("product_id"),
  hardwareProductId: text("hardware_product_id"),
  hardwareVariantId: text("hardware_variant_id"),
  sku: text("sku"),
  orderItemId: text("order_item_id"),
  assignedUserId: text("assigned_user_id").references(() => users.id, { onDelete: "set null" }),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  assignedAt: timestamp("assigned_at", { withTimezone: true }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  createdAt: now(),
}, (t) => ({
  codeIdx: uniqueIndex("devices_code_idx").on(t.deviceCode),
  orderItemIdx: index("devices_order_item_idx").on(t.orderItemId),
  assignedUserIdx: index("devices_assigned_user_idx").on(t.assignedUserId),
}));

/* — ActivityEvent —
   `pingSource` is set ONLY by /t/[token] (the physical device resolver). Every other
   event — /d/ analytics, /u/ profile_view, contact, funnel — leaves it NULL, so a
   profile_view triggered by the very same tap can never be counted as a second Ping.
   city/region/country are reserved for a future geo provider and stay NULL in v1;
   we never infer a visitor's location from profile data. */
export const activityEvents = pgTable("activity_events", {
  id: id(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  deviceId: text("device_id").references(() => devices.id, { onDelete: "set null" }),
  type: activityTypeEnum("type").notNull(),
  source: text("source"),
  pingSource: pingSourceEnum("ping_source"),
  city: text("city"),
  region: text("region"),
  country: text("country"),
  /** HMAC-SHA256 of the client IP keyed with AUTH_SECRET. Pseudonymous — never a raw address. */
  ipHash: text("ip_hash"),
  userAgent: text("user_agent"),
  createdAt: now(),
}, (t) => ({
  profileTimeIdx: index("activity_profile_time_idx").on(t.profileId, t.createdAt),
  // Serves every per-device Ping read: lastForDevice, historyForDevice, and the
  // recentForUser join+sort. Plain ASC because Postgres scans btree backwards for DESC.
  deviceTimeIdx: index("activity_device_time_idx").on(t.deviceId, t.createdAt),
}));

/* — ContactLead — */
export const contactLeads = pgTable("contact_leads", {
  id: id(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name"),
  phone: text("phone"),
  email: text("email"),
  message: text("message"),
  source: text("source"),
  submissionFingerprint: text("submission_fingerprint"),
  createdAt: now(),
}, (t) => ({
  profileIdx: index("leads_profile_idx").on(t.profileId),
  fingerprintTimeIdx: index("leads_fingerprint_time_idx").on(t.submissionFingerprint, t.createdAt),
}));

/* — UpgradeIntent — bridge to SL/BUSINESS, Solo does not fulfill — */
export const upgradeIntents = pgTable("upgrade_intents", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  profileId: text("profile_id").references(() => profiles.id, { onDelete: "set null" }),
  needs: jsonb("needs").$type<string[]>().default([]).notNull(),
  status: upgradeStatusEnum("status").default("open").notNull(),
  createdAt: now(),
});

/* — HardwareOrder — */
export const hardwareOrders = pgTable("hardware_orders", {
  id: id(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  stripeSessionId: text("stripe_session_id").unique(),
  productType: deviceTypeEnum("product_type").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  status: orderStatusEnum("status").default("pending").notNull(),
  createdAt: now(),
});

/* ============================================================
   COMMERCE — products, media, orders, addresses (directive §3,8,9,12)
   ============================================================ */

/* — Media — image records; storage via StorageProvider seam — */
export const media = pgTable("media", {
  id: id(),
  url: text("url").notNull(),
  alt: text("alt"),
  kind: text("kind").default("image").notNull(),
  storageKey: text("storage_key"),
  contentType: text("content_type"),
  width: integer("width"),
  height: integer("height"),
  objectPosition: text("object_position").default("50% 50%").notNull(),
  active: boolean("active").default(true).notNull(),
  // Set only for public customer uploads (e.g. Touchpoint Art reference art) — an
  // HMAC(AUTH_SECRET, ip) fingerprint used to rate-limit that upload endpoint, same
  // pattern as contactLeads.submissionFingerprint. Always null for operator-uploaded
  // storefront media.
  fingerprint: text("fingerprint"),
  createdAt: now(),
});

/* — Product — the storefront catalog; admin-editable, not hardcoded — */
export const products = pgTable("products", {
  id: id(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  nameEs: text("name_es"),
  shortDescription: text("short_description"),
  shortDescriptionEs: text("short_description_es"),
  fullDescription: text("full_description"),
  fullDescriptionEs: text("full_description_es"),
  basePrice: integer("base_price").notNull(),          // cents
  compareAtPrice: integer("compare_at_price"),          // cents, optional
  productType: deviceTypeEnum("product_type").notNull(),
  active: boolean("active").default(true).notNull(),
  featured: boolean("featured").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  primaryImageId: text("primary_image_id").references(() => media.id, { onDelete: "set null" }),
  galleryImageIds: jsonb("gallery_image_ids").$type<string[]>().default([]).notNull(),
  videoId: text("video_id").references(() => media.id, { onDelete: "set null" }),
  videoPosterId: text("video_poster_id").references(() => media.id, { onDelete: "set null" }),
  colors: jsonb("colors").$type<string[]>().default([]).notNull(),
  personalizationAvailable: boolean("personalization_available").default(false).notNull(),
  personalizationOptions: jsonb("personalization_options").$type<string[]>().default([]).notNull(),
  // "Touchpoint Art" — a paid custom-branded-artwork add-on (design labor, not a stock
  // personalization string). null price = not offered for this product.
  customArtAvailable: boolean("custom_art_available").default(false).notNull(),
  customArtPriceCents: integer("custom_art_price_cents"),
  inventoryMode: inventoryModeEnum("inventory_mode").default("infinite").notNull(),
  stockStatus: stockStatusEnum("stock_status").default("in_stock").notNull(),
  profileTypesSupported: jsonb("profile_types_supported").$type<string[]>().default([]).notNull(),
  activationInstructions: text("activation_instructions"),
  fulfillmentNotes: text("fulfillment_notes"),          // INTERNAL ONLY — never public
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  // Perpetual software entitlement granted to the buyer once an order containing this
  // product is paid — e.g. "solo_networking" for the Networking Kit. Null = grants nothing.
  // Not a subscription: see src/lib/entitlements.ts, the single choke point that checks it.
  grantsEntitlement: text("grants_entitlement"),
  createdAt: now(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ slugIdx: uniqueIndex("products_slug_idx").on(t.slug) }));


/* — PricingPlan — CMS-editable tiers. `key` is what `users.plan` stores; changing price,
   features, or adding/retiring a tier here never requires a code deploy. No plan currently
   gates any feature — see docs/PLANS.md before wiring a check against `users.plan`. — */
export const pricingPlans = pgTable("pricing_plans", {
  id: id(),
  key: text("key").notNull(),                 // e.g. "free" — matches users.plan
  nameEn: text("name_en").notNull(),
  nameEs: text("name_es").notNull(),
  taglineEn: text("tagline_en"),
  taglineEs: text("tagline_es"),
  priceMonthlyCents: integer("price_monthly_cents"),   // null = not priced / contact us
  priceYearlyCents: integer("price_yearly_cents"),
  currency: text("currency").default("usd").notNull(),
  featuresEn: jsonb("features_en").$type<string[]>().default([]).notNull(),
  featuresEs: jsonb("features_es").$type<string[]>().default([]).notNull(),
  stripePriceIdMonthly: text("stripe_price_id_monthly"), // unset until billing is wired up
  stripePriceIdYearly: text("stripe_price_id_yearly"),
  highlighted: boolean("highlighted").default(false).notNull(), // "most popular" styling
  active: boolean("active").default(true).notNull(),   // shown on a future /pricing page
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: now(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ keyIdx: uniqueIndex("pricing_plans_key_idx").on(t.key) }));
export type PricingPlan = typeof pricingPlans.$inferSelect;

/* — Storefront CMS — fixed approved funnel sections, not a page builder — */
export const storefrontSections = pgTable("storefront_sections", {
  id: id(),
  key: text("key").notNull(),
  label: text("label").notNull(),
  eyebrowEn: text("eyebrow_en"),
  eyebrowEs: text("eyebrow_es"),
  headlineEn: text("headline_en").notNull(),
  headlineEs: text("headline_es").notNull(),
  bodyEn: text("body_en"),
  bodyEs: text("body_es"),
  ctaLabelEn: text("cta_label_en"),
  ctaLabelEs: text("cta_label_es"),
  ctaHref: text("cta_href"),
  mediaId: text("media_id").references(() => media.id, { onDelete: "set null" }),
  mobileMediaId: text("mobile_media_id").references(() => media.id, { onDelete: "set null" }),
  backgroundTheme: text("background_theme").default("ivory").notNull(),
  overlayStrength: integer("overlay_strength").default(62).notNull(),
  desktopPosition: text("desktop_position").default("50% 50%").notNull(),
  mobilePosition: text("mobile_position").default("65% 50%").notNull(),
  featuredProductId: text("featured_product_id").references(() => products.id, { onDelete: "set null" }),
  featuredCollection: text("featured_collection"),
  active: boolean("active").default(true).notNull(),
  sortOrder: integer("sort_order").notNull(),
  createdAt: now(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ keyIdx: uniqueIndex("storefront_sections_key_idx").on(t.key) }));

/* — PurposeOption — CMS-editable content for each Purpose Finder card/modal.
   Structural matching logic (which profileTypesSupported tags a purpose
   matches, hardware priority order) is NOT here — stays code-defined in
   src/lib/purpose.ts, same split as CMS controlling copy but not component
   choice elsewhere. — */
export const purposeKeyEnum = pgEnum("purpose_key", [
  "personal", "creator", "professional", "share", "protect", "kids", "sports", "stage",
]);
export const purposeOptions = pgTable("purpose_options", {
  id: id(),
  key: purposeKeyEnum("key").notNull(),
  titleEn: text("title_en").notNull(),
  titleEs: text("title_es").notNull(),
  taglineEn: text("tagline_en").notNull(),
  taglineEs: text("tagline_es").notNull(),
  headlineEn: text("headline_en").notNull(),
  headlineEs: text("headline_es").notNull(),
  descriptionEn: text("description_en").notNull(),
  descriptionEs: text("description_es").notNull(),
  chipsEn: jsonb("chips_en").$type<string[]>().default([]).notNull(),
  chipsEs: jsonb("chips_es").$type<string[]>().default([]).notNull(),
  color: text("color").notNull(),
  secondaryHref: text("secondary_href").notNull(),
  // Kids-only fields — null for every other purpose.
  privacyPointsEn: jsonb("privacy_points_en").$type<{ t: string; b: string }[]>(),
  privacyPointsEs: jsonb("privacy_points_es").$type<{ t: string; b: string }[]>(),
  characterTeaser: jsonb("character_teaser").$type<string[]>(),
  // Card image (operator-uploaded via the media library). Null → matched product photo.
  imageMediaId: text("image_media_id").references(() => media.id, { onDelete: "set null" }),
  // Optional modal actions: a live example and a "create yours" start path.
  exampleHref: text("example_href"),
  exampleLabelEn: text("example_label_en"),
  exampleLabelEs: text("example_label_es"),
  startHref: text("start_href"),
  startLabelEn: text("start_label_en"),
  startLabelEs: text("start_label_es"),
  active: boolean("active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: now(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ keyIdx: uniqueIndex("purpose_options_key_idx").on(t.key) }));
export type PurposeOption = typeof purposeOptions.$inferSelect;

/* — DemoSample — operator-managed media for the fictional Talent sample profiles shown on the
   homepage phone demo and /examples/[key]. Copy stays code-defined (lib/samples, lib/talent/fixtures, lib/pro-samples);
   only imagery, reel, visibility and order are CMS-editable. — */
export const demoSamples = pgTable("demo_samples", {
  id: id(),
  key: text("key").notNull(), // a SampleKey from lib/samples
  portraitMediaId: text("portrait_media_id").references(() => media.id, { onDelete: "set null" }),
  reelMediaId: text("reel_media_id").references(() => media.id, { onDelete: "set null" }),
  active: boolean("active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ keyIdx: uniqueIndex("demo_samples_key_idx").on(t.key) }));
export type DemoSample = typeof demoSamples.$inferSelect;

export const collectionKeyEnum = pgEnum("collection_key", [
  "signature", "color", "patterns", "kids",
]);
export const collectionOptions = pgTable("collection_options", {
  id: id(),
  key: collectionKeyEnum("key").notNull(),
  titleEn: text("title_en").notNull(),
  titleEs: text("title_es").notNull(),
  noteEn: text("note_en").notNull(),
  noteEs: text("note_es").notNull(),
  pattern: text("pattern").notNull(),
  colors: jsonb("colors").$type<string[]>().default([]).notNull(),
  active: boolean("active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: now(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ keyIdx: uniqueIndex("collection_options_key_idx").on(t.key) }));
export type CollectionOption = typeof collectionOptions.$inferSelect;

/* — Snap Track — demand-capture teaser only; no product, no SKU. — */
export const snapTrackSignups = pgTable("snap_track_signups", {
  id: id(),
  email: text("email").notNull(),
  locale: text("locale").notNull(),
  createdAt: now(),
}, (t) => ({ emailIdx: uniqueIndex("snap_track_signups_email_idx").on(t.email) }));

export const commerceEventTypeEnum = pgEnum("commerce_event_type", [
  "video_impression", "video_start", "video_complete", "video_cta_click",
  "product_view", "checkout_initiated", "purchase",
  "purpose_view", "purpose_selected", "purpose_modal_open", "purpose_product_clicked", "purpose_all_hardware_clicked",
  "networking_kit_viewed", "networking_kit_checkout_started", "networking_kit_purchased",
  "networking_opened", "card_scan_started", "card_scan_completed", "card_scan_failed",
  "networking_lead_saved", "networking_lead_updated",
  "resume_view", "resume_share", "resume_download", "resume_contact_click",
]);

export const commerceEvents = pgTable("commerce_events", {
  id: id(),
  type: commerceEventTypeEnum("type").notNull(),
  productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
  mediaId: text("media_id").references(() => media.id, { onDelete: "set null" }),
  orderId: text("order_id"),
  sessionKey: text("session_key"),
  purpose: text("purpose"),
  locale: text("locale"),
  createdAt: now(),
}, (t) => ({ productTimeIdx: index("commerce_events_product_time_idx").on(t.productId, t.createdAt) }));

/* — ProductVariant — color/size/personalization SKU — */
export const productVariants = pgTable("product_variants", {
  id: id(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  color: text("color"),
  priceDelta: integer("price_delta").default(0).notNull(), // cents +/-
  sku: text("sku"),
  stockStatus: stockStatusEnum("stock_status").default("in_stock").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
}, (t) => ({ productIdx: index("variants_product_idx").on(t.productId) }));

/**
 * — Bundle slots — a bundle product (productType "bundle") is composed of one or more
 * slots (e.g. "phone_tag", "nfc_card", "wearable"), each resolved to a chosen component
 * product/variant at add-to-cart time. A slot with a single option has no customer choice;
 * a slot with multiple options (e.g. bracelet material) does. This generalizes to future
 * kits without schema changes — see docs/COMMERCE.md.
 */
export const productBundleSlots = pgTable("product_bundle_slots", {
  id: id(),
  bundleProductId: text("bundle_product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  slotKey: text("slot_key").notNull(),
  label: text("label").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  allowCustomerChoice: boolean("allow_customer_choice").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
}, (t) => ({
  bundleIdx: index("bundle_slots_bundle_idx").on(t.bundleProductId),
  slotKeyIdx: uniqueIndex("bundle_slots_bundle_slotkey_idx").on(t.bundleProductId, t.slotKey),
}));

export const productBundleSlotOptions = pgTable("product_bundle_slot_options", {
  id: id(),
  slotId: text("slot_id").notNull().references(() => productBundleSlots.id, { onDelete: "cascade" }),
  componentProductId: text("component_product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  componentVariantId: text("component_variant_id").references(() => productVariants.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").default(0).notNull(),
}, (t) => ({ slotIdx: index("bundle_slot_options_slot_idx").on(t.slotId) }));
export type ProductBundleSlot = typeof productBundleSlots.$inferSelect;
export type ProductBundleSlotOption = typeof productBundleSlotOptions.$inferSelect;

export const productPriceAudits = pgTable("product_price_audits", {
  id: id(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  changedByUserId: text("changed_by_user_id").references(() => users.id, { onDelete: "set null" }),
  oldBasePrice: integer("old_base_price").notNull(),
  newBasePrice: integer("new_base_price").notNull(),
  oldVariants: jsonb("old_variants").$type<Array<{ label: string; priceDelta: number; sku: string | null }>>().default([]).notNull(),
  newVariants: jsonb("new_variants").$type<Array<{ label: string; priceDelta: number; sku: string | null }>>().default([]).notNull(),
  createdAt: now(),
}, (t) => ({ productTimeIdx: index("product_price_audits_product_time_idx").on(t.productId, t.createdAt) }));

/* — Address — shipping snapshot on the order — */
export const addresses = pgTable("addresses", {
  id: id(),
  name: text("name").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  region: text("region").notNull(),
  postal: text("postal").notNull(),
  country: text("country").default("US").notNull(),
  phone: text("phone"),
  createdAt: now(),
});

/* — Order — payment state + fulfillment state kept SEPARATE — */
export const orders = pgTable("orders", {
  id: id(),
  orderNumber: text("order_number").notNull(),          // human: SL-1048
  checkoutRequestId: text("checkout_request_id").unique(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  email: text("email").notNull(),
  phone: text("phone"),
  shippingAddressId: text("shipping_address_id").references(() => addresses.id, { onDelete: "set null" }),
  subtotal: integer("subtotal").notNull(),              // cents
  total: integer("total").notNull(),                    // cents
  paymentState: paymentStateEnum("payment_state").default("pending").notNull(),
  fulfillmentState: fulfillmentStateEnum("fulfillment_state").default("unfulfilled").notNull(),
  fulfillmentIssue: text("fulfillment_issue"),
  stripeSessionId: text("stripe_session_id").unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
  stripeRefundId: text("stripe_refund_id").unique(),
  trackingNumber: text("tracking_number"),
  trackingCarrier: text("tracking_carrier"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  refundedAt: timestamp("refunded_at", { withTimezone: true }),
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: now(),
}, (t) => ({ orderNumIdx: uniqueIndex("orders_number_idx").on(t.orderNumber) }));

/** Durable delivery ledger. Payment state changes never depend on email uptime. */
export const orderNotifications = pgTable("order_notifications", {
  id: id(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  status: text("status").default("pending").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  lastError: text("last_error"),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).defaultNow().notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: now(),
}, (t) => ({
  orderTypeIdx: uniqueIndex("order_notifications_order_type_idx").on(t.orderId, t.type),
  pendingIdx: index("order_notifications_pending_idx").on(t.status, t.nextAttemptAt),
}));

/** Signed Stripe event receipt ledger for replay visibility and incident recovery. */
export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  status: text("status").default("processing").notNull(),
  attempts: integer("attempts").default(1).notNull(),
  lastError: text("last_error"),
  createdAt: now(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

/* — OrderItem — line items; device assigned during fulfillment, not at buy — */
export const orderItems = pgTable("order_items", {
  id: id(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id, { onDelete: "set null" }),
  variantId: text("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(),          // snapshot
  variantLabel: text("variant_label"),
  skuSnapshot: text("sku_snapshot"),
  hardwareProductId: text("hardware_product_id"),
  hardwareVariantId: text("hardware_variant_id"),
  personalization: text("personalization"),
  customArtPriceCents: integer("custom_art_price_cents"),  // cents snapshot, null = not selected
  customArtNotes: text("custom_art_notes"),                // customer's design request/reference
  customArtFileUrl: text("custom_art_file_url"),           // uploaded reference art, snapshot (matches productName/skuSnapshot pattern)
  quantity: integer("quantity").default(1).notNull(),
  unitPrice: integer("unit_price").notNull(),           // cents snapshot
  deviceId: text("device_id"),                          // assigned in fulfillment
  // Shared by every line item that came from one bundle "add to cart" action (e.g. the
  // Networking Kit's Phone Tag + NFC Card + wearable). Null for ordinary single-item lines.
  // Purely for display/grouping — fulfillment still operates per-orderItem, unchanged.
  bundleGroupId: text("bundle_group_id"),
  // Snapshot of the bundle product's grantsEntitlement at checkout (stamped onto exactly one
  // item per bundle group by the server-validated bundle-pricing path in src/lib/cart.ts —
  // never trust a client-supplied value here). Null for ordinary lines and non-entitling bundles.
  grantsEntitlement: text("grants_entitlement"),
}, (t) => ({
  orderIdx: index("order_items_order_idx").on(t.orderId),
  bundleGroupIdx: index("order_items_bundle_group_idx").on(t.bundleGroupId),
}));

/**
 * — Entitlements — perpetual, non-subscription feature unlocks granted by a qualifying
 * purchase (e.g. "solo_networking" from the Networking Kit). See src/lib/entitlements.ts,
 * the single choke point every gated feature checks — never scatter ad hoc checks.
 */
export const entitlements = pgTable("entitlements", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  sourceOrderId: text("source_order_id").references(() => orders.id, { onDelete: "set null" }),
  grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow().notNull(),
  revoked: boolean("revoked").default(false).notNull(),
}, (t) => ({ userKeyIdx: uniqueIndex("entitlements_user_key_idx").on(t.userId, t.key) }));

/**
 * — Multi-entitlement commerce foundation — a product/bundle can grant zero, one, or
 * several capabilities (e.g. a future "Professional Networking Kit" granting both
 * solo_networking and solo_resume). This is the CANONICAL source of truth for NEW
 * product configuration; the legacy scalar `products.grantsEntitlement` column above
 * is kept, untouched, purely for backward compatibility with the existing Networking
 * Kit and any pre-existing orders — see docs/COMMERCE.md and src/lib/entitlements.ts
 * (KNOWN_ENTITLEMENTS is the registry of valid keys these tables may reference).
 */
export const productEntitlementGrants = pgTable("product_entitlement_grants", {
  id: id(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  entitlementKey: text("entitlement_key").notNull(),
  createdAt: now(),
}, (t) => ({ productKeyIdx: uniqueIndex("product_entitlement_grants_product_key_idx").on(t.productId, t.entitlementKey) }));
export type ProductEntitlementGrant = typeof productEntitlementGrants.$inferSelect;

/**
 * Immutable purchase-time snapshot — resolved server-side and written inside the SAME
 * transaction that creates the order/orderItems (never trust the cart cookie; never
 * re-derived from current product config after the order exists). For a bundle, only
 * the single entitlement-carrier line (see src/lib/cart.ts priceBundleGroup) gets rows
 * here — physical component lines never independently duplicate the grant.
 */
export const orderItemEntitlementGrants = pgTable("order_item_entitlement_grants", {
  id: id(),
  orderItemId: text("order_item_id").notNull().references(() => orderItems.id, { onDelete: "cascade" }),
  entitlementKey: text("entitlement_key").notNull(),
  createdAt: now(),
}, (t) => ({ itemIdx: index("order_item_entitlement_grants_item_idx").on(t.orderItemId) }));
export type OrderItemEntitlementGrant = typeof orderItemEntitlementGrants.$inferSelect;
export type Entitlement = typeof entitlements.$inferSelect;

/**
 * — NetworkingLead — a Solo owner's private networking rolodex. Deliberately separate from
 * contactLeads (profile-scoped inbound visitor capture, always free): this is owner-scoped
 * (not tied to which profile someone visited), gated by the solo_networking entitlement, and
 * carries fields (company, jobTitle, notes, followUpAt) that contactLeads has no use for.
 * See docs/NETWORKING.md.
 */
export const networkingLeadSourceEnum = pgEnum("networking_lead_source", ["business_card_scan", "manual"]);
export const networkingLeads = pgTable("networking_leads", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  firstName: text("first_name"),
  lastName: text("last_name"),
  displayName: text("display_name").notNull(),
  company: text("company"),
  jobTitle: text("job_title"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  addressLine: text("address_line"),
  city: text("city"),
  region: text("region"),
  postalCode: text("postal_code"),
  country: text("country"),
  linkedinUrl: text("linkedin_url"),
  notes: text("notes"),
  source: networkingLeadSourceEnum("source").default("manual").notNull(),
  // OCR's raw text output, kept for debugging/recovery — never the source image itself
  // (the scanned photo is used only in-memory for extraction and never persisted; see
  // docs/NETWORKING.md "Card image privacy"). Null for manual entries.
  rawExtraction: text("raw_extraction"),
  followUpAt: timestamp("follow_up_at", { withTimezone: true }),
  lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
  createdAt: now(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx: index("networking_leads_user_idx").on(t.userId),
  userEmailIdx: index("networking_leads_user_email_idx").on(t.userId, t.email),
  userPhoneIdx: index("networking_leads_user_phone_idx").on(t.userId, t.phone),
}));
export type NetworkingLead = typeof networkingLeads.$inferSelect;

/**
 * — NetworkingSettings — CMS toggle row for the Networking feature, same "operator-editable
 * table" pattern as pricingPlans/purposeOptions. Fixed singleton id ("global") so there's
 * always at most one row; repo defaults to all-enabled if the row doesn't exist yet so the
 * feature works before an operator ever visits /operator/networking.
 */
export const networkingSettings = pgTable("networking_settings", {
  id: text("id").primaryKey(),
  networkingEnabled: boolean("networking_enabled").default(true).notNull(),
  cardScannerEnabled: boolean("card_scanner_enabled").default(true).notNull(),
  manualConnectionsEnabled: boolean("manual_connections_enabled").default(true).notNull(),
  followUpEnabled: boolean("follow_up_enabled").default(true).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export type NetworkingSettings = typeof networkingSettings.$inferSelect;

/**
 * — Resume / Career Profile (Phase 3) — attaches to a profile, one per profile. Contact
 * fields (email/phone/location/website) are deliberately NOT duplicated here — the resume
 * reads them live from the parent `profiles` row (see docs/RESUME.md "No duplicated contact
 * data") and only carries per-field visibility toggles. Dates are free text (not real date
 * columns) because resumes routinely carry partial/approximate dates ("2019", "Present").
 */
export const resumeDataSourceEnum = pgEnum("resume_data_source", ["manual", "extracted"]);
export const resumeExtractionStatusEnum = pgEnum("resume_extraction_status", ["pending", "completed", "failed"]);

export const resumeProfiles = pgTable("resume_profiles", {
  id: id(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  // Denormalized for cheap, defense-in-depth owner-scoped queries (same pattern as
  // devices.profileId + devices.assignedUserId) — never trust profileId alone for ownership.
  ownerUserId: text("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  headline: text("headline"),
  professionalSummary: text("professional_summary"),
  dataSource: resumeDataSourceEnum("data_source"),
  // Original uploaded file — reuses the existing media table/StorageProvider, never a
  // separate upload system. Null until the owner uploads something.
  originalResumeMediaId: text("original_resume_media_id").references(() => media.id, { onDelete: "set null" }),
  originalFileName: text("original_file_name"),
  extractionProvider: text("extraction_provider"),
  extractionModel: text("extraction_model"),
  extractionStatus: resumeExtractionStatusEnum("extraction_status"),
  extractionError: text("extraction_error"),
  // Public visibility — every one of these defaults to the private/off side. The owner must
  // explicitly enable each; the operator's global toggles in resumeSettings are an additional
  // kill switch on top, never a replacement for this per-owner control.
  publicEnabled: boolean("public_enabled").default(false).notNull(),
  showSummary: boolean("show_summary").default(true).notNull(),
  showExperience: boolean("show_experience").default(true).notNull(),
  showEducation: boolean("show_education").default(true).notNull(),
  showSkills: boolean("show_skills").default(true).notNull(),
  showCertifications: boolean("show_certifications").default(true).notNull(),
  showLanguages: boolean("show_languages").default(true).notNull(),
  showProjects: boolean("show_projects").default(true).notNull(),
  showEmail: boolean("show_email").default(false).notNull(),
  showPhone: boolean("show_phone").default(false).notNull(),
  showLocation: boolean("show_location").default(true).notNull(),
  showWebsite: boolean("show_website").default(true).notNull(),
  showOriginalPdf: boolean("show_original_pdf").default(false).notNull(),
  ctaLabelEn: text("cta_label_en"),
  ctaLabelEs: text("cta_label_es"),
  createdAt: now(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  profileIdx: uniqueIndex("resume_profiles_profile_idx").on(t.profileId),
  ownerIdx: index("resume_profiles_owner_idx").on(t.ownerUserId),
}));
export type ResumeProfile = typeof resumeProfiles.$inferSelect;

const resumeSectionCols = {
  id: id(),
  resumeProfileId: text("resume_profile_id").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  visible: boolean("visible").default(true).notNull(),
};

export const resumeExperience = pgTable("resume_experience", {
  ...resumeSectionCols,
  resumeProfileId: text("resume_profile_id").notNull().references(() => resumeProfiles.id, { onDelete: "cascade" }),
  company: text("company"),
  title: text("title").notNull(),
  location: text("location"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  current: boolean("current").default(false).notNull(),
  description: text("description"),
}, (t) => ({ resumeIdx: index("resume_experience_resume_idx").on(t.resumeProfileId) }));
export type ResumeExperience = typeof resumeExperience.$inferSelect;

export const resumeEducation = pgTable("resume_education", {
  ...resumeSectionCols,
  resumeProfileId: text("resume_profile_id").notNull().references(() => resumeProfiles.id, { onDelete: "cascade" }),
  institution: text("institution").notNull(),
  degree: text("degree"),
  fieldOfStudy: text("field_of_study"),
  location: text("location"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  description: text("description"),
}, (t) => ({ resumeIdx: index("resume_education_resume_idx").on(t.resumeProfileId) }));
export type ResumeEducation = typeof resumeEducation.$inferSelect;

export const resumeSkills = pgTable("resume_skills", {
  ...resumeSectionCols,
  resumeProfileId: text("resume_profile_id").notNull().references(() => resumeProfiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category"),
}, (t) => ({ resumeIdx: index("resume_skills_resume_idx").on(t.resumeProfileId) }));
export type ResumeSkill = typeof resumeSkills.$inferSelect;

export const resumeCertifications = pgTable("resume_certifications", {
  ...resumeSectionCols,
  resumeProfileId: text("resume_profile_id").notNull().references(() => resumeProfiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  issuer: text("issuer"),
  issueDate: text("issue_date"),
  expirationDate: text("expiration_date"),
  credentialId: text("credential_id"),
  credentialUrl: text("credential_url"),
}, (t) => ({ resumeIdx: index("resume_certifications_resume_idx").on(t.resumeProfileId) }));
export type ResumeCertification = typeof resumeCertifications.$inferSelect;

export const resumeLanguages = pgTable("resume_languages", {
  ...resumeSectionCols,
  resumeProfileId: text("resume_profile_id").notNull().references(() => resumeProfiles.id, { onDelete: "cascade" }),
  language: text("language").notNull(),
  proficiency: text("proficiency"),
}, (t) => ({ resumeIdx: index("resume_languages_resume_idx").on(t.resumeProfileId) }));
export type ResumeLanguage = typeof resumeLanguages.$inferSelect;

export const resumeProjects = pgTable("resume_projects", {
  ...resumeSectionCols,
  resumeProfileId: text("resume_profile_id").notNull().references(() => resumeProfiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role"),
  description: text("description"),
  url: text("url"),
  startDate: text("start_date"),
  endDate: text("end_date"),
}, (t) => ({ resumeIdx: index("resume_projects_resume_idx").on(t.resumeProfileId) }));
export type ResumeProject = typeof resumeProjects.$inferSelect;

/**
 * — ResumeSettings — CMS singleton, same operator-editable-table pattern as
 * networkingSettings/pricingPlans. requiredEntitlement is nullable text (NOT hardcoded to
 * solo_networking) — NULL means free; the operator can set it to any existing entitlement
 * key later with no deploy. upsellProductSlug resolves live against the product catalog —
 * never a hardcoded price/name. See docs/RESUME.md.
 */
export const resumeSettings = pgTable("resume_settings", {
  id: text("id").primaryKey(),
  featureEnabled: boolean("feature_enabled").default(true).notNull(),
  manualBuilderEnabled: boolean("manual_builder_enabled").default(true).notNull(),
  uploadEnabled: boolean("upload_enabled").default(true).notNull(),
  aiExtractionEnabled: boolean("ai_extraction_enabled").default(true).notNull(),
  publicPageEnabled: boolean("public_page_enabled").default(true).notNull(),
  pdfDownloadEnabled: boolean("pdf_download_enabled").default(true).notNull(),
  requiredEntitlement: text("required_entitlement"),
  maxUploadSizeMb: integer("max_upload_size_mb").default(10).notNull(),
  allowedDocumentTypes: jsonb("allowed_document_types").$type<string[]>().default(["application/pdf"]).notNull(),
  ctaLabelEn: text("cta_label_en").default("View Resume").notNull(),
  ctaLabelEs: text("cta_label_es").default("Ver currículum").notNull(),
  sectionTitleEn: text("section_title_en").default("Professional").notNull(),
  sectionTitleEs: text("section_title_es").default("Profesional").notNull(),
  upsellHeadingEn: text("upsell_heading_en").default("Build your professional resume").notNull(),
  upsellHeadingEs: text("upsell_heading_es").default("Crea tu currículum profesional").notNull(),
  upsellBodyEn: text("upsell_body_en").default("Included with the SnapLink Networking Kit.").notNull(),
  upsellBodyEs: text("upsell_body_es").default("Incluido con el Kit de Networking SnapLink.").notNull(),
  upsellCtaEn: text("upsell_cta_en").default("Learn more").notNull(),
  upsellCtaEs: text("upsell_cta_es").default("Más información").notNull(),
  upsellProductSlug: text("upsell_product_slug"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export type ResumeSettings = typeof resumeSettings.$inferSelect;

export type Media = typeof media.$inferSelect;
export type StorefrontSection = typeof storefrontSections.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type Address = typeof addresses.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderNotification = typeof orderNotifications.$inferSelect;

export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type ProfileLink = typeof profileLinks.$inferSelect;
export type Destination = typeof destinations.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type ActivityEvent = typeof activityEvents.$inferSelect;
export type ContactLead = typeof contactLeads.$inferSelect;
export type UpgradeIntent = typeof upgradeIntents.$inferSelect;
export type HardwareOrder = typeof hardwareOrders.$inferSelect;
