import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { orgToday } from "@/server/services/reports";
import { dispatchView } from "@/server/dispatch-view";
import { formatDay } from "@/lib/i18n/format";
import { Forbidden, Logo, Table, Td, Th } from "@/components/ui/misc";
import { PrintButton } from "../../invoices/[id]/forms";

/** Printable daily route sheet for a crew: the paper backup every driver still asks for. */
export default async function RouteSheet({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ date?: string; team?: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("workorders.dispatch")) return <Forbidden message={d.errors.forbiddenPage} />;
  const sp = await searchParams;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : orgToday(ctx);
  const v = await dispatchView(ctx, date);
  const route = v.teamRoutes.find((r) => r.team.id === sp.team);
  if (!route) return <Forbidden message={d.errors.notFound} />;
  const vehicles = [...new Set(route.orders.map((o) => o.vehicle?.plateNumber).filter(Boolean))];
  return (
    <article className="mx-auto max-w-4xl bg-white p-8 print:p-0">
      <header className="flex items-start justify-between gap-6 border-b-2 border-ink-900 pb-4">
        <div>
          <Logo />
          <h1 className="mt-4 text-3xl text-ink-950">{d.schedule.sheetTitle}</h1>
          <p className="mt-1 text-ink-700">{d.schedule.sheetFor.replace("{team}", route.team.name).replace("{date}", formatDay(date, locale))}</p>
        </div>
        <div className="text-end text-sm text-ink-700">
          <div className="font-semibold text-ink-900">{ctx.org.name}</div>
          {vehicles.length ? <div className="num">{vehicles.join(", ")}</div> : null}
          <div className="mt-3 flex gap-2 print:hidden">
            <Link href={`/${locale}/app/dispatch?date=${date}`} className="text-sm text-ink-600 hover:underline">{d.common.back}</Link>
            <PrintButton />
          </div>
        </div>
      </header>
      <Table className="mt-4">
        <thead><tr><Th>{d.schedule.stop}</Th><Th>{d.workOrders.number}</Th><Th>{d.requests.customer}</Th><Th>{d.common.address}</Th><Th>{d.contracts.category}</Th><Th>{d.schedule.done}</Th></tr></thead>
        <tbody>
          {route.orders.map((o, i) => (
            <tr key={o.id} className="break-inside-avoid">
              <Td><span className="num text-lg font-bold">{i + 1}</span></Td>
              <Td><span className="num">{o.number}</span></Td>
              <Td><div className="font-semibold">{o.customer?.name ?? o.civicReport?.trackingCode}</div><div className="text-xs text-ink-600">{o.serviceLocation?.label}</div></Td>
              <Td>{o.serviceLocation?.addressLine ?? o.civicReport?.addressHint ?? "—"}{o.instructions ? <div className="mt-1 text-xs text-ink-700">{o.instructions}</div> : null}</Td>
              <Td>{o.wasteCategory ? (locale === "ar" ? o.wasteCategory.nameAr : locale === "fr" ? o.wasteCategory.nameFr : o.wasteCategory.nameEn) : "—"}</Td>
              <Td><span aria-hidden className="inline-block size-5 rounded border-2 border-ink-700" /></Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <footer className="mt-12 flex justify-end">
        <div className="w-64 border-t border-ink-700 pt-1 text-sm text-ink-700">{d.schedule.signature}</div>
      </footer>
    </article>
  );
}
