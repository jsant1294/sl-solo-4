import { localeFrom } from "@/i18n/util";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Section } from "@/components/primitives";
import { signIn } from "@/lib/auth-config";
import { safeAppRedirect } from "@/lib/safe-redirect";
export const dynamic = "force-dynamic";

export default async function SignIn({ searchParams }: { searchParams: Promise<{ lang?: string; sent?: string; next?: string }> }) {
  const query = await searchParams;
  const locale = localeFrom(query);
  const es = locale === "es";
  const next = safeAppRedirect(query.next);
  const isOperator = next === "/operator" || next.startsWith("/operator/");
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader locale={locale} />
      <Section className="flex-1 pt-20 pb-24 max-w-sm text-center">
        {isOperator ? (
          <>
            <p className="font-mono text-[0.65rem] uppercase tracking-widest text-gold mb-2">SnapLink · Operator</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight">{es ? "Acceso autorizado" : "Authorized access"}</h1>
            <p className="text-ink-soft mt-3 text-sm">{query.sent ? (es ? "Revisa tu correo para continuar." : "Check your email to continue.") : (es ? "Solo para personal interno de SnapLink." : "Internal SnapLink staff only.")}</p>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl font-semibold tracking-tight">{es ? "Entrar" : "Sign in"}</h1>
            <p className="text-ink-soft mt-3 text-sm">{query.sent ? (es ? "Revisa tu correo para continuar." : "Check your email to continue.") : (es ? "Te enviaremos un enlace seguro por correo." : "We’ll email you a secure sign-in link.")}</p>
          </>
        )}
        {!query.sent && <form className="grid gap-3 mt-8" action={async (formData) => {
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
