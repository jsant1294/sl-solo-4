/* Server-safe presentational primitives — NO "use client".
   Glyph is a plain object of icon components; importing it into server
   components is safe only when it lives outside a client module. */

export const Glyph = {
  tap: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden>
      <path d="M9 11V6a2 2 0 1 1 4 0v5m0 0V9a2 2 0 1 1 4 0v4m0 0v-2a2 2 0 1 1 4 0v5a6 6 0 0 1-6 6h-2.5a4 4 0 0 1-3.2-1.6L5 18"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  arrow: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden>
      <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  check: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden>
      <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  menu: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  close: (p: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

/* — Phone frame — realistic device mockup for embedded live content — */
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-[320px] rounded-[3rem] bg-gradient-to-b from-neutral-700 via-neutral-900 to-black p-[10px] shadow-[0_35px_70px_-20px_rgba(0,0,0,0.5)]">
      <span className="absolute -left-px top-28 h-9 w-[3px] rounded-r bg-neutral-600"/>
      <span className="absolute -left-px top-[10.5rem] h-14 w-[3px] rounded-r bg-neutral-600"/>
      <span className="absolute -right-px top-36 h-16 w-[3px] rounded-r bg-neutral-600"/>
      <div className="relative overflow-hidden rounded-[2.35rem] bg-bg-raised ring-1 ring-black/10">
        <div className="pointer-events-none absolute left-1/2 top-3 z-10 h-6 w-28 -translate-x-1/2 rounded-full bg-black"/>
        <div className="max-h-[620px] overflow-y-auto">{children}</div>
        <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 h-1 w-28 -translate-x-1/2 rounded-full bg-black/25"/>
      </div>
    </div>
  );
}

/* — Section shell — consistent rhythm — */
export function Section({
  children, className = "", id,
}: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`px-5 sm:px-8 ${className}`}>
      <div className="mx-auto max-w-site">{children}</div>
    </section>
  );
}

/* — Eyebrow label — */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-gold">{children}</span>
  );
}
