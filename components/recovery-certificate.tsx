import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { formatDay, formatNumber, formatPercent } from "@/lib/i18n/format";
import type { recoveryCertificate } from "@/server/services/recycling";
import { Logo, Table, Td, Th } from "@/components/ui/misc";
import { PrintButton } from "@/app/[locale]/app/invoices/[id]/forms";
import { MonthPicker } from "@/components/certificate-view";

type Data = Awaited<ReturnType<typeof recoveryCertificate>>;

/** Attestation de valorisation — every figure is the sum of the listed weight tickets. */
export function RecoveryCertificateView({ data, d, locale, month }: { data: Data; d: Dictionary; locale: Locale; month: string }) {
  const t = (minor: number) => formatNumber(minor / 100, locale);
  const stream = (k: string) => (k === "NONE" ? d.recycling.unclassified : d.enums.MaterialStream[k as keyof typeof d.enums.MaterialStream]);
  return (
    <article className="mx-auto max-w-4xl bg-white p-8 print:p-0">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 print:hidden"><MonthPicker month={month} label={d.certificate.month} apply={d.common.apply} /><PrintButton /></div>
      <header className="flex items-start justify-between gap-6 border-b-2 border-ink-900 pb-4">
        <div>
          <Logo />
          <h1 className="mt-4 text-3xl text-ink-950">{d.recycling.certificateTitle}</h1>
          <p className="mt-1 text-sm text-ink-600">{d.certificate.reference}: <span className="num">{data.reference}</span></p>
        </div>
        <div className="text-end text-sm text-ink-700">
          <div className="font-semibold text-ink-900">{data.org.legalName ?? data.org.name}</div>
          {data.org.address ? <div>{data.org.address}</div> : null}
          <div className="num text-xs">{[data.org.taxId && `NIF ${data.org.taxId}`, data.org.tradeRegister && `RC ${data.org.tradeRegister}`].filter(Boolean).join(" · ")}</div>
        </div>
      </header>
      <p className="mt-6 leading-relaxed text-ink-800">
        {d.recycling.certificateIntro.replace("{org}", data.org.legalName ?? data.org.name).replace("{customer}", data.customer.name).replace("{from}", formatDay(new Date(data.from), locale)).replace("{to}", formatDay(new Date(data.to), locale))}
      </p>
      {data.tickets === 0 ? <p className="mt-6 text-ink-600">{d.recycling.noTickets}</p> : (
        <>
          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[[d.recycling.diversionRate, data.rate === null ? "—" : formatPercent(data.rate, locale)], [d.recycling.recovered, `${t(data.total.recovered)} kg`], [d.recycling.disposed, `${t(data.total.disposed)} kg`], [d.recycling.untracked, `${t(data.total.untracked)} kg`]].map(([k, v]) => (
              <div key={k} className="rounded-md border border-ink-200 p-3"><dt className="text-xs text-ink-600">{k}</dt><dd className="num display text-xl font-bold text-ink-950">{v}</dd></div>
            ))}
          </dl>
          {data.total.energy > 0 ? <p className="mt-2 text-sm text-ink-700">{d.recycling.energyShare}: <span className="num">{`\u2066${t(data.total.energy)} kg\u2069`}</span></p> : null}
          <h2 className="mt-8 text-lg font-bold text-ink-900">{d.recycling.byStream}</h2>
          <Table className="mt-2">
            <thead><tr><Th>{d.recycling.stream}</Th><Th numeric>{d.recycling.recovered}</Th><Th numeric>{d.recycling.disposed}</Th><Th numeric>{d.recycling.untracked}</Th></tr></thead>
            <tbody>{data.byStream.map((s) => <tr key={s.key}><Td>{stream(s.key)}</Td><Td numeric>{t(s.recovered)}</Td><Td numeric>{t(s.disposed)}</Td><Td numeric>{t(s.untracked)}</Td></tr>)}</tbody>
          </Table>
          <h2 className="mt-8 text-lg font-bold text-ink-900">{d.recycling.destinationsUsed}</h2>
          <ul className="mt-2 space-y-1 text-sm">{data.destinationsUsed.map((x) => <li key={x.id}>{x.name} — {d.enums.DestinationKind[x.kind]}{x.registrationNumber ? <span className="num text-ink-600"> · {x.registrationNumber}</span> : null}</li>)}</ul>
          <h2 className="mt-8 text-lg font-bold text-ink-900">{d.recycling.ticketsList}</h2>
          <Table className="mt-2">
            <thead><tr><Th>{d.common.date}</Th><Th>{d.workOrders.number}</Th><Th>{d.recycling.stream}</Th><Th>{d.recycling.destination}</Th><Th numeric>{d.workOrders.netKg}</Th><Th numeric>{d.recycling.rejectedKg}</Th></tr></thead>
            <tbody>{data.lines.map((l, i) => (
              <tr key={i} className="break-inside-avoid"><Td>{formatDay(l.date, locale)}</Td><Td><span className="num whitespace-nowrap">{l.workOrder}</span></Td><Td>{l.stream ? stream(l.stream) : "—"}{l.contaminated ? ` · ${d.recycling.contaminated}` : ""}</Td><Td>{l.destination ?? d.recycling.untracked}</Td><Td numeric>{formatNumber(l.netKg, locale)}</Td><Td numeric>{l.rejectedKg ? formatNumber(l.rejectedKg, locale) : "—"}</Td></tr>
            ))}</tbody>
          </Table>
        </>
      )}
      <p className="mt-6 text-xs text-ink-600">{d.recycling.certificateMethod}</p>
      <footer className="mt-10 flex items-end justify-between gap-6 text-sm text-ink-700">
        <span>{d.certificate.issuedOn.replace("{date}", formatDay(new Date(), locale))}</span>
        <div className="h-24 w-64 border border-dashed border-ink-400 p-2 text-xs">{d.certificate.signature}</div>
      </footer>
    </article>
  );
}
