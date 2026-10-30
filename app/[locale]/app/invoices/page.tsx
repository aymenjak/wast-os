import Link from "next/link";
import { Plus } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { listInvoices } from "@/server/services/invoices";
import { orgToday } from "@/server/services/reports";
import { formatDay, formatMoney } from "@/lib/i18n/format";
import { toMinor } from "@/lib/money";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, Forbidden, PageHeader, Table, Td, Th } from "@/components/ui/misc";

export default async function InvoicesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("invoices.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const rows = await listInvoices(ctx);
  const today = orgToday(ctx);
  return (
    <>
      <PageHeader title={d.invoices.title} actions={ctx.permissions.has("invoices.write") ? <ButtonLink href={`/${locale}/app/invoices/new`}><Plus aria-hidden className="size-4" />{d.invoices.new}</ButtonLink> : null} />
      <Card>
        {rows.length === 0 ? <EmptyState title={d.invoices.empty} /> : (
          <Table>
            <thead><tr><Th>{d.invoices.number}</Th><Th>{d.invoices.customer}</Th><Th>{d.invoices.issueDate}</Th><Th>{d.invoices.dueDate}</Th><Th numeric>{d.invoices.total}</Th><Th numeric>{d.invoices.balance}</Th><Th>{d.common.status}</Th></tr></thead>
            <tbody>
              {rows.map((i) => {
                const balance = (toMinor(i.total) - toMinor(i.amountPaid)) / 100;
                const overdue = i.dueDate && i.dueDate.toISOString().slice(0, 10) < today && (i.status === "ISSUED" || i.status === "PARTIALLY_PAID");
                return (
                  <tr key={i.id} className="hover:bg-ink-50/60">
                    <Td><Link href={`/${locale}/app/invoices/${i.id}`} className="num font-medium text-ink-900 hover:underline">{i.number ?? d.invoices.draft}</Link></Td>
                    <Td>{i.customer.name}</Td>
                    <Td>{formatDay(i.issueDate, locale)}</Td>
                    <Td className={overdue ? "font-medium text-danger-700" : undefined}>{formatDay(i.dueDate, locale)}</Td>
                    <Td numeric><span className="num">{formatMoney(i.total, locale, i.currency)}</span></Td>
                    <Td numeric><span className="num">{i.status === "VOID" || i.status === "DRAFT" ? "—" : formatMoney(balance, locale, i.currency)}</span></Td>
                    <Td><StatusBadge status={i.status} label={d.enums.InvoiceStatus[i.status]} /></Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
