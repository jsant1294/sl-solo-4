import { db } from "@/db";
import { repo } from "@/db/repo";
import {
  getProducts as demoProducts, getProductBySlug as demoBySlug,
  getKidsProducts as demoKids, getOrders as demoOrders, getOrderById as demoOrderById,
} from "@/db/commerce-demo";
import { getDemoProfile, getProfileByDestination } from "@/db/demo";
import { PREVIEW_DEMO_TOKEN, PREVIEW_DEMO_USERNAME, previewDemoProfile, previewProfileDemoEnabled } from "@/lib/preview-profile-demo";

/**
 * DATA — read facade. Uses the DB repo when DATABASE_URL is set, else the
 * in-memory demo store. Keeps the db/demo branch out of pages/components.
 */
export const data = {
  async products(activeOnly = true) {
    return db ? repo.products.list(activeOnly) : demoProducts({ activeOnly });
  },
  async productBySlug(slug: string) {
    return db ? repo.products.bySlug(slug) : demoBySlug(slug);
  },
  async storefrontSections() {
    return db ? repo.storefront.list() : [];
  },
  async kidsProducts() {
    if (!db) return demoKids();
    const all = await repo.products.list(true);
    return all.filter((p) => (p.profileTypesSupported as string[]).includes("kids"));
  },
  async orders() {
    return db ? repo.orders.list() : demoOrders();
  },
  async orderById(id: string) {
    return db ? repo.orders.byId(id) : demoOrderById(id);
  },
  async profileByUsername(username: string) {
    if (previewProfileDemoEnabled() && username.toLowerCase() === PREVIEW_DEMO_USERNAME) return previewDemoProfile;
    return db ? repo.profiles.byUsername(username) : getDemoProfile(username);
  },
  async resolveDestination(token: string) {
    if (previewProfileDemoEnabled() && token === PREVIEW_DEMO_TOKEN) return previewDemoProfile;
    if (db) {
      const r = await repo.destinations.resolve(token);
      return r ? { ...r.profile, links: [] } : undefined;
    }
    return getProfileByDestination(token);
  },
};
