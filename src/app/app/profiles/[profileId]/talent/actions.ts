"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { requireOwnedProfile } from "@/lib/auth";
import { hasTalent, readEnvelope, talentSchema } from "@/lib/talent/model";

export async function saveTalent(profileId: string, input: unknown, revision: number, operation: "draft" | "publish" | "unpublish") {
  try {
    const owner = await requireOwnedProfile(profileId);
    if (!owner || owner.type === "kids") return { ok: false as const, code: "forbidden" };
    const op = z.enum(["draft", "publish", "unpublish"]).parse(operation);
    z.number().int().nonnegative().parse(revision);
    const parsed = talentSchema.safeParse(input);
    if (!parsed.success) return { ok: false as const, code: "invalid", fields: parsed.error.issues.map(i => i.path.join(".")) };
    const update = (current: typeof owner) => {
      const old = readEnvelope(current.data);
      if ((hasTalent(current.data) && !old) || (old?.revision ?? 0) !== revision) throw new Error("conflict");
      const talent = { revision: revision + 1, draft: parsed.data, published: op === "publish" ? parsed.data : op === "unpublish" ? null : old?.published ?? null };
      return { data: { ...current.data, talent }, status: op === "publish" ? "active" as const : op === "unpublish" ? "draft" as const : current.status };
    };
    if (db) {
      await db.transaction(async tx => {
        const [current] = await tx.select().from(profiles).where(and(eq(profiles.id, profileId), eq(profiles.userId, owner.userId))).for("update");
        if (!current) throw new Error("forbidden");
        await tx.update(profiles).set(update({ ...owner, ...current })).where(and(eq(profiles.id, profileId), eq(profiles.userId, owner.userId)));
      });
    } else Object.assign(owner, update(owner));
    revalidatePath(`/u/${owner.username}`, "layout");
    revalidatePath(`/app/profiles/${profileId}`);
    return { ok: true as const, revision: revision + 1 };
  } catch (error) { return { ok: false as const, code: error instanceof Error && error.message === "conflict" ? "conflict" : "error" }; }
}
