import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { listCivicReports } from "@/server/services/civic";
import { Forbidden, PageHeader } from "@/components/ui/misc";
import { CivicMap } from "./civic-map";

export default async function CivicMapPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("civic.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const rows = await listCivicReports(ctx, { open: true });
  return (
    <>
      <PageHeader title={d.civic.mapTitle} description={`${rows.length} · ${d.civic.open}`} />
      <CivicMap points={rows.map((r) => ({ id: r.id, lat: Number(r.latitude), lng: Number(r.longitude), status: r.status, label: `${r.trackingCode} — ${d.enums.CivicCategory[r.category]} — ${d.enums.CivicReportStatus[r.status]}`, href: `/${locale}/app/civic/reports/${r.id}` }))} />
    </>
  );
}
