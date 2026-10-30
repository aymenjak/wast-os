import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { getOrganization } from "@/server/services/accounts";
import { formatDay } from "@/lib/i18n/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { DescriptionList, Forbidden, PageHeader } from "@/components/ui/misc";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("settings.manage")) return <Forbidden message={d.errors.forbiddenPage} />;
  const org = await getOrganization(ctx);
  const sub = org.subscription;
  return (
    <>
      <PageHeader title={d.settings.title} />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2"><CardHeader title={d.settings.organization} /><CardBody><SettingsForm org={{ ...org, email: org.email ?? "" }} /></CardBody></Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title={d.settings.verification} />
            <CardBody className="space-y-2 text-sm">
              <StatusBadge status={org.verificationStatus === "VERIFIED" ? "ACTIVE" : "PLANNED"} label={d.enums.VerificationStatus[org.verificationStatus]} />
              <p className="text-ink-600">{d.settings.verificationHint}</p>
            </CardBody>
          </Card>
          {sub ? (
            <Card>
              <CardHeader title={d.settings.subscription} />
              <CardBody>
                <DescriptionList className="sm:grid-cols-1" items={[
                  [d.settings.plan, sub.plan.name],
                  [d.common.status, <StatusBadge key="s" status={sub.status} label={d.enums.SubscriptionStatus[sub.status]} />],
                  [sub.status === "TRIAL" ? d.settings.trialEnds : d.settings.periodEnds, formatDay(sub.currentPeriodEnd, locale)],
                ]} />
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
