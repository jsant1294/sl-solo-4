import Link from "next/link";
import { notFound } from "next/navigation";
import { localeFrom, withLang } from "@/i18n/util";
import { getNetworkingPageAccess } from "../actions";
import { ScanFlow } from "../scan-flow";
export const dynamic = "force-dynamic";

export default async function ScanCard({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const locale = localeFrom({ lang });
  const es = locale === "es";

  const access = await getNetworkingPageAccess();
  if (!access.ok) notFound();
  if (!access.settings.cardScannerEnabled) notFound();

  return (
    <div className="max-w-xl">
      <Link href={withLang("/app/networking", locale)} className="text-sm text-ink-soft hover:text-gold no-underline">← {es ? "Networking" : "Networking"}</Link>
      <h1 className="font-display text-3xl font-semibold mt-4 mb-6">{es ? "Escanear tarjeta de presentación" : "Scan a Business Card"}</h1>
      <ScanFlow locale={locale} />
    </div>
  );
}
