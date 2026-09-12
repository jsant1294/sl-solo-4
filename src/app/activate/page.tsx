import { getDict } from "@/i18n/dict";
import { localeFrom } from "@/i18n/util";
import { SiteHeader } from "@/components/site-chrome";
import { Section } from "@/components/primitives";
import { ActivationFlow } from "./activation-flow";
import { listMyProfiles, requireUserId } from "@/lib/auth";
import { db } from "@/db";
import { repo } from "@/db/repo";
export const dynamic = "force-dynamic";

export default async function Activate({ searchParams }: { searchParams: Promise<{ lang?: string; sim?: string; product?: string }> }) {
  const sp = await searchParams;
  const locale = localeFrom(sp);
  const t = getDict(locale);
  const uid = await requireUserId();
  const profiles = await listMyProfiles();
  const devices = db ? await repo.devices.byAssignedUser(uid) : [];
  return (
    <>
      <SiteHeader locale={locale} />
      <Section className="pt-14 pb-24">
        <div className="max-w-md mx-auto">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-center">{t.activate.title}</h1>
          <p className="text-ink-soft text-center mt-3">{t.activate.sub}</p>
          <div className="mt-10">
            <ActivationFlow locale={locale} profiles={profiles.map((profile) => ({ id: profile.id, displayName: profile.displayName, username: profile.username }))} devices={devices.map((device) => ({ code: device.deviceCode, status: device.status, label: device.label ?? device.type }))} />
          </div>
        </div>
      </Section>
    </>
  );
}
