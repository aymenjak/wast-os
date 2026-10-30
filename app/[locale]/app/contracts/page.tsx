import Link from "next/link";
import { Plus } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { listContracts } from "@/server/services/contracts";
import { formatDay } from "@/lib/i18n/format";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, Forbidden, PageHeader, Table, Td, Th } from "@/components/ui/misc";

export default async function ContractsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("contracts.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const rows = await listContracts(ctx);
  return (
    <>
      <PageHeader title={d.contracts.title} actions={ctx.permissions.has("contracts.write") ? <ButtonLink href={`/${locale}/app/contracts/new`}><Plus aria-hidden className="size-4" />{d.contracts.new}</ButtonLink> : null} />
      <Card>
        {rows.length === 0 ? <EmptyState title={d.contracts.empty} /> : (
          <Table>
            <thead><tr><Th>{d.contracts.reference}</Th><Th>{d.contracts.titleField}</Th><Th>{d.contracts.customer}</Th><Th>{d.contracts.startDate}</Th><Th>{d.contracts.endDate}</Th><Th numeric>{d.contracts.lines}</Th><Th>{d.common.status}</Th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-ink-50/60">
                  <Td><Link href={`/${locale}/app/contracts/${c.id}`} className="num font-medium text-ink-900 hover:underline">{c.reference}</Link></Td>
                  <Td>{c.title}</Td>
                  <Td>{c.customer.name}</Td>
                  <Td>{formatDay(c.startDate, locale)}</Td>
                  <Td>{formatDay(c.endDate, locale)}</Td>
                  <Td numeric>{c._count.lines}</Td>
                  <Td><StatusBadge status={c.status} label={d.enums.ContractStatus[c.status]} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
