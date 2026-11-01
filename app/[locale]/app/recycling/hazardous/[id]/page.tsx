import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n/config";
import { formatDateTime, formatDay, formatNumber } from "@/lib/i18n/format";
import { appPage } from "@/server/page";
import { getMovement } from "@/server/services/hazardous";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/misc";
import { InlineAction } from "@/components/inline-action";
import { PrintButton } from "@/app/[locale]/app/invoices/[id]/forms";
import { cancelMovementAction } from "@/app/actions/business";
import { DeliverForm, PickUpForm, RefuseForm } from "../forms";

const STATUS_TONE = { DRAFT: "neutral", IN_TRANSIT: "info", DELIVERED: "success", REFUSED: "danger", CANCELLED: "neutral" } as const;

function Party({ title, lines, signed, signedAt, locale, pending }: { title: string; lines: ReactNode[]; signed: string | null; signedAt: Date | null; locale: Locale; pending: string }) {
  return (
    <section className="rounded-md border border-ink-200 p-4 break-inside-avoid">
      <h3 className="text-xs font-semibold tracking-wide text-ink-600 uppercase">{title}</h3>
      <div className="mt-1 space-y-0.5 text-sm text-ink-900">{lines.map((l, i) => <div key={i}>{l}</div>)}</div>
      <div className="mt-3 border-t border-dashed border-ink-200 pt-2 text-sm">
        {signed ? <><span className="font-medium text-ink-900">✓ {signed}</span><div className="text-xs text-ink-600">{formatDateTime(signedAt, locale)}</div></> : <span className="text-ink-500">{pending}</span>}
      </div>
    </section>
  );
}

/** One special-hazardous-waste transport (décret 04-409 art. 17–21), printable. */
export default async function MovementPage({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  const { id } = await params;
  const m = await getMovement(ctx, id);
  if (!m) notFound();
  const h = d.hazardous;
  const canAct = ctx.permissions.has("workorders.dispatch") || ctx.permissions.has("workorders.execute");
  return (
    <article className="mx-auto max-w-4xl bg-white p-8 print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/${locale}/app/recycling/hazardous`} className="text-sm text-brand-700 hover:underline">← {h.title}</Link>
        <PrintButton />
      </div>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink-900 pb-4">
        <div>
          <Logo />
          <h1 className="mt-4 text-2xl text-ink-950">{h.movementTitle} <span className="num">{m.number}</span></h1>
          <p className="mt-1 text-xs text-ink-600">{h.officialFormNote}</p>
        </div>
        <Badge tone={STATUS_TONE[m.status]}>{d.enums.HazardousMovementStatus[m.status]}</Badge>
      </header>

      <section className="mt-6">
        <h2 className="text-lg font-bold text-ink-900">{h.waste}</h2>
        <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-ink-600">{h.wasteCode}</dt><dd><span className="num font-semibold">{m.wasteCode} SD</span> — <span lang="fr" dir="ltr">{m.designation}</span></dd></div>
          <div><dt className="text-xs text-ink-600">{h.hazardCriteria}</dt><dd lang="fr" dir="ltr">{m.hazardCriteria || "—"}</dd></div>
          <div><dt className="text-xs text-ink-600">{h.consistency}</dt><dd>{d.enums.WasteConsistency[m.consistency]}</dd></div>
          <div><dt className="text-xs text-ink-600">{h.quantityKg}</dt><dd className="num">{formatNumber(Number(m.quantityKg), locale)}</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs text-ink-600">{h.packaging}</dt><dd>{m.packaging} · {m.labelled ? h.labelledYes : h.labelledNo}</dd></div>
        </dl>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Party title={h.role.SHIPPER} locale={locale} pending={h.awaitingSignature} signed={m.shipperSignedName} signedAt={m.shipperSignedAt} lines={[m.customer.name, <span key="c" className="num text-xs text-ink-600">{m.customer.code}</span>]} />
        <Party title={h.role.CARRIER} locale={locale} pending={h.awaitingSignature} signed={m.carrierSignedName} signedAt={m.carrierSignedAt}
          lines={[m.organization.legalName ?? m.organization.name, <span key="a" className="text-xs">{h.authNumber}: <span className="num">{m.carrierAuthNumber}</span> ({h.authExpires} {formatDay(m.carrierAuthExpiresOn, locale)})</span>, m.vehicle ? <span key="v" className="num text-xs">{m.vehicle.plateNumber}</span> : null].filter(Boolean)} />
        <Party title={h.role.CONSIGNEE} locale={locale} pending={h.awaitingSignature} signed={m.consigneeSignedName} signedAt={m.consigneeSignedAt}
          lines={[m.destination.name, <span key="k" className="text-xs">{d.enums.DestinationKind[m.destination.kind]} · <span className="num">{m.destination.registrationNumber}</span></span>]} />
      </div>

      {m.status === "DELIVERED" ? <p className="mt-4 text-sm text-success-700">✓ {h.decontaminatedDone}</p> : null}
      {m.status === "REFUSED" ? (
        <p role="status" className="mt-4 rounded-md border border-danger-700/30 bg-danger-100 px-4 py-3 text-sm text-danger-700">
          {h.refusedBy}: <strong>{h.role[m.refusedByRole as "SHIPPER" | "CARRIER" | "CONSIGNEE"]}</strong> · {formatDateTime(m.refusedAt, locale)}<span className="mt-1 block text-ink-800">{m.refusalReason}</span>
        </p>
      ) : null}

      {canAct && ["DRAFT", "IN_TRANSIT"].includes(m.status) ? (
        <section className="mt-8 space-y-4 rounded-md bg-ink-50 p-4 print:hidden">
          {m.status === "DRAFT" ? (
            <>
              <p className="text-sm text-ink-700">{m.labelled ? h.pickUpHint : h.labelFirst}</p>
              {m.labelled ? <PickUpForm movementId={m.id} /> : null}
              {ctx.permissions.has("workorders.dispatch") ? <InlineAction action={cancelMovementAction} hidden={{ movementId: m.id }} label={d.common.cancel} /> : null}
            </>
          ) : <DeliverForm movementId={m.id} />}
          <RefuseForm movementId={m.id} />
        </section>
      ) : null}
      {m.workOrder ? <p className="mt-6 text-sm print:hidden"><Link className="text-brand-700 hover:underline" href={`/${locale}/app/work-orders/${m.workOrder.id}`}>{m.workOrder.number}</Link></p> : null}
    </article>
  );
}
