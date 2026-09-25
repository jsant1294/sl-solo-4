import Link from "next/link";
import { getDict } from "@/i18n/dict";
import { localeFrom, withLang } from "@/i18n/util";
import { readCart, priceCart } from "@/lib/cart";
import { dollars } from "@/db/commerce-demo";
import { SiteHeader } from "@/components/site-chrome";
import { Section, Glyph } from "@/components/primitives";
import { ProductShot } from "@/components/product-shot";
import { CartControls } from "./cart-controls";
export const dynamic = "force-dynamic";

export default async function Cart({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const locale = localeFrom(await searchParams);
  const t = getDict(locale);
  const L = (h: string) => withLang(h, locale);
  const cart = await readCart();
  const { rows, subtotal, count } = await priceCart(cart);
  const es = locale === "es";

  return (
    <>
      <SiteHeader locale={locale} />
      <Section className="pt-14 pb-24 max-w-3xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-8">{es ? "Carrito" : "Cart"}</h1>
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong p-12 text-center">
            <p className="font-display text-xl">{es ? "Tu carrito está vacío" : "Your cart is empty"}</p>
            <Link href={L("/hardware")} className="inline-flex mt-6 rounded-full bg-ink text-bg px-6 py-3 text-sm font-medium no-underline hover:bg-gold transition-colors">
              {es ? "Ver hardware" : "Shop hardware"}
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
            <div className="flex flex-col gap-3">
              {rows.map((r, i) => (
                <div key={i} className="flex gap-4 rounded-xl border border-line bg-bg-raised p-4">
                  <div className="w-20 h-20 rounded-lg border border-line overflow-hidden shrink-0">
                    <ProductShot productType={r.productType} color="#14120F" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {r.bundleGroupId && (
                      <p className="text-[0.65rem] uppercase tracking-widest text-gold mb-1">{es ? "Parte del Kit de Networking" : "Part of the Networking Kit"}</p>
                    )}
                    <p className="font-medium">{r.productName}</p>
                    <p className="text-xs text-ink-faint">{r.variantLabel}{r.personalization ? ` · "${r.personalization}"` : ""}</p>
                    <p className="font-mono text-sm text-gold mt-1">{dollars(r.unitPrice)}</p>
                    <CartControls index={i} quantity={r.quantity} locale={locale} />
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-line bg-bg-sunken p-6 lg:sticky lg:top-24">
              <div className="flex justify-between text-sm mb-2"><span className="text-ink-soft">{es ? "Subtotal" : "Subtotal"} ({count})</span><span className="font-mono">{dollars(subtotal)}</span></div>
              <p className="text-xs text-ink-faint mb-4">{es ? "Envío calculado al pagar." : "Shipping calculated at checkout."}</p>
              <Link href={L("/checkout")} className="flex items-center justify-center gap-2 rounded-full bg-ink text-bg py-3.5 font-medium no-underline hover:bg-gold transition-colors">
                {es ? "Pagar" : "Checkout"}<Glyph.arrow className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </Section>
    </>
  );
}
