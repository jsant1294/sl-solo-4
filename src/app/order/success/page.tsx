import Link from "next/link";
import { localeFrom, withLang } from "@/i18n/util";
import { ClearPaidCart } from "./clear-paid-cart";
import { dollars } from "@/db/commerce-demo";
import { data } from "@/lib/data";
import { SiteHeader } from "@/components/site-chrome";
import { Section, Glyph } from "@/components/primitives";
export const dynamic = "force-dynamic";

export default async function OrderSuccess({ searchParams }: {
  searchParams: Promise<{ lang?: string; order?: string; session_id?: string; simulated?: string }>;
}) {
  const sp = await searchParams;
  const locale = localeFrom(sp);
  const L = (href: string) => withLang(href, locale);
  const es = locale === "es";
  const candidate = sp.order ? await data.orderById(sp.order) : undefined;
  const simulated = !process.env.STRIPE_SECRET_KEY && sp.simulated === "1";
  const sessionMatches = Boolean(candidate && (
    (sp.session_id && candidate.stripeSessionId === sp.session_id) || simulated
  ));
  const order = sessionMatches ? candidate : undefined;
  const paid = order?.paymentState === "paid";
  const pending = order?.paymentState === "pending";

  const title = paid
    ? (es ? "¡Pedido confirmado!" : "Order confirmed!")
    : pending
      ? (es ? "Pago en proceso" : "Payment processing")
      : (es ? "No pudimos confirmar el pedido" : "We could not confirm this order");

  return (
    <>
      {paid && order && sp.session_id && <ClearPaidCart orderId={order.id} sessionId={sp.session_id} />}
      <SiteHeader locale={locale} />
      <Section className="pt-20 pb-24 max-w-lg text-center">
        <div className={`w-16 h-16 rounded-full grid place-items-center mx-auto ${paid ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn"}`}>
          <Glyph.check className="w-8 h-8" />
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight mt-6">{title}</h1>
        {order ? (
          <>
            <p className="text-ink-soft mt-3">{es ? "Pedido" : "Order"} <span className="font-mono text-ink">{order.orderNumber}</span> · {dollars(order.total)}</p>
            <p className="text-ink-soft mt-4 text-sm max-w-sm mx-auto">
              {paid
                ? (es ? "Prepararemos tu SnapLink y enviaremos instrucciones cuando se envíe." : "We'll prepare your SnapLink and send activation instructions when it ships.")
                : (es ? "Te enviaremos la confirmación cuando Stripe complete el pago." : "We'll send confirmation after Stripe completes the payment.")}
            </p>
          </>
        ) : (
          <p className="text-ink-soft mt-3">{es ? "Revisa tu correo o vuelve a intentarlo desde el carrito." : "Check your email or try again from your cart."}</p>
        )}
        <div className="mt-8 flex gap-3 justify-center">
          <Link href={L("/hardware")} className="rounded-full border border-line-strong px-5 py-2.5 text-sm no-underline text-ink hover:border-gold hover:text-gold transition-colors">
            {es ? "Seguir comprando" : "Keep shopping"}
          </Link>
          {paid && <Link href={L("/join")} className="rounded-full bg-ink text-bg px-5 py-2.5 text-sm font-medium no-underline hover:bg-gold transition-colors">
            {es ? "Crear tu perfil" : "Create your profile"}
          </Link>}
        </div>
      </Section>
    </>
  );
}
