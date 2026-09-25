import { db } from "@/db";
import { repo } from "@/db/repo";
import { samplePresets, talentFixture, type SamplePreset } from "@/lib/talent/fixtures";
import { proSampleKeys, proSampleProfile, type ProSampleKey } from "@/lib/pro-samples";
import type { Talent } from "@/lib/talent/model";
import type { ProSample } from "@/lib/pro-samples";

/**
 * Every storefront sample profile, in default display order (interleaved so the gallery shows
 * range quickly). The story line is the emotional hook: the moment someone taps.
 */
export const sampleKeys = ["athlete", "nurse", "actor", "realtor", "cheer", "dancer", "combined"] as const;
export type SampleKey = typeof sampleKeys[number];
export const isSampleKey = (value: unknown): value is SampleKey => sampleKeys.includes(value as SampleKey);
const isTalent = (key: SampleKey): key is SamplePreset => samplePresets.includes(key as SamplePreset);
export const hasReel = isTalent;

type Copy = [en: string, es: string];
const meta: Record<SampleKey, { label: Copy; story: Copy; start: string }> = {
  athlete: { label: ["Athlete", "Atleta"], start: "athlete",
    story: ["Friday night. A college scout in the stands. One tap — and your reel is already playing on their phone.", "Viernes por la noche. Un reclutador en las gradas. Un toque — y tu video ya se reproduce en su teléfono."] },
  cheer: { label: ["Cheer", "Animación"], start: "cheer",
    story: ["Competition weekend. A college coach walks the mat. One tap shows every stunt you've ever landed.", "Fin de semana de competencia. Un entrenador universitario recorre el tapete. Un toque muestra cada acrobacia que has logrado."] },
  actor: { label: ["Actor", "Actor"], start: "actor",
    story: ["The audition ends. The casting director asks, “Do you have a reel?” You don't dig for a link. You just tap.", "Termina la audición. El director de casting pregunta: “¿Tienes un reel?”. No buscas un enlace. Solo tocas."] },
  dancer: { label: ["Dancer", "Danza"], start: "dancer",
    story: ["After the showcase, a choreographer finds you backstage. One tap — your reel, your training, your agent.", "Después de la función, un coreógrafo te busca tras bambalinas. Un toque — tu reel, tu formación, tu agente."] },
  combined: { label: ["Multi-talent", "Multitalento"], start: "creator",
    story: ["You cheer. You dance. You never fit in one box — and now you don't have to.", "Animas. Bailas. Nunca cupiste en una sola caja — y ahora no tienes que hacerlo."] },
  nurse: { label: ["Nurse", "Enfermería"], start: "professional",
    story: ["Career fair. Twelve booths, one shot. One tap — your license, your resume, and your number in the recruiter's phone.", "Feria de empleo. Doce mesas, una oportunidad. Un toque — tu licencia, tu currículum y tu número en el teléfono del reclutador."] },
  realtor: { label: ["Realtor", "Bienes raíces"], start: "professional",
    story: ["Open house. Forty visitors. The ones who tap are the ones who call you back.", "Casa abierta. Cuarenta visitantes. Los que tocan son los que te vuelven a llamar."] },
};
/** Product brand shown with a sample (athlete + cheer are SnapTrack). */
export const sampleBrand = (key: SampleKey) => key === "athlete" || key === "cheer" ? "SnapTrack" : null;
export const sampleLabel = (key: SampleKey, locale: "en" | "es") => meta[key].label[locale === "es" ? 1 : 0];
export const sampleStory = (key: SampleKey, locale: "en" | "es") => meta[key].story[locale === "es" ? 1 : 0];
export const sampleStartHref = (key: SampleKey) => `/get-started?path=${meta[key].start}`;

export type LoadedSample =
  | { key: SampleKey; kind: "talent"; active: boolean; order: number; talent: Talent }
  | { key: SampleKey; kind: "pro"; active: boolean; order: number; profile: ProSample };

/**
 * Samples with operator media (Operator → Demo samples) merged in. Order/visibility come from the
 * CMS row when present, else defaults. Never throws — before db:push it's built-in placeholders.
 */
export async function loadSamples(locale: "en" | "es", { includeHidden = false } = {}): Promise<LoadedSample[]> {
  const rows = db ? await repo.demoSamples.list().catch(() => []) : [];
  return sampleKeys
    .map((key, index): LoadedSample => {
      const row = rows.find((item) => item.key === key);
      const portrait = row?.portrait?.kind === "image" ? row.portrait.url : null;
      const base = { key, active: row?.active ?? true, order: row?.sortOrder ?? index };
      if (isTalent(key)) {
        const reel = row?.reel?.kind === "video" ? { url: row.reel.url, poster: portrait } : null;
        return { ...base, kind: "talent", talent: talentFixture(key, { portrait, reel }) };
      }
      return { ...base, kind: "pro", profile: proSampleProfile(key as ProSampleKey, locale, portrait) };
    })
    .filter((sample) => includeHidden || sample.active)
    .sort((a, b) => a.order - b.order);
}
export { proSampleKeys };
