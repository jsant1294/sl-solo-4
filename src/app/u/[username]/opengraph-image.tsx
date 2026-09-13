import { ImageResponse } from "next/og";
import { data } from "@/lib/data";
import { buildShareModel } from "@/lib/profile-sharing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "SnapLink SOLO profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await data.profileByUsername(username);
  if (!profile || profile.status !== "active") return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", background: "#111", color: "#d5ab55", alignItems: "center", justifyContent: "center", fontSize: 64 }}>SnapLink SOLO</div>, size);
  const model = buildShareModel(profile);
  const dark = model.theme === "obsidian" || model.theme === "signature_gold";
  const bg = dark ? "#0d0f0e" : "#f7f0df";
  const ink = dark ? "#f7f0df" : "#171714";
  const gold = "#d5ab55";
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden", background: bg, color: ink, padding: "76px 84px" }}>
    <div style={{ position: "absolute", width: 560, height: 560, borderRadius: 999, right: -130, top: -190, background: `radial-gradient(circle, ${gold}88, transparent 68%)` }}/>
    <div style={{ display: "flex", width: "100%", alignItems: "center", gap: 72 }}>
      {(() => { const avatarRadius = model.avatarShape === "square" ? 48 : 130; return model.avatarUrl ? <img src={model.avatarUrl} width="260" height="260" style={{ width: 260, height: 260, borderRadius: avatarRadius, objectFit: "cover", border: `5px solid ${gold}` }}/> : <div style={{ width: 260, height: 260, borderRadius: avatarRadius, display: "flex", alignItems: "center", justifyContent: "center", background: dark ? "#181b19" : "#fffaf0", border: `5px solid ${gold}`, color: gold, fontSize: 96, fontWeight: 700 }}>{model.initials}</div>; })()}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ color: gold, fontSize: 24, letterSpacing: 7, textTransform: "uppercase", marginBottom: 20 }}>SnapLink SOLO</div>
        <div style={{ fontSize: 68, lineHeight: 1.02, fontWeight: 700, letterSpacing: -2 }}>{model.displayName}</div>
        <div style={{ fontSize: 31, lineHeight: 1.25, opacity: .78, marginTop: 20, maxWidth: 650 }}>{model.headline}</div>
        <div style={{ color: gold, fontSize: 22, letterSpacing: 4, marginTop: 44 }}>TAP · CONNECT · SHARE</div>
      </div>
    </div>
  </div>, size);
}
