"use client";
export function TrackedProfileLink({ username, href, children, className }: { username: string; href: string; children: React.ReactNode; className: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={() => { void fetch("/api/profile-event", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ username, event: "social_link_clicked" }) }); }}>{children}</a>;
}
