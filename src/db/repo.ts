import { eq, and, or, inArray, gte, lte, desc, asc, isNull, sql, ilike } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import {
  products, productVariants, productBundleSlots, productBundleSlotOptions, productPriceAudits, media, storefrontSections, commerceEvents, orders, orderItems, addresses, orderNotifications, stripeWebhookEvents,
  users, profiles, profileLinks, destinations, devices, activityEvents, contactLeads, purposeOptions, demoSamples, collectionOptions, snapTrackSignups, pricingPlans, entitlements,
  networkingLeads, networkingSettings,
  resumeProfiles, resumeExperience, resumeEducation, resumeSkills, resumeCertifications, resumeLanguages, resumeProjects, resumeSettings,
  productEntitlementGrants, orderItemEntitlementGrants,
} from "@/db/schema";
import type {
  Product, ProductVariant, Order, OrderItem, Address, Media,
  Profile, ProfileLink, Device, NetworkingLead, NetworkingSettings,
  ResumeProfile, ResumeSettings,
} from "@/db/schema";
import type { PgTable } from "drizzle-orm/pg-core";
import { getProfileExperience } from "@/lib/profile-data";
import { assignmentError, canOperatorTransitionDevice, canResolvePhysicalDevice, isProvisionableDeviceCode, isValidDeviceCode, normalizeDeviceCode } from "@/lib/device-lifecycle";
import { isKnownEntitlementKey } from "@/lib/entitlement-registry";

/**
 * REPOSITORY — the only place app code touches the DB. Every query is
 * ownership/scope-aware where relevant. Pages/actions call repo.*; swapping
 * demo → real is confined here. Requires db (DATABASE_URL); callers guard.
 */
function requireDb() {
  if (!db) throw new Error("DATABASE_URL not set — repo unavailable");
  return db;
}

export const repo = {
  commerce: {
    async record(input: typeof commerceEvents.$inferInsert) {
      const d = requireDb(); await d.insert(commerceEvents).values(input);
    },
  },
  products: {
    async hydrate(p: Product) {
      const d = requireDb();
      const vars = await d.select().from(productVariants)
        .where(eq(productVariants.productId, p.id)).orderBy(asc(productVariants.sortOrder));
      const allIds = [p.primaryImageId, ...(p.galleryImageIds ?? []), p.videoId, p.videoPosterId].filter(Boolean) as string[];
      const mediaRows: Media[] = [];
      for (const mediaId of allIds) {
        const [row] = await d.select().from(media).where(eq(media.id, mediaId)).limit(1);
        if (row) mediaRows.push(row);
      }
      const byId = new Map(mediaRows.map((m) => [m.id, m]));
      return {
        ...p, variants: vars,
        primaryImage: p.primaryImageId ? byId.get(p.primaryImageId) ?? null : null,
        galleryImages: (p.galleryImageIds ?? []).map((mediaId) => byId.get(mediaId)).filter(Boolean) as Media[],
        video: p.videoId ? byId.get(p.videoId) ?? null : null,
        videoPoster: p.videoPosterId ? byId.get(p.videoPosterId) ?? null : null,
      };
    },
    async list(activeOnly = true) {
      const d = requireDb();
      const rows = await d.select().from(products)
        .where(activeOnly ? eq(products.active, true) : undefined)
        .orderBy(asc(products.sortOrder));
      return Promise.all(rows.map((p) => this.hydrate(p)));
    },
    async bySlug(slug: string) {
      const d = requireDb();
      const [p] = await d.select().from(products).where(eq(products.slug, slug)).limit(1);
      if (!p) return undefined;
      return this.hydrate(p);
    },
    async byId(id: string) {
      const d = requireDb();
      const [p] = await d.select().from(products).where(eq(products.id, id)).limit(1);
      if (!p) return undefined;
      return this.hydrate(p);
    },
    async update(id: string, input: Partial<typeof products.$inferInsert>) {
      const d = requireDb();
      const [row] = await d.update(products).set({ ...input, updatedAt: new Date() }).where(eq(products.id, id)).returning();
      return row;
    },
    async create(input: Pick<typeof products.$inferInsert, "name" | "slug" | "basePrice" | "productType"> & Partial<typeof products.$inferInsert>) {
      const d = requireDb();
      const [row] = await d.insert(products).values(input).returning();
      return row;
    },
    async replaceVariants(productId: string, input: Array<Omit<typeof productVariants.$inferInsert, "productId">>) {
      const d = requireDb();
      await d.delete(productVariants).where(eq(productVariants.productId, productId));
      if (input.length) await d.insert(productVariants).values(input.map((variant) => ({ ...variant, productId })));
    },
    async updateWithVariants(id: string, changedByUserId: string, input: Partial<typeof products.$inferInsert>, variants: Array<Omit<typeof productVariants.$inferInsert, "productId">>) {
      const d = requireDb();
      await d.transaction(async (tx) => {
        const [current] = await tx.select().from(products).where(eq(products.id, id)).limit(1);
        if (!current) throw new Error("Product not found");
        const oldVariants = await tx.select().from(productVariants).where(eq(productVariants.productId, id));
        await tx.update(products).set({ ...input, updatedAt: new Date() }).where(eq(products.id, id));
        await tx.delete(productVariants).where(eq(productVariants.productId, id));
        if (variants.length) await tx.insert(productVariants).values(variants.map((variant) => ({ ...variant, productId: id })));
        const newBasePrice = input.basePrice ?? current.basePrice;
        const priceChanged = newBasePrice !== current.basePrice || JSON.stringify(oldVariants.map((v) => [v.label, v.priceDelta, v.sku])) !== JSON.stringify(variants.map((v) => [v.label, v.priceDelta, v.sku]));
        if (priceChanged) await tx.insert(productPriceAudits).values({
          productId: id, changedByUserId: changedByUserId === "demo-operator" ? null : changedByUserId,
          oldBasePrice: current.basePrice, newBasePrice,
          oldVariants: oldVariants.map((v) => ({ label: v.label, priceDelta: v.priceDelta, sku: v.sku })),
          newVariants: variants.map((v) => ({ label: v.label, priceDelta: v.priceDelta ?? 0, sku: v.sku ?? null })),
        });
      });
    },
    async createMedia(input: Omit<typeof media.$inferInsert, "id" | "createdAt">) {
      const d = requireDb();
      const [row] = await d.insert(media).values(input).returning();
      return row;
    },
    async deleteMedia(id: string) {
      const d = requireDb();
      await d.delete(media).where(eq(media.id, id));
    },
    async bundleSlots(bundleProductId: string) {
      const d = requireDb();
      const slots = await d.select().from(productBundleSlots)
        .where(eq(productBundleSlots.bundleProductId, bundleProductId)).orderBy(asc(productBundleSlots.sortOrder));
      return Promise.all(slots.map(async (slot) => {
        const optionRows = await d.select().from(productBundleSlotOptions)
          .where(eq(productBundleSlotOptions.slotId, slot.id)).orderBy(asc(productBundleSlotOptions.sortOrder));
        const options = await Promise.all(optionRows.map(async (opt) => {
          const product = await this.byId(opt.componentProductId);
          const variant = product?.variants.find((v) => v.id === opt.componentVariantId) ?? null;
          return { ...opt, product, variant };
        }));
        return { ...slot, options };
      }));
    },
    /** Replaces all slots+options for a bundle product in one transaction. */
    async replaceBundleSlots(bundleProductId: string, slots: Array<{
      slotKey: string; label: string; quantity: number; allowCustomerChoice: boolean;
      options: Array<{ componentProductId: string; componentVariantId: string | null }>;
    }>) {
      const d = requireDb();
      await d.transaction(async (tx) => {
        const existing = await tx.select({ id: productBundleSlots.id }).from(productBundleSlots)
          .where(eq(productBundleSlots.bundleProductId, bundleProductId));
        for (const row of existing) await tx.delete(productBundleSlotOptions).where(eq(productBundleSlotOptions.slotId, row.id));
        await tx.delete(productBundleSlots).where(eq(productBundleSlots.bundleProductId, bundleProductId));
        for (const [sortOrder, slot] of slots.entries()) {
          const [created] = await tx.insert(productBundleSlots).values({
            bundleProductId, slotKey: slot.slotKey, label: slot.label,
            quantity: slot.quantity, allowCustomerChoice: slot.allowCustomerChoice, sortOrder,
          }).returning();
          if (slot.options.length) await tx.insert(productBundleSlotOptions).values(
            slot.options.map((opt, i) => ({ slotId: created.id, componentProductId: opt.componentProductId, componentVariantId: opt.componentVariantId, sortOrder: i })),
          );
        }
      });
    },

    /** New-architecture grants only (the join table) — see effectiveEntitlementGrants for the union with the legacy scalar. */
    async entitlementGrants(productId: string): Promise<string[]> {
      const d = requireDb();
      const rows = await d.select({ key: productEntitlementGrants.entitlementKey }).from(productEntitlementGrants)
        .where(eq(productEntitlementGrants.productId, productId));
      return rows.map((r) => r.key);
    },
    /** Transactional delete-then-insert, same pattern as replaceBundleSlots/replaceVariants. Validated against KNOWN_ENTITLEMENTS — never stores an unrecognized key. */
    async replaceEntitlementGrants(productId: string, keys: string[]) {
      const invalid = keys.filter((k) => !isKnownEntitlementKey(k));
      if (invalid.length) throw new Error(`Unknown entitlement key(s): ${invalid.join(", ")}`);
      const unique = [...new Set(keys)];
      const d = requireDb();
      await d.transaction(async (tx) => {
        await tx.delete(productEntitlementGrants).where(eq(productEntitlementGrants.productId, productId));
        if (unique.length) await tx.insert(productEntitlementGrants).values(unique.map((entitlementKey) => ({ productId, entitlementKey })));
      });
    },
    /**
     * Effective grant set for a product — union of the new join table and the legacy scalar
     * `products.grantsEntitlement` column, deduplicated. This is what checkout/bundle pricing
     * calls to resolve what a purchase actually grants; the legacy Networking Kit continues
     * to work via its scalar value with zero CMS changes required.
     */
    async effectiveEntitlementGrants(productId: string): Promise<string[]> {
      const d = requireDb();
      const [product] = await d.select({ legacy: products.grantsEntitlement }).from(products).where(eq(products.id, productId)).limit(1);
      const rows = await d.select({ key: productEntitlementGrants.entitlementKey }).from(productEntitlementGrants)
        .where(eq(productEntitlementGrants.productId, productId));
      const keys = new Set(rows.map((r) => r.key));
      if (product?.legacy) keys.add(product.legacy);
      return [...keys];
    },
  },

  entitlements: {
    async has(userId: string | null | undefined, key: string): Promise<boolean> {
      if (!userId) return false;
      const d = requireDb();
      const [row] = await d.select({ id: entitlements.id }).from(entitlements)
        .where(and(eq(entitlements.userId, userId), eq(entitlements.key, key), eq(entitlements.revoked, false))).limit(1);
      return Boolean(row);
    },
    /** Idempotent — granting an already-held entitlement is a no-op. */
    async grant(userId: string, key: string, sourceOrderId?: string | null) {
      const d = requireDb();
      await d.insert(entitlements).values({ userId, key, sourceOrderId: sourceOrderId ?? null })
        .onConflictDoNothing({ target: [entitlements.userId, entitlements.key] });
    },
    /**
     * Grants every distinct entitlement key snapshotted onto a paid order's line items.
     * The snapshot (orderItems.grantsEntitlement) was stamped server-side at checkout by
     * the bundle-pricing path in src/lib/cart.ts — never re-derived from client input here.
     */
    /**
     * Union of the legacy scalar snapshot (orderItems.grantsEntitlement — every order ever
     * created before or after the multi-entitlement foundation) and the new join-table
     * snapshot (order_item_entitlement_grants). Both are immutable purchase-time truth;
     * neither is re-derived from current product config. Historical orders are never
     * backfilled — they simply have an empty new-table side and the union degrades to
     * exactly today's single-key behavior.
     */
    async grantForPaidOrder(orderId: string, userId: string | null | undefined): Promise<string[]> {
      if (!userId) return []; // guest checkout — buyer must sign in/link the order later (Phase 1 limitation)
      const d = requireDb();
      const items = await d.select({ id: orderItems.id, grantsEntitlement: orderItems.grantsEntitlement }).from(orderItems).where(eq(orderItems.orderId, orderId));
      const legacyKeys = items.map((i) => i.grantsEntitlement).filter(Boolean) as string[];
      const itemIds = items.map((i) => i.id);
      const newRows = itemIds.length
        ? await d.select({ key: orderItemEntitlementGrants.entitlementKey }).from(orderItemEntitlementGrants)
          .where(sql`${orderItemEntitlementGrants.orderItemId} = any(${itemIds})`)
        : [];
      const keys = [...new Set([...legacyKeys, ...newRows.map((r) => r.key)])];
      for (const key of keys) await this.grant(userId, key, orderId);
      return keys;
    },
  },

  media: {
    async list() {
      const d = requireDb();
      return d.select().from(media).orderBy(desc(media.createdAt));
    },
    async byId(id: string) {
      const d = requireDb();
      const [row] = await d.select().from(media).where(eq(media.id, id)).limit(1);
      return row;
    },
    async create(input: Omit<typeof media.$inferInsert, "id" | "createdAt">) {
      const d = requireDb();
      const [row] = await d.insert(media).values(input).returning();
      return row;
    },
    async countRecentByFingerprint(fingerprint: string, windowMs: number) {
      const d = requireDb();
      const since = new Date(Date.now() - windowMs);
      const rows = await d.select({ id: media.id }).from(media)
        .where(and(eq(media.fingerprint, fingerprint), gte(media.createdAt, since)));
      return rows.length;
    },
  },

  storefront: {
    async list() {
      const d = requireDb();
      const rows = await d.select().from(storefrontSections).orderBy(asc(storefrontSections.sortOrder));
      return Promise.all(rows.map(async (section) => {
        const selectedMedia = section.mediaId
          ? (await d.select().from(media).where(eq(media.id, section.mediaId)).limit(1))[0] ?? null
          : null;
        const mobileMedia = section.mobileMediaId
          ? (await d.select().from(media).where(eq(media.id, section.mobileMediaId)).limit(1))[0] ?? null
          : null;
        const featuredProduct = section.featuredProductId
          ? await repo.products.byId(section.featuredProductId)
          : null;
        return { ...section, media: selectedMedia, mobileMedia, featuredProduct };
      }));
    },
    async update(id: string, input: Partial<typeof storefrontSections.$inferInsert>) {
      const d = requireDb();
      const [row] = await d.update(storefrontSections)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(storefrontSections.id, id)).returning();
      return row;
    },
  },

  purposes: {
    async list() {
      const d = requireDb();
      const rows = await d.select().from(purposeOptions).orderBy(asc(purposeOptions.sortOrder));
      const imageIds = rows.map((row) => row.imageMediaId).filter((id): id is string => !!id);
      const images = imageIds.length ? await d.select().from(media).where(and(inArray(media.id, imageIds), eq(media.active, true))) : [];
      return rows.map((row) => ({ ...row, image: images.find((item) => item.id === row.imageMediaId) ?? null }));
    },
    /** Inserts default rows for purpose keys not yet in the table; never overwrites operator edits. */
    async seedMissing(defaults: (typeof purposeOptions.$inferInsert)[]) {
      const d = requireDb();
      if (defaults.length) await d.insert(purposeOptions).values(defaults).onConflictDoNothing({ target: purposeOptions.key });
    },
    async update(id: string, input: Partial<typeof purposeOptions.$inferInsert>) {
      const d = requireDb();
      const [row] = await d.update(purposeOptions)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(purposeOptions.id, id)).returning();
      return row;
    },
  },

  demoSamples: {
    /** Rows with their portrait/reel media resolved (inactive media ignored). */
    async list() {
      const d = requireDb();
      const rows = await d.select().from(demoSamples).orderBy(asc(demoSamples.sortOrder));
      const ids = rows.flatMap((row) => [row.portraitMediaId, row.reelMediaId]).filter((id): id is string => !!id);
      const items = ids.length ? await d.select().from(media).where(and(inArray(media.id, ids), eq(media.active, true))) : [];
      const find = (id: string | null) => items.find((item) => item.id === id) ?? null;
      return rows.map((row) => ({ ...row, portrait: find(row.portraitMediaId), reel: find(row.reelMediaId) }));
    },
    async upsert(key: string, input: Partial<Omit<typeof demoSamples.$inferInsert, "id" | "key">>) {
      const d = requireDb();
      const [row] = await d.insert(demoSamples).values({ key, ...input })
        .onConflictDoUpdate({ target: demoSamples.key, set: { ...input, updatedAt: new Date() } }).returning();
      return row;
    },
  },

  plans: {
    async list() {
      const d = requireDb();
      return d.select().from(pricingPlans).orderBy(asc(pricingPlans.sortOrder));
    },
    async listActive() {
      const d = requireDb();
      return d.select().from(pricingPlans).where(eq(pricingPlans.active, true)).orderBy(asc(pricingPlans.sortOrder));
    },
    async update(id: string, input: Partial<typeof pricingPlans.$inferInsert>) {
      const d = requireDb();
      const [row] = await d.update(pricingPlans)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(pricingPlans.id, id)).returning();
      return row;
    },
    async create(input: typeof pricingPlans.$inferInsert) {
      const d = requireDb();
      const [row] = await d.insert(pricingPlans).values(input).returning();
      return row;
    },
  },

  collections: {
    async list() {
      const d = requireDb();
      return d.select().from(collectionOptions).orderBy(asc(collectionOptions.sortOrder));
    },
    async update(id: string, input: Partial<typeof collectionOptions.$inferInsert>) {
      const d = requireDb();
      const [row] = await d.update(collectionOptions)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(collectionOptions.id, id)).returning();
      return row;
    },
  },

  // Legacy "Snap Track — NFC tracking" waitlist (teaser removed; SnapTrack is now the athlete/cheer
  // Talent Profile brand). Kept only so the existing table stays readable.
  snapTrack: {
    async subscribe(email: string, locale: string) {
      const d = requireDb();
      await d.insert(snapTrackSignups).values({ email, locale }).onConflictDoNothing();
    },
  },

  orders: {
    async create(input: {
      orderNumber: string; email: string; phone?: string; userId?: string;
      checkoutRequestId?: string;
      subtotal: number; total: number; address?: Omit<Address, "id" | "createdAt">;
      items: (Omit<OrderItem, "id" | "orderId"> & { entitlementGrants?: string[] })[];
    }): Promise<Order> {
      const d = requireDb();
      return d.transaction(async (tx) => {
        const [addr] = input.address ? await tx.insert(addresses).values(input.address).returning() : [];
        const [order] = await tx.insert(orders).values({
          orderNumber: input.orderNumber, checkoutRequestId: input.checkoutRequestId ?? null, email: input.email, phone: input.phone ?? null,
          userId: input.userId ?? null, shippingAddressId: addr?.id ?? null,
          subtotal: input.subtotal, total: input.total,
          paymentState: "pending", fulfillmentState: "unfulfilled",
        }).returning();
        // Inserted one at a time (not a single multi-row INSERT) so each returned id can be
        // reliably paired with the entitlement grants that belong to that specific line —
        // multi-row RETURNING order isn't a guarantee we want to depend on here.
        for (const { entitlementGrants, ...item } of input.items) {
          const [row] = await tx.insert(orderItems).values({ ...item, orderId: order.id }).returning({ id: orderItems.id });
          if (entitlementGrants?.length) {
            await tx.insert(orderItemEntitlementGrants).values(entitlementGrants.map((entitlementKey) => ({ orderItemId: row.id, entitlementKey })));
          }
        }
        return order;
      });
    },
    async byId(id: string) {
      const d = requireDb();
      const [o] = await d.select().from(orders).where(eq(orders.id, id)).limit(1);
      if (!o) return undefined;
      const items = await d.select().from(orderItems).where(eq(orderItems.orderId, id));
      const addr = o.shippingAddressId
        ? (await d.select().from(addresses).where(eq(addresses.id, o.shippingAddressId)).limit(1))[0] ?? null
        : null;
      return { ...o, items, address: addr };
    },
    async byCheckoutRequest(requestId: string) {
      const d = requireDb();
      const [order] = await d.select().from(orders).where(eq(orders.checkoutRequestId, requestId)).limit(1);
      return order;
    },
    async byStripeSession(sessionId: string) {
      const d = requireDb();
      const [o] = await d.select().from(orders).where(eq(orders.stripeSessionId, sessionId)).limit(1);
      return o;
    },
    async byStripePaymentIntent(paymentIntentId: string) {
      const d = requireDb();
      const [o] = await d.select().from(orders).where(eq(orders.stripePaymentIntentId, paymentIntentId)).limit(1);
      return o;
    },
    async setStripeSession(orderId: string, sessionId: string) {
      const d = requireDb();
      const [updated] = await d.update(orders).set({ stripeSessionId: sessionId })
        .where(and(eq(orders.id, orderId), eq(orders.paymentState, "pending"))).returning({ id: orders.id });
      return Boolean(updated);
    },
    async setStripePaymentIntent(orderId: string, paymentIntentId: string) {
      const d = requireDb();
      await d.update(orders).set({ stripePaymentIntentId: paymentIntentId })
        .where(and(eq(orders.id, orderId), isNull(orders.stripePaymentIntentId)));
    },
    async reconciliationCandidates(withinDays = 7) {
      const d = requireDb();
      const since = new Date(Date.now() - withinDays * 24 * 60 * 60_000);
      return d.select().from(orders).where(and(gte(orders.createdAt, since), sql`${orders.stripeSessionId} is not null`))
        .orderBy(desc(orders.createdAt)).limit(100);
    },
    async markPaidOnce(orderId: string, total?: number, paymentIntentId?: string | null) {
      const d = requireDb();
      const [updated] = await d.update(orders)
        .set({ paymentState: "paid", paidAt: new Date(), ...(typeof total === "number" ? { total } : {}),
          ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}) })
        .where(and(eq(orders.id, orderId), eq(orders.paymentState, "pending")))
        .returning({ id: orders.id });
      return Boolean(updated);
    },
    async markRefunded(orderId: string, refundId?: string | null) {
      const d = requireDb();
      const [updated] = await d.update(orders)
        .set({ paymentState: "refunded", refundedAt: new Date(), ...(refundId ? { stripeRefundId: refundId } : {}) })
        .where(and(eq(orders.id, orderId), eq(orders.paymentState, "paid")))
        .returning({ id: orders.id });
      return Boolean(updated);
    },
    async markPaymentFailed(orderId: string) {
      const d = requireDb();
      const [updated] = await d.update(orders).set({ paymentState: "failed" })
        .where(and(eq(orders.id, orderId), eq(orders.paymentState, "pending")))
        .returning({ id: orders.id });
      return Boolean(updated);
    },
    async updateShippingAddress(orderId: string, input: Partial<Omit<Address, "id" | "createdAt">>) {
      const d = requireDb();
      const [order] = await d.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (!order) return false;
      if (!order.shippingAddressId) {
        if (!input.name || !input.line1 || !input.city || !input.region || !input.postal) return false;
        try {
          return await d.transaction(async (tx) => {
            const [created] = await tx.insert(addresses).values({
              name: input.name!, line1: input.line1!, line2: input.line2 ?? null,
              city: input.city!, region: input.region!, postal: input.postal!,
              country: input.country ?? "US", phone: input.phone ?? null,
            }).returning({ id: addresses.id });
            const [linked] = await tx.update(orders).set({ shippingAddressId: created.id })
              .where(and(eq(orders.id, orderId), isNull(orders.shippingAddressId))).returning({ id: orders.id });
            if (!linked) throw new Error("Shipping address assignment conflict");
            return true;
          });
        } catch {
          const [current] = await d.select({ shippingAddressId: orders.shippingAddressId }).from(orders).where(eq(orders.id, orderId)).limit(1);
          return Boolean(current?.shippingAddressId);
        }
      }
      const [updated] = await d.update(addresses).set(input)
        .where(eq(addresses.id, order.shippingAddressId)).returning({ id: addresses.id });
      return Boolean(updated);
    },
    async list() {
      const d = requireDb();
      const rows = await d.select().from(orders).orderBy(desc(orders.createdAt));
      const out = [];
      for (const o of rows) {
        const items = await d.select().from(orderItems).where(eq(orderItems.orderId, o.id));
        const addr = o.shippingAddressId
          ? (await d.select().from(addresses).where(eq(addresses.id, o.shippingAddressId)).limit(1))[0] ?? null
          : null;
        out.push({ ...o, items, address: addr });
      }
      return out;
    },
    async launchCounts() {
      const d = requireDb();
      const [row] = await d.select({
        pendingPayments: sql<number>`count(*) filter (where ${orders.paymentState} = 'pending' and ${orders.createdAt} < now() - interval '30 minutes')`,
        paidWithIssues: sql<number>`count(*) filter (where ${orders.paymentState} = 'paid' and ${orders.fulfillmentIssue} is not null)`,
        paidUnfulfilled: sql<number>`count(*) filter (where ${orders.paymentState} = 'paid' and ${orders.fulfillmentState} = 'unfulfilled')`,
      }).from(orders);
      return { pendingPayments: Number(row?.pendingPayments ?? 0), paidWithIssues: Number(row?.paidWithIssues ?? 0), paidUnfulfilled: Number(row?.paidUnfulfilled ?? 0) };
    },
    async setFulfillment(orderId: string, state: Order["fulfillmentState"], extra?: Partial<Order>) {
      const d = requireDb();
      await d.update(orders).set({ fulfillmentState: state, ...extra }).where(eq(orders.id, orderId));
    },
    async setFulfillmentIssue(orderId: string, issue: string | null) {
      const d = requireDb();
      await d.update(orders).set({ fulfillmentIssue: issue }).where(eq(orders.id, orderId));
    },
    async repairShippingAddress(orderId: string, input: Omit<Address, "id" | "createdAt">) {
      const d = requireDb();
      return d.transaction(async (tx) => {
        const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
        if (!order) return { ok: false as const, error: "Order not found" };
        if (order.paymentState !== "paid") return { ok: false as const, error: "Order is not paid" };
        if (order.fulfillmentIssue !== "shipping_address_missing") return { ok: false as const, error: "Order does not require shipping repair" };
        let addressId = order.shippingAddressId;
        if (addressId) await tx.update(addresses).set(input).where(eq(addresses.id, addressId));
        else {
          const [created] = await tx.insert(addresses).values(input).returning({ id: addresses.id });
          addressId = created.id;
          await tx.update(orders).set({ shippingAddressId: addressId }).where(eq(orders.id, orderId));
        }
        const [cleared] = await tx.update(orders).set({ fulfillmentIssue: null }).where(and(eq(orders.id, orderId), eq(orders.fulfillmentIssue, "shipping_address_missing"))).returning({ id: orders.id });
        if (!cleared) throw new Error("Shipping issue changed concurrently");
        return { ok: true as const, addressId };
      });
    },
    async assignDevice(itemId: string, deviceId: string) {
      const d = requireDb();
      await d.update(orderItems).set({ deviceId }).where(eq(orderItems.id, itemId));
    },
  },

  notifications: {
    async enqueuePaidOrder(orderId: string) {
      const d = requireDb();
      await d.insert(orderNotifications).values([
        { orderId, type: "operator_new_order" },
        { orderId, type: "customer_order_confirmation" },
      ]).onConflictDoNothing();
    },
    async enqueueShipped(orderId: string) {
      const d = requireDb();
      await d.insert(orderNotifications).values({ orderId, type: "customer_shipped" }).onConflictDoNothing();
    },
    async enqueueFulfillmentIssue(orderId: string) {
      const d = requireDb();
      await d.insert(orderNotifications).values({ orderId, type: "operator_fulfillment_issue" }).onConflictDoNothing();
    },
    async pending(limit = 25) {
      const d = requireDb();
      await d.update(orderNotifications).set({ status: "pending", lastError: "Delivery lease expired" })
        .where(and(eq(orderNotifications.status, "processing"), lte(orderNotifications.nextAttemptAt, new Date())));
      return d.select().from(orderNotifications)
        .where(and(eq(orderNotifications.status, "pending"), lte(orderNotifications.nextAttemptAt, new Date())))
        .orderBy(asc(orderNotifications.createdAt)).limit(limit);
    },
    async claim(id: string) {
      const d = requireDb();
      const [row] = await d.update(orderNotifications).set({ status: "processing", nextAttemptAt: new Date(Date.now() + 5 * 60_000) })
        .where(and(eq(orderNotifications.id, id), eq(orderNotifications.status, "pending"))).returning({ id: orderNotifications.id });
      return Boolean(row);
    },
    async markSent(id: string) {
      const d = requireDb();
      await d.update(orderNotifications).set({ status: "sent", sentAt: new Date(), lastError: null })
        .where(and(eq(orderNotifications.id, id), eq(orderNotifications.status, "processing")));
    },
    async markFailed(id: string, error: string) {
      const d = requireDb();
      await d.update(orderNotifications).set({
        status: "pending", attempts: sql`${orderNotifications.attempts} + 1`, lastError: error.slice(0, 500),
        nextAttemptAt: new Date(Date.now() + 5 * 60_000),
      }).where(and(eq(orderNotifications.id, id), eq(orderNotifications.status, "processing")));
    },
    async counts() {
      const d = requireDb();
      const [row] = await d.select({
        pending: sql<number>`count(*) filter (where ${orderNotifications.status} = 'pending')`,
        failed: sql<number>`count(*) filter (where ${orderNotifications.status} = 'pending' and ${orderNotifications.attempts} > 0)`,
      }).from(orderNotifications);
      return { pending: Number(row?.pending ?? 0), failed: Number(row?.failed ?? 0) };
    },
  },

  stripeEvents: {
    async begin(eventId: string, type: string) {
      const d = requireDb();
      const [row] = await d.insert(stripeWebhookEvents).values({ id: eventId, type })
        .onConflictDoUpdate({ target: stripeWebhookEvents.id, set: {
          attempts: sql`${stripeWebhookEvents.attempts} + 1`, status: "processing", lastError: null,
        } }).returning({ processedAt: stripeWebhookEvents.processedAt });
      return !row?.processedAt;
    },
    async complete(eventId: string) {
      const d = requireDb();
      await d.update(stripeWebhookEvents).set({ status: "processed", processedAt: new Date(), lastError: null })
        .where(eq(stripeWebhookEvents.id, eventId));
    },
    async fail(eventId: string, error: string) {
      const d = requireDb();
      await d.update(stripeWebhookEvents).set({ status: "failed", lastError: error.slice(0, 500) })
        .where(eq(stripeWebhookEvents.id, eventId));
    },
  },

  profiles: {
    async listAllForOperator() {
      const d = requireDb();
      return d.select({ profile: profiles, ownerEmail: users.email, ownerName: users.name })
        .from(profiles).innerJoin(users, eq(profiles.userId, users.id)).orderBy(desc(profiles.createdAt));
    },
    async createForOwner(input: {
      ownerEmail: string; ownerName: string; type: Profile["type"]; username: string;
      displayName: string; locale: Profile["locale"]; data: Profile["data"]; accent?: string | null;
    }) {
      const d = requireDb();
      return d.transaction(async (tx) => {
        await tx.insert(users).values({ email: input.ownerEmail, name: input.ownerName, role: "customer", locale: input.locale }).onConflictDoNothing();
        const [owner] = await tx.select().from(users).where(eq(users.email, input.ownerEmail)).limit(1);
        if (!owner) throw new Error("Unable to create profile owner");
        if (!owner.name && input.ownerName) await tx.update(users).set({ name: input.ownerName }).where(eq(users.id, owner.id));
        await tx.update(orders).set({ userId: owner.id }).where(and(eq(orders.email, input.ownerEmail), isNull(orders.userId)));
        const [profile] = await tx.insert(profiles).values({
          userId: owner.id, type: input.type, status: "draft", username: input.username,
          displayName: input.displayName, locale: input.locale, data: input.data, accent: input.accent ?? null,
        }).returning();
        await tx.insert(destinations).values({ token: `dst_${nanoid(10)}`, profileId: profile.id, active: true });
        return { profile, owner };
      });
    },
    async getOwned(id: string, userId: string) {
      const d = requireDb();
      const [p] = await d.select().from(profiles)
        .where(and(eq(profiles.id, id), eq(profiles.userId, userId))).limit(1);
      if (!p) return undefined;
      const links = await d.select().from(profileLinks).where(eq(profileLinks.profileId, id)).orderBy(asc(profileLinks.sortOrder));
      const { contactChannels } = getProfileExperience(p.data, p.id);
      return { ...p, links, contactChannels };
    },
    /** Operator control-plane detail fetch — not ownership-scoped; admin only. */
    async adminById(id: string) {
      const d = requireDb();
      const [p] = await d.select().from(profiles).where(eq(profiles.id, id)).limit(1);
      if (!p) return undefined;
      const [owner] = await d.select({ id: users.id, email: users.email, name: users.name, plan: users.plan })
        .from(users).where(eq(users.id, p.userId)).limit(1);
      const links = await d.select().from(profileLinks).where(eq(profileLinks.profileId, id)).orderBy(asc(profileLinks.sortOrder));
      const { contactChannels } = getProfileExperience(p.data, p.id);
      return { ...p, owner, links, contactChannels };
    },
    async listByUser(userId: string) {
      const d = requireDb();
      return d.select().from(profiles).where(eq(profiles.userId, userId)).orderBy(desc(profiles.createdAt));
    },
    async byUsername(username: string) {
      const d = requireDb();
      const [p] = await d.select().from(profiles).where(eq(profiles.username, username.toLowerCase())).limit(1);
      if (!p) return undefined;
      const links = await d.select().from(profileLinks).where(eq(profileLinks.profileId, p.id)).orderBy(asc(profileLinks.sortOrder));
      const { contactChannels } = getProfileExperience(p.data, p.id);
      return { ...p, links, contactChannels };
    },
    async update(id: string, fields: Partial<Profile>) {
      const d = requireDb();
      await d.update(profiles).set(fields).where(eq(profiles.id, id));
    },
  },

  links: {
    async create(profileId: string, input: { type: typeof profileLinks.$inferInsert.type; label?: string; url: string; sortOrder: number }) {
      const d = requireDb(); const [row] = await d.insert(profileLinks).values({ profileId, type: input.type, label: input.label ?? null, url: input.url, sortOrder: input.sortOrder, visible: true }).returning(); return row;
    },
    async update(id: string, profileId: string, fields: Partial<ProfileLink>) {
      const d = requireDb(); const [row] = await d.update(profileLinks).set(fields).where(and(eq(profileLinks.id, id), eq(profileLinks.profileId, profileId))).returning(); return row;
    },
    async delete(id: string, profileId: string) {
      const d = requireDb(); await d.delete(profileLinks).where(and(eq(profileLinks.id, id), eq(profileLinks.profileId, profileId)));
    },
  },

  destinations: {
    async byProfile(profileId: string) {
      const d = requireDb(); const [dest] = await d.select().from(destinations).where(and(eq(destinations.profileId, profileId), eq(destinations.active, true))).limit(1); return dest;
    },
    async resolve(token: string) {
      const d = requireDb();
      const [dest] = await d.select().from(destinations)
        .where(and(eq(destinations.token, token), eq(destinations.active, true))).limit(1);
      if (!dest) return undefined;
      const [p] = await d.select().from(profiles).where(eq(profiles.id, dest.profileId)).limit(1);
      return p ? { destination: dest, profile: p } : undefined;
    },
    async create(profileId: string, token: string) {
      const d = requireDb();
      const [dest] = await d.insert(destinations).values({ token, profileId, active: true }).returning();
      return dest;
    },
  },

  devices: {
    async list() {
      const d = requireDb(); return d.select().from(devices).orderBy(desc(devices.createdAt));
    },
    async byId(id: string) {
      const d = requireDb(); const [dev] = await d.select().from(devices).where(eq(devices.id, id)).limit(1); return dev;
    },
    async byProfile(profileId: string) {
      const d = requireDb(); return d.select().from(devices).where(eq(devices.profileId, profileId)).orderBy(desc(devices.createdAt));
    },
    async byAssignedUser(userId: string) {
      const d = requireDb(); return d.select().from(devices).where(eq(devices.assignedUserId, userId)).orderBy(desc(devices.createdAt));
    },
    async byToken(token: string): Promise<Device | undefined> {
      const d = requireDb();
      const [dev] = await d.select().from(devices).where(eq(devices.deviceCode, normalizeDeviceCode(token))).limit(1);
      return dev;
    },
    async claim(deviceId: string, profileId: string, destinationId: string, assignedUserId: string) {
      const d = requireDb();
      const [claimed] = await d.update(devices).set({
        profileId, destinationId, status: "paired", activatedAt: new Date(),
      }).where(and(eq(devices.id, deviceId), eq(devices.assignedUserId, assignedUserId), eq(devices.status, "assigned")))
        .returning({ id: devices.id });
      return Boolean(claimed);
    },
    async assignExisting(input: { orderId: string; itemId: string; deviceCode: string }) {
      const d = requireDb();
      if (!isValidDeviceCode(input.deviceCode)) return { ok: false as const, error: "Invalid device code" };
      return d.transaction(async (tx) => {
        const [order] = await tx.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
        if (!order) return { ok: false as const, error: "Order not found" };
        const [item] = await tx.select().from(orderItems)
          .where(and(eq(orderItems.id, input.itemId), eq(orderItems.orderId, input.orderId))).limit(1);
        if (!item) return { ok: false as const, error: "Order item not found" };
        const [device] = await tx.select().from(devices)
          .where(eq(devices.deviceCode, normalizeDeviceCode(input.deviceCode))).limit(1);
        const [product] = item.productId ? await tx.select({ productType: products.productType }).from(products).where(eq(products.id, item.productId)).limit(1) : [];
        const error = assignmentError({
          paymentState: order.paymentState, fulfillmentState: order.fulfillmentState,
          fulfillmentIssue: order.fulfillmentIssue, orderUserId: order.userId,
          itemDeviceId: item.deviceId, deviceStatus: device?.status,
          deviceAssignedUserId: device?.assignedUserId, deviceOrderItemId: device?.orderItemId,
          expectedProductId: item.hardwareProductId ?? item.productId,
          deviceProductId: device?.hardwareProductId ?? device?.productId,
          expectedVariantId: item.hardwareVariantId ?? item.variantId,
          deviceVariantId: device?.hardwareVariantId,
          expectedDeviceType: product?.productType, deviceType: device?.type,
        });
        if (error || !device || !order.userId) return { ok: false as const, error: error ?? "Device cannot be assigned" };

        const [assigned] = await tx.update(devices).set({
          status: "assigned", assignedUserId: order.userId, orderItemId: item.id,
          productId: item.productId, hardwareProductId: item.hardwareProductId ?? item.productId,
          hardwareVariantId: item.hardwareVariantId ?? item.variantId,
          sku: item.skuSnapshot, assignedAt: new Date(),
        }).where(and(eq(devices.id, device.id), eq(devices.status, "unclaimed"), isNull(devices.assignedUserId), isNull(devices.orderItemId)))
          .returning({ id: devices.id, status: devices.status });
        if (!assigned) throw new Error("Device assignment conflict");
        const [linked] = await tx.update(orderItems).set({ deviceId: device.id })
          .where(and(eq(orderItems.id, item.id), isNull(orderItems.deviceId))).returning({ id: orderItems.id });
        if (!linked) throw new Error("Order item assignment conflict");
        return { ok: true as const, deviceId: device.id, status: assigned.status };
      });
    },
    async resolveTouchpoint(token: string) {
      const d = requireDb();
      const [device] = await d.select().from(devices)
        .where(eq(devices.deviceCode, normalizeDeviceCode(token))).limit(1);
      if (!device?.destinationId) return undefined;
      const [destination] = await d.select().from(destinations)
        .where(eq(destinations.id, device.destinationId)).limit(1);
      if (!destination) return undefined;
      const [profile] = await d.select().from(profiles)
        .where(eq(profiles.id, destination.profileId)).limit(1);
      return profile && canResolvePhysicalDevice({ status: device.status, destinationActive: destination.active, profileStatus: profile.status })
        ? { device, destination, profile } : undefined;
    },
    async create(input: { deviceCode: string; type: Device["type"]; label?: string; productId?: string; hardwareProductId?: string; hardwareVariantId?: string; sku?: string; orderItemId?: string; assignedUserId?: string }) {
      const d = requireDb();
      if (!isProvisionableDeviceCode(input.deviceCode)) throw new Error("Device code must be 12–64 characters using A–Z, 0–9, _ or -");
      const [dev] = await d.insert(devices).values({
        deviceCode: normalizeDeviceCode(input.deviceCode), type: input.type, label: input.label ?? null, status: "unclaimed",
        productId: input.productId ?? null, orderItemId: input.orderItemId ?? null, assignedUserId: input.assignedUserId ?? null,
        hardwareProductId: input.hardwareProductId ?? input.productId ?? null,
        hardwareVariantId: input.hardwareVariantId ?? null, sku: input.sku ?? null,
      }).returning();
      return dev;
    },
    async update(id: string, fields: Partial<Device>) {
      const d = requireDb(); const [dev] = await d.update(devices).set(fields).where(eq(devices.id, id)).returning(); return dev;
    },
    async transitionStatus(id: string, status: Device["status"]) {
      const d = requireDb();
      return d.transaction(async (tx) => {
        const [device] = await tx.select().from(devices).where(eq(devices.id, id)).limit(1);
        if (!device) return { ok: false as const, error: "Device not found" };
        if (!canOperatorTransitionDevice(device.status, status)) return { ok: false as const, error: `Cannot change ${device.status} to ${status}` };
        const [updated] = await tx.update(devices).set({ status }).where(and(eq(devices.id, id), eq(devices.status, device.status))).returning();
        return updated ? { ok: true as const, device: updated } : { ok: false as const, error: "Device status changed concurrently" };
      });
    },
  },

  events: {
    async record(profileId: string, type: "tap" | "qr_scan" | "profile_view" | "contact" | "guardian_call_click", source?: string) {
      const d = requireDb();
      await d.insert(activityEvents).values({ profileId, type, source: source ?? null });
    },
    async counts(profileId: string) {
      const d = requireDb();
      const rows = await d.select({ type: activityEvents.type, count: sql<number>`count(*)` })
        .from(activityEvents).where(eq(activityEvents.profileId, profileId)).groupBy(activityEvents.type);
      const byType: Record<string, number> = {};
      let total = 0;
      for (const r of rows) {
        byType[r.type] = Number(r.count);
        total += Number(r.count);
      }
      return { byType, total };
    },
  },

  leads: {
    async create(input: { profileId: string; name?: string; phone?: string; email?: string; message?: string; source?: string; submissionFingerprint?: string }) {
      const d = requireDb();
      const [row] = await d.insert(contactLeads).values({
        profileId: input.profileId, name: input.name ?? null, phone: input.phone ?? null,
        email: input.email ?? null, message: input.message ?? null, source: input.source ?? null,
        submissionFingerprint: input.submissionFingerprint ?? null,
      }).returning();
      return row;
    },
    async countRecentByFingerprint(fingerprint: string, withinMs: number) {
      const d = requireDb();
      const since = new Date(Date.now() - withinMs);
      const [row] = await d.select({ count: sql<number>`count(*)` }).from(contactLeads)
        .where(and(eq(contactLeads.submissionFingerprint, fingerprint), gte(contactLeads.createdAt, since)));
      return Number(row?.count ?? 0);
    },
    /** Basic abuse seam: same profile + same contact method within the window counts as a duplicate. */
    async recentDuplicate(profileId: string, contact: { email?: string; phone?: string }, withinMs: number) {
      const d = requireDb();
      const since = new Date(Date.now() - withinMs);
      const contactMatch = [
        contact.email ? eq(contactLeads.email, contact.email) : undefined,
        contact.phone ? eq(contactLeads.phone, contact.phone) : undefined,
      ].filter(Boolean);
      if (contactMatch.length === 0) return false;
      const [row] = await d.select({ id: contactLeads.id }).from(contactLeads)
        .where(and(eq(contactLeads.profileId, profileId), gte(contactLeads.createdAt, since), or(...contactMatch)))
        .limit(1);
      return Boolean(row);
    },
    async list() {
      const d = requireDb();
      const rows = await d.select().from(contactLeads).orderBy(desc(contactLeads.createdAt));
      const out = [];
      for (const lead of rows) {
        const [p] = await d.select({ username: profiles.username, displayName: profiles.displayName })
          .from(profiles).where(eq(profiles.id, lead.profileId)).limit(1);
        out.push({ ...lead, profileUsername: p?.username ?? null, profileDisplayName: p?.displayName ?? null });
      }
      return out;
    },
    async listByUser(userId: string) {
      const d = requireDb();
      const rows = await d.select({ lead: contactLeads, username: profiles.username, displayName: profiles.displayName })
        .from(contactLeads).innerJoin(profiles, eq(contactLeads.profileId, profiles.id))
        .where(eq(profiles.userId, userId)).orderBy(desc(contactLeads.createdAt));
      return rows.map(({ lead, username, displayName }) => ({ ...lead, profileUsername: username, profileDisplayName: displayName }));
    },
  },

  /**
   * NETWORKING LEADS — a Solo owner's private rolodex (business card scans + manual
   * connections). Every query/mutation is owner-scoped in the WHERE clause itself, never
   * just in the caller — see docs/NETWORKING.md "Owner isolation".
   */
  networkingLeads: {
    async listByUser(userId: string, opts?: { query?: string; filter?: "today" | "week" | "followup" }) {
      const d = requireDb();
      const conditions = [eq(networkingLeads.userId, userId)];
      if (opts?.query) {
        const q = `%${opts.query.trim()}%`;
        conditions.push(or(
          ilike(networkingLeads.displayName, q), ilike(networkingLeads.company, q),
          ilike(networkingLeads.email, q), ilike(networkingLeads.phone, q),
        )!);
      }
      const now = new Date();
      if (opts?.filter === "today") {
        const start = new Date(now); start.setHours(0, 0, 0, 0);
        const end = new Date(now); end.setHours(23, 59, 59, 999);
        conditions.push(gte(networkingLeads.createdAt, start), lte(networkingLeads.createdAt, end));
      } else if (opts?.filter === "week") {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60_000);
        conditions.push(gte(networkingLeads.createdAt, start));
      } else if (opts?.filter === "followup") {
        conditions.push(sql`${networkingLeads.followUpAt} is not null`);
      }
      return d.select().from(networkingLeads).where(and(...conditions)).orderBy(desc(networkingLeads.createdAt));
    },
    /** Ownership is enforced in the WHERE clause — a non-owner id lookup returns undefined, never another user's row. */
    async byId(id: string, userId: string) {
      const d = requireDb();
      const [row] = await d.select().from(networkingLeads).where(and(eq(networkingLeads.id, id), eq(networkingLeads.userId, userId))).limit(1);
      return row;
    },
    async create(userId: string, input: Omit<typeof networkingLeads.$inferInsert, "id" | "userId" | "createdAt" | "updatedAt">) {
      const d = requireDb();
      const [row] = await d.insert(networkingLeads).values({ ...input, userId }).returning();
      return row;
    },
    async update(id: string, userId: string, fields: Partial<Omit<NetworkingLead, "id" | "userId" | "createdAt">>) {
      const d = requireDb();
      const [row] = await d.update(networkingLeads).set({ ...fields, updatedAt: new Date() })
        .where(and(eq(networkingLeads.id, id), eq(networkingLeads.userId, userId))).returning();
      return row;
    },
    async delete(id: string, userId: string) {
      const d = requireDb();
      const [row] = await d.delete(networkingLeads).where(and(eq(networkingLeads.id, id), eq(networkingLeads.userId, userId))).returning({ id: networkingLeads.id });
      return Boolean(row);
    },
    /** Basic exact-match dedupe on normalized email/phone, scoped to this owner only. */
    async findDuplicate(userId: string, contact: { email?: string; phone?: string }) {
      const d = requireDb();
      const matches = [
        contact.email ? eq(networkingLeads.email, contact.email) : undefined,
        contact.phone ? eq(networkingLeads.phone, contact.phone) : undefined,
      ].filter(Boolean);
      if (!matches.length) return undefined;
      const [row] = await d.select().from(networkingLeads).where(and(eq(networkingLeads.userId, userId), or(...matches))).limit(1);
      return row;
    },
  },

  /** NETWORKING SETTINGS — CMS singleton toggle row, same operator-editable-table pattern as pricingPlans/purposeOptions. */
  networkingSettings: {
    async get(): Promise<NetworkingSettings> {
      const d = requireDb();
      const [row] = await d.select().from(networkingSettings).where(eq(networkingSettings.id, "global")).limit(1);
      return row ?? {
        id: "global", networkingEnabled: true, cardScannerEnabled: true,
        manualConnectionsEnabled: true, followUpEnabled: true, updatedAt: new Date(),
      };
    },
    async update(fields: Partial<Omit<NetworkingSettings, "id" | "updatedAt">>) {
      const d = requireDb();
      const [row] = await d.insert(networkingSettings).values({ id: "global", ...fields })
        .onConflictDoUpdate({ target: networkingSettings.id, set: { ...fields, updatedAt: new Date() } })
        .returning();
      return row;
    },
  },

  /**
   * RESUME (Phase 3) — every query is owner-scoped in the WHERE clause itself, matching the
   * Phase 2 networkingLeads standard. Section tables (experience/education/…) don't carry
   * ownerUserId directly, so every section mutation verifies ownership via a subquery against
   * resumeProfiles rather than trusting the resumeProfileId passed in — see docs/RESUME.md.
   */
  resume: {
    async getOwned(profileId: string, userId: string): Promise<ResumeProfile | undefined> {
      const d = requireDb();
      const [row] = await d.select().from(resumeProfiles)
        .where(and(eq(resumeProfiles.profileId, profileId), eq(resumeProfiles.ownerUserId, userId))).limit(1);
      return row;
    },
    async getOwnedById(id: string, userId: string): Promise<ResumeProfile | undefined> {
      const d = requireDb();
      const [row] = await d.select().from(resumeProfiles)
        .where(and(eq(resumeProfiles.id, id), eq(resumeProfiles.ownerUserId, userId))).limit(1);
      return row;
    },
    /** Public read — no owner check, but requires publicEnabled=true. */
    async getPublic(profileId: string): Promise<ResumeProfile | undefined> {
      const d = requireDb();
      const [row] = await d.select().from(resumeProfiles)
        .where(and(eq(resumeProfiles.profileId, profileId), eq(resumeProfiles.publicEnabled, true))).limit(1);
      return row;
    },
    async getOrCreateForProfile(profileId: string, userId: string): Promise<ResumeProfile> {
      const d = requireDb();
      const existing = await this.getOwned(profileId, userId);
      if (existing) return existing;
      const [row] = await d.insert(resumeProfiles).values({ profileId, ownerUserId: userId })
        .onConflictDoNothing({ target: resumeProfiles.profileId }).returning();
      return row ?? (await this.getOwned(profileId, userId))!;
    },
    async update(id: string, userId: string, fields: Partial<Omit<ResumeProfile, "id" | "profileId" | "ownerUserId" | "createdAt">>) {
      const d = requireDb();
      const [row] = await d.update(resumeProfiles).set({ ...fields, updatedAt: new Date() })
        .where(and(eq(resumeProfiles.id, id), eq(resumeProfiles.ownerUserId, userId))).returning();
      return row;
    },

    experience: resumeSectionRepo(resumeExperience),
    education: resumeSectionRepo(resumeEducation),
    skills: resumeSectionRepo(resumeSkills),
    certifications: resumeSectionRepo(resumeCertifications),
    languages: resumeSectionRepo(resumeLanguages),
    projects: resumeSectionRepo(resumeProjects),
  },

  resumeSettings: {
    async get(): Promise<ResumeSettings> {
      const d = requireDb();
      const [row] = await d.select().from(resumeSettings).where(eq(resumeSettings.id, "global")).limit(1);
      if (row) return row;
      // Same shape as the column defaults — feature works before an operator ever visits
      // /operator/resume, matching the networkingSettings fallback pattern.
      const [inserted] = await d.insert(resumeSettings).values({ id: "global" }).onConflictDoNothing().returning();
      if (inserted) return inserted;
      const [refetched] = await d.select().from(resumeSettings).where(eq(resumeSettings.id, "global")).limit(1);
      return refetched;
    },
    async update(fields: Partial<Omit<ResumeSettings, "id" | "updatedAt">>) {
      const d = requireDb();
      const [row] = await d.insert(resumeSettings).values({ id: "global", ...fields })
        .onConflictDoUpdate({ target: resumeSettings.id, set: { ...fields, updatedAt: new Date() } })
        .returning();
      return row;
    },
  },
};

/**
 * Factory shared by every resume section table (experience/education/skills/certifications/
 * languages/projects) — identical shape (id, resumeProfileId, sortOrder, visible + own
 * fields), so this avoids six near-duplicate CRUD blocks. Ownership is enforced by a
 * subquery against resumeProfiles.ownerUserId on every mutation, not just the read path.
 */
function resumeSectionRepo<TTable extends PgTable & {
  id: { name: string }; resumeProfileId: { name: string }; sortOrder: { name: string }; visible: { name: string };
}>(table: TTable) {
  type Row = TTable["$inferSelect"];
  type Insert = TTable["$inferInsert"];
  const col = table as unknown as { id: typeof resumeExperience.id; resumeProfileId: typeof resumeExperience.resumeProfileId; sortOrder: typeof resumeExperience.sortOrder; visible: typeof resumeExperience.visible };

  async function ownsResumeProfile(resumeProfileId: string, userId: string) {
    const d = requireDb();
    const [row] = await d.select({ id: resumeProfiles.id }).from(resumeProfiles)
      .where(and(eq(resumeProfiles.id, resumeProfileId), eq(resumeProfiles.ownerUserId, userId))).limit(1);
    return Boolean(row);
  }

  return {
    /** List is scoped by resumeProfileId only — callers must have already verified ownership of that resumeProfileId (e.g. via repo.resume.getOwned). */
    async list(resumeProfileId: string): Promise<Row[]> {
      const d = requireDb();
      return d.select().from(table as PgTable).where(eq(col.resumeProfileId, resumeProfileId)).orderBy(asc(col.sortOrder)) as Promise<Row[]>;
    },
    async create(resumeProfileId: string, userId: string, input: Omit<Insert, "id" | "resumeProfileId">): Promise<Row | undefined> {
      if (!(await ownsResumeProfile(resumeProfileId, userId))) return undefined;
      const d = requireDb();
      const [row] = await d.insert(table as PgTable).values({ ...input, resumeProfileId } as Insert).returning();
      return row as Row;
    },
    async update(id: string, resumeProfileId: string, userId: string, fields: Partial<Omit<Insert, "id" | "resumeProfileId">>): Promise<Row | undefined> {
      if (!(await ownsResumeProfile(resumeProfileId, userId))) return undefined;
      const d = requireDb();
      const [row] = await d.update(table as PgTable).set(fields as Partial<Insert>)
        .where(and(eq(col.id, id), eq(col.resumeProfileId, resumeProfileId))).returning();
      return row as Row | undefined;
    },
    async delete(id: string, resumeProfileId: string, userId: string): Promise<boolean> {
      if (!(await ownsResumeProfile(resumeProfileId, userId))) return false;
      const d = requireDb();
      const [row] = await d.delete(table as PgTable)
        .where(and(eq(col.id, id), eq(col.resumeProfileId, resumeProfileId))).returning({ id: col.id });
      return Boolean(row);
    },
  };
}
