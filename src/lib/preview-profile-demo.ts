import type { Profile, ProfileLink } from "@/db/schema";
import type { StoredContactChannel } from "@/lib/profile-data";

export const PREVIEW_DEMO_USERNAME = "solo-demo";
export const PREVIEW_DEMO_TOKEN = "preview-all-actions";
export const PREVIEW_DEMO_PROFILE_ID = "preview-demo-profile";

export function previewProfileDemoEnabled() {
  return process.env.VERCEL_ENV !== "production";
}

const now = new Date("2026-01-01T00:00:00.000Z");
const channels = [
  ["call", "+12025550148"], ["sms", "+12025550148"], ["whatsapp", "+12025550148"],
  ["messenger", "snaplinkdemo"], ["telegram", "snaplinkdemo"], ["viber", "snaplinkdemo"],
  ["line", "snaplinkdemo"], ["snapchat", "snaplinkdemo"], ["email", "solo-demo@example.com"],
  ["vcard", ""], ["custom", "https://example.com/solo-demo/contact"],
] as const;

export const previewDemoContactChannels: StoredContactChannel[] = channels.map(([type, value], sortOrder) => ({
  id: `preview-contact-${type}`, profileId: PREVIEW_DEMO_PROFILE_ID, type, value,
  enabled: true, public: true, sortOrder, createdAt: now, updatedAt: now,
}));

export const previewDemoLinks: ProfileLink[] = [
  { id: "preview-featured-work", profileId: PREVIEW_DEMO_PROFILE_ID, type: "website", label: "See my featured work", url: "https://example.com/solo-demo/work", sortOrder: 0, visible: true },
  { id: "preview-featured-book", profileId: PREVIEW_DEMO_PROFILE_ID, type: "custom", label: "Book a demo meeting", url: "https://example.com/solo-demo/book", sortOrder: 1, visible: true },
  { id: "preview-instagram", profileId: PREVIEW_DEMO_PROFILE_ID, type: "instagram", label: "Instagram", url: "https://example.com/solo-demo/instagram", sortOrder: 2, visible: true },
  { id: "preview-facebook", profileId: PREVIEW_DEMO_PROFILE_ID, type: "facebook", label: "Facebook", url: "https://example.com/solo-demo/facebook", sortOrder: 3, visible: true },
  { id: "preview-tiktok", profileId: PREVIEW_DEMO_PROFILE_ID, type: "tiktok", label: "TikTok", url: "https://example.com/solo-demo/tiktok", sortOrder: 4, visible: true },
  { id: "preview-linkedin", profileId: PREVIEW_DEMO_PROFILE_ID, type: "linkedin", label: "LinkedIn", url: "https://example.com/solo-demo/linkedin", sortOrder: 5, visible: true },
  { id: "preview-youtube", profileId: PREVIEW_DEMO_PROFILE_ID, type: "youtube", label: "YouTube", url: "https://example.com/solo-demo/youtube", sortOrder: 6, visible: true },
  { id: "preview-x", profileId: PREVIEW_DEMO_PROFILE_ID, type: "x", label: "X", url: "https://example.com/solo-demo/x", sortOrder: 7, visible: true },
  { id: "preview-shop", profileId: PREVIEW_DEMO_PROFILE_ID, type: "website", label: "Shop my collection", url: "https://example.com/solo-demo/shop", sortOrder: 8, visible: true },
  { id: "preview-newsletter", profileId: PREVIEW_DEMO_PROFILE_ID, type: "custom", label: "Join my newsletter", url: "https://example.com/solo-demo/newsletter", sortOrder: 9, visible: true },
];

export const previewDemoProfile: Profile & { links: ProfileLink[]; contactChannels: StoredContactChannel[] } = {
  id: PREVIEW_DEMO_PROFILE_ID,
  userId: "preview-demo-user",
  type: "creator",
  status: "active",
  username: PREVIEW_DEMO_USERNAME,
  displayName: "Jordan Rivera",
  headline: "Creator · Designer · Community Builder",
  bio: "This fully loaded SOLO profile demonstrates every public action while keeping the first mobile screen focused and simple.",
  avatarUrl: null,
  phone: "+12025550148",
  email: "solo-demo@example.com",
  website: "https://example.com/solo-demo",
  location: "Atlanta, Georgia",
  accent: "#D5AB55",
  theme: "signature_gold",
  locale: "en",
  data: {
    experience: {
      contactChannels: previewDemoContactChannels.map(({ type, value, enabled, public: visible, sortOrder }) => ({ type, value, enabled, public: visible, sortOrder })),
      primaryContactAction: "whatsapp",
      shareTitle: "Jordan Rivera on SnapLink SOLO",
      shareDescription: "Tap to connect, save contact details, explore links, or send a message.",
      shareImageUrl: null,
      favoriteLinkIds: ["preview-featured-work", "preview-featured-book"],
      paymentMethods: [
        { type: "venmo", value: "snaplinkdemo", enabled: true, public: true, sortOrder: 0 },
        { type: "cashapp", value: "$snaplinkdemo", enabled: true, public: true, sortOrder: 1 },
        { type: "paypal", value: "snaplinkdemo", enabled: true, public: true, sortOrder: 2 },
        { type: "zelle", value: "solo-demo@example.com", enabled: true, public: true, sortOrder: 3 },
        { type: "custom", label: "Demo payment page", value: "https://example.com/solo-demo/pay", enabled: true, public: true, sortOrder: 4 },
      ],
    },
  },
  active: true,
  createdAt: now,
  links: previewDemoLinks,
  contactChannels: previewDemoContactChannels,
};
