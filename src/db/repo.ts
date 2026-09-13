import { eq, and, or, gte, lte, desc, asc, isNull, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import {
  products, productVariants, productPriceAudits, media, storefrontSections, commerceEvents, orders, orderItems, addresses, orderNotifications, stripeWebhookEvents,
  users, profiles, profileLinks, destinations, devices, activityEvents, contactLeads, purposeOptions, collectionOptions, snapTrackSignups, pricingPlans,
} from "@/db/schema";
import type {
  Product, ProductVariant, Order, OrderItem, Address, Media,
  Profile, ProfileLink, Device,
} from "@/db/schema";
import { getProfileExperience } from "@/lib/profile-data";
import { assignmentError, canOperatorTransitionDevice, canResolvePhysicalDevice, isProvisionableDeviceCode, isValidDeviceCode, normalizeDeviceCode } from "@/lib/device-lifecycle";

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
      return d.select().from(purposeOptions).orderBy(asc(purposeOptions.sortOrder));
    },
    async update(id: string, input: Partial<typeof purposeOptions.$inferInsert>) {
      const d = requireDb();
      const [row] = await d.update(purposeOptions)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(purposeOptions.id, id)).returning();
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
      items: Omit<OrderItem, "id" | "orderId">[];
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
        if (input.items.length) await tx.insert(orderItems).values(input.items.map((item) => ({ ...item, orderId: order.id })));
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
};
