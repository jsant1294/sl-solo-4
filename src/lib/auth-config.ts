import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";

/**
 * Auth.js — passwordless email magic-link via Resend.
 * Role (customer|operator) is read from the users row and exposed on the
 * session so requireOperator() can gate the /operator surface.
 *
 * Requires env: AUTH_SECRET, AUTH_RESEND_KEY, EMAIL_FROM, DATABASE_URL.
 * If db is null (no DATABASE_URL yet) the adapter is omitted so the app
 * still boots; sign-in will no-op until the DB is wired.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: db
    ? DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
      })
    : undefined,
  session: { strategy: "database" },
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.EMAIL_FROM ?? "SnapLink <onboarding@resend.dev>",
    }),
    Credentials({
      name: "Operator password",
      credentials: {
        email: { label: "Email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        const opEmail = (process.env.OPERATOR_EMAIL ?? "").trim().toLowerCase();
        const opPassword = process.env.OPERATOR_PASSWORD ?? "";
        if (!opEmail || !opPassword || !email || email !== opEmail || password !== opPassword) return null;
        if (!db) return null;
        const [existing] = await db
          .select({ id: users.id, email: users.email, name: users.name, role: users.role })
          .from(users).where(eq(users.email, email)).limit(1);
        if (existing) {
          if (existing.role !== "operator") {
            await db.update(users).set({ role: "operator" }).where(eq(users.id, existing.id));
          }
          return { id: existing.id, email: existing.email, name: existing.name ?? "Operator", role: "operator" };
        }
        const [created] = await db.insert(users).values({
          email, name: "Operator", role: "operator", emailVerified: new Date(),
        }).returning({ id: users.id, email: users.email, name: users.name });
        return { id: created.id, email: created.email, name: created.name ?? "Operator", role: "operator" };
      },
    }),
  ],
  pages: { signIn: "/sign-in", verifyRequest: "/sign-in?sent=1" },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // @ts-expect-error augmenting session user with role
        session.user.role = (user as { role?: string }).role ?? "customer";
      }
      return session;
    },
  },
});
