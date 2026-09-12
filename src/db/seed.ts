import "dotenv/config";
import { db } from "./index";
import { products, productVariants, users } from "./schema";
import { DEMO_PRODUCTS } from "./commerce-demo";

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
  console.log("seed complete");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
