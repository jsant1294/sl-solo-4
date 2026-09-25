import Link from "next/link";
import { getDict } from "@/i18n/dict";
import { localeFrom, withLang } from "@/i18n/util";
import { getSessionUserId, listMyProfiles } from "@/lib/auth";
import { db } from "@/db";
import { repo } from "@/db/repo";
import { hasEntitlement, meetsEntitlementRequirement, ENTITLEMENT_SOLO_NETWORKING } from "@/lib/entitlements";
import { Eyebrow, Glyph } from "@/components/primitives";
export const dynamic = "force-dynamic";

const typeLabel = (locale: "en" | "es") => ({
  personal: locale === "es" ? "Personal" : "Personal",
  business: locale === "es" ? "Negocio" : "Business",
  kids: "Kids",
});
const statusLabel = (locale: "en" | "es") => ({
  draft: locale === "es" ? "Borrador" : "Draft",
  active: locale === "es" ? "Activo" : "Active",
  disabled: locale === "es" ? "Desactivado" : "Disabled",
});

export default async function MySnapLinks({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const locale = localeFrom(await searchParams);
  const t = getDict(locale);
  const es = locale === "es";
  const L = (h: string) => withLang(h, locale);
  const uid = await getSessionUserId();
  const profiles = await listMyProfiles();
  const devices = uid && db ? await repo.devices.byAssignedUser(uid) : [];
  const devicesByProfile = new Map<string, number>();
  for (const d of devices) if (d.profileId) devicesByProfile.set(d.profileId, (devicesByProfile.get(d.profileId) ?? 0) + 1);
  const needsActivationCount = devices.filter((d) => d.status === "assigned").length;
  const showNetworking = uid ? await hasEntitlement(uid, ENTITLEMENT_SOLO_NETWORKING) : false;
  let showResume = false;
  if (db && uid) {
    const resumeSettings = await repo.resumeSettings.get();
    const granted = resumeSettings.requiredEntitlement ? await hasEntitlement(uid, resumeSettings.requiredEntitlement) : false;
    showResume = resumeSettings.featureEnabled && meetsEntitlementRequirement(resumeSettings.requiredEntitlement, granted);
  }
  const showPreviewDemo = process.env.VERCEL_ENV !== "production";
  const TL = typeLabel(locale); const SL = statusLabel(locale);

  return (
    <div>
      <Eyebrow>{t.app.mysl}</Eyebrow>
      <div className="flex items-center justify-between gap-4 mt-3 mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t.app.mysl}</h1>
        <Link href={L("/app/create")}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink text-bg px-5 py-2.5 text-sm font-medium no-underline hover:bg-gold transition-colors whitespace-nowrap">
          + {locale === "es" ? "Crear" : "Create"}
        </Link>
      </div>

      <div className="mb-6 rounded-xl border border-line bg-bg-raised p-5">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-gold mb-4">{es ? "Tu SnapLink" : "Your SnapLink"}</p>
        <div className="grid gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-ink-soft">{es ? "Cuenta" : "Account"}</span>
            <span className="inline-flex items-center gap-1.5 text-ok"><Glyph.check className="w-4 h-4" />{es ? "Lista" : "Ready"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-soft">{es ? "Perfil" : "Profile"}</span>
            {profiles.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-ok"><Glyph.check className="w-4 h-4" />{es ? "Listo" : "Ready"}</span>
            ) : (
              <Link href={L("/app/create")} className="text-xs text-gold hover:underline no-underline">{es ? "Configurar" : "Set up"}</Link>
            )}
          </div>
          {devices.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-ink-soft">{es ? "Hardware" : "Hardware"}</span>
              {needsActivationCount > 0 ? (
                <Link href={L("/app/hardware")} className="inline-flex items-center gap-1 rounded-full bg-ink text-bg px-3.5 py-1.5 text-xs font-medium no-underline hover:bg-gold transition-colors">
                  {needsActivationCount} {es ? "listo para activar" : "ready to activate"}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-ok"><Glyph.check className="w-4 h-4" />{es ? "Activo" : "Active"}</span>
              )}
            </div>
          )}
          {showNetworking && (
            <div className="flex items-center justify-between">
              <span className="text-ink-soft">{es ? "Networking" : "Networking"}</span>
              <Link href={L("/app/networking")} className="inline-flex items-center gap-1.5 text-xs text-gold hover:underline no-underline">
                {es ? "Desbloqueado" : "Unlocked"} · {es ? "Abrir" : "Open"}
              </Link>
            </div>
          )}
          {showResume && (
            <div className="flex items-center justify-between">
              <span className="text-ink-soft">{es ? "Profesional" : "Professional"}</span>
              <Link href={L("/app/resume")} className="inline-flex items-center gap-1.5 text-xs text-gold hover:underline no-underline">
                {es ? "Desbloqueado" : "Unlocked"} · {es ? "Abrir" : "Open"}
              </Link>
            </div>
          )}
        </div>
      </div>

      {showPreviewDemo && (
        <div className="mb-5 rounded-xl border border-gold/40 bg-gold/5 p-5 sm:flex sm:items-center sm:justify-between sm:gap-5">
          <div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-gold">{locale === "es" ? "Muestra de vista previa" : "Preview showcase"}</p>
            <p className="mt-1 font-display text-xl font-medium">{locale === "es" ? "Perfil SOLO completo" : "Fully loaded SOLO profile"}</p>
            <p className="mt-1 text-sm text-ink-soft">{locale === "es" ? "Prueba cada contacto, red social, pago, compartir, VCF, enlace destacado e interacción Más." : "Test every contact, social, payment, share, VCF, favorite-link and More interaction."}</p>
          </div>
          <Link href={L("/u/solo-demo")} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-medium text-bg no-underline hover:bg-gold sm:mt-0">
            {locale === "es" ? "Abrir demo" : "Open demo"} <Glyph.arrow className="ml-2 h-4 w-4" />
          </Link>
        </div>
      )}

      {profiles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong p-12 text-center">
          <p className="font-display text-xl">{locale === "es" ? "Crea tu primer SnapLink" : "Create your first SnapLink"}</p>
          <p className="text-ink-soft mt-2 text-sm">{locale === "es" ? "Identidad, un toque, acción." : "Identity, one tap, action."}</p>
          <Link href={L("/app/create")} className="inline-flex mt-6 rounded-full bg-ink text-bg px-6 py-3 text-sm font-medium no-underline hover:bg-gold transition-colors">
            + {locale === "es" ? "Crear SnapLink" : "Create SnapLink"}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {profiles.map((p) => {
            const initials = p.displayName.split(" ").map((s) => s[0]).slice(0, 2).join("");
            const deviceCount = devicesByProfile.get(p.id) ?? 0;
            const dot = p.status === "active" ? "bg-ok" : p.status === "draft" ? "bg-warn" : "bg-ink-faint";
            return (
              <div key={p.id} className="rounded-xl border border-line bg-bg-raised p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full grid place-items-center font-display text-gold text-lg shrink-0"
                  style={{ background: p.accent ? `${p.accent}22` : "hsl(var(--bg-sunken))" }}>
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink truncate">{p.displayName}</p>
                  <p className="text-xs text-ink-faint mt-0.5">
                    <span className="font-mono">{TL[p.type as "personal" | "business" | "kids"] ?? p.type}</span>
                    <span className="mx-1.5">·</span>
                    <span className="inline-flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${dot}`} />{SL[p.status]}</span>
                    {deviceCount > 0 && <><span className="mx-1.5">·</span>{deviceCount} {locale === "es" ? "dispositivos" : "devices"}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {p.type !== "kids" && (
                    <Link href={L(`/u/${p.username}`)} className="text-xs text-ink-soft hover:text-gold no-underline hidden sm:inline">
                      {locale === "es" ? "Ver" : "View"}
                    </Link>
                  )}
                  <Link href={L(`/app/profiles/${p.id}`)}
                    className="inline-flex items-center gap-1 rounded-full border border-line-strong px-4 py-2 text-xs font-medium text-ink no-underline hover:border-gold hover:text-gold transition-colors">
                    {t.builder.edit}<Glyph.arrow className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
