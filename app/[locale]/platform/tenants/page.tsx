import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { requireUser } from "@/server/auth/session";
import { listTenants, TENANT_SORTS } from "@/server/services/platform";
import { tableState } from "@/server/table";
import { formatDay, formatNumber } from "@/lib/i18n/format";
import { Card } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { Pagination, SortTh, TableToolbar } from "@/components/data-table";

type SP = Record<string, string | string[] | undefined>;

export default async function Tenants({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<SP> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const s = await requireUser(locale);
  const d = getDictionary(locale);
  const st = tableState(sp, TENANT_SORTS, { sort: "createdAt", dir: "desc" });
  const page = await listTenants(s.user.id, st);
  const filters = [
    { value: null, label: d.platform.tenants.all },
    { value: "SERVICE_PROVIDER", label: d.platform.kinds.SERVICE_PROVIDER },
    { value: "MUNICIPALITY", label: d.platform.kinds.MUNICIPALITY },
    { value: "TRIAL", label: d.enums.SubscriptionStatus.TRIAL },
    { value: "PAST_DUE", label: d.enums.SubscriptionStatus.PAST_DUE },
    { value: "UNVERIFIED", label: d.platform.tenants.toVerify },
    { value: "SUSPENDED", label: d.platform.tenants.suspendedBadge },
  ];
  return (
    <>
      <PageHeader title={d.platform.nav.tenants} />
      <Card>
        <TableToolbar sp={sp} d={d} locale={locale} q={st.q} filters={filters} active={st.filter} />
        {page.rows.length === 0 ? <EmptyState art="search" title={d.table.noResults} /> : (
          <Table scroll>
            <thead>
              <tr>
                <SortTh sp={sp} col="name" label={d.common.name} sort={st.sort} dir={st.dir} d={d} />
                <Th>{d.platform.tenants.kind}</Th><Th>{d.platform.tenants.subscription}</Th><Th>{d.platform.tenant.verification}</Th><Th numeric>{d.platform.tenants.members}</Th>
                <SortTh sp={sp} col="createdAt" label={d.platform.tenants.created} sort={st.sort} dir={st.dir} d={d} defaultDir="desc" />
              </tr>
            </thead>
            <tbody>
              {page.rows.map((t) => (
                <tr key={t.id} className="hover:bg-ink-50/60">
                  <Td>
                    <Link className="font-semibold text-ink-900 hover:underline" href={`/${locale}/platform/tenants/${t.id}`}>{t.name}</Link>
                    {t.suspendedAt ? <Badge tone="danger" className="ms-2">{d.platform.tenants.suspendedBadge}</Badge> : null}
                    <div className="text-xs text-ink-600">{[t.wilaya, t.email].filter(Boolean).join(" · ")}</div>
                  </Td>
                  <Td>{d.platform.kinds[t.kind]}</Td>
                  <Td>{t.subscription ? <StatusBadge status={t.subscription.status} label={`${t.subscription.planCode} · ${d.enums.SubscriptionStatus[t.subscription.status]}`} /> : "—"}</Td>
                  <Td>{t.kind === "MUNICIPALITY" ? d.enums.VerificationStatus[t.verificationStatus] : "—"}</Td>
                  <Td numeric>{formatNumber(t._count.memberships, locale)}</Td>
                  <Td>{formatDay(t.createdAt, locale)}</Td>
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
