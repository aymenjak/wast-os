import Link from "next/link";
import { CalendarRange, Plus } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { tableState } from "@/server/table";
import { INVOICE_SORTS, invoicesTable } from "@/server/services/tables";
import { orgToday } from "@/server/services/reports";
import { formatDay, formatMoney } from "@/lib/i18n/format";
import { toMinor } from "@/lib/money";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, Forbidden, MetricStrip, PageHeader, Stat, Table, Td, Th } from "@/components/ui/misc";
import { Pagination, SortTh, TableToolbar } from "@/components/data-table";

export default async function InvoicesPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("invoices.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const sp = await searchParams;
  const s = tableState(sp, INVOICE_SORTS, { sort: "createdAt", dir: "desc" });
  const page = await invoicesTable(ctx, s);
  const today = orgToday(ctx);
  const money = (v: number) => <span className="num">{formatMoney(v, locale, ctx.org.currency)}</span>;
  return (
    <>
      <PageHeader title={d.invoices.title} actions={ctx.permissions.has("invoices.write") ? <><ButtonLink variant="secondary" href={`/${locale}/app/invoices/monthly`}><CalendarRange aria-hidden className="size-4" />{d.invoices.monthly}</ButtonLink><ButtonLink href={`/${locale}/app/invoices/new`}><Plus aria-hidden className="size-4" />{d.invoices.new}</ButtonLink></> : null} />
      <MetricStrip className="mb-6 lg:grid-cols-3">
        <Stat label={d.invoices.total} value={money(page.sums.total)} />
        <Stat label={d.invoices.paid} value={money(page.sums.paid)} />
        <Stat label={d.invoices.balance} value={money(page.sums.total - page.sums.paid)} tone={page.sums.total - page.sums.paid > 0 ? "warning" : "default"} />
      </MetricStrip>
      <Card>
        <TableToolbar sp={sp} d={d} locale={locale} q={s.q} active={s.filter} exportKind={ctx.permissions.has("reports.read") && !ctx.support ? "invoices" : undefined}
          filters={[
            { value: null, label: d.common.all },
            { value: "OPEN", label: d.civic.open },
            ...(["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "VOID"] as const).map((x) => ({ value: x, label: d.enums.InvoiceStatus[x] })),
          ]} />
        {page.total === 0 ? <EmptyState art={s.q || s.filter ? "search" : "invoices"} title={s.q || s.filter ? d.table.noResults : d.invoices.empty} /> : (
          <Table scroll>
            <thead><tr>
              <SortTh sp={sp} col="number" label={d.invoices.number} sort={s.sort} dir={s.dir} d={d} />
              <Th className="sticky top-0 z-10 bg-ink-50">{d.invoices.customer}</Th>
              <SortTh sp={sp} col="issueDate" label={d.invoices.issueDate} sort={s.sort} dir={s.dir} d={d} defaultDir="desc" />
              <SortTh sp={sp} col="dueDate" label={d.invoices.dueDate} sort={s.sort} dir={s.dir} d={d} />
              <SortTh sp={sp} col="total" label={d.invoices.total} sort={s.sort} dir={s.dir} d={d} numeric defaultDir="desc" />
              <Th numeric className="sticky top-0 z-10 bg-ink-50">{d.invoices.balance}</Th>
              <Th className="sticky top-0 z-10 bg-ink-50">{d.common.status}</Th>
            </tr></thead>
            <tbody>
              {page.rows.map((i) => {
                const balance = (toMinor(i.total) - toMinor(i.amountPaid)) / 100;
                const overdue = i.dueDate && i.dueDate.toISOString().slice(0, 10) < today && (i.status === "ISSUED" || i.status === "PARTIALLY_PAID");
                return (
                  <tr key={i.id} className="hover:bg-ink-50/60">
                    <Td><Link href={`/${locale}/app/invoices/${i.id}`} className="num font-medium text-ink-900 hover:underline">{i.number ?? d.invoices.draft}</Link></Td>
                    <Td>{i.customer.name}</Td>
                    <Td>{formatDay(i.issueDate, locale)}</Td>
                    <Td className={overdue ? "font-medium text-danger-700" : undefined}>{formatDay(i.dueDate, locale)}</Td>
                    <Td numeric>{money(Number(i.total))}</Td>
                    <Td numeric>{i.status === "VOID" || i.status === "DRAFT" ? "—" : money(balance)}</Td>
                    <Td><StatusBadge status={i.status} label={d.enums.InvoiceStatus[i.status]} /></Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <Pagination sp={sp} d={d} locale={locale} page={page.page} pages={page.pages} total={page.total} pageSize={page.pageSize} />
      </Card>
    </>
  );
}
