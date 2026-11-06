import type { Locale } from "@/lib/i18n/config";
import { appPage, orNotFound } from "@/server/page";
import { collectionSlip } from "@/server/services/work-orders";
import { formatDateTime, formatDay, formatNumber } from "@/lib/i18n/format";
import { Logo, Table, Td, Th } from "@/components/ui/misc";
import { PrintButton } from "@/app/[locale]/app/invoices/[id]/forms";

/** Printable collection slip (bon d'enlèvement / وصل الرفع) with the customer's signature taken on site. */
export default async function CollectionSlipPage({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  const { id } = await params;
  const { wo, org, signature, netKg } = await orNotFound(collectionSlip(ctx, id));
  const w = d.workOrders;
  const cat = wo.wasteCategory ? (locale === "ar" ? wo.wasteCategory.nameAr : locale === "fr" ? wo.wasteCategory.nameFr : wo.wasteCategory.nameEn) : "—";
  const crew = wo.team ? [wo.team.name, ...wo.team.members.map((m) => m.membership.user.name)].join(", ") : "—";
  const loc = wo.serviceLocation;
  const rows: [string, React.ReactNode][] = [
    [w.number, <span key="n" className="num">{wo.number}</span>],
    [d.common.date, formatDay(wo.scheduledDate, locale)],
    [d.contracts.customer, wo.customer?.name ?? "—"],
    [d.requests.location, loc ? [loc.label, loc.addressLine, loc.commune].filter(Boolean).join(", ") : "—"],
    [d.contracts.category, cat],
    [w.slipCrew, crew],
    [d.fleet.plate, wo.vehicle ? <bdi key="p" className="num">{wo.vehicle.plateNumber}</bdi> : "—"],
  ];
  return (
    <article className="mx-auto max-w-3xl bg-white p-6 sm:p-8 print:p-0">
      <div className="mb-6 flex justify-end print:hidden"><PrintButton /></div>
      <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-ink-900 pb-4">
        <div>
          <Logo />
          <h1 className="mt-4 text-2xl text-ink-950 sm:text-3xl">{w.slipTitle}</h1>
          <p className="mt-1 text-sm text-ink-600"><span className="num">{wo.number}</span></p>
        </div>
        <div className="text-sm text-ink-700 sm:text-end">
          <div className="font-semibold text-ink-900">{org.legalName ?? org.name}</div>
          {org.address ? <div>{org.address}</div> : null}
          <div className="num text-xs">{[org.taxId && `NIF ${org.taxId}`, org.tradeRegister && `RC ${org.tradeRegister}`].filter(Boolean).join(", ")}</div>
        </div>
      </header>
      <p className="mt-6 leading-relaxed text-ink-800">{w.slipIntro.replace("{org}", org.legalName ?? org.name).replace("{customer}", wo.customer?.name ?? "—")}</p>
      <dl className="mt-6 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-col border-b border-ink-100 pb-2">
            <dt className="text-ink-600">{k}</dt>
            <dd className="font-medium text-ink-900">{v}</dd>
          </div>
        ))}
      </dl>
      {wo.weightTickets.length ? (
        <Table className="mt-6">
          <thead><tr><Th>{w.ticketNumber}</Th><Th numeric>{w.grossKg}</Th><Th numeric>{w.tareKg}</Th><Th numeric>{w.netKg}</Th></tr></thead>
          <tbody>
            {wo.weightTickets.map((t) => (
              <tr key={t.id}>
                <Td><span className="num">{t.ticketNumber ?? "—"}</span></Td>
                <Td numeric>{formatNumber(Number(t.grossKg), locale)}</Td>
                <Td numeric>{formatNumber(Number(t.tareKg), locale)}</Td>
                <Td numeric>{formatNumber(Number(t.netKg), locale)}</Td>
              </tr>
            ))}
            <tr className="font-semibold"><Td>{d.common.total}</Td><Td numeric /><Td numeric /><Td numeric>{formatNumber(netKg, locale)} kg</Td></tr>
          </tbody>
        </Table>
      ) : null}
      {wo.completionNotes ? <p className="mt-4 text-sm text-ink-700"><span className="font-medium">{w.completionNotes}: </span>{wo.completionNotes}</p> : null}
      <footer className="mt-10 grid gap-6 text-sm text-ink-700 sm:grid-cols-2">
        <div className="h-32 rounded-md border border-dashed border-ink-400 p-2 text-xs">{d.certificate.signature}</div>
        <div className="rounded-md border border-ink-300 p-2">
          <div className="text-xs text-ink-600">{w.slipCustomerSignature}</div>
          {signature && wo.signedAt ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/files/${signature.id}`} alt={`${w.signature}: ${wo.signerName}`} className="mt-1 h-20 w-auto max-w-full" />
              <div className="mt-1 text-xs">{w.signedBy.replace("{name}", wo.signerName ?? "").replace("{time}", formatDateTime(wo.signedAt, locale, org.timezone))}</div>
            </>
          ) : <div className="h-24 pt-2 text-xs text-ink-500">{w.slipNoSignature}</div>}
        </div>
      </footer>
    </article>
  );
}
