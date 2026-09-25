import "dotenv/config";
import { db } from "./index";
import { products, productVariants, users } from "./schema";
import { DEMO_PRODUCTS } from "./commerce-demo";
import { repo } from "./repo";
import { ENTITLEMENT_SOLO_NETWORKING } from "@/lib/entitlements";

/**
 * Seed the real DB with the product catalog + an operator user.
 * Run: npm run db:seed  (requires DATABASE_URL)
 */
async function main() {
  if (!db) throw new Error("DATABASE_URL not set");

  // Operator user — set OPERATOR_EMAIL, then sign in with magic link to use it.
  const opEmail = process.env.OPERATOR_EMAIL;
  if (opEmail) {
    await db.insert(users).values({ email: opEmail, name: "Operator", role: "operator" })
      .onConflictDoNothing();
    console.log(`operator user ensured: ${opEmail}`);
  }

  for (const p of DEMO_PRODUCTS) {
    const { variants, ...prod } = p;
    await db.insert(products).values({
      id: prod.id, slug: prod.slug, name: prod.name,
      shortDescription: prod.shortDescription, fullDescription: prod.fullDescription,
      basePrice: prod.basePrice, compareAtPrice: prod.compareAtPrice,
      productType: prod.productType, active: prod.active, featured: prod.featured,
      sortOrder: prod.sortOrder, colors: prod.colors,
      personalizationAvailable: prod.personalizationAvailable,
      inventoryMode: prod.inventoryMode, stockStatus: prod.stockStatus,
      profileTypesSupported: prod.profileTypesSupported,
      activationInstructions: prod.activationInstructions,
      galleryImageIds: [],
    }).onConflictDoNothing();

    for (const v of variants) {
      await db.insert(productVariants).values({
        id: v.id, productId: v.productId, label: v.label, color: v.color,
        priceDelta: v.priceDelta, sku: v.sku, stockStatus: v.stockStatus, sortOrder: v.sortOrder,
      }).onConflictDoNothing();
    }
    console.log(`seeded product: ${prod.name} (${variants.length} variants)`);
  }

  // — Networking Kit bundle + wearable material variants + Pet Charm (additive, idempotent) —
  await db.insert(productVariants).values([
    { id: "v_brace_3dp", productId: "prod_bracelet", label: "3D Printed", color: null, priceDelta: 0, sku: "BR-3DP", stockStatus: "in_stock", sortOrder: 3 },
    { id: "v_brace_leather", productId: "prod_bracelet", label: "Leather", color: null, priceDelta: 500, sku: "BR-LTHR", stockStatus: "in_stock", sortOrder: 4 },
  ]).onConflictDoNothing();
  console.log("seeded bracelet variants: 3D Printed, Leather");

  await db.insert(products).values({
    id: "prod_pet_charm", slug: "pet-charm", name: "Pet Charm", productType: "keychain",
    basePrice: 1900, sortOrder: 7, active: true,
    shortDescription: "A tap-to-contact tag for a collar.",
    fullDescription: "A durable NFC + QR charm for a pet's collar. A tap or scan opens a safe contact page so a stranger can reach you if your pet wanders — no GPS, no subscription.",
    colors: ["Steel"], profileTypesSupported: ["personal"],
    activationInstructions: "Attach to a collar, then tap the charm to any phone to claim it.",
    galleryImageIds: [],
  }).onConflictDoNothing();
  await db.insert(productVariants).values([
    { id: "v_pet_steel", productId: "prod_pet_charm", label: "Steel", color: "#888780", priceDelta: 0, sku: "PET-STL", stockStatus: "in_stock", sortOrder: 0 },
  ]).onConflictDoNothing();
  console.log("seeded product: Pet Charm");

  await db.insert(products).values({
    id: "prod_networking_kit", slug: "networking-kit", name: "SnapLink Networking Kit", nameEs: "Kit de Networking SnapLink",
    productType: "bundle", basePrice: 9900, featured: true, sortOrder: 0, active: true,
    shortDescription: "Tap to share. Scan to connect.",
    shortDescriptionEs: "Toca para compartir. Escanea para conectar.",
    fullDescription: "Three smart touchpoints, one professional identity. A Phone Tag, an NFC Card, and your choice of SnapLink Bracelet — every one resolves to the same SOLO profile. Includes the Professional Resume, Business Card Scanner, and lead capture. No monthly fee.",
    fullDescriptionEs: "Tres puntos de contacto inteligentes, una identidad profesional. Un Phone Tag, una NFC Card y el brazalete SnapLink que elijas — los tres apuntan al mismo perfil SOLO. Incluye Currículum profesional, Escáner de tarjetas y captura de contactos. Sin cuota mensual.",
    colors: [], profileTypesSupported: ["professional", "business"],
    grantsEntitlement: ENTITLEMENT_SOLO_NETWORKING,
    activationInstructions: "Claim all three pieces to the same SOLO profile from Activate.",
    galleryImageIds: [],
  }).onConflictDoNothing();
  await repo.products.replaceBundleSlots("prod_networking_kit", [
    { slotKey: "phone_tag", label: "Phone Tag", quantity: 1, allowCustomerChoice: false, options: [{ componentProductId: "prod_plate", componentVariantId: "v_plate_obs" }] },
    { slotKey: "nfc_card", label: "NFC Card", quantity: 1, allowCustomerChoice: false, options: [{ componentProductId: "prod_card", componentVariantId: "v_card_obs" }] },
    { slotKey: "wearable", label: "Wearable", quantity: 1, allowCustomerChoice: true, options: [
      { componentProductId: "prod_bracelet", componentVariantId: "v_brace_3dp" },
      { componentProductId: "prod_bracelet", componentVariantId: "v_brace_leather" },
    ] },
  ]);
  console.log("seeded product: SnapLink Networking Kit (bundle, 3 slots)");

  console.log("seed complete");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
