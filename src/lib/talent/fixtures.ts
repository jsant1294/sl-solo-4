import { copy, newTalent, newModule, talentSchema, type Talent, type Discipline } from "./model";
export const samplePresets = ["athlete", "cheer", "actor", "dancer", "combined"] as const;
export type SamplePreset = typeof samplePresets[number];
/** Operator-supplied sample imagery (Operator → Demo samples). Absent → built-in placeholder. */
export type SampleMedia = { portrait?: string | null; reel?: { url: string; poster?: string | null } | null };

type Fact = Talent["facts"][number];
const text = (id: string, key: string, en: string, es: string, valueEn: string, valueEs: string, discipline: Discipline): Fact =>
  ({ id, visible: true, discipline, key, label: copy(en, es), value: { type: "text", value: copy(valueEn, valueEs) }, observedAt: "" });
const num = (id: string, key: string, en: string, es: string, value: number, unit: string, discipline: Discipline): Fact =>
  ({ id, visible: true, discipline, key, label: copy(en, es), value: { type: "number", value, unit }, observedAt: "" });

/** Fictional names and claims. Demo media is explicitly unrelated playback material. No destructive seed. */
export function talentFixture(preset: SamplePreset, media: SampleMedia = {}): Talent {
  const primary: Discipline = preset === "combined" ? "cheer" : preset;
  const names = { athlete: "Jordan Ellis", cheer: "Avery Quinn", actor: "Morgan Lane", dancer: "Riley Parker", combined: "Alex Rivera" };
  const headlines = {
    athlete: copy("Focus. Footwork. Follow-through.", "Enfoque. Técnica. Constancia."),
    cheer: copy("Strength in every movement.", "Fuerza en cada movimiento."),
    actor: copy("Stories that stay with you.", "Historias que permanecen."),
    dancer: copy("Movement with intention.", "Movimiento con intención."),
    combined: copy("One performer. More than one stage.", "Un talento. Más de un escenario."),
  };
  const p = newTalent(names[preset], primary);
  p.sample = true; p.headline = headlines[preset];
  p.bio = copy("This fictional profile demonstrates how identity, selected work, and opportunity contact fit together. Replace every sample claim with your own approved content.", "Este perfil ficticio muestra identidad, trabajo seleccionado y contacto. Sustituye cada dato de ejemplo por contenido propio aprobado.");
  p.disciplines = preset === "combined" ? ["cheer", "dancer"] : [primary];
  for (const d of p.disciplines) p.modules[d] = { ...newModule()!, visible: true, affiliation: copy("Sample Arts & Athletics Program", "Programa de artes y atletismo de ejemplo"), skills: d === "actor" ? copy("Stage acting · Improvisation", "Teatro · Improvisación") : d === "dancer" ? copy("Contemporary · Jazz", "Contemporáneo · Jazz") : d === "cheer" ? copy("Tumbling · Stunt technique", "Acrobacia · Técnica de elevaciones") : copy("Footwork · Route running", "Juego de pies · Rutas"), training: copy("Sample training entry — fictional", "Formación de ejemplo — ficticia") };

  // "At a glance" tiles — typed, discipline-scoped, clearly sample values.
  const facts: Record<SamplePreset, Fact[]> = {
    athlete: [text("f-pos", "position", "Position", "Posición", "Wide receiver", "Receptor abierto", "athlete"), num("f-class", "class", "Class of", "Generación", 2027, "", "athlete"), text("f-ht", "height", "Height", "Estatura", "6'1\"", "1,85 m", "athlete")],
    cheer: [text("f-role", "role", "Role", "Rol", "Flyer · Tumbler", "Flyer · Acróbata", "cheer"), num("f-class", "class", "Class of", "Generación", 2028, "", "cheer"), text("f-level", "level", "Level", "Nivel", "Level 6", "Nivel 6", "cheer")],
    actor: [text("f-range", "range", "Playing range", "Rango de edad", "18–25", "18–25", "actor"), text("f-lang", "languages", "Languages", "Idiomas", "English · Spanish", "Inglés · Español", "actor"), text("f-base", "base", "Based in", "Con base en", "Austin, TX", "Austin, TX", "actor")],
    dancer: [text("f-style", "styles", "Styles", "Estilos", "Contemporary · Jazz", "Contemporáneo · Jazz", "dancer"), num("f-years", "years", "Training", "Formación", 12, "yrs", "dancer"), text("f-base", "base", "Based in", "Con base en", "Miami, FL", "Miami, FL", "dancer")],
    combined: [text("f-cheer", "cheer", "Cheer", "Animación", "Flyer", "Flyer", "cheer"), text("f-dance", "dance", "Dance", "Danza", "Jazz · Hip-hop", "Jazz · Hip-hop", "dancer"), num("f-class", "class", "Class of", "Generación", 2027, "", "cheer")],
  };
  p.facts = facts[preset];
  p.credits = [{ id: "sample-credit", visible: true, discipline: primary, title: copy("Sample showcase — fictional", "Muestra de ejemplo — ficticia"), role: copy("Performer", "Intérprete"), organization: "Sample program", date: "2026", evidenceUrl: "" }];

  // Every sample shows the primary contact button a real profile would. Recruiting → coach; auditions → agent.
  const recruiting = p.primaryGoal === "recruiting";
  p.contacts = [{ id: "sample-contact", visible: true, role: recruiting ? "coach" : "agent", goals: [p.primaryGoal], destination: "mailto:sample@example.com",
    label: recruiting ? copy("Contact for recruiting", "Contacto de reclutamiento") : copy("Book an audition", "Solicitar audición") }];
  p.primaryContactId = "sample-contact";

  p.portrait = media.portrait ?? "";
  p.media = [media.reel
    ? { id: "sample-video", visible: true, kind: "video", url: media.reel.url, poster: media.reel.poster ?? media.portrait ?? "", title: copy("Highlight reel", "Video destacado"), caption: copy("Sample reel.", "Reel de ejemplo."), alt: copy() }
    : { id: "sample-video", visible: true, kind: "video", url: "https://media.w3.org/2010/05/sintel/trailer.mp4", poster: media.portrait ?? "", title: copy("Playback demo · Sintel trailer", "Demostración de video · Tráiler de Sintel"), caption: copy("Blender Foundation sample video; not this fictional person’s work.", "Video de muestra de Blender Foundation; no es trabajo de esta persona ficticia."), alt: copy() }];
  p.featuredReelId = "sample-video";
  p.presentation.theme = preset === "actor" || preset === "dancer" ? "obsidian" : preset === "athlete" ? "signature_gold" : "ivory";
  return talentSchema.parse(p);
}
