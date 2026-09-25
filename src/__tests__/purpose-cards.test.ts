import { describe, expect, it } from "vitest";
import { defaultPurposeRows, purposes, purposesWithDefaults } from "@/lib/purpose";
import type { PurposeOption } from "@/db/schema";

const rows = () => defaultPurposeRows().map((row) => ({ ...row, createdAt: new Date(), updatedAt: new Date(), imageMediaId: null, image: null })) as (PurposeOption & { image: null })[];

describe("merged purpose cards", () => {
  it("includes talent audiences with example and start actions", () => {
    const sports = purposes.find((p) => p.key === "sports")!;
    expect(sports.example?.href).toBe("/examples/athlete");
    expect(sports.start?.href).toBe("/get-started?path=athlete");
    expect(purposes.find((p) => p.key === "professional")!.start?.href).toBe("/get-started?path=professional");
    expect(purposes.map((p) => p.key)).toEqual(["personal", "sports", "stage", "creator", "professional", "share", "protect", "kids"]);
  });
  it("round-trips defaults through CMS rows, including actions and kids privacy points", () => {
    const merged = purposesWithDefaults(rows());
    expect(merged.map((p) => p.key)).toEqual(purposes.map((p) => p.key));
    expect(merged.find((p) => p.key === "stage")!.example).toEqual(purposes.find((p) => p.key === "stage")!.example);
    expect(merged.find((p) => p.key === "kids")!.privacyPoints).toEqual(purposes.find((p) => p.key === "kids")!.privacyPoints);
  });
  it("fills in purposes missing from the table, but respects rows an operator hid", () => {
    const partial = rows().filter((row) => row.key !== "sports" && row.key !== "stage");
    expect(purposesWithDefaults(partial).map((p) => p.key)).toContain("sports");
    const hidden = rows().map((row) => row.key === "share" ? { ...row, active: false } : row);
    expect(purposesWithDefaults(hidden).map((p) => p.key)).not.toContain("share");
  });
  it("uses the operator image and custom actions from a row", () => {
    const custom = rows().map((row) => row.key === "sports" ? { ...row, image: { url: "https://cdn.example/a.jpg", alt: "Athlete", objectPosition: "50% 30%" }, startLabelEn: "Join now", startLabelEs: null } : row);
    const sports = purposesWithDefaults(custom as never).find((p) => p.key === "sports")!;
    expect(sports.image).toEqual({ url: "https://cdn.example/a.jpg", alt: "Athlete", objectPosition: "50% 30%" });
    expect(sports.start).toMatchObject({ label: "Join now", labelEs: "Join now" });
  });
});
