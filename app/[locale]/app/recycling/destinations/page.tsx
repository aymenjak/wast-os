import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { listCategoriesForClassification, listDestinations } from "@/server/services/recycling";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Forbidden, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { InlineAction } from "@/components/inline-action";
import { setDestinationActiveAction } from "@/app/actions/business";
import { CLASS_LETTER, findNomenclature } from "@/lib/nomenclature-06-104";
import { RECOVERY_KINDS } from "@/server/domain/recovery";
import { ClassifyForm, DestinationForm } from "../forms";

// Valorisation kinds (law 01-19 art. 3 as amended by law 25-02).
const RECOVERY: ReadonlySet<string> = RECOVERY_KINDS;

export default async function DestinationsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("settings.manage")) return <Forbidden message={d.errors.forbiddenPage} />;
  const [destinations, categories] = await Promise.all([listDestinations(ctx), listCategoriesForClassification(ctx)]);
  const name = (c: { nameAr: string; nameFr: string; nameEn: string }) => (locale === "ar" ? c.nameAr : locale === "fr" ? c.nameFr : c.nameEn);
  return (
    <>
      <PageHeader eyebrow={<Link href={`/${locale}/app/recycling`} className="hover:underline">{d.recycling.title}</Link>} title={d.recycling.destinations} description={d.recycling.destinationsLead} />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          {destinations.length === 0 ? <EmptyState art="workOrders" title={d.recycling.noDestinations} /> : (
            <Table>
              <thead><tr><Th>{d.common.name}</Th><Th>{d.recycling.kind}</Th><Th>{d.recycling.registrationNumber}</Th><Th /></tr></thead>
              <tbody>{destinations.map((x) => (
                <tr key={x.id} className={x.active ? "" : "opacity-60"}>
                  <Td>{x.name}<div className="text-xs text-ink-600">{[x.wilaya, x.address].filter(Boolean).join(" · ")}</div></Td>
                  <Td><Badge tone={RECOVERY.has(x.kind) ? "success" : "neutral"}>{d.enums.DestinationKind[x.kind]}</Badge></Td>
                  <Td><span className="num text-xs">{x.registrationNumber ?? "—"}</span></Td>
                  <Td className="text-end"><InlineAction action={setDestinationActiveAction} hidden={{ destinationId: x.id, active: String(!x.active) }} label={x.active ? d.recycling.disable : d.recycling.enable} size="sm" /></Td>
                </tr>
              ))}</tbody>
            </Table>
          )}
        </Card>
        <Card className="lg:col-span-2"><CardHeader title={d.recycling.addDestination} description={d.recycling.recoveryKindsNote} /><CardBody><DestinationForm /></CardBody></Card>
      </div>
      <Card className="mt-6">
        <CardHeader title={d.recycling.classification} description={d.recycling.classificationLead} />
        <ul className="divide-y divide-ink-100">
          {categories.map((c) => (
            <li key={c.id} className="flex flex-wrap items-end justify-between gap-3 px-5 py-3">
              <div><div className="font-medium text-ink-900">{name(c)}</div><div className="num text-xs text-ink-600">{c.code}</div>
                {(() => {
                  const e = c.nomenclatureCode ? findNomenclature(c.nomenclatureCode, CLASS_LETTER[c.regulatoryClass]) : undefined;
                  return e ? <div className="mt-0.5 max-w-md text-xs text-ink-700" lang="fr" dir="ltr"><span className="num">{e[0]} {e[1]}</span> — {e[2]}</div> : null;
                })()}</div>
              <ClassifyForm category={{ id: c.id, stream: c.stream, regulatoryClass: c.regulatoryClass, nomenclatureCode: c.nomenclatureCode }} />
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
