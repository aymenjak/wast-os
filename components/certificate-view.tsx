import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { formatDay, formatNumber } from "@/lib/i18n/format";
import type { collectionCertificate } from "@/server/services/reports";
import { Logo, Table, Td, Th } from "@/components/ui/misc";
import { PrintButton } from "@/app/[locale]/app/invoices/[id]/forms";

type Data = Awaited<ReturnType<typeof collectionCertificate>>;

/** Printable monthly collection certificate (attestation de collecte / شهادة جمع). */
export function CertificateView({ data, d, locale, month, monthPicker }: { data: Data; d: Dictionary; locale: Locale; month: string; monthPicker: React.ReactNode }) {
  const name = (c: { nameAr: string; nameFr: string; nameEn: string } | null) => (c ? (locale === "ar" ? c.nameAr : locale === "fr" ? c.nameFr : c.nameEn) : "—");
  const totalKg = data.byCategory.reduce((s, c) => s + c.netKgMinor, 0) / 100;
  return (
    <article className="mx-auto max-w-4xl bg-white p-8 print:p-0">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 print:hidden">{monthPicker}<PrintButton /></div>
      <header className="flex items-start justify-between gap-6 border-b-2 border-ink-900 pb-4">
        <div>
          <Logo />
          <h1 className="mt-4 text-3xl text-ink-950">{d.certificate.title}</h1>
          <p className="mt-1 text-sm text-ink-600">{d.certificate.reference}: <span className="num">{data.reference}</span></p>
        </div>
        <div className="text-end text-sm text-ink-700">
          <div className="font-semibold text-ink-900">{data.org.legalName ?? data.org.name}</div>
          {data.org.address ? <div>{data.org.address}</div> : null}
          <div className="num text-xs">{[data.org.taxId && `NIF ${data.org.taxId}`, data.org.tradeRegister && `RC ${data.org.tradeRegister}`].filter(Boolean).join(", ")}</div>
        </div>
      </header>
      <p className="mt-6 leading-relaxed text-ink-800">
        {d.certificate.intro.replace("{org}", data.org.legalName ?? data.org.name).replace("{customer}", data.customer.name).replace("{from}", formatDay(data.from, locale)).replace("{to}", formatDay(data.to, locale))}
      </p>
      {data.orders.length === 0 ? <p className="mt-6 text-ink-600">{d.certificate.none}</p> : (
        <>
          <Table className="mt-6">
            <thead><tr><Th>{d.common.date}</Th><Th>{d.workOrders.number}</Th><Th>{d.requests.location}</Th><Th>{d.contracts.category}</Th><Th numeric>{d.workOrders.netKg}</Th></tr></thead>
            <tbody>
              {data.orders.map((w) => (
                <tr key={w.id} className="break-inside-avoid">
                  <Td>{formatDay(w.scheduledDate, locale)}</Td>
                  <Td><span className="num">{w.number}</span></Td>
                  <Td>{w.serviceLocation?.label}</Td>
                  <Td>{name(w.wasteCategory)}</Td>
                  <Td numeric>{w.weightTickets.length ? formatNumber(w.weightTickets.reduce((s, t) => s + Number(t.netKg), 0), locale) : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <dl className="ms-auto mt-4 w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-ink-600">{d.certificate.collections}</dt><dd className="num font-semibold">{formatNumber(data.orders.length, locale)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-600">{d.certificate.totalNet}</dt><dd className="num font-semibold">{formatNumber(totalKg, locale)} kg</dd></div>
          </dl>
        </>
      )}
      <footer className="mt-12 flex items-end justify-between gap-6 text-sm text-ink-700">
        <span>{d.certificate.issuedOn.replace("{date}", formatDay(new Date(), locale))}</span>
        <div className="h-24 w-64 border border-dashed border-ink-400 p-2 text-xs">{d.certificate.signature}</div>
      </footer>
    </article>
  );
}

export function MonthPicker({ month, label, apply }: { month: string; label: string; apply: string }) {
  return (
    <form className="flex items-end gap-2">
      <label className="flex flex-col gap-1 text-sm font-medium text-ink-800">{label}
        <input type="month" name="month" defaultValue={month} className="h-9 rounded-md border border-ink-300 px-2 text-sm" />
      </label>
      <button className="h-9 rounded-md border border-ink-200 bg-white px-3 text-sm hover:bg-ink-50">{apply}</button>
    </form>
  );
}
