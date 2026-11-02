import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { requireUser } from "@/server/auth/session";
import { listPlans } from "@/server/services/platform";
import { formatMinor, formatNumber } from "@/lib/i18n/format";
import { toMinor } from "@/lib/money";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DescriptionList, PageHeader } from "@/components/ui/misc";
import { PlanForm } from "../forms";

export default async function Plans({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const s = await requireUser(locale);
  const d = getDictionary(locale);
  const plans = await listPlans(s.user.id);
  const owner = s.user.platformRole === "OWNER";
  const lim = (x: number) => (x < 0 ? "∞" : formatNumber(x, locale));
  return (
    <>
      <PageHeader title={d.platform.nav.plans} description={d.platform.plans.lead} />
      {owner ? null : <p className="mb-6 text-sm text-ink-600">{d.platform.plans.ownerOnly}</p>}
      <div className="space-y-6">
        {plans.map((p) => (
          <Card key={p.code}>
            <CardHeader title={<>{p.name} <span className="num text-sm font-normal text-ink-600">{p.code}</span></>} description={d.platform.plans.subscribers.replace("{n}", formatNumber(p._count.subscriptions, locale))} />
            <CardBody>
              {owner ? (
                <PlanForm plan={{ code: p.code, name: p.name, priceMonthly: p.priceMonthly.toString(), priceYearly: p.priceYearly.toString(), maxUsers: p.maxUsers, maxVehicles: p.maxVehicles, maxCustomers: p.maxCustomers, customerPortal: p.customerPortal, advancedReports: p.advancedReports, isPublic: p.isPublic }} />
              ) : (
                <DescriptionList items={[
                  [d.platform.plans.priceMonthly, <bdi key="m">{formatMinor(toMinor(p.priceMonthly), locale, "DZD")}</bdi>],
                  [d.platform.plans.maxUsers, lim(p.maxUsers)], [d.platform.plans.maxVehicles, lim(p.maxVehicles)], [d.platform.plans.maxCustomers, lim(p.maxCustomers)],
                ]} />
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
