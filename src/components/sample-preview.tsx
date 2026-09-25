import { TalentView } from "@/components/talent/view";
import { StandardProfile } from "@/components/renderers/standard-profile";
import type { LoadedSample } from "@/lib/samples";

/** Renders any storefront sample with the same renderer a real customer profile uses. */
export function SamplePreview({ sample, locale, compact = false }: { sample: LoadedSample; locale: "en" | "es"; compact?: boolean }) {
  return sample.kind === "talent"
    ? <TalentView talent={sample.talent} locale={locale} compact={compact}/>
    : <StandardProfile profile={sample.profile} links={sample.profile.links} contactChannels={sample.profile.contactChannels} locale={locale}/>;
}
