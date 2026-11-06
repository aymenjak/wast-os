import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { orgToday } from "@/server/services/reports";
import { monthlyBillingPreview } from "@/server/services/monthly-billing";
import { formatMinor } from "@/lib/i18n/format";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState, Forbidden, PageHeader } from "@/components/ui/misc";
import { MonthPicker } from "@/components/certificate-view";
import { MonthlyRunForm } from "./run-form";

/** Month-end billing run: preview per customer, then one draft invoice each (D-89). */
export default async function MonthlyBillingPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ month?: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("invoices.write")) return <Forbidden message={d.errors.forbiddenPage} />;
  const sp = await searchParams;
  // Default: the month that just ended (the run is done at the start of the next month).
  const today = orgToday(ctx);
  const prev = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 2, 1)).toISOString().slice(0, 7);
  const month = sp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : prev;
  const preview = await monthlyBillingPreview(ctx, month);
  const err = d.errors.invoice as Record<string, string>;
  const rows = preview.customers.map((c) => ({
    customerId: c.customerId,
    name: c.name,
    collections: c.collections,
    flatFees: c.flatFees,
    total: formatMinor(c.totalMinor, locale, ctx.org.currency),
    problems: c.problems.map((p) => ({ number: p.number, message: (err[p.error.replace("errors.invoice.", "")] ?? p.error).replace("{number}", p.number) })),
  }));
  return (
    <>
      <PageHeader eyebrow={<Link href={`/${locale}/app/invoices`} className="hover:underline">{d.invoices.title}</Link>} title={d.invoices.monthly} description={d.invoices.monthlyLead} />
      <div className="mb-4"><MonthPicker month={month} label={d.invoices.monthlyMonth} apply={d.common.apply} /></div>
      <Card>
        <CardBody>
          {rows.length === 0 ? <EmptyState art="invoices" title={d.invoices.monthlyNothing} /> : <MonthlyRunForm month={month} rows={rows} total={formatMinor(preview.totalMinor, locale, ctx.org.currency)} />}
        </CardBody>
      </Card>
    </>
  );
}
