import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { getOrganization } from "@/server/services/accounts";
import { formatDay } from "@/lib/i18n/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { DescriptionList, Forbidden, PageHeader } from "@/components/ui/misc";
import { SettingsForm } from "./settings-form";
import { ChargilyForm } from "@/components/billing-forms";
import { AiChatToggle } from "@/components/ai-chat-toggle";
import { chatAvailability } from "@/server/services/ai-chat";
import { orgChargilyStatus } from "@/server/payments/chargily";
import { Badge } from "@/components/ui/badge";

export default async function SettingsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("settings.manage")) return <Forbidden message={d.errors.forbiddenPage} />;
  const org = await getOrganization(ctx);
  const sub = org.subscription;
  const pay = await orgChargilyStatus(ctx.org.id);
  const ai = await chatAvailability(ctx);
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
          <Card>
            <CardHeader title={d.assistant.settingsTitle} description={d.assistant.settingsLead} action={<Badge tone={ai.organization ? "success" : "neutral"}>{ai.organization ? d.mfa.on : d.mfa.off}</Badge>} />
            <CardBody className="space-y-2 text-sm">
              {ai.platform ? <AiChatToggle enabled={ai.organization} /> : <p className="text-ink-600">{d.assistant.platformOff}</p>}
            </CardBody>
          </Card>
          {ctx.org.kind === "SERVICE_PROVIDER" ? (
            <Card>
              <CardHeader title={d.billing.chargilyTitle} description={d.billing.chargilyLead} action={pay.configured ? <Badge tone={pay.mode === "live" ? "success" : "info"}>{pay.mode === "live" ? d.billing.modeLive : d.billing.modeTest}</Badge> : <Badge tone="neutral">{d.mfa.off}</Badge>} />
              <CardBody><ChargilyForm configured={pay.configured} mode={pay.mode} /></CardBody>
            </Card>
          ) : null}
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
