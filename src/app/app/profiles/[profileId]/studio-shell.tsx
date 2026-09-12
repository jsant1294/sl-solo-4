"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { getDict, type Locale } from "@/i18n/dict";
import type { Profile, ProfileLink } from "@/db/schema";
import { withProfileExperience, type KidsData, type StoredContactChannel, type StoredPaymentMethod } from "@/lib/profile-data";
import { ProfileRenderer } from "@/components/renderers";
import { updateProfileFields, updateProfileData, setProfileStatus, claimUsername } from "../../actions";
import { IdentitySection, AvatarSection, ContactSection, ContactMessagingSection, PaymentMethodsSection, SharingPreviewSection, LinksSection, AppearanceSection, DevicesSection, KidsGuardiansSection, KidsEmergencySection } from "./sections";
import { PublishBar } from "./publish-bar";
import { GrowWithSnapLink } from "@/components/grow-with-snaplink";

type StudioProfile = Pick<Profile,
  "id" | "type" | "status" | "username" | "displayName" | "headline" | "bio" |
  "avatarUrl" | "phone" | "email" | "website" | "location" | "theme" | "accent" | "locale" | "data"
> & { destinationToken: string; links: ProfileLink[]; contactChannels: StoredContactChannel[]; primaryContactAction: string | null; shareTitle: string | null; shareDescription: string | null; shareImageUrl: string | null; favoriteLinkIds: string[]; paymentMethods: StoredPaymentMethod[] };

type SaveState = "idle" | "saving" | "saved" | "error";

export function StudioShell({
  locale, profile: initial, devices,
}: { locale: Locale; profile: StudioProfile; devices: { id: string; label: string; type: string; status: string; deviceCode: string }[] }) {
  const t = getDict(locale);
  const [p, setP] = useState<StudioProfile>(initial);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [save, setSave] = useState<SaveState>("idle");
  const [dirty, setDirty] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const isKids = p.type === "kids";

  // Warn on navigation with unsaved changes.
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  // Debounced autosave of scalar fields.
  const queueFieldSave = useCallback((next: StudioProfile) => {
    setDirty(true); setSave("saving");
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      const res = await updateProfileFields(next.id, {
        displayName: next.displayName, headline: next.headline ?? "", bio: next.bio ?? "",
        phone: next.phone ?? "", email: next.email ?? "", website: next.website ?? "",
        location: next.location ?? "", theme: next.theme, accent: next.accent ?? "",
      });
      setSave(res.ok ? "saved" : "error"); setDirty(false);
    }, 700);
  }, []);

  const patch = useCallback((fields: Partial<StudioProfile>) => {
    setP((prev) => { const next = { ...prev, ...fields }; queueFieldSave(next); return next; });
  }, [queueFieldSave]);

  const saveData = useCallback(async (data: KidsData | Record<string, unknown>) => {
    setP((prev) => ({ ...prev, data: data as StudioProfile["data"] }));
    setSave("saving");
    const res = await updateProfileData(p.id, data);
    setSave(res.ok ? "saved" : "error");
    if (!res.ok) console.warn("data save:", res.error);
  }, [p.id]);

  async function changeStatus(status: "draft" | "active" | "disabled") {
    const res = await setProfileStatus(p.id, status);
    if (res.ok) setP((prev) => ({ ...prev, status }));
  }

  async function changeUsername(raw: string): Promise<string | null> {
    const res = await claimUsername(p.id, raw);
    if (res.ok) { setP((prev) => ({ ...prev, username: raw.toLowerCase() })); return null; }
    return res.error;
  }

  // Build a preview profile object the real renderer understands.
  const previewProfile = { ...p, data: withProfileExperience(p.data, { primaryContactAction: p.primaryContactAction, shareTitle: p.shareTitle, shareDescription: p.shareDescription, shareImageUrl: p.shareImageUrl, favoriteLinkIds: p.favoriteLinkIds, paymentMethods: p.paymentMethods }), active: true, userId: "", createdAt: new Date() } as unknown as Profile;

  return (
    <div className="-mt-8">
      {/* Studio header */}
      <div className="sticky top-0 z-20 -mx-5 px-5 py-3 bg-bg/90 backdrop-blur-md border-b border-line flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-gold">{locale === "es" ? "Estudio de perfil" : "Profile Studio"}</p>
          <p className="font-display text-lg font-medium truncate">{p.displayName || (locale === "es" ? "Sin título" : "Untitled")}</p>
        </div>
        <SaveBadge state={save} locale={locale} />
      </div>

      {/* Mobile tab toggle */}
      <div className="lg:hidden flex gap-1 mt-4 p-1 rounded-full bg-bg-sunken w-fit">
        {(["edit", "preview"] as const).map((x) => (
          <button key={x} onClick={() => setTab(x)}
            className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === x ? "bg-bg-raised text-ink shadow-sm" : "text-ink-soft"}`}>
            {x === "edit" ? t.builder.edit : t.builder.preview}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_minmax(320px,380px)] gap-8 mt-6 items-start">
        {/* EDITOR */}
        <div className={`${tab === "preview" ? "hidden lg:block" : ""} flex flex-col gap-4 pb-32`}>
          <IdentitySection locale={locale} p={p} patch={patch} isKids={isKids}
            onData={saveData} changeUsername={changeUsername} />
          {!isKids && <AvatarSection locale={locale} profileId={p.id} avatarUrl={p.avatarUrl} displayName={p.displayName} onChange={(avatarUrl) => setP((prev) => ({ ...prev, avatarUrl }))}/>}

          {isKids ? (
            <>
              <KidsGuardiansSection locale={locale} data={p.data as KidsData} onSave={saveData} />
              <KidsEmergencySection locale={locale} data={p.data as KidsData} onSave={saveData} />
              <ContactMessagingSection locale={locale} profile={p} channels={p.contactChannels} isKids onChange={(contactChannels, primaryContactAction) => setP((prev) => ({ ...prev, contactChannels, primaryContactAction }))} />
            </>
          ) : (
            <>
              <ContactSection locale={locale} p={p} patch={patch} />
              <ContactMessagingSection locale={locale} profile={p} channels={p.contactChannels} isKids={false} onChange={(contactChannels, primaryContactAction) => setP((prev) => ({ ...prev, contactChannels, primaryContactAction }))} />
              <LinksSection locale={locale} profileId={p.id} initialLinks={p.links} favoriteLinkIds={p.favoriteLinkIds} onChange={(links) => setP((prev) => ({ ...prev, links }))} onFavoritesChange={(favoriteLinkIds) => setP((prev) => ({ ...prev, favoriteLinkIds }))}/>
              <PaymentMethodsSection locale={locale} profileId={p.id} initialMethods={p.paymentMethods} onChange={(paymentMethods) => setP((prev) => ({ ...prev, paymentMethods }))}/>
            </>
          )}

          <AppearanceSection locale={locale} p={p} patch={patch} isKids={isKids} />
          <SharingPreviewSection locale={locale} profile={p} onChange={(fields) => setP((prev) => ({ ...prev, ...fields }))} />
          <DevicesSection locale={locale} devices={devices} token={p.destinationToken} username={p.username} />

          {p.type === "business" && <GrowWithSnapLink locale={locale} />}
        </div>

        {/* LIVE PREVIEW — real renderer in a phone frame */}
        <div className={`${tab === "edit" ? "hidden lg:block" : ""} lg:sticky lg:top-24`}>
          <div className="mx-auto w-[320px] rounded-[2.4rem] border border-line-strong bg-bg-raised shadow-lg p-3">
            <div className="rounded-[1.9rem] overflow-hidden border border-line max-h-[620px] overflow-y-auto">
              <div className="scale-[0.92] origin-top">
                <ProfileRenderer profile={previewProfile} links={p.links} contactChannels={p.contactChannels} locale={p.locale} />
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-ink-faint mt-3 font-mono">{t.builder.livePreview}</p>
        </div>
      </div>

      <PublishBar locale={locale} status={p.status} onChange={changeStatus}
        username={p.username} type={p.type} token={p.destinationToken} />
    </div>
  );
}

function SaveBadge({ state, locale }: { state: SaveState; locale: Locale }) {
  const map = {
    idle: { text: "", cls: "" },
    saving: { text: locale === "es" ? "Guardando…" : "Saving…", cls: "text-ink-faint" },
    saved: { text: locale === "es" ? "Guardado ✓" : "Saved ✓", cls: "text-ok" },
    error: { text: locale === "es" ? "Error al guardar" : "Save failed", cls: "text-err" },
  }[state];
  if (!map.text) return <span className="text-xs text-ink-faint">—</span>;
  return <span className={`text-xs font-medium ${map.cls} whitespace-nowrap`}>{map.text}</span>;
}
