import type { Profile } from "@/db/schema";
import { asKidsData, getProfileExperience } from "@/lib/profile-data";

export type ShareModel = {
  title: string; description: string; imageUrl: string; canonicalUrl: string;
  displayName: string; headline: string; avatarUrl: string | null; initials: string;
  theme: Profile["theme"]; kidsSafe: boolean; avatarShape: "round" | "square";
};

export function canonicalProfileUrl(username: string, origin?: string) {
  const base = (origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/u/${encodeURIComponent(username)}`;
}

function generatedOgImageUrl(canonicalUrl: string, avatarUrl: string | null) {
  let version = "no-avatar";
  if (avatarUrl) {
    try {
      version = new URL(avatarUrl).pathname.split("/").filter(Boolean).pop() || "avatar";
    } catch {
      version = avatarUrl;
    }
  }
  return `${canonicalUrl}/opengraph-image?v=${encodeURIComponent(version)}`;
}

export function buildShareModel(profile: Profile, origin?: string): ShareModel {
  const canonicalUrl = canonicalProfileUrl(profile.username, origin);
  const settings = getProfileExperience(profile.data, profile.id);
  if (profile.type === "kids") {
    const kids = asKidsData(profile.data);
    return {
      title: settings.shareTitle || "SnapLink Protect",
      description: settings.shareDescription || "Tap to connect safely.",
      imageUrl: generatedOgImageUrl(canonicalUrl, null), canonicalUrl,
      displayName: kids?.firstName ? `${kids.firstName.charAt(0).toUpperCase()}'s SnapLink` : "SnapLink Protect",
      headline: "SnapLink Protect", avatarUrl: null, initials: "SL", theme: "ivory", kidsSafe: true, avatarShape: "round",
    };
  }
  const title = settings.shareTitle?.trim() || profile.displayName;
  const description = settings.shareDescription?.trim() || profile.headline?.trim() || profile.bio?.trim().slice(0, 180) || "Tap. Connect. Share.";
  const initials = profile.displayName.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "SL";
  return {
    title, description, imageUrl: settings.shareImageUrl || generatedOgImageUrl(canonicalUrl, profile.avatarUrl), canonicalUrl,
    displayName: profile.displayName, headline: profile.headline || description,
    avatarUrl: profile.avatarUrl, initials, theme: profile.theme, kidsSafe: false, avatarShape: settings.avatarShape,
  };
}
