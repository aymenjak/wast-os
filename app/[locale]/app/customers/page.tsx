import Link from "next/link";
import { Plus } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { tableState } from "@/server/table";
import { CUSTOMER_SORTS, customersTable } from "@/server/services/tables";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, Forbidden, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { Pagination, SortTh, TableToolbar } from "@/components/data-table";

export default async function CustomersPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("customers.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const sp = await searchParams;
  const s = tableState(sp, CUSTOMER_SORTS, { sort: "name" });
  const page = await customersTable(ctx, s);
  return (
    <>
      <PageHeader title={d.customers.title} actions={ctx.permissions.has("customers.write") ? <ButtonLink href={`/${locale}/app/customers/new`}><Plus aria-hidden className="size-4" />{d.customers.new}</ButtonLink> : null} />
      <Card>
        <TableToolbar sp={sp} d={d} locale={locale} q={s.q} active={s.filter} exportKind={ctx.support ? undefined : "customers"}
          filters={[{ value: null, label: d.common.all }, { value: "ACTIVE", label: d.enums.CustomerStatus.ACTIVE }, { value: "INACTIVE", label: d.enums.CustomerStatus.INACTIVE }]} />
        {page.total === 0 ? <EmptyState title={s.q || s.filter ? d.table.noResults : d.customers.empty} hint={s.q || s.filter ? undefined : d.customers.emptyHint} /> : (
          <Table scroll>
            <thead><tr>
              <SortTh sp={sp} col="code" label={d.customers.code} sort={s.sort} dir={s.dir} d={d} />
              <SortTh sp={sp} col="name" label={d.common.name} sort={s.sort} dir={s.dir} d={d} />
              <Th className="sticky top-0 z-10 bg-ink-50">{d.customers.kind}</Th>
              <Th numeric className="sticky top-0 z-10 bg-ink-50">{d.customers.locations}</Th>
              <Th numeric className="sticky top-0 z-10 bg-ink-50">{d.customers.activeContracts}</Th>
              <Th className="sticky top-0 z-10 bg-ink-50">{d.common.status}</Th>
            </tr></thead>
            <tbody>
              {page.rows.map((c) => (
                <tr key={c.id} className="hover:bg-ink-50/60">
                  <Td><span className="num text-ink-600">{c.code}</span></Td>
                  <Td><Link href={`/${locale}/app/customers/${c.id}`} className="font-medium text-ink-900 hover:underline">{c.name}</Link></Td>
                  <Td>{d.enums.CustomerKind[c.kind]}</Td>
                  <Td numeric>{c._count.locations}</Td>
                  <Td numeric>{c._count.contracts}</Td>
                  <Td><StatusBadge status={c.status} label={d.enums.CustomerStatus[c.status]} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination sp={sp} d={d} locale={locale} page={page.page} pages={page.pages} total={page.total} pageSize={page.pageSize} />
      </Card>
    </>
  );
}
