import { permanentRedirect } from "next/navigation";
/** Moved to /examples/[key] (all samples, incl. professionals). Kept so shared/CMS links keep working. */
export default async function LegacyExample({ params, searchParams }: { params: Promise<{ preset: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { preset } = await params; const { lang } = await searchParams;
  permanentRedirect(`/examples/${encodeURIComponent(preset)}${lang === "es" ? "?lang=es" : ""}`);
}
