import type { Locale } from "@/i18n/dict";
import type { Profile, ProfileLink } from "@/db/schema";
import type { StoredContactChannel } from "@/lib/profile-data";
import { asKidsData } from "@/lib/profile-data";
import { StandardProfile } from "./standard-profile";
import { KidsProfile } from "./kids-profile";

/**
 * Single public rendering boundary. Shared infra (routing, destination,
 * theme, events) stays shared; only presentation branches by type.
 */
export function ProfileRenderer({
  profile, links, contactChannels = [], locale,
}: { profile: Profile; links: ProfileLink[]; contactChannels?: StoredContactChannel[]; locale: Locale }) {
  if (profile.type === "kids") {
    const kids = asKidsData(profile.data);
    if (!kids) return null; // invalid kids payload never renders
    return <KidsProfile profile={profile} data={kids} contactChannels={contactChannels} accent={profile.accent} username={profile.username} locale={locale} />;
  }
  return <StandardProfile profile={profile} links={links} contactChannels={contactChannels} locale={locale} />;
}
