import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { requireUser } from "@/server/auth/session";
import { billingSettings, listPlatformInvoices, PLATFORM_INVOICE_FILTERS, todayIso } from "@/server/services/billing";
import { requirePlatform } from "@/server/services/platform";
import { formatDay, formatMinor } from "@/lib/i18n/format";
import { toMinor } from "@/lib/money";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { BillingSettingsForm, RecordPaymentForm, RunBillingButton, VoidForm } from "../billing-forms";

export default async function PlatformBilling({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ filter?: string }> }) {
  const { locale } = await params;
  const { filter } = await searchParams;
  const s = await requireUser(locale);
  await requirePlatform(s.user.id, "ADMIN");
  const d = getDictionary(locale);
  const [settings, inv] = await Promise.all([billingSettings(), listPlatformInvoices(s.user.id, filter)]);
  const owner = s.user.platformRole === "OWNER";
  const money = (x: unknown) => <bdi>{formatMinor(toMinor(x as string), locale, "DZD")}</bdi>;
  const sum = (st: string) => inv.sums.find((x) => x.status === st);
  const ready = settings.enabled && settings.issuerName && settings.issuerTaxId;
  return (
    <>
      <PageHeader title={d.billing.platformTitle} description={d.billing.platformLead} actions={<RunBillingButton />} />
      {!ready ? <p role="status" className="mb-6 rounded-[var(--radius-card)] bg-warning-100 px-4 py-3 text-sm text-warning-700">{d.billing.notConfigured}</p> : null}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={d.billing.invoices} />
          <nav aria-label={d.common.filter} className="flex flex-wrap gap-1 border-b border-ink-100 px-4 py-3">
            {[null, ...PLATFORM_INVOICE_FILTERS].map((f) => (
              <Link key={f ?? "all"} href={f ? `?filter=${f}` : "?"} aria-current={(filter ?? null) === f ? "page" : undefined} className="rounded-full border border-ink-200 px-3 py-1 text-sm aria-[current=page]:border-ink-900 aria-[current=page]:bg-ink-900 aria-[current=page]:text-white">
                {f ? (f === "OVERDUE" ? d.billing.overdue : d.billing.status[f]) : d.platform.tenants.all}
              </Link>
            ))}
          </nav>
          {inv.rows.length === 0 ? <EmptyState art="invoices" title={d.billing.noInvoices} /> : (
            <Table scroll>
              <thead><tr><Th>{d.invoices.number}</Th><Th>{d.platform.nav.tenants}</Th><Th>{d.invoices.dueDate}</Th><Th numeric>{d.invoices.total}</Th><Th>{d.common.status}</Th><Th /></tr></thead>
              <tbody>
                {inv.rows.map((i) => {
                  const overdue = i.status === "ISSUED" && i.dueDate < inv.today;
                  return (
                    <tr key={i.id} className="align-top">
                      <Td><span className="num font-semibold">{i.number}</span><div className="text-xs text-ink-600">{i.planCode} · {d.billing.cycles[i.cycle]}</div></Td>
                      <Td><Link className="hover:underline" href={`/${locale}/platform/tenants/${i.organization.id}`}>{i.organization.name}</Link></Td>
                      <Td>{formatDay(i.dueDate, locale)}</Td>
                      <Td numeric>{money(i.total)}</Td>
                      <Td>{overdue ? <Badge tone="danger">{d.billing.overdue}</Badge> : <StatusBadge status={i.status} label={d.billing.status[i.status]} />}{i.paymentMethod ? <div className="text-xs text-ink-600">{d.billing.methods[i.paymentMethod as keyof typeof d.billing.methods] ?? i.paymentMethod}</div> : null}</Td>
                      <Td>{i.status === "ISSUED" ? <div className="space-y-2"><RecordPaymentForm invoiceId={i.id} today={todayIso()} /><VoidForm invoiceId={i.id} /></div> : null}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title={d.billing.totals} />
            <CardBody className="space-y-1 text-sm">
              {(["ISSUED", "PAID", "VOID"] as const).map((st) => <div key={st} className="flex justify-between"><span className="text-ink-600">{d.billing.status[st]} ({sum(st)?._count ?? 0})</span><span className="font-semibold">{money(sum(st)?._sum.total ?? "0")}</span></div>)}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={d.billing.settingsTitle} description={owner ? d.billing.settingsLead : d.platform.plans.ownerOnly} />
            <CardBody>
              {owner ? (
                <BillingSettingsForm s={{ enabled: settings.enabled, autoSuspend: settings.autoSuspend, issuerName: settings.issuerName ?? "", issuerAddress: settings.issuerAddress ?? "", issuerTaxId: settings.issuerTaxId ?? "", issuerTradeRegister: settings.issuerTradeRegister ?? "", issuerStatId: settings.issuerStatId ?? "", taxRateBps: settings.taxRateBps, dueDays: settings.dueDays, graceDays: settings.graceDays }} />
              ) : (
                <ul className="space-y-1 text-sm"><li>{d.billing.enabled}: {settings.enabled ? "✓" : "—"}</li><li>{d.billing.autoSuspend}: {settings.autoSuspend ? "✓" : "—"}</li></ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
