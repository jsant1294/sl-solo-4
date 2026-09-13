import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PALETTE_LIST, resolvePalette } from "@/lib/profile-palettes";

describe("profile palettes", () => {
  it("exposes every unique curated palette and resolves its public tokens", () => {
    expect(PALETTE_LIST).toHaveLength(21);
    expect(new Set(PALETTE_LIST.map((palette) => palette.key)).size).toBe(21);
    for (const palette of PALETTE_LIST) {
      const resolved = resolvePalette({ palette: palette.key }, "ivory");
      expect(resolved.key).toBe(palette.key);
      expect(resolved.style["--bg"]).toBe(palette.bg);
      expect(resolved.style["--gold"]).toBe(palette.gold);
      expect(resolved.style["--hero"]).toBe(palette.hero);
    }
  });

  it("mounts the appearance editor and does not cap the palette catalog", () => {
    const source = readFileSync(join(process.cwd(), "src/app/operator/profiles/[id]/operator-control.tsx"), "utf8");
    expect(source).toContain("<AppearancePanel d={d} />");
    expect(source).toContain("PALETTE_LIST.map");
    expect(source).not.toContain("PALETTE_LIST.slice");
  });
});
