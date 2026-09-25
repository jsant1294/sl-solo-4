import Link from "next/link";
import { getDict } from "@/i18n/dict";
import { localeFrom, withLang } from "@/i18n/util";
import { getSessionUserId, listMyProfiles } from "@/lib/auth";
import { db } from "@/db";
import { repo } from "@/db/repo";
import { Eyebrow, Glyph } from "@/components/primitives";
export const dynamic = "force-dynamic";

/**
 * Real customer hardware — reads repo.devices.byAssignedUser, the same table the operator
 * fulfillment/assignment workflow writes to (never an in-memory design-time fixture, which is
 * not production truth). "Assigned" devices are physically shipped but
 * not yet claimed by the customer (needs activation); "paired" devices are live.
 */
export default async function AppHardware({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const locale = localeFrom(await searchParams);
  const t = getDict(locale);
  const L = (h: string) => withLang(h, locale);
  const es = locale === "es";
  const uid = await getSessionUserId();
  const profiles = await listMyProfiles();
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const devices = uid && db ? await repo.devices.byAssignedUser(uid) : [];
  const needsActivation = devices.filter((d) => d.status === "assigned");
  const active = devices.filter((d) => d.status === "paired");

  return (
    <div>
      <Eyebrow>SL / Solo</Eyebrow>
      <div className="flex items-center justify-between gap-4 mt-3 mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t.app.hardware}</h1>
        <Link href={L("/hardware")} className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-gold no-underline">
          {t.hardware.buy}<Glyph.arrow className="w-4 h-4" />
        </Link>
      </div>

      {devices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong p-12 text-center">
          <p className="font-display text-xl">{es ? "Aún no tienes hardware" : "No hardware yet"}</p>
          <p className="text-ink-soft mt-2 text-sm">
            {es ? "Cuando compres un SnapLink físico y lo enviemos, aparecerá aquí para que lo actives." : "Once you buy a physical SnapLink and we ship it, it'll show up here for you to activate."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {needsActivation.length > 0 && (
            <section>
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-gold mb-3">{es ? "Necesita activación" : "Needs activation"}</p>
              <div className="flex flex-col gap-3">
                {needsActivation.map((d) => (
                  <div key={d.id} className="rounded-xl border border-line bg-bg-raised p-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{d.label ?? d.type}</p>
                      <p className="text-xs text-ink-faint mt-0.5">{es ? "Estado: Listo para activar" : "Status: Ready to activate"}</p>
                    </div>
                    <Link href={L(`/activate?device=${encodeURIComponent(d.deviceCode)}`)}
                      className="inline-flex items-center gap-1 rounded-full bg-ink text-bg px-4 py-2 text-xs font-medium no-underline hover:bg-gold transition-colors shrink-0">
                      {es ? "Activar" : "Activate"}<Glyph.arrow className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {active.length > 0 && (
            <section>
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ok mb-3">{es ? "Activo" : "Active"}</p>
              <div className="flex flex-col gap-3">
                {active.map((d) => {
                  const profile = d.profileId ? profileById.get(d.profileId) : undefined;
                  return (
                    <div key={d.id} className="rounded-xl border border-line bg-bg-raised p-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{d.label ?? d.type}</p>
                        <p className="text-xs text-ink-faint mt-0.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-ok" />{es ? "Estado: Activo" : "Status: Active"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={L(`/t/${d.deviceCode}`)} className="text-xs text-ink-soft hover:text-gold no-underline">
                          {es ? "Probar toque" : "Test Tap"}
                        </Link>
                        {profile && (
                          <Link href={L(`/u/${profile.username}`)}
                            className="inline-flex items-center gap-1 rounded-full border border-line-strong px-4 py-2 text-xs font-medium text-ink no-underline hover:border-gold hover:text-gold transition-colors">
                            {es ? "Ver perfil" : "View Profile"}
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
