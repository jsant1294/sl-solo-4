"use client";
import { useState } from "react";
import { getDict, type Locale } from "@/i18n/dict";
import type { Profile, ProfileLink } from "@/db/schema";
import type { KidsData, Guardian, StoredContactChannel, StoredPaymentMethod } from "@/lib/profile-data";
import { Glyph } from "@/components/primitives";
import { createLink, updateLink, deleteLink, reorderLinks, uploadAvatar, removeAvatar, updateContactChannels, updateFavoriteLinks, updatePaymentMethods, updateShareSettings, uploadShareImage, removeShareImage } from "../../actions";
import { PAYMENT_TYPES, normalizePaymentMethod } from "@/lib/payment-methods";
import { CONTACT_TYPES, normalizeContactHref, type ContactType } from "@/lib/contact-channels";

/* — Section shell — */
export function Card({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="rounded-xl border border-line bg-bg-raised p-5">
      <h2 className="font-display text-lg font-medium">{title}</h2>
      {hint && <p className="text-xs text-ink-faint mt-1">{hint}</p>}
      <div className="mt-4 flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-ink-soft">{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-line bg-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-gold outline-none" />
    </label>
  );
}

type P = Pick<Profile, "displayName" | "headline" | "bio" | "phone" | "email" | "website" | "location" | "theme" | "accent" | "username" | "type" | "data">;
type Patch = (f: Partial<Record<string, unknown>>) => void;

/* — IDENTITY — adapts to type — */
export function IdentitySection({
  locale, p, patch, isKids, onData, changeUsername,
}: {
  locale: Locale; p: P; patch: Patch; isKids: boolean;
  onData: (d: KidsData) => void; changeUsername: (raw: string) => Promise<string | null>;
}) {
  const t = getDict(locale);
  const [uname, setUname] = useState(p.username);
  const [unameErr, setUnameErr] = useState<string | null>(null);

  if (isKids) {
    const k = p.data as KidsData;
    return (
      <Card title={t.builder.identity} hint={locale === "es" ? "Solo nombre. Sin apellido, dirección, escuela ni cumpleaños." : "First name only. No last name, address, school, or birthday."}>
        <Field label={locale === "es" ? "Nombre del niño" : "Child's first name"} value={k.firstName ?? ""}
          onChange={(v) => onData({ ...k, firstName: v })} />
        <Field label={locale === "es" ? "Mensaje de ayuda" : "Help message"} value={k.helpMessage ?? ""}
          onChange={(v) => onData({ ...k, helpMessage: v })}
          placeholder={locale === "es" ? "Si necesito ayuda, contacta a mi tutor." : "If I need help, contact my guardian."} />
      </Card>
    );
  }

  const nameLabel = p.type === "business" ? (locale === "es" ? "Nombre del negocio" : "Business name") : t.builder.displayName;
  return (
    <Card title={t.builder.identity}>
      <Field label={nameLabel} value={p.displayName ?? ""} onChange={(v) => patch({ displayName: v })} />
      <Field label={t.builder.headline} value={p.headline ?? ""} onChange={(v) => patch({ headline: v })} />
      <label className="block">
        <span className="text-xs text-ink-soft">{t.builder.bio}</span>
        <textarea value={p.bio ?? ""} onChange={(e) => patch({ bio: e.target.value })} rows={3}
          className="mt-1 w-full rounded-lg border border-line bg-bg px-3.5 py-2.5 text-sm text-ink resize-none focus:border-gold outline-none" />
      </label>

      {/* username / public URL */}
      <div className="pt-2 border-t border-line">
        <span className="text-xs text-ink-soft">{locale === "es" ? "Tu SnapLink" : "Your SnapLink"}</span>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1 flex items-center rounded-lg border border-line bg-bg overflow-hidden focus-within:border-gold">
            <span className="pl-3 pr-1 text-ink-faint font-mono text-xs select-none">/u/</span>
            <input value={uname} onChange={(e) => setUname(e.target.value)} spellCheck={false} autoCapitalize="none"
              className="flex-1 bg-transparent py-2.5 pr-3 text-sm text-ink outline-none font-mono" />
          </div>
          <button onClick={async () => setUnameErr(await changeUsername(uname))}
            className="rounded-lg border border-line-strong px-4 py-2.5 text-xs font-medium hover:border-gold hover:text-gold transition-colors whitespace-nowrap">
            {locale === "es" ? "Guardar" : "Save"}
          </button>
          <CopyLink text={`/u/${p.username}`} locale={locale} />
        </div>
        {unameErr && <p className="text-xs text-err mt-1">{unameErr}</p>}
        <p className="text-[0.7rem] text-ink-faint mt-1">
          {locale === "es" ? "Cambiar tu usuario no afecta tus dispositivos NFC." : "Changing your username never breaks your NFC devices."}
        </p>
      </div>
    </Card>
  );
}

/* — CONTACT — */
export function ContactSection({ locale, p, patch }: { locale: Locale; p: P; patch: Patch }) {
  const t = getDict(locale);
  return (
    <Card title={t.builder.contact}>
      <Field label={t.builder.phone} value={p.phone ?? ""} onChange={(v) => patch({ phone: v })} type="tel" />
      <Field label={t.profile.email} value={p.email ?? ""} onChange={(v) => patch({ email: v })} type="email" />
      <Field label={t.builder.website} value={p.website ?? ""} onChange={(v) => patch({ website: v })} />
      <Field label={t.builder.location} value={p.location ?? ""} onChange={(v) => patch({ location: v })} />
    </Card>
  );
}

const channelLabelsEn: Record<ContactType, string> = { call: "Call", sms: "SMS / Text", whatsapp: "WhatsApp", messenger: "Facebook Messenger", telegram: "Telegram", viber: "Viber", line: "LINE", snapchat: "Snapchat", email: "Email", vcard: "Save Contact", custom: "Custom contact URL" };
const channelLabelsEs: Record<ContactType, string> = { call: "Llamar", sms: "SMS / Mensaje", whatsapp: "WhatsApp", messenger: "Facebook Messenger", telegram: "Telegram", viber: "Viber", line: "LINE", snapchat: "Snapchat", email: "Correo", vcard: "Guardar contacto", custom: "URL de contacto personalizada" };
function channelLabel(type: ContactType, locale: Locale) { return (locale === "es" ? channelLabelsEs : channelLabelsEn)[type]; }
export function ContactMessagingSection({ locale, profile, channels, isKids, onChange }: {
  locale: Locale; profile: Pick<Profile, "id" | "phone" | "email"> & { primaryContactAction: string | null };
  channels: StoredContactChannel[]; isKids: boolean;
  onChange: (channels: StoredContactChannel[], primary: string) => void;
}) {
  const allowed = isKids ? (["call", "sms", "whatsapp", "vcard"] as ContactType[]) : [...CONTACT_TYPES];
  const seed = allowed.map((type, sortOrder) => channels.find((row) => row.type === type) ?? ({ id: `preview-${type}`, profileId: profile.id, type, value: null, enabled: false, public: false, sortOrder, createdAt: new Date(), updatedAt: new Date() } as StoredContactChannel));
  const [rows, setRows] = useState(seed); const [primary, setPrimary] = useState(profile.primaryContactAction || "share"); const [state, setState] = useState("");
  const update = (type: string, patch: Partial<StoredContactChannel>) => { const next = rows.map((row) => row.type === type ? { ...row, ...patch } : row); setRows(next); onChange(next, primary); };
  const valueFor = (row: StoredContactChannel) => row.type === "call" || row.type === "sms" ? (row.value || profile.phone || "") : row.type === "email" ? (row.value || profile.email || "") : row.value || "";
  return <Card title={locale === "es" ? "Contacto y mensajería" : "Contact & Messaging"} hint={isKids ? (locale === "es" ? "Solo acciones del tutor principal. La información médica nunca se incluye." : "Primary guardian actions only. Medical information is never included.") : (locale === "es" ? "Solo los canales activados y públicos aparecen en tu perfil." : "Only enabled, public channels appear on your profile.")}>
    <label className="block"><span className="text-xs text-ink-soft">{locale === "es" ? "Acción principal" : "Primary action"}</span><select value={primary} onChange={(e) => { setPrimary(e.target.value); onChange(rows, e.target.value); }} className="mt-1 w-full rounded-lg border border-line bg-bg px-3.5 py-2.5 text-sm"><option value="share">{locale === "es" ? "Compartir perfil" : "Share Profile"}</option>{rows.filter((row) => row.enabled && row.public).map((row) => <option key={row.type} value={row.type}>{channelLabel(row.type as ContactType, locale)}</option>)}</select></label>
    {rows.map((row) => {
      const type = row.type as ContactType; const derived = ["call", "sms", "email", "vcard"].includes(type) || isKids;
      const href = normalizeContactHref(type, type === "vcard" ? `/u/profile/contact.vcf` : valueFor(row));
      return <div key={type} className="rounded-lg border border-line bg-bg p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{channelLabel(type, locale)}</p><div className="flex gap-3 text-xs"><label className="flex items-center gap-1"><input type="checkbox" checked={row.enabled} onChange={(e) => update(type, { enabled: e.target.checked })}/> {locale === "es" ? "Activado" : "Enabled"}</label><label className="flex items-center gap-1"><input type="checkbox" checked={row.public} onChange={(e) => update(type, { public: e.target.checked })}/> {locale === "es" ? "Público" : "Public"}</label></div></div>
        {!derived && <input value={row.value ?? ""} onChange={(e) => update(type, { value: e.target.value })} placeholder={type === "custom" ? "https://" : type === "whatsapp" ? "+1 404…" : type === "viber" ? (locale === "es" ? "URI de cuenta pública" : "Public Account URI") : (locale === "es" ? "Usuario o https://" : "Username or https://")} className="mt-2 w-full rounded-md border border-line bg-bg-raised px-3 py-2 text-sm"/>}
        {derived && <p className="mt-1 text-[0.68rem] text-ink-faint">{isKids ? (locale === "es" ? "Usa el contacto prioritario del tutor" : "Uses priority-1 guardian contact") : type === "vcard" ? (locale === "es" ? "Generado a partir de campos públicos" : "Generated from public fields") : (locale === "es" ? `Usa ${type === "email" ? "el correo del perfil" : "el teléfono del perfil"}` : `Uses ${type === "email" ? "profile email" : "profile phone"}`)}</p>}
        {href && row.enabled && row.public && !isKids && <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="mt-2 inline-block text-xs text-gold">{locale === "es" ? `Probar ${channelLabel(type, locale)}` : `Test ${channelLabel(type, locale)}`}</a>}
      </div>;
    })}
    <button onClick={async () => { setState(locale === "es" ? "Guardando…" : "Saving…"); const result = await updateContactChannels(profile.id, rows.map(({ type, value, enabled, public: visible, sortOrder }) => ({ type, value: value ?? "", enabled, public: visible, sortOrder })), primary); setState(result.ok ? (locale === "es" ? "Guardado ✓" : "Saved ✓") : result.error); }} className="self-start rounded-full bg-ink px-5 py-2.5 text-xs font-medium text-bg">{locale === "es" ? "Guardar contactos" : "Save contacts"}</button>{state && <p className={`text-xs ${state.includes("✓") ? "text-ok" : "text-ink-faint"}`}>{state}</p>}
  </Card>;
}

type ShareStudioProfile = Pick<Profile, "id" | "displayName" | "headline" | "bio" | "avatarUrl" | "theme" | "type"> & { shareTitle: string | null; shareDescription: string | null; shareImageUrl: string | null };
export function SharingPreviewSection({ locale, profile, onChange }: { locale: Locale; profile: ShareStudioProfile; onChange: (fields: Partial<ShareStudioProfile>) => void }) {
  const [title, setTitle] = useState(profile.shareTitle ?? ""); const [description, setDescription] = useState(profile.shareDescription ?? ""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const safeKids = profile.type === "kids"; const shownTitle = safeKids ? (title || "SnapLink Protect") : (title || profile.displayName); const shownDescription = safeKids ? (description || (locale === "es" ? "Toca para conectar de forma segura." : "Tap to connect safely.")) : (description || profile.headline || profile.bio || (locale === "es" ? "Toca. Conecta. Comparte." : "Tap. Connect. Share."));
  return <Card title={locale === "es" ? "Compartir y vista previa" : "Sharing & Preview"} hint={locale === "es" ? "Controla cómo se ve tu SnapLink cuando alguien lo comparte." : "Control how your SnapLink looks when someone shares it."}>
    <div className={`overflow-hidden rounded-xl border border-line p-5 ${profile.theme === "ivory" ? "bg-[#f7f0df] text-[#171714]" : "bg-[#0d0f0e] text-[#f7f0df]"}`}><div className="flex items-center gap-4">{profile.shareImageUrl || (!safeKids && profile.avatarUrl) ? <img src={profile.shareImageUrl || profile.avatarUrl || ""} alt="" className="h-20 w-20 rounded-full object-cover border-2 border-gold"/> : <div className="grid h-20 w-20 place-items-center rounded-full border-2 border-gold text-xl text-gold">{safeKids ? "SL" : profile.displayName.split(/\s+/).map((x) => x[0]).slice(0, 2).join("")}</div>}<div><p className="text-[0.6rem] uppercase tracking-[.18em] text-gold">SnapLink SOLO</p><p className="font-display text-xl font-semibold">{shownTitle}</p><p className="mt-1 line-clamp-2 text-xs opacity-70">{shownDescription}</p></div></div></div>
    <Field label={locale === "es" ? "Título al compartir" : "Share title"} value={title} onChange={(v) => { setTitle(v); onChange({ shareTitle: v || null }); }}/><label className="block"><span className="text-xs text-ink-soft">{locale === "es" ? "Descripción al compartir" : "Share description"}</span><textarea value={description} onChange={(e) => { setDescription(e.target.value); onChange({ shareDescription: e.target.value || null }); }} maxLength={220} rows={3} className="mt-1 w-full rounded-lg border border-line bg-bg px-3.5 py-2.5 text-sm"/></label>
    <button onClick={async () => { setMessage(locale === "es" ? "Guardando…" : "Saving…"); const result = await updateShareSettings(profile.id, { title, description }); setMessage(result.ok ? (locale === "es" ? "Guardado ✓" : "Saved ✓") : result.error); }} className="self-start rounded-full bg-ink px-5 py-2.5 text-xs font-medium text-bg">{locale === "es" ? "Guardar vista previa" : "Save share preview"}</button>
    {!safeKids && <form action={async (form) => { setBusy(true); const result = await uploadShareImage(profile.id, form); setBusy(false); if (result.ok) onChange({ shareImageUrl: result.url }); else setMessage(result.error); }} className="rounded-lg border border-line bg-bg p-3"><p className="text-xs font-medium">{locale === "es" ? "Imagen opcional al compartir" : "Optional share image override"}</p><input name="shareImage" type="file" accept="image/jpeg,image/png,image/webp" required className="mt-2 text-xs"/><button disabled={busy} className="mt-2 block rounded-full border border-line-strong px-4 py-2 text-xs">{busy ? (locale === "es" ? "Subiendo…" : "Uploading…") : (locale === "es" ? "Subir" : "Upload")}</button></form>}
    {profile.shareImageUrl && <button onClick={async () => { const result = await removeShareImage(profile.id); if (result.ok) onChange({ shareImageUrl: null }); }} className="self-start text-xs text-err">{locale === "es" ? "Quitar imagen para compartir" : "Remove share image"}</button>}{message && <p className="text-xs text-ink-faint">{message}</p>}
  </Card>;
}

export function AvatarSection({ locale, profileId, avatarUrl, displayName, onChange }: { locale: Locale; profileId: string; avatarUrl: string | null; displayName: string; onChange: (url: string | null) => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const initials = displayName.split(" ").map((part) => part[0]).slice(0, 2).join("");
  return <Card title={locale === "es" ? "Foto de perfil" : "Profile photo"} hint={locale === "es" ? "JPG, PNG o WebP. Máximo 8 MB." : "JPG, PNG or WebP. Maximum 8 MB."}>
    <div className="flex items-center gap-4">{avatarUrl ? <img src={avatarUrl} alt={displayName} className="h-20 w-20 rounded-full object-cover border border-line"/> : <div className="h-20 w-20 rounded-full bg-bg-sunken grid place-items-center font-display text-2xl text-gold">{initials}</div>}<form className="grid gap-2 flex-1" action={async (form) => { setBusy(true); setError(""); const result = await uploadAvatar(profileId, form); setBusy(false); if (result.ok) onChange(result.url); else setError(result.error); }}><input type="file" name="avatar" accept="image/jpeg,image/png,image/webp" required className="text-xs"/><button disabled={busy} className="rounded-full border border-line-strong px-4 py-2 text-xs self-start">{busy ? (locale === "es" ? "Subiendo…" : "Uploading…") : (locale === "es" ? "Subir foto" : "Upload photo")}</button></form></div>
    {avatarUrl && <button onClick={async () => { const result = await removeAvatar(profileId); if (result.ok) onChange(null); else setError(result.error); }} className="text-xs text-err self-start">{locale === "es" ? "Quitar foto" : "Remove photo"}</button>}{error && <p className="text-xs text-err">{error}</p>}
  </Card>;
}

/* — LINKS — */
export function LinksSection({ locale, profileId, initialLinks, favoriteLinkIds: initialFavorites, onChange, onFavoritesChange }: { locale: Locale; profileId: string; initialLinks: ProfileLink[]; favoriteLinkIds: string[]; onChange: (links: ProfileLink[]) => void; onFavoritesChange: (ids: string[]) => void }) {
  const t = getDict(locale);
  const [links, setLinks] = useState(initialLinks); const [adding, setAdding] = useState(false); const [error, setError] = useState("");
  const [favorites, setFavorites] = useState(initialFavorites);
  const sync = (next: ProfileLink[]) => { setLinks(next); onChange(next); };
  const move = async (index: number, delta: number) => { const target = index + delta; if (target < 0 || target >= links.length) return; const next = [...links]; [next[index], next[target]] = [next[target], next[index]]; sync(next); await reorderLinks(profileId, next.map((link) => link.id)); };
  return (
    <Card title={t.builder.links}>
      {links.length === 0 && <p className="text-sm text-ink-faint">{locale === "es" ? "Sin enlaces aún." : "No links yet."}</p>}
      {links.map((link, index) => (
        <LinkEditor key={link.id} locale={locale} link={link} favorite={favorites.includes(link.id)} onFavorite={async () => { const next = favorites.includes(link.id) ? favorites.filter((id) => id !== link.id) : [...favorites, link.id].slice(-2); const result = await updateFavoriteLinks(profileId, next); if (result.ok) { setFavorites(next); onFavoritesChange(next); } else setError(result.error); }} onSave={async (fields) => { const result = await updateLink(profileId, link.id, fields); if (result.ok) sync(links.map((item) => item.id === link.id ? result.link : item)); else setError(result.error); }} onDelete={async () => { const result = await deleteLink(profileId, link.id); if (result.ok) { const nextFav = favorites.filter((id) => id !== link.id); setFavorites(nextFav); onFavoritesChange(nextFav); sync(links.filter((item) => item.id !== link.id)); void updateFavoriteLinks(profileId, nextFav); } else setError(result.error); }} onUp={() => move(index, -1)} onDown={() => move(index, 1)} />
      ))}
      {adding ? <LinkCreator locale={locale} onCancel={() => setAdding(false)} onCreate={async (fields) => { const result = await createLink(profileId, fields); if (result.ok) { sync([...links, result.link]); setAdding(false); } else setError(result.error); }}/> : <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-gold self-start mt-1">
        + {t.builder.addLink}
      </button>}{error && <p className="text-xs text-err">{error}</p>}
    </Card>
  );
}

const linkTypes = ["website", "instagram", "facebook", "tiktok", "linkedin", "youtube", "whatsapp", "x", "custom"];
function LinkEditor({ locale, link, favorite, onFavorite, onSave, onDelete, onUp, onDown }: { locale: Locale; link: ProfileLink; favorite: boolean; onFavorite: () => void; onSave: (fields: { type: string; label: string; url: string; visible: boolean }) => void; onDelete: () => void; onUp: () => void; onDown: () => void }) {
  const [editing, setEditing] = useState(false); const [fields, setFields] = useState<{ type: string; label: string; url: string; visible: boolean }>({ type: link.type, label: link.label ?? "", url: link.url, visible: link.visible });
  const es = locale === "es";
  if (!editing) return <div className="flex items-center gap-2 rounded-lg border border-line bg-bg px-3.5 py-2.5"><button onClick={() => setEditing(true)} className="min-w-0 flex-1 text-left"><span className="block text-sm truncate">{link.label ?? link.type}</span><span className="text-[0.65rem] text-ink-faint truncate block">{link.url}</span></button><button onClick={onFavorite} aria-label={favorite ? (es ? "Quitar de enlaces principales" : "Remove from top links") : (es ? "Mostrar como enlace principal" : "Show as top link")} title={es ? "Enlace principal" : "Top link"} className={`h-9 w-9 rounded-full ${favorite ? "text-gold bg-gold/10" : "text-ink-faint"}`}>★</button><button onClick={onUp} aria-label={es ? "Subir" : "Move up"}>↑</button><button onClick={onDown} aria-label={es ? "Bajar" : "Move down"}>↓</button><button onClick={onDelete} className="text-xs text-err">{es ? "Eliminar" : "Delete"}</button></div>;
  return <div className="rounded-lg border border-line bg-bg p-3 grid gap-2"><select value={fields.type} onChange={(e) => setFields({ ...fields, type: e.target.value })} className="rounded-md border border-line bg-bg-raised px-3 py-2 text-sm">{linkTypes.map((type) => <option key={type}>{type}</option>)}</select><input value={fields.label} onChange={(e) => setFields({ ...fields, label: e.target.value })} placeholder={es ? "Etiqueta" : "Label"} className="rounded-md border border-line bg-bg-raised px-3 py-2 text-sm"/><input value={fields.url} onChange={(e) => setFields({ ...fields, url: e.target.value })} placeholder="https://" className="rounded-md border border-line bg-bg-raised px-3 py-2 text-sm"/><label className="flex gap-2 text-xs"><input type="checkbox" checked={fields.visible} onChange={(e) => setFields({ ...fields, visible: e.target.checked })}/> {es ? "Visible" : "Visible"}</label><div className="flex gap-2"><button onClick={() => { onSave(fields); setEditing(false); }} className="rounded-full bg-ink text-bg px-4 py-2 text-xs">{es ? "Guardar" : "Save"}</button><button onClick={() => setEditing(false)} className="text-xs">{es ? "Cancelar" : "Cancel"}</button></div></div>;
}
function LinkCreator({ locale, onCreate, onCancel }: { locale: Locale; onCreate: (fields: { type: string; label: string; url: string }) => void; onCancel: () => void }) {
  const [fields, setFields] = useState({ type: "website", label: "", url: "https://" });
  const es = locale === "es";
  return <div className="rounded-lg border border-gold/40 bg-bg p-3 grid gap-2"><select value={fields.type} onChange={(e) => setFields({ ...fields, type: e.target.value })} className="rounded-md border border-line px-3 py-2 text-sm">{linkTypes.map((type) => <option key={type}>{type}</option>)}</select><input value={fields.label} onChange={(e) => setFields({ ...fields, label: e.target.value })} placeholder={es ? "Etiqueta" : "Label"} className="rounded-md border border-line px-3 py-2 text-sm"/><input value={fields.url} onChange={(e) => setFields({ ...fields, url: e.target.value })} placeholder="https://" className="rounded-md border border-line px-3 py-2 text-sm"/><div className="flex gap-2"><button onClick={() => onCreate(fields)} className="rounded-full bg-ink text-bg px-4 py-2 text-xs">{es ? "Agregar enlace" : "Add link"}</button><button onClick={onCancel} className="text-xs">{es ? "Cancelar" : "Cancel"}</button></div></div>;
}

export function PaymentMethodsSection({ locale, profileId, initialMethods, onChange }: { locale: Locale; profileId: string; initialMethods: StoredPaymentMethod[]; onChange: (methods: StoredPaymentMethod[]) => void }) {
  const seed = PAYMENT_TYPES.map((type, sortOrder) => initialMethods.find((method) => method.type === type) ?? ({ type, value: "", enabled: false, public: false, sortOrder } as StoredPaymentMethod));
  const [methods, setMethods] = useState(seed); const [message, setMessage] = useState("");
  const update = (type: string, patch: Partial<StoredPaymentMethod>) => { const next = methods.map((method) => method.type === type ? { ...method, ...patch } : method); setMethods(next); onChange(next); };
  return <Card title={locale === "es" ? "Pagos y propinas" : "Pay & Tip"} hint={locale === "es" ? "Aparece como una acción compacta. Zelle copia el identificador; no inventamos un enlace de pago." : "Appears as one compact action. Zelle copies the identifier; no payment URL is invented."}>
    {methods.map((method) => { const preview = method.value ? normalizePaymentMethod(method, locale) : null; return <div key={method.type} className="rounded-lg border border-line bg-bg p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium capitalize">{method.type === "cashapp" ? "Cash App" : method.type}</p><div className="flex gap-3 text-xs"><label className="flex items-center gap-1"><input type="checkbox" checked={method.enabled} onChange={(e) => update(method.type, { enabled: e.target.checked })}/> {locale === "es" ? "Activado" : "Enabled"}</label><label className="flex items-center gap-1"><input type="checkbox" checked={method.public} onChange={(e) => update(method.type, { public: e.target.checked })}/> {locale === "es" ? "Público" : "Public"}</label></div></div>{method.type === "custom" && <input value={method.label ?? ""} onChange={(e) => update(method.type, { label: e.target.value })} placeholder={locale === "es" ? "Etiqueta del botón" : "Button label"} className="mt-2 w-full rounded-md border border-line bg-bg-raised px-3 py-2 text-sm"/>}<input value={method.value} onChange={(e) => update(method.type, { value: e.target.value })} placeholder={method.type === "zelle" ? (locale === "es" ? "Correo o teléfono mostrado para copiar" : "Email or phone shown for copy") : method.type === "custom" ? (locale === "es" ? "https:// página de pago segura" : "https:// secure payment page") : (locale === "es" ? "Usuario / identificador" : "Username / handle")} className="mt-2 w-full rounded-md border border-line bg-bg-raised px-3 py-2 text-sm"/>{method.value && !preview && <p className="mt-1 text-xs text-err">{locale === "es" ? "Destino de pago inválido" : "Invalid payment destination"}</p>}</div>; })}
    <button onClick={async () => { setMessage(locale === "es" ? "Guardando…" : "Saving…"); const configured = methods.filter((method) => method.value.trim()); const result = await updatePaymentMethods(profileId, configured); setMessage(result.ok ? (locale === "es" ? "Guardado ✓" : "Saved ✓") : result.error); }} className="self-start rounded-full bg-ink px-5 py-2.5 text-xs font-medium text-bg">{locale === "es" ? "Guardar pagos" : "Save payments"}</button>{message && <p className="text-xs text-ink-faint">{message}</p>}
  </Card>;
}

/* — APPEARANCE — */
export function AppearanceSection({ locale, p, patch, isKids }: { locale: Locale; p: P; patch: Patch; isKids: boolean }) {
  const t = getDict(locale);
  if (isKids) {
    const accents = ["#E86FA6", "#5B8DEF", "#3FBF8F", "#F0A63C", "#9B6BDB"];
    return (
      <Card title={t.builder.look}>
        <span className="text-xs text-ink-soft">{locale === "es" ? "Color de acento" : "Accent color"}</span>
        <div className="flex gap-2.5 mt-1">
          {accents.map((c) => (
            <button key={c} onClick={() => patch({ accent: c })} aria-label={c}
              className={`w-9 h-9 rounded-full transition-transform ${p.accent === c ? "ring-2 ring-offset-2 ring-offset-bg-raised ring-ink scale-110" : ""}`}
              style={{ background: c }} />
          ))}
        </div>
      </Card>
    );
  }
  const themes: { key: Profile["theme"]; label: string }[] = [
    { key: "ivory", label: t.builder.themes.ivory },
    { key: "obsidian", label: t.builder.themes.obsidian },
    { key: "signature_gold", label: t.builder.themes.signature_gold },
  ];
  return (
    <Card title={t.builder.look}>
      <span className="text-xs text-ink-soft">{t.builder.theme}</span>
      <div className="grid grid-cols-3 gap-2 mt-1">
        {themes.map((th) => (
          <button key={th.key} onClick={() => patch({ theme: th.key })}
            className={`rounded-lg border p-3 text-xs font-medium transition-colors ${p.theme === th.key ? "border-gold text-gold" : "border-line text-ink-soft hover:border-line-strong"}`}>
            {th.label}
          </button>
        ))}
      </div>
    </Card>
  );
}

/* — DEVICES + QR — */
export function DevicesSection({
  locale, devices, token, username,
}: { locale: Locale; devices: { id: string; label: string; type: string; status: string; deviceCode: string }[]; token: string; username: string }) {
  const t = getDict(locale);
  return (
    <Card title={locale === "es" ? "Dispositivos y QR" : "Devices & QR"}
      hint={locale === "es" ? "El dispositivo apunta a tu destino, no a tu identidad." : "Devices point at your destination, not your identity."}>
      {devices.map((d, i) => (
        <div key={i} className="flex items-center justify-between rounded-lg border border-line bg-bg px-3.5 py-3">
          <div>
            <p className="text-sm font-medium">{d.label}</p>
            <p className="text-xs text-ink-faint font-mono uppercase">{d.type} · {d.status}</p>
          </div>
          <span className="w-2 h-2 rounded-full bg-ok" />
        </div>
      ))}
      <div className="mt-2 pt-3 border-t border-line flex items-center gap-4">
        {token ? <img src={`/api/qr/${encodeURIComponent(token)}`} alt="SnapLink destination QR" className="w-24 h-24 rounded-md border border-line"/> : <div className="w-24 h-24 rounded-md border border-line grid place-items-center text-xs text-ink-faint">No destination</div>}
        <div>
          <p className="text-sm font-medium">QR</p>
          <p className="text-xs text-ink-faint">/d/{token}</p>
          {token && <a href={`/api/qr/${encodeURIComponent(token)}?download=1`} download className="text-xs text-gold hover:underline mt-1 inline-block">{locale === "es" ? "Descargar QR" : "Download QR"}</a>}
        </div>
      </div>
    </Card>
  );
}

/* — KIDS: GUARDIANS — */
export function KidsGuardiansSection({ locale, data, onSave }: { locale: Locale; data: KidsData; onSave: (d: KidsData) => void }) {
  const guardians = data.guardians ?? [];
  const add = () => onSave({ ...data, guardians: [...guardians, { label: "", name: "", phone: "", priority: guardians.length + 1 }] });
  const update = (i: number, g: Partial<Guardian>) => {
    const next = guardians.map((x, idx) => (idx === i ? { ...x, ...g } : x));
    onSave({ ...data, guardians: next });
  };
  const remove = (i: number) => onSave({ ...data, guardians: guardians.filter((_, idx) => idx !== i) });

  return (
    <Card title={locale === "es" ? "Tutores" : "Guardians"}
      hint={locale === "es" ? "El primero (prioridad 1) es el contacto principal." : "The first (priority 1) is the primary contact."}>
      {guardians.map((g, i) => (
        <div key={i} className="rounded-lg border border-line bg-bg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-ink-faint">#{g.priority}</span>
            <button onClick={() => remove(i)} className="text-xs text-err hover:underline">{locale === "es" ? "Quitar" : "Remove"}</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder={locale === "es" ? "Etiqueta (Mamá)" : "Label (Mom)"} value={g.label}
              onChange={(e) => update(i, { label: e.target.value })}
              className="rounded-lg border border-line bg-bg-raised px-3 py-2 text-sm focus:border-gold outline-none" />
            <input placeholder={locale === "es" ? "Nombre" : "Name"} value={g.name}
              onChange={(e) => update(i, { name: e.target.value })}
              className="rounded-lg border border-line bg-bg-raised px-3 py-2 text-sm focus:border-gold outline-none" />
          </div>
          <input placeholder={locale === "es" ? "Teléfono" : "Phone"} value={g.phone} type="tel"
            onChange={(e) => update(i, { phone: e.target.value })}
            className="rounded-lg border border-line bg-bg-raised px-3 py-2 text-sm focus:border-gold outline-none" />
        </div>
      ))}
      {guardians.length < 4 && (
        <button onClick={add} className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-gold self-start">
          + {locale === "es" ? "Agregar tutor" : "Add guardian"}
        </button>
      )}
    </Card>
  );
}

/* — KIDS: EMERGENCY (opt-in) — */
export function KidsEmergencySection({ locale, data, onSave }: { locale: Locale; data: KidsData; onSave: (d: KidsData) => void }) {
  const em = data.emergency ?? { enabled: false };
  const set = (patch: Partial<NonNullable<KidsData["emergency"]>>) =>
    onSave({ ...data, emergency: { ...em, ...patch } });

  return (
    <Card title={locale === "es" ? "Información de emergencia" : "Emergency information"}
      hint={locale === "es" ? "Opcional. Se muestra en segundo plano, no como acción principal." : "Optional. Shown as secondary, never the primary action."}>
      <label className="flex items-center gap-2.5 cursor-pointer">
        <input type="checkbox" checked={!!em.enabled} onChange={(e) => set({ enabled: e.target.checked })}
          className="w-4 h-4 accent-[hsl(var(--gold))]" />
        <span className="text-sm">{locale === "es" ? "Mostrar información de emergencia" : "Show emergency information"}</span>
      </label>
      {em.enabled && (
        <>
          <Field label={locale === "es" ? "Alergias" : "Allergies"} value={em.allergies ?? ""} onChange={(v) => set({ allergies: v })} />
          <Field label={locale === "es" ? "Nota médica" : "Medical note"} value={em.medical ?? ""} onChange={(v) => set({ medical: v })} />
          <Field label={locale === "es" ? "Nota" : "Note"} value={em.note ?? ""} onChange={(v) => set({ note: v })} />
        </>
      )}
    </Card>
  );
}

/* — small bits — */
function CopyLink({ text, locale = "en" }: { text: string; locale?: Locale }) {
  const [done, setDone] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="rounded-lg border border-line-strong px-3 py-2.5 text-xs hover:border-gold hover:text-gold transition-colors whitespace-nowrap">
      {done ? "✓" : (locale === "es" ? "Copiar" : "Copy")}
    </button>
  );
}
