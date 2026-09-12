import type { CollectionOption } from "@/db/schema";

export type CollectionKey = "signature" | "color" | "patterns" | "kids";

export type Collection = {
  key: CollectionKey;
  title: string; titleEs: string;
  note: string; noteEs: string;
  pattern: string; // one of the pattern-* classes in globals.css
  colors: string[]; // swatch hex codes
};

/** Demo-mode fallback — same role DEMO_PRODUCTS plays for products. */
export const collections: Collection[] = [
  { key: "signature", title: "Signature", titleEs: "Emblemática", note: "Black, ivory and warm gold", noteEs: "Negro, marfil y dorado cálido", pattern: "pattern-signature", colors: ["#14120f", "#f3e7c0", "#bd8c26"] },
  { key: "color", title: "Color", titleEs: "Color", note: "Bright choices with a premium finish", noteEs: "Opciones alegres con acabado premium", pattern: "pattern-color", colors: ["#e76455", "#68449a", "#257f95", "#dda91f"] },
  { key: "patterns", title: "Patterns", titleEs: "Patrones", note: "Designs made to feel unmistakably yours", noteEs: "Diseños que se sienten inconfundiblemente tuyos", pattern: "pattern-play", colors: ["#063b2a", "#bd8c26", "#f3e7c0"] },
  { key: "kids", title: "Kids", titleEs: "Niños", note: "Friendly character worlds for Protect", noteEs: "Personajes amigables para Proteger", pattern: "pattern-kids", colors: ["#e9669d", "#68449a", "#2d9a80"] },
];

export function collectionsFromRows(rows: CollectionOption[]): Collection[] {
  return rows
    .filter((row) => row.active)
    .map((row) => ({
      key: row.key as CollectionKey,
      title: row.titleEn, titleEs: row.titleEs,
      note: row.noteEn, noteEs: row.noteEs,
      pattern: row.pattern,
      colors: row.colors,
    }));
}
