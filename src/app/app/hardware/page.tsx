import Link from "next/link";
import { getDict } from "@/i18n/dict";
import { localeFrom, withLang } from "@/i18n/util";
import { listMyProfiles } from "@/lib/auth";
import { DEMO_DEVICES } from "@/db/demo";
import { Eyebrow, Glyph } from "@/components/primitives";
export const dynamic = "force-dynamic";

export default async function AppHardware({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const locale = localeFrom(await searchParams);
  const t = getDict(locale);
  const L = (h: string) => withLang(h, locale);
  const profiles = await listMyProfiles();

  return (
    <div>
      <Eyebrow>SL / Solo</Eyebrow>
      <div className="flex items-center justify-between gap-4 mt-3 mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t.app.hardware}</h1>
        <Link href={L("/hardware")} className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-gold no-underline">
          {t.hardware.buy}<Glyph.arrow className="w-4 h-4" />
        </Link>
      </div>
      <div className="flex flex-col gap-4">
        {profiles.map((p) => {
          const devices = DEMO_DEVICES[p.id] ?? [];
          return (
            <div key={p.id} className="rounded-xl border border-line bg-bg-raised p-5">
              <p className="font-medium">{p.displayName}</p>
              <p className="text-xs text-ink-faint font-mono mt-0.5">{p.type}{"destinationToken" in p && (p as {destinationToken?: string}).destinationToken ? ` · /d/${(p as {destinationToken?: string}).destinationToken}` : ""}</p>
              <div className="mt-3 flex flex-col gap-2">
                {devices.length === 0 && <p className="text-sm text-ink-faint">{locale === "es" ? "Sin dispositivos." : "No devices."}</p>}
                {devices.map((d, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-line bg-bg px-3.5 py-2.5">
                    <span className="text-sm">{d.label}</span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-ink-faint font-mono uppercase">
                      {d.type}<span className="w-1.5 h-1.5 rounded-full bg-ok" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
