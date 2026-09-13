import { z } from "zod";

/**
 * PROFILE PALETTES — single source of truth for the Solo palette library.
 * Shared by the operator control plane (cards/swatches) and the public
 * renderer (CSS custom properties on the profile root). Nothing here is
 * operator-only: the customer theme selector and public pages read the same
 * definitions. Values are space-separated HSL triplets so Tailwind's
 * `hsl(var(--x) / <alpha>)` utilities keep working (bg-bg/50 etc.).
 *
 * Custom operator palettes store the CUSTOM_PALETTE_FIELDS subset and merge
 * on top of a base palette at render time.
 */

export type PaletteTokens = {
  bg: string;          /* --bg */
  bgRaised: string;    /* --bg-raised (surface) */
  bgSunken: string;    /* --bg-sunken (surfaceAlt) */
  ink: string;         /* --ink (text) */
  inkSoft: string;     /* --ink-soft (mutedText) */
  inkFaint: string;    /* --ink-faint */
  line: string;        /* --line (border) */
  lineStrong: string;  /* --line-strong */
  gold: string;        /* --gold (primary) */
  goldBright: string;  /* --gold-bright */
  goldInk: string;     /* --gold-ink */
  accent: string;      /* --accent */
  btnBg: string;       /* --btn-bg (buttonBackground) */
  btnText: string;     /* --btn-text (buttonText) */
};

export type PaletteDefinition = PaletteTokens & {
  key: string;
  name: string;
  dark: boolean;
  /** 3 representative colors for the operator palette cards (hex). */
  swatches: string[];
  /** Decorative hero background baked from the tokens. */
  hero: string;
};

/**
 * Fields an operator may override with a custom palette. Keys map 1:1 to the
 * token model. `goldBright`/`goldInk`/`inkFaint`/`lineStrong` + hero are not
 * overridable — they stay derived from the chosen base palette.
 */
export const CUSTOM_PALETTE_FIELDS = [
  { key: "background", varName: "--bg", label: "Background" },
  { key: "surface", varName: "--bg-raised", label: "Surface" },
  { key: "surfaceAlt", varName: "--bg-sunken", label: "Surface alt" },
  { key: "text", varName: "--ink", label: "Text" },
  { key: "mutedText", varName: "--ink-soft", label: "Muted text" },
  { key: "primary", varName: "--gold", label: "Primary" },
  { key: "accent", varName: "--accent", label: "Accent" },
  { key: "buttonBackground", varName: "--btn-bg", label: "Button background" },
  { key: "buttonText", varName: "--btn-text", label: "Button text" },
  { key: "border", varName: "--line", label: "Border" },
] as const;
export const customPaletteSchema = z.object({
  background: z.string().max(60).optional(),
  surface: z.string().max(60).optional(),
  surfaceAlt: z.string().max(60).optional(),
  text: z.string().max(60).optional(),
  mutedText: z.string().max(60).optional(),
  primary: z.string().max(60).optional(),
  accent: z.string().max(60).optional(),
  buttonBackground: z.string().max(60).optional(),
  buttonText: z.string().max(60).optional(),
  border: z.string().max(60).optional(),
});

/** Convert a hex color to a space-separated HSL triplet, or null if invalid. */
export function hexToHslTriplet(hex: string): string | null {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!m) return null;
  let hx = m[1];
  if (hx.length === 3) hx = hx.split("").map((c) => c + c).join("");
  const r = parseInt(hx.slice(0, 2), 16) / 255;
  const g = parseInt(hx.slice(2, 4), 16) / 255;
  const b = parseInt(hx.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** HSL triplet → hex (for swatch cards / storage previews). */
export function hslTripletToHex(triplet: string): string {
  const parts = triplet.trim().split(/\s+/);
  const h = parseFloat(parts[0] ?? "0");
  const s = parseFloat(parts[1] ?? "0%") / 100;
  const l = parseFloat(parts[2] ?? "50%") / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const mm = l - c / 2;
  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const to = (v: number) => Math.round((v + mm) * 255).toString(16).padStart(2, "0");
  return `#${to(rgb[0])}${to(rgb[1])}${to(rgb[2])}`;
}

const heroFrom = (glow: string, alpha: string) =>
  `radial-gradient(130% 130% at 70% 0%, hsl(${glow} / ${alpha}), transparent 62%)`;

/* — Light neutral base (Ivory) — */
const L: PaletteTokens = {
  bg: "42 33% 97%", bgRaised: "0 0% 100%", bgSunken: "40 20% 94%",
  ink: "24 10% 10%", inkSoft: "24 6% 34%", inkFaint: "24 5% 55%",
  line: "30 12% 88%", lineStrong: "30 10% 78%",
  gold: "41 46% 48%", goldBright: "43 62% 56%", goldInk: "40 55% 22%",
  accent: "41 46% 48%", btnBg: "24 10% 10%", btnText: "42 33% 97%",
};

/* — Dark neutral base (Obsidian) — */
const D: PaletteTokens = {
  bg: "24 8% 7%", bgRaised: "24 7% 11%", bgSunken: "24 9% 5%",
  ink: "42 30% 95%", inkSoft: "40 10% 72%", inkFaint: "40 6% 50%",
  line: "30 8% 20%", lineStrong: "30 8% 28%",
  gold: "43 58% 58%", goldBright: "44 72% 66%", goldInk: "43 60% 80%",
  accent: "43 58% 58%", btnBg: "42 30% 95%", btnText: "24 8% 7%",
};

function palette(key: string, name: string, tokens: PaletteTokens, swatches: string[], dark = false, hero?: string): PaletteDefinition {
  return {
    key, name, dark, swatches,
    ...tokens,
    hero: hero ?? heroFrom(tokens.goldBright, dark ? "0.5" : "0.3"),
  };
}

export const PALETTES: Record<string, PaletteDefinition> = {
  /* — Built-in Solo themes (historical `profiles.theme` values) — */
  ivory: palette("ivory", "Ivory", L, ["#F8F6F1", "#17140B", "#B78A32"]),
  obsidian: palette("obsidian", "Obsidian", D, ["#14120F", "#F1E9D5", "#C9A94E"], true),
  signature_gold: palette("signature_gold", "Signature Gold", D, ["#14120F", "#E9C46A", "#C9A94E"], true),
  champagne_studio: palette("champagne_studio", "Champagne Studio", {
    ...L, bg: "40 45% 96%", bgRaised: "42 55% 99%", bgSunken: "38 40% 92%",
    ink: "26 42% 12%", inkSoft: "28 26% 38%", inkFaint: "28 20% 56%",
    line: "38 32% 87%", lineStrong: "36 24% 76%",
    gold: "40 42% 45%", goldBright: "42 62% 54%", goldInk: "38 52% 22%",
    accent: "18 62% 52%", btnBg: "26 42% 12%", btnText: "42 55% 99%",
  }, ["#F6EDDC", "#2B1D12", "#A97E3B"]),
  stamped_steel: palette("stamped_steel", "Stamped Steel", {
    ...L, bg: "220 12% 95%", bgRaised: "0 0% 100%", bgSunken: "218 15% 91%",
    ink: "222 20% 12%", inkSoft: "222 10% 36%", inkFaint: "222 8% 55%",
    line: "218 14% 86%", lineStrong: "218 14% 74%",
    gold: "210 32% 38%", goldBright: "205 40% 48%", goldInk: "212 55% 16%",
    accent: "200 45% 46%", btnBg: "222 20% 12%", btnText: "0 0% 100%",
  }, ["#F0F2F5", "#151A22", "#41617F"]),
  forest_pro: palette("forest_pro", "Forest Pro", {
    ...L, bg: "150 25% 94%", bgRaised: "0 0% 100%", bgSunken: "148 28% 90%",
    ink: "150 30% 11%", inkSoft: "150 14% 34%", inkFaint: "150 12% 52%",
    line: "148 24% 86%", lineStrong: "148 22% 74%",
    gold: "150 44% 30%", goldBright: "145 50% 40%", goldInk: "152 60% 14%",
    accent: "145 55% 42%", btnBg: "150 30% 11%", btnText: "150 50% 96%",
  }, ["#EBF4EE", "#12281B", "#3D7A52"]),
  voltage: palette("voltage", "Voltage", {
    ...L, bg: "48 60% 95%", bgRaised: "0 0% 100%", bgSunken: "48 55% 90%",
    ink: "220 45% 12%", inkSoft: "220 18% 38%", inkFaint: "220 12% 54%",
    line: "48 40% 86%", lineStrong: "48 36% 74%",
    gold: "45 90% 42%", goldBright: "48 95% 54%", goldInk: "43 80% 20%",
    accent: "200 92% 44%", btnBg: "220 45% 12%", btnText: "48 60% 96%",
  }, ["#F6F1D2", "#111A33", "#A37D0A"]),
  aqua_flow: palette("aqua_flow", "Aqua Flow", {
    ...L, bg: "175 42% 95%", bgRaised: "0 0% 100%", bgSunken: "174 46% 90%",
    ink: "180 30% 11%", inkSoft: "180 16% 36%", inkFaint: "180 12% 54%",
    line: "174 40% 86%", lineStrong: "174 36% 74%",
    gold: "177 60% 32%", goldBright: "180 70% 42%", goldInk: "178 65% 14%",
    accent: "190 74% 42%", btnBg: "180 30% 11%", btnText: "175 60% 96%",
  }, ["#E7F6F4", "#102B2A", "#2C8A85"]),
  barberia_classic: palette("barberia_classic", "Barbería Classic", {
    bg: "30 22% 12%", bgRaised: "30 20% 16%", bgSunken: "30 26% 9%",
    ink: "42 30% 94%", inkSoft: "38 16% 70%", inkFaint: "36 10% 50%",
    line: "30 16% 22%", lineStrong: "30 16% 31%",
    gold: "40 46% 52%", goldBright: "42 62% 60%", goldInk: "40 60% 78%",
    accent: "355 60% 45%", btnBg: "355 60% 45%", btnText: "42 30% 96%",
  }, ["#1F1912", "#F0E3C8", "#B8892F", "#B2332F"], true),
  sazon: palette("sazon", "Sazón", {
    bg: "30 55% 95%", bgRaised: "30 60% 99%", bgSunken: "28 52% 90%",
    ink: "22 55% 12%", inkSoft: "22 28% 36%", inkFaint: "22 18% 54%",
    line: "28 44% 86%", lineStrong: "28 40% 74%",
    gold: "18 72% 44%", goldBright: "20 82% 54%", goldInk: "16 70% 20%",
    accent: "40 82% 48%", btnBg: "22 55% 12%", btnText: "30 80% 97%",
  }, ["#F7EBDC", "#241208", "#C2491F"]),
  clean_clinic: palette("clean_clinic", "Clean Clinic", {
    ...L, bg: "180 20% 97%", bgRaised: "0 0% 100%", bgSunken: "180 22% 93%",
    ink: "185 20% 12%", inkSoft: "185 10% 36%", inkFaint: "185 8% 55%",
    line: "180 22% 88%", lineStrong: "180 20% 76%",
    gold: "170 40% 36%", goldBright: "168 45% 46%", goldInk: "172 52% 14%",
    accent: "160 60% 44%", btnBg: "185 20% 12%", btnText: "180 30% 98%",
  }, ["#F2F9F8", "#152828", "#3A8F82"]),
  athlete_stadium: palette("athlete_stadium", "Athlete Stadium", {
    bg: "225 40% 9%", bgRaised: "225 35% 13%", bgSunken: "226 45% 6%",
    ink: "200 40% 96%", inkSoft: "200 16% 74%", inkFaint: "200 10% 52%",
    line: "223 28% 22%", lineStrong: "223 28% 30%",
    gold: "190 80% 46%", goldBright: "187 90% 58%", goldInk: "190 70% 82%",
    accent: "225 90% 62%", btnBg: "190 80% 46%", btnText: "226 45% 9%",
  }, ["#101631", "#EAF7FA", "#1EB6D8", "#4D6BEB"], true),
  newborn_blush: palette("newborn_blush", "Newborn Blush", {
    bg: "335 60% 97%", bgRaised: "0 0% 100%", bgSunken: "333 55% 92%",
    ink: "330 40% 13%", inkSoft: "330 20% 38%", inkFaint: "330 14% 56%",
    line: "333 45% 88%", lineStrong: "333 40% 78%",
    gold: "330 55% 58%", goldBright: "325 70% 68%", goldInk: "332 60% 32%",
    accent: "350 72% 66%", btnBg: "330 40% 13%", btnText: "335 70% 98%",
  }, ["#FBEDF3", "#2B1420", "#E28EB0"]),
  realtor_slate: palette("realtor_slate", "Realtor Slate", {
    ...L, bg: "215 15% 95%", bgRaised: "0 0% 100%", bgSunken: "215 16% 91%",
    ink: "220 25% 12%", inkSoft: "220 12% 36%", inkFaint: "220 10% 55%",
    line: "215 18% 87%", lineStrong: "215 18% 75%",
    gold: "220 35% 32%", goldBright: "218 40% 42%", goldInk: "222 55% 14%",
    accent: "25 70% 50%", btnBg: "220 25% 12%", btnText: "0 0% 100%",
  }, ["#EEF1F5", "#141A24", "#364B72"]),
  marketplace_lime: palette("marketplace_lime", "Marketplace Lime", {
    bg: "90 42% 95%", bgRaised: "0 0% 100%", bgSunken: "90 44% 90%",
    ink: "95 60% 10%", inkSoft: "95 26% 34%", inkFaint: "95 18% 52%",
    line: "90 40% 86%", lineStrong: "90 36% 74%",
    gold: "80 55% 38%", goldBright: "78 62% 48%", goldInk: "82 62% 16%",
    accent: "150 55% 42%", btnBg: "95 60% 10%", btnText: "90 55% 97%",
  }, ["#F1F7E4", "#172B05", "#7AA636"]),
  midnight_copper: palette("midnight_copper", "Midnight Copper", {
    bg: "232 32% 8%", bgRaised: "232 28% 12%", bgSunken: "233 36% 5%",
    ink: "45 30% 94%", inkSoft: "40 14% 70%", inkFaint: "40 8% 48%",
    line: "231 22% 21%", lineStrong: "231 22% 29%",
    gold: "25 60% 46%", goldBright: "27 70% 55%", goldInk: "25 60% 78%",
    accent: "215 55% 58%", btnBg: "25 60% 46%", btnText: "232 45% 96%",
  }, ["#0F111F", "#F0E9DD", "#B9762F"], true),
  desert_sand: palette("desert_sand", "Desert Sand", {
    bg: "38 50% 94%", bgRaised: "38 60% 98%", bgSunken: "36 46% 89%",
    ink: "32 40% 12%", inkSoft: "32 20% 36%", inkFaint: "32 14% 54%",
    line: "36 42% 86%", lineStrong: "36 38% 74%",
    gold: "32 58% 42%", goldBright: "34 70% 52%", goldInk: "32 60% 18%",
    accent: "24 72% 50%", btnBg: "32 40% 12%", btnText: "38 70% 96%",
  }, ["#F3EAD9", "#241608", "#AC6F24"]),
  royal_plum: palette("royal_plum", "Royal Plum", {
    bg: "270 35% 10%", bgRaised: "270 30% 14%", bgSunken: "272 42% 7%",
    ink: "45 40% 95%", inkSoft: "270 14% 72%", inkFaint: "270 10% 50%",
    line: "269 24% 22%", lineStrong: "269 24% 31%",
    gold: "268 45% 55%", goldBright: "268 55% 64%", goldInk: "268 55% 84%",
    accent: "40 60% 50%", btnBg: "268 45% 55%", btnText: "270 50% 97%",
  }, ["#151024", "#F1EBDC", "#9D72C9", "#A3882B"], true),
  coastal_navy: palette("coastal_navy", "Coastal Navy", {
    ...L, bg: "210 50% 96%", bgRaised: "0 0% 100%", bgSunken: "210 50% 91%",
    ink: "215 55% 12%", inkSoft: "215 24% 36%", inkFaint: "215 16% 54%",
    line: "210 42% 87%", lineStrong: "210 42% 76%",
    gold: "220 55% 35%", goldBright: "218 55% 44%", goldInk: "222 70% 16%",
    accent: "190 75% 44%", btnBg: "215 55% 12%", btnText: "210 60% 97%",
  }, ["#EDF3FA", "#111C32", "#2C4A80"]),
  concrete_orange: palette("concrete_orange", "Concrete Orange", {
    ...L, bg: "30 12% 95%", bgRaised: "0 0% 100%", bgSunken: "30 14% 91%",
    ink: "220 15% 14%", inkSoft: "220 10% 38%", inkFaint: "220 8% 55%",
    line: "30 18% 87%", lineStrong: "30 18% 76%",
    gold: "24 90% 48%", goldBright: "22 95% 56%", goldInk: "24 85% 22%",
    accent: "200 65% 45%", btnBg: "24 90% 48%", btnText: "0 0% 100%",
  }, ["#F2F2F0", "#191B20", "#E26516"]),
  southline_sage: palette("southline_sage", "Southline Sage", {
    ...L, bg: "120 25% 96%", bgRaised: "120 40% 99%", bgSunken: "120 26% 91%",
    ink: "130 25% 12%", inkSoft: "130 14% 35%", inkFaint: "130 10% 53%",
    line: "120 22% 87%", lineStrong: "120 20% 75%",
    gold: "120 30% 40%", goldBright: "118 34% 48%", goldInk: "122 48% 16%",
    accent: "145 45% 42%", btnBg: "130 25% 12%", btnText: "120 35% 97%",
  }, ["#EFF5ED", "#152417", "#7A9469"]),
};

export const PALETTE_LIST = Object.values(PALETTES);

export function getPalette(key: string): PaletteDefinition {
  return PALETTES[key] ?? PALETTES.ivory;
}

/**
 * Resolve the effective palette for a profile row.
 * Priority: profiles.data.palette (named key or custom overrides) → legacy
 * `profiles.theme` column → ivory. Returns the tokens as a CSS vars object
 * the public renderer applies on its root node (+ which palette it is).
 */
export function resolvePalette(data: unknown, theme: string): { key: string; style: Record<string, string> } {
  const raw = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const stored = raw.palette && typeof raw.palette === "object" ? raw.palette as Record<string, unknown> : null;
  let base = PALETTES[String(raw.palette === null || typeof raw.palette === "string" ? raw.palette ?? "" : "")] ??
    PALETTES[theme === "signature_gold" ? "signature_gold" : theme] ?? PALETTES.ivory;
  if (stored && typeof stored.key === "string") base = getPalette(stored.key);
  const custom = stored && typeof stored.custom === "object" ? stored.custom as Record<string, unknown> : {};
  const style: Record<string, string> = {
    "--bg": base.bg, "--bg-raised": base.bgRaised, "--bg-sunken": base.bgSunken,
    "--ink": base.ink, "--ink-soft": base.inkSoft, "--ink-faint": base.inkFaint,
    "--line": base.line, "--line-strong": base.lineStrong,
    "--gold": base.gold, "--gold-bright": base.goldBright, "--gold-ink": base.goldInk,
    "--accent": base.accent, "--btn-bg": base.btnBg, "--btn-text": base.btnText,
  };
  const fieldVars: Record<string, string> = {
    background: "--bg", surface: "--bg-raised", surfaceAlt: "--bg-sunken",
    text: "--ink", mutedText: "--ink-soft", primary: "--gold", accent: "--accent",
    buttonBackground: "--btn-bg", buttonText: "--btn-text", border: "--line",
  };
  for (const [field, varName] of Object.entries(fieldVars)) {
    if (field !== "background" && typeof custom[field] === "string") {
      const v = String(custom[field]).trim();
      if (v && v !== varName) style[varName] = v;
    }
  }
  let hero = base.hero;
  if (typeof custom.hero === "string" && custom.hero) hero = String(custom.hero);
  style["--hero"] = hero;
  return { key: stored?.key && typeof stored.key === "string" ? stored.key : base.key, style };
}