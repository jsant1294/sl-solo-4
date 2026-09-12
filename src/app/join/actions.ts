"use server";

import { cookies } from "next/headers";
import { signIn } from "@/lib/auth-config";
import { checkUsername } from "@/lib/username";
import { db } from "@/db";
import { repo } from "@/db/repo";
import { z } from "zod";

const joinSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  username: z.string(),
  locale: z.enum(["en", "es"]),
});

export async function beginJoin(input: unknown): Promise<{ ok: false; error: string }> {
  const parsed = joinSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check your name, email, and username" };
  if (!db) return { ok: false, error: "Account creation is temporarily unavailable" };
  const username = checkUsername(parsed.data.username);
  if (!username.ok) return { ok: false, error: username.reason };
  if (await repo.profiles.byUsername(username.value)) return { ok: false, error: "taken" };

  const jar = await cookies();
  jar.set("sl_onboarding", JSON.stringify({ name: parsed.data.name, username: username.value, locale: parsed.data.locale }), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/app/onboarding", maxAge: 60 * 30,
  });
  await signIn("resend", { email: parsed.data.email, redirectTo: `/app/onboarding?lang=${parsed.data.locale}` });
  return { ok: false, error: "Unable to start sign in" };
}
