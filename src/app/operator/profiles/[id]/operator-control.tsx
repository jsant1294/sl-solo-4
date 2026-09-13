"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CONTACT_TYPES } from "@/lib/contact-channels";
import { PAYMENT_TYPES } from "@/lib/payment-methods";
import {
  FLOATING_CTA_ACTION_TYPES, PROFILE_LAYOUTS, getFloatingCta, getProfileLayout,
  type FloatingCtaActionType, type FloatingCtaConfig, type FloatingCtaMenuItem,
  type ProfileLayoutKey,
} from "@/lib/profile-data";
import { PALETTE_LIST, resolvePalette } from "@/lib/profile-palettes";
import {
  opCreateLink, opDeleteLink, opReorderLinks, opUpdateLink,
  opUploadAvatar, opRemoveAvatar, opClaimUsername, opSetStatus, opUpdateProfile,
  opUpdateCategory, opUpdateContactChannels, opUpdateShareSettings, opUpdateFavoriteLinks,
  opUpdatePaymentMethods, opUploadShareImage, opRemoveShareImage, opUpdatePresentation,
  opUpdateFloatingCta, opUpdateLayout, opUpdatePalette, type OpResult,
} from "../actions";

const FLOATING_CTA_POSITIONS: FloatingCtaConfig["position"][] = ["bottom-right", "bottom-center", "bottom-left"];
const FLOATING_CTA_STYLES: FloatingCtaConfig["style"][] = ["solid", "glass", "outline"];
const MAX_FLOATING_CTA_MENU = 5;

const inputCls = "w-full rounded-md border border-line bg-bg-raised px-3 py-2 text-sm";
const labelCls = "grid gap-1.5 text-xs font-medium text-ink-soft";
const cardCls = "rounded-xl border border-line bg-bg-raised p-5";
const chip = "rounded-full border border-line px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-widest";

type LinkRow = { id: string; type: string; label: string | null; url: string; sortOrder: number; visible: boolean };
type P = {
  id: string; type: string; status: "draft" | "active" | "disabled"; username: string; displayName: string;
  headline: string | null; bio: string | null; avatarUrl: string | null;
  phone: string | null; email: string | null; website: string | null; location: string | null;
  accent: string | null; theme: string; locale: string; active: boolean;
  createdAt: string;
  owner: { email: string; name: string | null; plan: string } | null;
  links: LinkRow[];
  contactChannels: { id: string; type: string; value: string | null; enabled: boolean; public: boolean; sortOrder: number }[];
  data: unknown;
};

type Props = {
  detail: P;// eslint-disable-next-line @typescript-eslint/no-explicit-any
  devices: { id: string; deviceCode: string; label: string | null; status: string }[];
  events: { byType: Record<string, number>; total: number };
  presentation: { id: string; visible: boolean; sortOrder: number }[];
  publicUrl: string;
  destinationToken: string | null;
  sections: { id: string; label: string }[];
};

function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = useCallback(async (fn: () => Promise<{ ok: boolean; error?: string } | undefined>) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fn();
      setMsg(r ? { ok: r.ok, text: r.ok ? "Saved." : r.error ?? "Something went wrong." } : null);
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message || "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }, [router]);
  return { busy, msg, run };
}

function Box({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className={cardCls}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function Feedback({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return <p className={`text-sm ${msg.ok ? "text-ok" : "text-warn"}`}>{msg.text}</p>;
}

export function OperatorControlPlane({ detail: d, devices, events, presentation, publicUrl, destinationToken, sections }: Props) {
  const router = useRouter();
  const status = d.status;
  const exp = (d.data && typeof d.data === "object" ? d.data as Record<string, unknown> : {});
  const expExperience = exp.experience && typeof exp.experience === "object" ? exp.experience as Record<string, unknown> : {};
  const shareTitle = typeof expExperience.shareTitle === "string" ? expExperience.shareTitle : "";
  const shareDescription = typeof expExperience.shareDescription === "string" ? expExperience.shareDescription : "";
  const shareImageUrl = typeof expExperience.shareImageUrl === "string" ? expExperience.shareImageUrl : "";
  const favoriteIds = Array.isArray(expExperience.favoriteLinkIds) ? (expExperience.favoriteLinkIds as string[]) : [];
  const category = d.type === "business" && typeof exp.category === "string" ? exp.category : "";
  const primaryAction = typeof expExperience.primaryContactAction === "string" ? expExperience.primaryContactAction : "share";
  const payments = Array.isArray(expExperience.paymentMethods) ? expExperience.paymentMethods as {
    type: string; value: string; label?: string; enabled: boolean; public: boolean; sortOrder: number;
  }[] : [];
  const links = [...d.links].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="grid gap-6">
      {/* ——— Header ——— */}
      <section className={`${cardCls} !p-6`}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-semibold tracking-tight">{d.displayName}</h1>
              <span className={`${chip} ${status === "active" ? "border-ok/50 text-ok" : "text-ink-faint"}`}>{status}</span>
              <span className={`${chip} text-gold border-gold/40`}>SOLO</span>
            </div>
            <p className="mt-1.5 font-mono text-sm text-ink-soft">@{d.username} · {d.type} · {d.locale === "es" ? "Español" : "English"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href={publicUrl} target="_blank" rel="noopener noreferrer"
              className="rounded-full bg-ink text-bg px-5 py-2.5 text-sm font-medium no-underline hover:bg-gold transition-colors">Preview Live ↗</a>
            <CopyLink url={publicUrl} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["draft", "active", "disabled"] as const).map((s) => (
            <button key={s} disabled={s === status}
              onClick={() => { void opSetStatus(d.id, s).then(() => router.refresh()); }}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${s === status ? "border-gold text-gold" : "border-line text-ink-soft hover:border-gold/50 hover:text-ink"}`}>
              {s === "active" ? "Set Active" : s === "draft" ? "Set Draft" : "Disable"}
            </button>
          ))}
        </div>
      </section>

      {/* ——— Operator info ——— */}
      <section className={cardCls}>
        <h2 className="mb-4 font-display text-lg font-semibold tracking-tight">Operator information</h2>
        <dl className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <Info label="Owner" value={d.owner?.name ?? "—"} />
          <Info label="Owner email" value={d.owner?.email ?? "—"} />
          <Info label="Owner plan" value={d.owner?.plan ?? "free"} />
          <Info label="Profile ID" value={d.id} mono />
          <Info label="Destination token" value={destinationToken ?? "—"} mono />
          <Info label="Username / slug" value={`@${d.username}`} mono />
          <Info label="Profile type" value={d.type} />
          <Info label="Status" value={d.status} />
          <Info label="Created" value={new Date(d.createdAt).toLocaleString()} />
          <Info label="Public URL" value={publicUrl} mono href={publicUrl} />
          <Info label="Associated devices" value={String(devices.length)} />
          <Info label="Activity events" value={String(events.total)} />
        </dl>
        {events.total > 0 && (
          <p className="mt-3 text-xs text-ink-faint">
            {Object.entries(events.byType).map(([k, v]) => `${k}: ${v}`).join(" · ")} ·{" "}
            <span>per-link click counts are not tracked in the current data model.</span>
          </p>
        )}
      </section>

      {/* ——— Identity & appearance ——— */}
      <Box title="Profile management">
        <AvatarPanel profileId={d.id} avatarUrl={d.avatarUrl} />
        <FieldsForm d={d} />
        <div className="grid sm:grid-cols-2 gap-4">
          <UsernameForm d={d} />
          <CategoryForm d={d} initialCategory={category} />
        </div>
      </Box>

      {/* ——— Sharing ——— */}
      <Box title="Sharing">
        <ShareForm d={d} initialTitle={shareTitle} initialDescription={shareDescription} shareImageUrl={shareImageUrl} />
      </Box>

      {/* ——— Profile presentation ——— */}
      <Box title="Profile presentation" action={<span className="text-xs text-ink-faint">source of truth for public composition</span>}>
        <PresentationEditor profileId={d.id} sections={sections} presentation={presentation} />
      </Box>

      {/* ——— Links ——— */}
      <Box title="Links management" action={<span className="text-xs text-ink-faint">shared with the customer links editor — same records</span>}>
        <LinksPanel profileId={d.id} profileName={d.displayName} links={links} favoriteIds={favoriteIds} />
      </Box>

      {/* ——— Contact & payments ——— */}
      <Box title="Contact & payments">
        <ContactPanel profileId={d.id} profileType={d.type} channels={d.contactChannels} primaryAction={primaryAction} />
        {d.type !== "kids" && <PaymentsPanel profileId={d.id} methods={payments} />}
      </Box>

      {/* ——— Devices ——— */}
      <section className={cardCls}>
        <h2 className="mb-4 font-display text-lg font-semibold tracking-tight">Associated devices</h2>
        {devices.length === 0 ? (
          <p className="text-sm text-ink-faint">No devices are linked to this profile yet.</p>
        ) : (
          <div className="rounded-lg border border-line overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {devices.map((dev) => (
                  <tr key={dev.id} className="border-t border-line first:border-t-0">
                    <td className="px-4 py-2.5">
                      <Link href={`/operator/devices/${dev.id}`} className="hover:underline"><span className="font-mono text-gold">{dev.deviceCode}</span> <span className="text-ink-soft">{dev.label}</span></Link>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-ink-faint">{dev.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ——— Danger / override note ——— */}
      <section className={`${cardCls} border-warn/30`}>
        <p className="text-sm text-ink-soft">
          <span className="font-medium text-warn">Administrative override.</span> Edits made here are applied through{" "}
          <span className="font-mono text-xs">requireOperator()</span> — server-side operator authorization — and share the
          exact same data model and validation as the customer Studio. No entitlement or ownership checks are weakened;
          customer-side control remains unchanged.
        </p>
      </section>
    </div>
  );
}

function Info({ label, value, mono, href }: { label: string; value: string; mono?: boolean; href?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className={mono ? "font-mono" : ""}>
        {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline break-all">{value}</a> : <span className="break-all">{value}</span>}
      </dd>
    </div>
  );
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { void navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink-soft no-underline hover:border-gold transition-colors">
      {copied ? "Copied ✓" : "Copy Link"}
    </button>
  );
}

/* ——— Avatar ——— */
function AvatarPanel({ profileId, avatarUrl }: { profileId: string; avatarUrl: string | null }) {
  const { busy, msg, run } = useAction();
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="grid h-20 w-20 place-items-center rounded-full border border-line-strong bg-bg-sunken font-display text-2xl text-gold overflow-hidden">
        {avatarUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          : <span aria-hidden="true">◎</span>}
      </div>
      <div className="flex flex-col gap-2">
        <form action={async (formData) => {
          await run(async () => { const r = await opUploadAvatar(profileId, formData); return r; });
        }}>
          <input ref={fileRef} type="file" name="avatar" accept="image/*" hidden onChange={(e) => e.target.form?.requestSubmit()} />
          <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
            className="rounded-full border border-line px-4 py-1.5 text-xs font-medium hover:border-gold transition-colors">Upload avatar</button>
        </form>
        {avatarUrl && (
          <button disabled={busy} onClick={() => { void run(async () => opRemoveAvatar(profileId)); }}
            className="text-xs text-ink-faint hover:text-warn">Remove avatar</button>
        )}
        <Feedback msg={msg} />
      </div>
    </div>
  );
}

/* ——— Scalar field editors ——— */
function FieldsForm({ d }: { d: P }) {
  const { busy, msg, run } = useAction();
  const f = (fd: FormData, k: string) => String(fd.get(k) ?? "");
  return (
    <form action={async (formData) => {
      const fields = {
        displayName: f(formData, "displayName") || undefined,
        headline: f(formData, "headline"),
        bio: f(formData, "bio"),
        phone: f(formData, "phone"),
        email: f(formData, "email"),
        website: f(formData, "website"),
        location: f(formData, "location"),
        theme: f(formData, "theme"),
        accent: f(formData, "accent"),
      };
      await run(async () => opUpdateProfile(d.id, fields));
    }} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls}>Display name<input className={inputCls} name="displayName" defaultValue={d.displayName} /></label>
        <label className={labelCls}>Headline<input className={inputCls} name="headline" defaultValue={d.headline ?? ""} /></label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls}>Phone<input className={inputCls} name="phone" defaultValue={d.phone ?? ""} /></label>
        <label className={labelCls}>Email<input className={inputCls} name="email" type="email" defaultValue={d.email ?? ""} /></label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelCls}>Website<input className={inputCls} name="website" defaultValue={d.website ?? ""} /></label>
        <label className={labelCls}>Location<input className={inputCls} name="location" defaultValue={d.location ?? ""} /></label>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={labelCls}>Theme
          <select className={inputCls} name="theme" defaultValue={d.theme}>
            <option value="ivory">Ivory</option>
            <option value="obsidian">Obsidian</option>
            <option value="signature_gold">Signature Gold</option>
          </select>
        </label>
        <label className={labelCls}>Accent <span className="text-ink-faint">(kids color)</span>
          <input className={inputCls} name="accent" defaultValue={d.accent ?? ""} placeholder="#E86FA6" />
        </label>
        <div className="sm:self-end">
          <label className={labelCls}>Bio
            <textarea className={`${inputCls} min-h-20`} name="bio" defaultValue={d.bio ?? ""} />
          </label>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button disabled={busy} className="rounded-full bg-ink text-bg px-6 py-2.5 text-sm font-medium hover:bg-gold disabled:opacity-50 transition-colors">Save profile</button>
        <Feedback msg={msg} />
      </div>
    </form>
  );
}

function UsernameForm({ d }: { d: P }) {
  const { busy, msg, run } = useAction();
  return (
    <form action={async (formData) => {
      await run(async () => opClaimUsername(d.id, String(formData.get("username") ?? "")));
    }} className="grid gap-1.5">
      <span className="text-xs font-medium text-ink-soft">Username</span>
      <div className="flex items-center rounded-md border border-line bg-bg px-3">
        <span className="text-sm text-ink-faint">/u/</span>
        <input className="w-full bg-transparent px-1 py-2 font-mono text-sm outline-none" name="username" defaultValue={d.username} />
      </div>
      <button disabled={busy} className="text-xs text-gold hover:underline disabled:opacity-50 text-left">Claim / update username</button>
      <Feedback msg={msg} />
    </form>
  );
}

function CategoryForm({ d, initialCategory }: { d: P; initialCategory: string }) {
  const { busy, msg, run } = useAction();
  return (
    <form action={async (formData) => {
      await run(async () => opUpdateCategory(d.id, String(formData.get("category") ?? "")));
    }} className="grid gap-1.5">
      <span className="text-xs font-medium text-ink-soft">Category <span className="text-ink-faint">(business eyebrow)</span></span>
      <input className={inputCls} name="category" defaultValue={initialCategory} placeholder="Photography" />
      <button disabled={busy} className="text-xs text-gold hover:underline disabled:opacity-50 text-left">Save category</button>
      <Feedback msg={msg} />
    </form>
  );
}

/* ——— Sharing ——— */
function ShareForm({ d, initialTitle, initialDescription, shareImageUrl }: {
  d: P; initialTitle: string; initialDescription: string; shareImageUrl: string;
}) {
  const { busy, msg, run } = useAction();
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="grid gap-4">
      <form action={async (formData) => {
        await run(async () => opUpdateShareSettings(d.id, {
          title: String(formData.get("title") ?? ""),
          description: String(formData.get("description") ?? ""),
        }));
      }} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelCls}>Share title<input className={inputCls} name="title" defaultValue={initialTitle} maxLength={90} /></label>
          <label className={labelCls}>Share description<input className={inputCls} name="description" defaultValue={initialDescription} maxLength={220} /></label>
        </div>
        <div className="flex items-center gap-3">
          <button disabled={busy} className="rounded-full bg-ink text-bg px-6 py-2.5 text-sm font-medium hover:bg-gold disabled:opacity-50 transition-colors">Save sharing</button>
        </div>
      </form>
      <div className="flex flex-wrap items-center gap-3">
        <form action={async (formData) => {
          await run(async () => {
            const r = await opUploadShareImage(d.id, formData);
            return { ok: r.ok, error: r.ok ? undefined : r.error };
          });
        }}>
          <input ref={fileRef} type="file" name="shareImage" accept="image/*" hidden onChange={(e) => e.target.form?.requestSubmit()} />
          <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
            className="rounded-full border border-line px-4 py-1.5 text-xs font-medium hover:border-gold transition-colors">Upload share image</button>
        </form>
        {shareImageUrl && (
          <button disabled={busy} onClick={() => { void run(async () => opRemoveShareImage(d.id)); }}
            className="text-xs text-ink-faint hover:text-warn">Remove share image</button>
        )}
      </div>
      <Feedback msg={msg} />
    </div>
  );
}

/* ——— Presentation ——— */
function PresentationEditor({ profileId, sections, presentation }: {
  profileId: string; sections: { id: string; label: string }[]; presentation: { id: string; visible: boolean; sortOrder: number }[];
}) {
  const { busy, msg, run } = useAction();
  const [rows, setRows] = useState(() => [...presentation].sort((a, b) => a.sortOrder - b.sortOrder));
  const toggle = (id: string) => setRows((prev) => prev.map((r) => r.id === id ? { ...r, visible: !r.visible } : r));
  const move = (index: number, dir: -1 | 1) =>
    setRows((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const save = () => run(async () => opUpdatePresentation(profileId, rows.map((r, i) => ({ id: r.id, visible: r.visible, sortOrder: i }))));
  const labelOf = (id: string) => sections.find((s) => s.id === id)?.label ?? id;
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map((row, index) => (
          <div key={row.id} className="flex items-center gap-2 rounded-lg border border-line bg-bg px-3 py-2">
            <button onClick={() => toggle(row.id)} aria-pressed={row.visible}
              className={`font-mono text-[0.65rem] uppercase tracking-widest px-2 py-1 rounded-full border transition-colors ${row.visible ? "border-ok/50 text-ok" : "border-line text-ink-faint"}`}>
              {row.visible ? "SHOW" : "HIDE"}
            </button>
            <span className="text-sm font-medium flex-1">{labelOf(row.id)}</span>
            <button disabled={index === 0} onClick={() => move(index, -1)} className="text-ink-faint hover:text-ink disabled:opacity-30">↑</button>
            <button disabled={index === rows.length - 1} onClick={() => move(index, 1)} className="text-ink-faint hover:text-ink disabled:opacity-30">↓</button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button disabled={busy} onClick={save} className="rounded-full bg-ink text-bg px-6 py-2.5 text-sm font-medium hover:bg-gold disabled:opacity-50 transition-colors">Save presentation</button>
        <Feedback msg={msg} />
      </div>
    </div>
  );
}

/* ——— Links ——— */
function LinksPanel({ profileId, links, favoriteIds }: {
  profileId: string; links: LinkRow[]; favoriteIds: string[]; profileName: string;
}) {
  const { busy, msg, run } = useAction();
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(favoriteIds.slice(0, 2));
  const toggleFavorite = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : prev.length >= 2 ? prev : [...prev, id]);
  };
  const persistFavorites = () => run(async () => opUpdateFavoriteLinks(profileId, selected));
  const moveLink = (index: number, dir: -1 | 1) => {
    const next = [...links];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    void run(async () => { const r = await opReorderLinks(profileId, next.map((l) => l.id)); router.refresh(); return r; });
  };
  return (
    <div className="grid gap-4">
      <form action={async (formData) => {
        await run(async () => opCreateLink(profileId, {
          type: String(formData.get("type") ?? "website"),
          label: String(formData.get("label") ?? ""),
          url: String(formData.get("url") ?? ""),
        }));
      }} className="grid gap-3 rounded-lg border border-line bg-bg p-4 sm:grid-cols-[140px_1fr_1.4fr_auto]">
        <select className={inputCls} name="type" defaultValue="website">
          {ALL_LINK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input className={inputCls} name="label" placeholder="Label" />
        <input className={inputCls} name="url" placeholder="https://…" required />
        <button disabled={busy} className="rounded-full bg-ink text-bg px-5 py-2 text-sm font-medium hover:bg-gold disabled:opacity-50 transition-colors">Add link</button>
      </form>

      {links.map((link, index) => (
        <div key={link.id} className="rounded-lg border border-line bg-bg p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className={`font-mono text-[0.65rem] uppercase tracking-widest px-2 py-1 rounded-full border ${link.visible ? "border-ok/50 text-ok" : "border-line text-ink-faint"}`}>{link.visible ? "ACTIVE" : "INACTIVE"}</span>
            <span className="text-xs text-ink-faint">{link.type} · click counts are not tracked per link yet</span>
            <div className="ml-auto flex items-center gap-2">
              <button disabled={index === 0} onClick={() => moveLink(index, -1)} className="font-mono text-xs text-ink-faint hover:text-ink disabled:opacity-30">↑</button>
              <button disabled={index === links.length - 1} onClick={() => moveLink(index, 1)} className="font-mono text-xs text-ink-faint hover:text-ink disabled:opacity-30">↓</button>
              <button onClick={() => toggleFavorite(link.id)} disabled={!selected.includes(link.id) && selected.length >= 2 && !favoriteIds.includes(link.id)}
                className={`text-xs ${selected.includes(link.id) ? "text-gold" : "text-ink-faint hover:text-gold disabled:opacity-30"}`}>{selected.includes(link.id) ? "★ Featured" : "☆ Feature"}</button>
              <button onClick={() => { void run(async () => opDeleteLink(profileId, link.id)); }} className="text-xs text-ink-faint hover:text-warn">Delete</button>
            </div>
          </div>
          <form action={async (formData) => {
            await run(async () => opUpdateLink(profileId, link.id, {
              type: String(formData.get("type") ?? link.type),
              label: String(formData.get("label") ?? ""),
              url: String(formData.get("url") ?? ""),
              visible: formData.get("visible") === "on",
            }));
          }} className="grid gap-3 sm:grid-cols-[140px_1fr_1.4fr_auto] sm:items-center">
            <select className={inputCls} name="type" defaultValue={link.type}>
              {ALL_LINK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input className={inputCls} name="label" defaultValue={link.label ?? ""} />
            <input className={inputCls} name="url" defaultValue={link.url} required />
            <label className="flex items-center gap-2 text-xs text-ink-soft">
              <input type="checkbox" name="visible" defaultChecked={link.visible} className="accent-current" /> Show
              <button disabled={busy} className="ml-1 rounded-full border border-line px-4 py-1.5 text-xs font-medium hover:border-gold transition-colors">Save</button>
            </label>
          </form>
        </div>
      ))}
      {links.length === 0 && <p className="text-sm text-ink-faint">No links yet — add the first one above.</p>}

      <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
        <p className="text-xs text-ink-faint">Featured (max 2) show at the top of the public profile.</p>
        <button disabled={busy} onClick={persistFavorites} className="rounded-full border border-line px-5 py-1.5 text-xs font-medium hover:border-gold transition-colors">Save featured</button>
      </div>
      <Feedback msg={msg} />
    </div>
  );
}

const ALL_LINK_TYPES = ["website", "instagram", "facebook", "tiktok", "linkedin", "youtube", "whatsapp", "x", "custom"] as const;

/* ——— Contact ——— */
function ContactPanel({ profileId, profileType, channels, primaryAction }: {
  profileId: string; profileType: string; channels: Props["detail"]["contactChannels"]; primaryAction: string;
}) {
  const { busy, msg, run } = useAction();
  const [rows, setRows] = useState<typeof channels>(channels.length ? channels : []);
  const [primary, setPrimary] = useState(primaryAction);
  const types = CONTACT_TYPES as readonly string[];
  const patch = (index: number, part: Partial<(typeof channels)[number]>) =>
    setRows((prev) => prev.map((row, i) => i === index ? { ...row, ...part } : row));
  const addRow = () => setRows((prev) => [...prev, { id: `new-${prev.length}`, type: "custom", value: null, enabled: true, public: true, sortOrder: prev.length }]);
  const removeRow = (index: number) => setRows((prev) => prev.filter((_, i) => i !== index));
  const save = () => run(async () => opUpdateContactChannels(profileId, rows.map((row, index) => ({
    type: row.type, value: row.value ?? "", enabled: row.enabled, public: row.public, sortOrder: index,
  })), primary));
  return (
    <div className="grid gap-4">
      {profileType === "kids" && <p className="text-xs text-ink-faint">Protect profiles only support guardian-safe contact actions (call / sms / whatsapp / vCard).</p>}
      <div className="grid gap-2">
        {rows.map((row, index) => (
          <div key={row.id} className="grid gap-2 rounded-lg border border-line bg-bg p-3 sm:grid-cols-[130px_1.4fr_auto_auto_auto] sm:items-center">
            <select className={inputCls} value={row.type} onChange={(e) => patch(index, { type: e.target.value })}>
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input className={inputCls} value={row.value ?? ""} onChange={(e) => patch(index, { value: e.target.value || null })} placeholder="value / destination" />
            <label className="flex items-center gap-1.5 text-xs text-ink-soft"><input type="checkbox" checked={row.enabled} onChange={(e) => patch(index, { enabled: e.target.checked })} className="accent-current" />Active</label>
            <label className="flex items-center gap-1.5 text-xs text-ink-soft"><input type="checkbox" checked={row.public} onChange={(e) => patch(index, { public: e.target.checked })} className="accent-current" />Public</label>
            <button onClick={() => removeRow(index)} className="text-xs text-ink-faint hover:text-warn">Remove</button>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-ink-faint">No contact channels configured.</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={addRow} disabled={rows.length >= 11} className="rounded-full border border-line px-4 py-1.5 text-xs font-medium hover:border-gold disabled:opacity-30 transition-colors">+ Add channel</button>
        <label className="flex items-center gap-2 text-xs text-ink-soft">
          Primary action
          <select className={inputCls} value={primary} onChange={(e) => setPrimary(e.target.value)}>
            {CONTACT_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <button disabled={busy} onClick={() => void save()}
          className="rounded-full bg-ink text-bg px-5 py-2 text-sm font-medium hover:bg-gold disabled:opacity-50 transition-colors">Save contacts</button>
      </div>
      <Feedback msg={msg} />
    </div>
  );
}
const CONTACT_ACTIONS = ["call", "sms", "whatsapp", "messenger", "telegram", "viber", "line", "snapchat", "email", "vcard", "custom", "share"] as const;

/* ——— Payments ——— */
function PaymentsPanel({ profileId, methods }: { profileId: string; methods: { type: string; value: string; label?: string; enabled: boolean; public: boolean; sortOrder: number }[] }) {
  const { busy, msg, run } = useAction();
  const [rows, setRows] = useState(methods);
  const patch = (index: number, part: Partial<(typeof rows)[number]>) => setRows((prev) => prev.map((row, i) => i === index ? { ...row, ...part } : row));
  const addRow = () => setRows((prev) => [...prev, { type: "venmo", value: "", enabled: true, public: false, sortOrder: prev.length }]);
  const removeRow = (index: number) => setRows((prev) => prev.filter((_, i) => i !== index));
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        {rows.map((row, index) => (
          <div key={index} className="grid gap-2 rounded-lg border border-line bg-bg p-3 sm:grid-cols-[120px_1fr_1fr_auto_auto_auto] sm:items-center">
            <select className={inputCls} value={row.type} onChange={(e) => patch(index, { type: e.target.value })}>
              {PAYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input className={inputCls} value={row.value} onChange={(e) => patch(index, { value: e.target.value })} placeholder="destination" />
            <input className={inputCls} value={row.label ?? ""} onChange={(e) => patch(index, { label: e.target.value || undefined })} placeholder="label (optional)" />
            <label className="flex items-center gap-1.5 text-xs text-ink-soft"><input type="checkbox" checked={row.enabled} onChange={(e) => patch(index, { enabled: e.target.checked })} className="accent-current" />Active</label>
            <label className="flex items-center gap-1.5 text-xs text-ink-soft"><input type="checkbox" checked={row.public} onChange={(e) => patch(index, { public: e.target.checked })} className="accent-current" />Public</label>
            <button onClick={() => removeRow(index)} className="text-xs text-ink-faint hover:text-warn">Remove</button>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-ink-faint">No payment methods configured.</p>}
      </div>
      <div className="flex items-center gap-3">
        <button onClick={addRow} disabled={rows.length >= 5} className="rounded-full border border-line px-4 py-1.5 text-xs font-medium hover:border-gold disabled:opacity-30 transition-colors">+ Add payment method</button>
        <button disabled={busy} onClick={() => void run(async () => opUpdatePaymentMethods(profileId, rows.map((r, i) => ({ ...r, sortOrder: i }))))}
          className="rounded-full bg-ink text-bg px-5 py-2 text-sm font-medium hover:bg-gold disabled:opacity-50 transition-colors">Save payments</button>
      </div>
      <Feedback msg={msg} />
    </div>
  );
}

/* ——— Floating action orb ——— */
function FloatingCtaPanel({ d }: { d: P }) {
  const { busy, msg, run } = useAction();
  const [config, setConfig] = useState(() => getFloatingCta((d.data ?? {}) as never));
  const patch = (part: Partial<FloatingCtaConfig>) => setConfig((prev) => ({ ...prev, ...part }));
  const setInfo = (index: number, part: Partial<FloatingCtaMenuItem>) =>
    setConfig((prev) => ({ ...prev, menu: prev.menu.map((item, i) => i === index ? { ...item, ...part } : item) }));
  return (
    <Box title="Floating action orb" action={<span className="text-xs text-ink-faint">{d.type === "kids" ? "accent orb only — no inbound call/pay actions" : "guest-safe floating CTA menu"}</span>}>
      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm font-medium text-ink-soft"><input type="checkbox" checked={config.enabled} onChange={(e) => patch({ enabled: e.target.checked })} className="accent-gold" />Enabled</label>
        {d.type !== "kids" && (
          <label className="flex items-center gap-2 text-sm font-medium text-ink-soft">
            <select value={config.behavior} onChange={(e) => patch({ behavior: e.target.value as FloatingCtaConfig["behavior"] })} className="rounded-md border border-line bg-bg px-2 py-1 text-xs">
              <option value="menu">Menu (expandable)</option>
              <option value="single">Single action</option>
            </select>
          </label>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className={labelCls}>Position<select className={inputCls} value={config.position} onChange={(e) => patch({ position: e.target.value as FloatingCtaConfig["position"] })}>{FLOATING_CTA_POSITIONS.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
        <label className={labelCls}>Style<select className={inputCls} value={config.style} onChange={(e) => patch({ style: e.target.value as FloatingCtaConfig["style"] })}>{FLOATING_CTA_STYLES.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
        <label className={labelCls}>Accent override<button type="button" onClick={() => patch({ accent: undefined })} className="mt-1 text-xs text-ink-faint hover:text-gold">clear</button><input className={inputCls} value={config.accent ?? ""} onChange={(e) => patch({ accent: /^#[0-9A-Fa-f]{6}$/.test(e.target.value) ? e.target.value : undefined })} placeholder="#E8B34B" /></label>
      </div>
      <div className="grid gap-2">
        {config.menu.map((item, index) => (
          <div key={index} className="grid gap-2 rounded-lg border border-line bg-bg p-3 sm:grid-cols-[130px_1fr_1fr_auto] sm:items-center">
            <select className={inputCls} value={item.type} onChange={(e) => setInfo(index, { type: e.target.value as FloatingCtaActionType })}>{FLOATING_CTA_ACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
            <input className={inputCls} value={item.label ?? ""} onChange={(e) => setInfo(index, { label: e.target.value || undefined })} placeholder="Label" />
            <input className={inputCls} value={item.value ?? ""} onChange={(e) => setInfo(index, { value: e.target.value || undefined })} placeholder="value / href / p" />
            <button onClick={() => setConfig((prev) => ({ ...prev, menu: prev.menu.filter((_, i) => i !== index) }))} className="text-xs text-ink-faint hover:text-warn">Remove</button>
          </div>
        ))}
        {config.menu.length === 0 && <p className="text-xs text-ink-faint">Empty menu — the orb opens the contact sheet instead.</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button disabled={config.menu.length >= MAX_FLOATING_CTA_MENU} onClick={() => setConfig((prev) => ({ ...prev, menu: [...prev.menu, { type: "call", label: "", value: "", visible: true }] }))} className="rounded-full border border-line px-4 py-1.5 text-xs font-medium hover:border-gold disabled:opacity-30 transition-colors">+ Add menu item</button>
        <button disabled={busy} onClick={() => void run(async () => opUpdateFloatingCta(d.id, config))} className="rounded-full bg-ink text-bg px-5 py-2 text-sm font-medium hover:bg-gold disabled:opacity-50 transition-colors">Save orb</button>
      </div>
      <Feedback msg={msg} />
    </Box>
  );
}

/* ——— Appearance (layout + palette) ——— */
function AppearancePanel({ d }: { d: P }) {
  const { busy, msg, run } = useAction();
  const layout = getProfileLayout((d.data ?? {}) as never);
  const palette = resolvePalette((d.data ?? {}) as never, d.theme);
  const [layoutKey, setLayoutKey] = useState<ProfileLayoutKey>(layout);
  const [paletteKey, setPaletteKey] = useState<string>(palette.key);
  const [custom, setCustom] = useState<Record<string, string>>({});
  const applying = busy;
  const applyIndividual = (fn: () => Promise<OpResult>) => void run(async () => { const r = await fn(); return r; });
  return (
    <Box title="Appearance" action={<span className="text-xs text-ink-faint">layout composes sections; palette sets the brand tokens</span>}>
      <div className="grid gap-TC-6">
        <div>
          <p className="text-xs font-medium text-ink-soft mb-2">Layout</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {PROFILE_LAYOUTS.map((l) => (
              <button key={l.key} onClick={() => applyIndividual(() => opUpdateLayout(d.id, l.key))} className={`text-left rounded-xl border p-3 transition-colors ${layoutKey === l.key ? "border-gold bg-bg-raised" : "border-line hover:border-gold/50"}`}>
                <p className="text-sm font-medium">{l.label}</p>{l.description && <p className="mt-1 text-xs leading-relaxed text-ink-soft">{l.description}</p>}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-ink-soft mb-2">Palette</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {PALETTE_LIST.slice(0, 18).map((pal) => (
              <button key={pal.key} onClick={() => applyIndividual(() => opUpdatePalette(d.id, pal.key))} className={`text-left rounded-xl border p-3 transition-colors ${paletteKey === pal.key ? "border-gold bg-bg-raised" : "border-line hover:border-gold/50"}`}>
                <p className="text-sm font-medium">{pal.name}</p>
                <div className="mt-2 flex overflow-hidden rounded-md border border-line">{pal.swatches.map((swatch) => <span key={swatch} className="h-3 flex-1" style={{ background: swatch }} />)}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
      <Feedback msg={msg} />
    </Box>
  );
}
