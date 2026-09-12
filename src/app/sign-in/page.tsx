import { localeFrom } from "@/i18n/util";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Section } from "@/components/primitives";
import { signIn } from "@/lib/auth-config";
import { safeAppRedirect } from "@/lib/safe-redirect";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";

export default async function SignIn({ searchParams }: { searchParams: Promise<{ lang?: string; sent?: string; next?: string; error?: string }> }) {
  const query = await searchParams;
  const locale = localeFrom(query);
  const es = locale === "es";
  const next = safeAppRedirect(query.next);
  const isOperator = next === "/operator" || next.startsWith("/operator/");
  const badCredentials = query.error === "credentials";
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader locale={locale} />
      <Section className="flex-1 pt-20 pb-24 max-w-sm text-center">
        {isOperator ? (
          <>
            <p className="font-mono text-[0.65rem] uppercase tracking-widest text-gold mb-2">SnapLink · Operator</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight">{es ? "Acceso autorizado" : "Authorized access"}</h1>
            <p className="text-ink-soft mt-3 text-sm">{es ? "Solo para personal interno de SnapLink." : "Internal SnapLink staff only."}</p>
            <form className="grid gap-3 mt-8 text-left" action={async (formData) => {
              "use server";
              const email = String(formData.get("email") ?? "").trim();
              const password = String(formData.get("password") ?? "");
              const next = safeAppRedirect(formData.get("next"));
              try {
                await signIn("credentials", { email, password, redirectTo: next });
              } catch (error) {
                if (error instanceof AuthError) {
                  redirect(`/sign-in?next=${encodeURIComponent(next)}&error=credentials`);
                }
                throw error;
              }
            }}>
              <input type="email" name="email" required autoComplete="username" placeholder={es ? "correo@operator" : "operator@email"} className="rounded-lg border border-line bg-bg-raised px-4 py-3 text-sm outline-none focus:border-gold"/>
              <input type="password" name="password" required autoComplete="current-password" placeholder={es ? "Contraseña" : "Password"} className="rounded-lg border border-line bg-bg-raised px-4 py-3 text-sm outline-none focus:border-gold"/>
              {badCredentials && <p className="text-sm text-red-600">{es ? "Correo o contraseña incorrectos." : "Incorrect email or password."}</p>}
              <input type="hidden" name="next" value={next}/>
              <button className="rounded-full bg-ink text-bg px-6 py-3 text-sm font-medium hover:bg-gold transition-colors">{es ? "Entrar" : "Sign in"}</button>
            </form>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl font-semibold tracking-tight">{es ? "Entrar" : "Sign in"}</h1>
            <p className="text-ink-soft mt-3 text-sm">{query.sent ? (es ? "Revisa tu correo para continuar." : "Check your email to continue.") : (es ? "Te enviaremos un enlace seguro por correo." : "We’ll email you a secure sign-in link.")}</p>
          </>
        )}
        {!isOperator && !query.sent && <form className="grid gap-3 mt-8" action={async (formData) => {
          "use server";
          const email = String(formData.get("email") ?? "").trim();
          const next = safeAppRedirect(formData.get("next"));
          await signIn("resend", { email, redirectTo: next });
        }}>
          <input type="email" name="email" required autoComplete="email" placeholder={es ? "tu@correo.com" : "you@example.com"} className="rounded-lg border border-line bg-bg-raised px-4 py-3 text-sm outline-none focus:border-gold"/>
          <input type="hidden" name="next" value={next}/>
          <button className="rounded-full bg-ink text-bg px-6 py-3 text-sm font-medium hover:bg-gold transition-colors">{es ? "Enviar enlace" : "Email me a sign-in link"}</button>
        </form>}
      </Section>
      <SiteFooter locale={locale} />
    </div>
  );
}
