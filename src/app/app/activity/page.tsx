import { getDict } from "@/i18n/dict";
import { localeFrom } from "@/i18n/util";
import { DEMO_ACTIVITY } from "@/db/demo";
import { Eyebrow } from "@/components/primitives";
export const dynamic = "force-dynamic";

export default async function Activity({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const locale = localeFrom(await searchParams);
  const t = getDict(locale);
  const a = DEMO_ACTIVITY;
  const max = Math.max(...a.trend);

  const Row = ({ label, d }: { label: string; d: { tap: number; qr_scan: number; profile_view: number; contact: number } }) => (
    <div className="grid grid-cols-4 gap-3">
      <Stat n={d.profile_view} label={t.activity.views} />
      <Stat n={d.tap} label={t.activity.taps} />
      <Stat n={d.qr_scan} label={t.activity.scans} />
      <Stat n={d.contact} label={t.activity.contacts} />
    </div>
  );

  return (
    <div>
      <Eyebrow>SL / Solo</Eyebrow>
      <h1 className="font-display text-3xl font-semibold tracking-tight mt-3 mb-8">{t.activity.title}</h1>

      <p className="font-mono text-xs uppercase tracking-widest text-ink-faint mb-3">{t.activity.today}</p>
      <Row label={t.activity.today} d={a.today} />

      <p className="font-mono text-xs uppercase tracking-widest text-ink-faint mb-3 mt-8">{t.activity.d30}</p>
      <div className="rounded-xl border border-line bg-bg-raised p-5">
        <div className="flex items-end gap-1 h-24">
          {a.trend.map((v, i) => (
            <div key={i} className="flex-1 bg-gold/70 rounded-sm" style={{ height: `${(v / max) * 100}%` }} />
          ))}
        </div>
      </div>
      <div className="mt-4"><Row label={t.activity.d30} d={a.d30} /></div>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-lg border border-line bg-bg-raised p-4">
      <p className="font-display text-2xl font-semibold">{n}</p>
      <p className="text-xs text-ink-faint mt-1">{label}</p>
    </div>
  );
}
