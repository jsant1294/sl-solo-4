"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { repo } from "@/db/repo";
import { requireOperator } from "@/lib/operator";
import { checkUsername, type UsernameCheck } from "@/lib/username";
import type { ProfileType } from "@/lib/profile-data";
import type { Locale } from "@/i18n/dict";

const ALLOWED_TYPES = ["personal", "business"] as const satisfies readonly ProfileType[];
const ALLOWED_LOCALES = ["en", "es"] as const satisfies readonly Locale[];

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

const usernameMessage: Record<Extract<UsernameCheck, { ok: false }>["reason"], string> = {
  too_short: "Username must be at least 3 characters.",
  too_long: "Username must be 30 characters or fewer.",
  invalid: "Username can only use lowercase letters, numbers, hyphens, and underscores.",
  reserved: "That username is reserved.",
};

function fail(message: string): never {
  redirect(`/operator/profiles/new?error=${encodeURIComponent(message)}`);
}

const fields = z.object({
  ownerEmail: z.string().trim().toLowerCase().email("Enter a valid owner email."),
  ownerName: z.string().trim().min(1, "Owner name is required."),
  displayName: z.string().trim().min(1, "Display name is required."),
});

export async function createOperatorProfile(form: FormData): Promise<void> {
  await requireOperator();

  const parsed = fields.safeParse({
    ownerEmail: value(form, "ownerEmail"),
    ownerName: value(form, "ownerName"),
    displayName: value(form, "displayName"),
  });
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Please check the form and try again.");
  const { ownerEmail, ownerName, displayName } = parsed.data;

  const checkedUsername = checkUsername(value(form, "username"));
  if (!checkedUsername.ok) fail(usernameMessage[checkedUsername.reason]);
  const username = checkedUsername.value;

  const rawType = value(form, "type");
  const type = (ALLOWED_TYPES as readonly string[]).includes(rawType) ? (rawType as ProfileType) : "personal";

  const rawLocale = value(form, "locale");
  const locale = (ALLOWED_LOCALES as readonly string[]).includes(rawLocale) ? (rawLocale as Locale) : "en";

  const accent = value(form, "accent");

  const existing = await repo.profiles.byUsername(username);
  if (existing) fail("This username is already in use.");

  let result: Awaited<ReturnType<typeof repo.profiles.createForOwner>>;
  try {
    result = await repo.profiles.createForOwner({
      ownerEmail, ownerName, type, username, displayName, locale,
      data: {}, accent: accent || null,
    });
  } catch {
    fail("Could not create the profile. Please try again.");
  }

  redirect(`/operator/profiles?created=${result.profile.id}`);
}
