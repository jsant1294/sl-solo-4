import type { Product, ProductVariant, Order, OrderItem, Address } from "./schema";

/**
 * COMMERCE DEMO STORE — STUBBED persistence (in-memory), schema-shaped.
 * Swap for Drizzle queries to wire. Prices in cents. Images reference
 * /placeholder/* until real photography + StorageProvider are wired;
 * swapping is centralized here + admin, never in JSX.
 */

type DemoProduct = Product & { variants: ProductVariant[] };

const P = (o: Partial<DemoProduct> & Pick<DemoProduct, "id" | "slug" | "name" | "basePrice" | "productType">): DemoProduct => ({
  nameEs: null, shortDescription: null, shortDescriptionEs: null, fullDescription: null, fullDescriptionEs: null, compareAtPrice: null,
  active: true, featured: false, sortOrder: 0, primaryImageId: null,
  galleryImageIds: [], colors: [], personalizationAvailable: false,
  customArtAvailable: false, customArtPriceCents: null,
  videoId: null, videoPosterId: null, personalizationOptions: [],
  inventoryMode: "infinite", stockStatus: "in_stock", profileTypesSupported: [],
  activationInstructions: null, fulfillmentNotes: null, seoTitle: null,
  seoDescription: null, createdAt: new Date(), updatedAt: new Date(), variants: [], ...o,
});

export const DEMO_PRODUCTS: DemoProduct[] = [
  P({
    id: "prod_card", slug: "nfc-card", name: "NFC Card", productType: "card",
    basePrice: 2900, featured: true, sortOrder: 1,
    shortDescription: "Your identity in your wallet.",
    fullDescription: "A premium matte card with embedded NFC and a printed QR. Tap or scan — no app required for the person you meet.",
    colors: ["Obsidian", "Ivory"], personalizationAvailable: true,
    customArtAvailable: true, customArtPriceCents: 4900,
    profileTypesSupported: ["personal", "professional", "creator", "business"],
    activationInstructions: "Tap the card to any phone, then follow the link to claim.",
    variants: [
      { id: "v_card_obs", productId: "prod_card", label: "Obsidian", color: "#14120F", priceDelta: 0, sku: "CARD-OBS", stockStatus: "in_stock", sortOrder: 0 },
      { id: "v_card_ivo", productId: "prod_card", label: "Ivory", color: "#F8F6F1", priceDelta: 0, sku: "CARD-IVO", stockStatus: "in_stock", sortOrder: 1 },
    ],
  }),
  P({
    id: "prod_plate", slug: "phone-tag", name: "Phone Tag", productType: "phone_plate",
    basePrice: 3900, featured: true, sortOrder: 2,
    shortDescription: "Your connection on the phone you already carry.",
    fullDescription: "A slim NFC plate that adheres to any phone or case. Your profile opens when someone taps their phone to yours.",
    colors: ["Obsidian", "Gold"], personalizationAvailable: false,
    profileTypesSupported: ["personal", "professional", "creator"],
    variants: [
      { id: "v_plate_obs", productId: "prod_plate", label: "Obsidian", color: "#14120F", priceDelta: 0, sku: "PLATE-OBS", stockStatus: "in_stock", sortOrder: 0 },
      { id: "v_plate_gold", productId: "prod_plate", label: "Gold", color: "#B78A32", priceDelta: 500, sku: "PLATE-GLD", stockStatus: "in_stock", sortOrder: 1 },
    ],
  }),
  P({
    id: "prod_bracelet", slug: "bracelet", name: "Bracelet", productType: "bracelet",
    basePrice: 3400, featured: true, sortOrder: 3,
    shortDescription: "Wear your SnapLink.",
    fullDescription: "A comfortable silicone band with embedded NFC. Tap your wrist to any phone to share.",
    colors: ["Black", "Pink", "Blue"], personalizationAvailable: true,
    profileTypesSupported: ["personal", "creator", "kids"],
    variants: [
      { id: "v_brace_blk", productId: "prod_bracelet", label: "Black", color: "#14120F", priceDelta: 0, sku: "BR-BLK", stockStatus: "in_stock", sortOrder: 0 },
      { id: "v_brace_pnk", productId: "prod_bracelet", label: "Pink", color: "#E86FA6", priceDelta: 0, sku: "BR-PNK", stockStatus: "in_stock", sortOrder: 1 },
      { id: "v_brace_blu", productId: "prod_bracelet", label: "Blue", color: "#5B8DEF", priceDelta: 0, sku: "BR-BLU", stockStatus: "in_stock", sortOrder: 2 },
    ],
  }),
  P({
    id: "prod_keychain", slug: "keychain", name: "Keychain", productType: "keychain",
    basePrice: 2400, sortOrder: 4,
    shortDescription: "Always with you.",
    fullDescription: "A metal keychain fob with NFC and QR. Tap or scan to hand off your profile in a second.",
    colors: ["Steel"], profileTypesSupported: ["personal", "professional"],
    variants: [{ id: "v_key_steel", productId: "prod_keychain", label: "Steel", color: "#888780", priceDelta: 0, sku: "KEY-STL", stockStatus: "in_stock", sortOrder: 0 }],
  }),
  P({
    id: "prod_stand", slug: "table-stand", name: "Review / Table Stand", productType: "stand",
    basePrice: 4900, sortOrder: 5,
    shortDescription: "Turn a counter into a connection.",
    fullDescription: "A weighted stand for a counter, table, or checkout. Customers tap or scan to connect or leave a review.",
    colors: ["Obsidian"], profileTypesSupported: ["business", "professional"],
    variants: [{ id: "v_stand_obs", productId: "prod_stand", label: "Obsidian", color: "#14120F", priceDelta: 0, sku: "STD-OBS", stockStatus: "in_stock", sortOrder: 0 }],
  }),
  P({
    id: "prod_kids_tag", slug: "kids-backpack-tag", name: "Kids Backpack Tag", productType: "sticker",
    basePrice: 1900, featured: true, sortOrder: 6,
    shortDescription: "Help someone reach you when it matters.",
    fullDescription: "A durable NFC tag for a backpack or bag. Taps open a safe, guardian-controlled contact page — first name only, no personal details.",
    colors: ["Pink", "Blue", "Green"], personalizationAvailable: true,
    profileTypesSupported: ["kids"],
    activationInstructions: "A guardian taps the tag, creates the child's safe page, and stays in control of it.",
    variants: [
      { id: "v_kids_pnk", productId: "prod_kids_tag", label: "Pink", color: "#E86FA6", priceDelta: 0, sku: "KID-PNK", stockStatus: "in_stock", sortOrder: 0 },
      { id: "v_kids_blu", productId: "prod_kids_tag", label: "Blue", color: "#5B8DEF", priceDelta: 0, sku: "KID-BLU", stockStatus: "in_stock", sortOrder: 1 },
      { id: "v_kids_grn", productId: "prod_kids_tag", label: "Green", color: "#3FBF8F", priceDelta: 0, sku: "KID-GRN", stockStatus: "in_stock", sortOrder: 2 },
    ],
  }),
];

export const getProducts = (opts?: { activeOnly?: boolean }) =>
  DEMO_PRODUCTS.filter((p) => (opts?.activeOnly ? p.active : true)).sort((a, b) => a.sortOrder - b.sortOrder);
export const getProductBySlug = (slug: string) => DEMO_PRODUCTS.find((p) => p.slug === slug);
export const getProductById = (id: string) => DEMO_PRODUCTS.find((p) => p.id === id);
export const getFeatured = () => getProducts({ activeOnly: true }).filter((p) => p.featured);
export const getKidsProducts = () => getProducts({ activeOnly: true }).filter((p) => p.profileTypesSupported.includes("kids"));

export const dollars = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

/* — Orders (in-memory, STUBBED) — */
export const DEMO_ORDERS: (Order & { items: OrderItem[]; address: Address | null })[] = [
  {
    id: "ord_1", orderNumber: "SL-1048", checkoutRequestId: null, userId: "u_jose", email: "maria@example.com",
    phone: "+14045550101", shippingAddressId: "addr_1", subtotal: 3400, total: 3400,
    paymentState: "paid", fulfillmentState: "unfulfilled", fulfillmentIssue: null, stripeSessionId: null,
    stripePaymentIntentId: null, stripeRefundId: null, trackingNumber: null, trackingCarrier: null, paidAt: new Date("2025-04-01T10:00:00"), refundedAt: null,
    shippedAt: null, deliveredAt: null, createdAt: new Date("2025-04-01T09:58:00"),
    address: { id: "addr_1", name: "Maria Rivera", line1: "123 Peachtree St", line2: null, city: "Atlanta", region: "GA", postal: "30303", country: "US", phone: "+14045550101", createdAt: new Date() },
    items: [{ id: "oi_1", orderId: "ord_1", productId: "prod_bracelet", variantId: "v_brace_pnk", hardwareProductId: "prod_bracelet", hardwareVariantId: "v_brace_pnk", skuSnapshot: "BR-PNK", productName: "Bracelet", variantLabel: "Pink", personalization: "Mia", customArtPriceCents: null, customArtNotes: null, customArtFileUrl: null, quantity: 1, unitPrice: 3400, deviceId: null }],
  },
];

let orderSeq = 1049;
export function nextOrderNumber(): string { return `SL-${orderSeq++}`; }

export const getOrders = () => DEMO_ORDERS.sort((a, b) => +b.createdAt - +a.createdAt);
export const getOrderById = (id: string) => DEMO_ORDERS.find((o) => o.id === id);
