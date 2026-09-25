import Link from "next/link";
import { requireOperator } from "@/lib/operator";
import { createProduct } from "../actions";
export const dynamic = "force-dynamic";

const input = "w-full rounded-md border border-line bg-bg-raised px-3 py-2 text-sm";
const label = "grid gap-1.5 text-xs font-medium text-ink-soft";

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireOperator();
  const { error } = await searchParams;

  return (
    <div className="max-w-xl">
      <Link href="/operator/products" className="text-sm text-ink-soft hover:text-gold no-underline">← Products</Link>
      <h1 className="font-display text-2xl font-semibold tracking-tight mt-4 mb-6">New Product</h1>

      {error && (
        <div className="mb-5 rounded-lg border border-warn/40 bg-warn/5 px-4 py-3 text-sm text-warn">{error}</div>
      )}

      <form action={createProduct} className="rounded-xl border border-line bg-bg-raised p-5 grid gap-5">
        <label className={label}>Name (EN)<input className={input} name="name" required placeholder="SnapLink 3D Printed Bracelet"/></label>
        <label className={label}>Slug<input className={input} name="slug" required placeholder="bracelet-3d-printed"/></label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className={label}>Product type<select className={input} name="productType" defaultValue="bracelet">
            <option value="phone_plate">Phone Tag (phone_plate)</option>
            <option value="card">NFC Card (card)</option>
            <option value="stand">Table Stand (stand)</option>
            <option value="sticker">Sticker/tag (sticker)</option>
            <option value="bracelet">Bracelet (bracelet)</option>
            <option value="keychain">Keychain/charm (keychain)</option>
            <option value="bundle">Bundle/kit (bundle)</option>
          </select></label>
          <label className={label}>Starting price (cents)<input className={input} type="number" name="basePrice" required placeholder="9900"/></label>
        </div>
        <label className={label}>Short description (EN, optional)<input className={input} name="shortDescription" placeholder="A customizable NFC wearable made for everyday connection."/></label>
        <p className="text-xs text-ink-faint">Creates the product so it appears in the catalog. Full copy, media, variants, purpose tags, and bundle slots are managed from the product editor afterward.</p>
        <div className="flex items-center gap-3">
          <button className="rounded-full bg-ink text-bg px-6 py-3 text-sm font-medium hover:bg-gold transition-colors">Create Product</button>
          <Link href="/operator/products" className="text-sm text-ink-soft hover:text-ink no-underline">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
