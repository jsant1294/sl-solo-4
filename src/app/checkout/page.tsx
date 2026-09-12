import { redirect } from "next/navigation";
import { getDict } from "@/i18n/dict";
import { localeFrom, withLang } from "@/i18n/util";
import { readCart, priceCart } from "@/lib/cart";
import { dollars } from "@/db/commerce-demo";
import { SiteHeader } from "@/components/site-chrome";
import { Section } from "@/components/primitives";
import { CheckoutForm } from "./checkout-form";
export const dynamic = "force-dynamic";

export default async function Checkout({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const locale = localeFrom(await searchParams);
  const t = getDict(locale);
  const cart = await readCart();
  if (cart.length === 0) redirect(withLang("/cart", locale));
  const { rows, subtotal, count } = await priceCart(cart);
  const es = locale === "es";

  return (
    <>
      <SiteHeader locale={locale} />
      <Section className="pt-14 pb-24 max-w-3xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight mb-8">{es ? "Pagar" : "Checkout"}</h1>
        <div className="grid lg:grid-cols-[1fr_300px] gap-8 items-start">
          <CheckoutForm locale={locale} />
          <div className="rounded-xl border border-line bg-bg-sunken p-6 lg:sticky lg:top-24">
            <p className="font-mono text-[0.7rem] uppercase tracking-widest text-ink-faint mb-3">{es ? "Resumen" : "Summary"}</p>
            {rows.map((r, i) => (
              <div key={i} className="flex justify-between text-sm mb-1.5">
                <span className="text-ink-soft truncate mr-2">{r.quantity}× {r.productName}</span>
                <span className="font-mono">{dollars(r.lineTotal)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm mt-3 pt-3 border-t border-line font-medium">
              <span>{es ? "Total" : "Total"}</span><span className="font-mono">{dollars(subtotal)}</span>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
