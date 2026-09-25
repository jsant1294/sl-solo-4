import { hasTalent, readEnvelope, projectTalent } from "@/lib/talent/model";
import { TalentView } from "@/components/talent/view";
import type { Locale } from "@/i18n/dict";
import type { Profile, ProfileLink } from "@/db/schema";
import type { StoredContactChannel, ResumeCta } from "@/lib/profile-data";
import { asKidsData } from "@/lib/profile-data";
import { StandardProfile } from "./standard-profile";
import { KidsProfile } from "./kids-profile";

/**
 * Single public rendering boundary. Shared infra (routing, destination,
 * theme, events) stays shared; only presentation branches by type.
 */
export function ProfileRenderer({
  profile, links, contactChannels = [], locale, resumeCta = null,
}: { profile: Profile; links: ProfileLink[]; contactChannels?: StoredContactChannel[]; locale: Locale; resumeCta?: ResumeCta }) {
  if (profile.type === "kids") {
    const kids = asKidsData(profile.data);
    if (!kids) return null; // invalid kids payload never renders
    return <KidsProfile profile={profile} data={kids} contactChannels={contactChannels} accent={profile.accent} username={profile.username} locale={locale} />;
  }
  if (hasTalent(profile.data)) {
    const envelope = readEnvelope(profile.data);
    if (!envelope) return null; // corrupt Talent payload never renders
    if (envelope.published) return <TalentView talent={projectTalent(envelope.published)} locale={locale} />;
  }
  return <StandardProfile profile={profile} links={links} contactChannels={contactChannels} locale={locale} resumeCta={resumeCta} />;
}
