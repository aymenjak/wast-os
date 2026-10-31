import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { requireUser } from "@/server/auth/session";
import { mfaStatus } from "@/server/services/mfa";
import { formatDateTime } from "@/lib/i18n/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/misc";
import { DisableMfa, EnrollMfa, RegenerateCodes } from "./forms";

export default async function SecurityPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ required?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const s = await requireUser(locale);
  const d = getDictionary(locale);
  const st = await mfaStatus(s.user.id);
  return (
    <>
      <PageHeader title={d.mfa.title} description={<bdi>{s.user.email}</bdi>} />
      {sp.required && !st.enabled ? <p role="alert" className="mb-6 rounded-[var(--radius-card)] bg-warning-100 px-4 py-3 text-sm text-warning-700">{d.mfa.requiredNotice}</p> : null}
      <Card>
        <CardHeader title={d.mfa.cardTitle} description={d.mfa.lead} action={st.enabled ? <Badge tone="success">{d.mfa.on}</Badge> : <Badge tone="neutral">{d.mfa.off}</Badge>} />
        <CardBody className="space-y-6">
          {st.enabled ? (
            <>
              <p className="text-sm text-ink-700">{d.mfa.enabledSince.replace("{date}", formatDateTime(st.enabledAt!, locale))} · {d.mfa.recoveryRemaining.replace("{n}", String(st.recoveryRemaining))}</p>
              <RegenerateCodes />
              {st.required ? <p className="text-sm text-ink-600">{d.mfa.cannotDisableStaff}</p> : <DisableMfa />}
            </>
          ) : <EnrollMfa />}
        </CardBody>
      </Card>
    </>
  );
}
