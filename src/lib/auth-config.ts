import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
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
