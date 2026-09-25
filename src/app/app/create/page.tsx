import { localeFrom } from "@/i18n/util";
import { safeAppRedirect } from "@/lib/safe-redirect";
import { Eyebrow } from "@/components/primitives";
import { CreateFlow } from "./create-flow";
export const dynamic = "force-dynamic";

export default async function CreatePage({ searchParams }: { searchParams: Promise<{ lang?: string; next?: string }> }) {
  const sp = await searchParams;
  const locale = localeFrom(sp);
  // Optional return destination (e.g. hardware activation sends the customer here first when
  // they have no profile yet, then wants them back). Validated the same way sign-in validates
  // its own `next` param — never trusted as an arbitrary open redirect.
  const next = sp.next ? safeAppRedirect(sp.next, "") : "";
  return (
    <div>
      <Eyebrow>SL / Solo</Eyebrow>
      <h1 className="font-display text-3xl font-semibold tracking-tight mt-3 mb-2">
        {locale === "es" ? "¿Qué estás creando?" : "What are you creating?"}
      </h1>
      <p className="text-ink-soft mb-8">{locale === "es" ? "Elige el tipo de SnapLink." : "Choose the kind of SnapLink."}</p>
      <CreateFlow locale={locale} next={next || undefined} />
    </div>
  );
}
