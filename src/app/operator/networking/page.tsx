import { requireOperator } from "@/lib/operator";
import { repo } from "@/db/repo";
import { activeProviderStatus } from "@/lib/providers";
import { saveNetworkingSettings } from "./actions";
export const dynamic = "force-dynamic";

export default async function OperatorNetworking({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireOperator();
  const settings = await repo.networkingSettings.get();
  const saved = (await searchParams).saved;
  const providerStatus = activeProviderStatus();

  const toggle = (name: string, label: string, defaultChecked: boolean, hint: string) => (
    <label className="flex items-start gap-3 rounded-lg border border-line p-4">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5" />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-ink-faint mt-0.5">{hint}</span>
      </span>
    </label>
  );

  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Networking</h1>
        {saved && <span className="text-sm text-ok">Saved</span>}
      </div>
      <p className="text-sm text-ink-faint mb-6">
        Controls the paid Networking area (business card scanner + connections), gated by the <code className="font-mono text-xs">solo_networking</code> entitlement.
        Does not affect free contact capture on public profiles, which is never gated.
      </p>
      <form action={saveNetworkingSettings} className="grid gap-3">
        {toggle("networkingEnabled", "Networking enabled", settings.networkingEnabled, "Master switch for the whole /app/networking area. Off shows a maintenance message to entitled customers.")}
        {toggle("cardScannerEnabled", "Business Card Scanner enabled", settings.cardScannerEnabled, "Turns off the Scan a Business Card entry point and OCR calls specifically.")}
        {toggle("manualConnectionsEnabled", "Manual connections enabled", settings.manualConnectionsEnabled, "Turns off Add Manually — useful if you ever need to force scan-only.")}
        {toggle("followUpEnabled", "Follow-up enabled", settings.followUpEnabled, "Turns off the follow-up date field and filter.")}
        <button className="rounded-full bg-ink text-bg px-6 py-2.5 text-sm font-medium hover:bg-gold transition-colors self-start mt-2">Save</button>
      </form>
      <div className="mt-6 rounded-xl border border-line bg-bg-raised p-5">
        <h2 className="font-display text-lg mb-1">Active AI provider</h2>
        <p className="text-sm">
          <span className="font-mono">{providerStatus.provider}</span>{" — "}
          {providerStatus.configured ? <span className="text-ok">configured</span> : <span className="text-warn">not configured (missing {providerStatus.missingEnvVar})</span>}
        </p>
        <p className="text-xs text-ink-faint mt-1">Set via the <span className="font-mono">AI_EXTRACTION_PROVIDER</span> environment variable (anthropic or groq). Shared with Resume extraction. Credentials are environment-only — never entered in this CMS.</p>
      </div>
    </div>
  );
}
