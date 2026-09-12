import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Section } from "@/components/primitives";

export function PolicyPage({ title, summary, children }: { title: string; summary: string; children: React.ReactNode }) {
  return <div className="min-h-screen flex flex-col"><SiteHeader locale="en"/><Section className="flex-1 max-w-3xl py-16"><p className="font-mono text-xs uppercase tracking-widest text-gold">Customer policy · Effective September 10, 2026</p><h1 className="mt-3 font-display text-4xl font-semibold">{title}</h1><p className="mt-4 text-lg text-ink-soft">{summary}</p><div className="prose-policy mt-10 space-y-8 text-ink-soft">{children}</div></Section><SiteFooter locale="en"/></div>;
}

export function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="mb-2 font-display text-2xl font-semibold text-ink">{title}</h2><div className="space-y-3 leading-7">{children}</div></section>;
}
