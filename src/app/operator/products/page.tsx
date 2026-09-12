import Link from "next/link";
import { dollars } from "@/db/commerce-demo";
import { data } from "@/lib/data";
export const dynamic = "force-dynamic";

export default async function OperatorProducts() {
  const products = await data.products(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Products</h1>
        <span className="text-xs text-ink-faint font-mono">Neon-backed catalog</span>
      </div>
      <div className="rounded-xl border border-line overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-sunken text-ink-faint">
            <tr>
              <th className="text-left font-medium px-4 py-3">Product</th>
              <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Type</th>
              <th className="text-left font-medium px-4 py-3">Price</th>
              <th className="text-left font-medium px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-line hover:bg-bg-raised">
                <td className="px-4 py-3 font-medium"><Link href={`/operator/products/${p.id}`} className="text-ink hover:text-gold no-underline">{p.name}</Link>{p.featured && <span className="ml-2 text-[0.6rem] uppercase tracking-widest text-gold border border-gold/40 rounded-sm px-1.5 py-0.5">Featured</span>}</td>
                <td className="px-4 py-3 hidden sm:table-cell text-ink-soft font-mono text-xs">{p.productType}</td>
                <td className="px-4 py-3 font-mono">{dollars(p.basePrice)}</td>
                <td className="px-4 py-3"><span className={p.active ? "text-ok" : "text-ink-faint"}>{p.active ? "Active" : "Hidden"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-faint mt-4">Open a product to edit storefront copy, variants, merchandising, and media.</p>
    </div>
  );
}
