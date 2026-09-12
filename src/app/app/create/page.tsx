import { getDict } from "@/i18n/dict";
import { localeFrom } from "@/i18n/util";
import { Eyebrow } from "@/components/primitives";
import { CreateFlow } from "./create-flow";
export const dynamic = "force-dynamic";

export default async function CreatePage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const locale = localeFrom(await searchParams);
  const t = getDict(locale);
  return (
    <div>
      <Eyebrow>SL / Solo</Eyebrow>
      <h1 className="font-display text-3xl font-semibold tracking-tight mt-3 mb-2">
        {locale === "es" ? "¿Qué estás creando?" : "What are you creating?"}
      </h1>
      <p className="text-ink-soft mb-8">{locale === "es" ? "Elige el tipo de SnapLink." : "Choose the kind of SnapLink."}</p>
      <CreateFlow locale={locale} />
    </div>
  );
}
