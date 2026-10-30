import Link from "next/link";
import { Plus } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { listCustomers } from "@/server/services/customers";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, Forbidden, PageHeader, Table, Td, Th } from "@/components/ui/misc";

export default async function CustomersPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ q?: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("customers.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const { q } = await searchParams;
  const rows = await listCustomers(ctx, { q });
  return (
    <>
      <PageHeader
        title={d.customers.title}
        actions={ctx.permissions.has("customers.write") ? <ButtonLink href={`/${locale}/app/customers/new`}><Plus aria-hidden className="size-4" />{d.customers.new}</ButtonLink> : null}
      />
      <Card>
        <form className="flex gap-2 border-b border-ink-100 p-3" role="search">
          <label htmlFor="q" className="sr-only">{d.common.search}</label>
          <input id="q" name="q" defaultValue={q} placeholder={d.common.search} className="h-9 w-full max-w-sm rounded-md border border-ink-300 px-3 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        </form>
        {rows.length === 0 ? (
          <EmptyState title={d.customers.empty} hint={d.customers.emptyHint} />
        ) : (
          <Table>
            <thead><tr><Th>{d.customers.code}</Th><Th>{d.common.name}</Th><Th>{d.customers.kind}</Th><Th numeric>{d.customers.locations}</Th><Th numeric>{d.customers.activeContracts}</Th><Th>{d.common.status}</Th></tr></thead>
            <tbody>
              {rows.map((c) => (
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
      </Card>
    </>
  );
}
