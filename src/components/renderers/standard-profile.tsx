import Link from "next/link";
import type { ReactNode } from "react";
import { getDict, type Locale } from "@/i18n/dict";
import type { Profile, ProfileLink } from "@/db/schema";
import type { ResumeCta } from "@/lib/profile-data";
import { getProfileExperience, getProfilePresentation, type StoredContactChannel } from "@/lib/profile-data";
import { ContactSheet } from "@/app/u/[username]/contact-sheet";
import { ContactOrb } from "@/components/contact-orb";
import { publicContactActions, resolvePrimaryAction } from "@/lib/contact-channels";
import { canonicalProfileUrl } from "@/lib/profile-sharing";
import { TrackedProfileLink } from "@/components/profile-link";
import { ProfileQuickActions } from "@/components/profile-quick-actions";
import { publicPaymentMethods } from "@/lib/payment-methods";
import { withLang } from "@/i18n/util";
import { resolvePalette } from "@/lib/profile-palettes";

const themeClass: Record<string, string> = {
  obsidian: "theme-obsidian", ivory: "", signature_gold: "theme-obsidian",
};

/** Personal + Business share this renderer; Business shows category eyebrow. */
export function StandardProfile({
  profile, links, contactChannels, locale, resumeCta = null,
}: { profile: Profile; links: ProfileLink[]; contactChannels: StoredContactChannel[]; locale: Locale; resumeCta?: ResumeCta }) {
  const t = getDict(locale);
  const initials = profile.displayName.split(" ").map((s) => s[0]).slice(0, 2).join("");
  const category = profile.type === "business"
    ? (profile.data as { category?: string })?.category : null;
  const actions = publicContactActions(profile, contactChannels, "", locale);
  const primary = resolvePrimaryAction(profile, actions);
  const palette = resolvePalette(profile.data, profile.theme);
  const settings = getProfileExperience(profile.data, profile.id);
  const shareTitle = settings.shareTitle || profile.displayName;
  const shareDescription = settings.shareDescription || profile.headline || profile.bio || (locale === "es" ? "Toca. Conecta. Comparte." : "Tap. Connect. Share.");
  const visibleLinks = links.filter((link) => link.visible);
  const favorites = settings.favoriteLinkIds.map((id) => visibleLinks.find((link) => link.id === id)).filter(Boolean) as ProfileLink[];
  const favoriteIds = new Set(favorites.map((link) => link.id));
  const socialTypes = new Set(["instagram", "facebook", "tiktok", "linkedin", "youtube", "x"]);
  const socials = visibleLinks.filter((link) => socialTypes.has(link.type) && !favoriteIds.has(link.id));
  const remaining = visibleLinks.filter((link) => !socialTypes.has(link.type) && !favoriteIds.has(link.id));
const payments = publicPaymentMethods(settings.paymentMethods, locale);
  const secondaryActions = actions.filter((action) => action.type !== primary.type);

  const presentation = getProfilePresentation(profile.data);
  const orderedSections = presentation.filter((s) => s.visible).sort((a, b) => a.sortOrder - b.sortOrder);
  const show = (id: string) => orderedSections.some((s) => s.id === id);
  const blocks: Record<string, ReactNode> = {
    identity: (
      <>
        <div className="relative mx-auto w-32 sm:w-36">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt={profile.displayName}
              className={`h-32 w-32 object-cover border-2 border-bg-raised shadow-md sm:h-36 sm:w-36 ${settings.avatarShape === "square" ? "rounded-2xl" : "rounded-full"}`} />
          ) : (
            <div className={`grid h-32 w-32 place-items-center border border-line-strong bg-bg-raised font-display text-3xl text-gold shadow-md sm:h-36 sm:w-36 sm:text-4xl ${settings.avatarShape === "square" ? "rounded-2xl" : "rounded-full"}`}>
              {initials}
            </div>
          )}
        </div>
        {category && <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-gold mt-5">{category}</p>}
        <h1 className={`font-display text-2xl font-semibold tracking-tight ${category ? "mt-1" : "mt-4 sm:mt-5"}`}>{profile.displayName}</h1>
        {profile.headline && <p className="text-gold text-sm font-medium mt-1">{profile.headline}</p>}
        {profile.location && <p className="text-ink-faint text-xs mt-1 font-mono">{profile.location}</p>}
      </>
    ),
    bio: profile.bio
      ? <p className="mt-3 line-clamp-3 text-[0.9rem] leading-relaxed text-ink-soft sm:mt-4 sm:line-clamp-none sm:text-[0.95rem]">{profile.bio}</p>
      : null,
    quickActions: (
      <ProfileQuickActions username={profile.username} actions={secondaryActions} payments={payments} locale={locale}/>
    ),
    resume: resumeCta ? (
      <Link href={withLang(resumeCta.href, locale)} className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-gold/40 bg-gold/5 px-4 py-3.5 no-underline text-ink transition-colors hover:border-gold">
        <span className="min-w-0">
          <span className="block text-[0.65rem] uppercase tracking-[0.18em] text-gold font-mono">{locale === "es" ? "Profesional" : "Professional"}</span>
          {resumeCta.headline && <span className="block text-sm text-ink-soft truncate mt-0.5">{resumeCta.headline}</span>}
        </span>
        <span className="shrink-0 font-medium text-sm text-gold">{resumeCta.ctaLabel}</span>
      </Link>
    ) : null,
    featuredLinks: favorites.length > 0
      ? <div className="mt-5 flex flex-col gap-2">{favorites.map((link) => <ProfileLinkCard key={link.id} username={profile.username} link={link} featured/>)}</div>
      : null,
    socialLinks: socials.length > 0
      ? <div className="mt-5 flex flex-wrap items-center justify-center gap-2" aria-label={t.contact.socialProfiles}>{socials.map((link) => <TrackedProfileLink key={link.id} username={profile.username} href={link.url} className="grid h-11 w-11 place-items-center rounded-full border border-line bg-bg-raised text-ink no-underline hover:border-gold"><span className="sr-only">{link.label ?? link.type}</span><SocialGlyph type={link.type}/></TrackedProfileLink>)}</div>
      : null,
    moreLinks: (remaining.length > 0 || profile.website)
      ? <>
        <details className="mt-5 rounded-xl border border-line bg-bg-raised sm:hidden"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium"><span>{locale === "es" ? "Más enlaces" : "More links"}</span><span aria-hidden="true" className="text-ink-faint">＋</span></summary><div className="grid gap-2 border-t border-line p-2">{profile.website && <SimpleLinkCard href={profile.website} label={t.profile.website}/>} {remaining.map((link) => <ProfileLinkCard key={link.id} username={profile.username} link={link}/>)}</div></details>
        <div className="mt-8 hidden flex-col gap-2.5 sm:flex"><p className="mb-1 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-faint">{t.profile.links}</p>{profile.website && <SimpleLinkCard href={profile.website} label={t.profile.website}/>} {remaining.map((link) => <ProfileLinkCard key={link.id} username={profile.username} link={link}/>)}</div>
      </>
      : null,
    contactSheet: (
      <>
        <details className="mt-5 rounded-xl border border-line bg-bg-raised sm:hidden"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium"><span>{locale === "es" ? "Enviar una nota" : "Send a note"}</span><span aria-hidden="true" className="text-ink-faint">＋</span></summary><div className="border-t border-line p-3"><ContactSheet locale={locale} username={profile.username}/></div></details>
        <div className="mt-8 hidden sm:block"><ContactSheet locale={locale} username={profile.username}/></div>
      </>
    ),
  };

  return (
    <main className={`min-h-screen ${themeClass[profile.theme]} bg-bg text-ink`} style={palette.style}>
      <div className="mx-auto max-w-[520px] overflow-x-clip px-4 pb-28 text-center sm:px-5 sm:pb-20">
        <div className="h-28 -mx-4 mb-[-2.5rem] sm:h-40 sm:-mx-5 sm:mb-[-3rem]"
          style={{ background: "var(--hero)" }} />

        {orderedSections.map((section) => blocks[section.id] ?? null)}

        <div className="mt-12 text-center">
          <Link href="/" className="inline-flex items-baseline gap-2 no-underline opacity-60 hover:opacity-100 transition-opacity">
            <span className="font-display text-sm font-semibold text-ink">SnapLink</span>
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-gold">Solo</span>
          </Link>
          <Link href={withLang("/hardware", locale)} className="mt-2 block font-mono text-[0.65rem] uppercase tracking-[0.15em] text-gold no-underline hover:underline">
            {locale === "es" ? "Consigue tu SnapLink →" : "Get your SnapLink →"}
          </Link>
        </div>
      </div>
      {show("quickActions") && <ContactOrb username={profile.username} actions={actions} primary={primary} shareTitle={shareTitle} shareDescription={shareDescription} shareUrl={canonicalProfileUrl(profile.username)} locale={locale} />}
    </main>
  );
}

function ProfileLinkCard({ username, link, featured = false }: { username: string; link: ProfileLink; featured?: boolean }) { return <TrackedProfileLink username={username} href={link.url} className={`flex min-h-11 items-center justify-between rounded-xl border bg-bg-raised px-4 no-underline text-ink transition-colors hover:border-gold/60 ${featured ? "border-gold/45 py-3 shadow-sm" : "border-line py-2.5"}`}><span className="truncate text-sm font-medium">{link.label ?? link.type}</span><span className="ml-3 font-mono text-[0.6rem] uppercase text-ink-faint">{link.type}</span></TrackedProfileLink>; }
function SimpleLinkCard({ href, label }: { href: string; label: string }) { return <a href={href} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-between rounded-xl border border-line bg-bg-raised px-4 py-2.5 text-sm font-medium text-ink no-underline hover:border-gold/60"><span>{label}</span><span aria-hidden="true" className="text-ink-faint">↗</span></a>; }
function SocialGlyph({ type }: { type: string }) { const label = ({ instagram: "◎", facebook: "f", tiktok: "♪", linkedin: "in", youtube: "▶", x: "𝕏" } as Record<string, string>)[type] ?? "↗"; return <span aria-hidden="true" className="text-sm font-semibold">{label}</span>; }
