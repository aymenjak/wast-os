import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { appPage, orNotFound } from "@/server/page";
import { getContract, canTransitionContract, readTiers } from "@/server/services/contracts";
import { formatDateTime, formatDay, formatMoney, formatNumber } from "@/lib/i18n/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { DescriptionList, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { InlineAction } from "@/components/inline-action";
import { removeSurchargeAction, setContractStatusAction } from "@/app/actions/business";
import { LinePricingForm, SurchargeForm } from "./forms";
import type { ContractStatus } from "@/lib/generated/prisma/enums";

export default async function ContractDetail({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  const { id } = await params;
  const c = await orNotFound(getContract(ctx, id));
  const name = (x: { nameEn: string; nameFr: string; nameAr: string }) => (locale === "ar" ? x.nameAr : locale === "fr" ? x.nameFr : x.nameEn);
  const canWrite = ctx.permissions.has("contracts.write");
  const money = (v: string | number | { toString(): string }) => formatMoney(String(v), locale, ctx.org.currency);
  const tonneLines = c.lines.filter((l) => l.billingUnit === "PER_TONNE");
  const actions: [ContractStatus, string, "primary" | "secondary" | "danger"][] = [
    ["ACTIVE", c.status === "SUSPENDED" ? d.contracts.resume : d.contracts.activate, "primary"],
    ["SUSPENDED", d.contracts.suspend, "secondary"],
    ["TERMINATED", d.contracts.terminate, "danger"],
  ];
  return (
    <>
      <PageHeader
        eyebrow={<Link href={`/${locale}/app/contracts`} className="hover:underline">{d.contracts.title}</Link>}
        title={c.title}
        description={<><span className="num">{c.reference}</span>, <Link className="hover:underline" href={`/${locale}/app/customers/${c.customerId}`}>{c.customer.name}</Link></>}
        actions={
          <>
            <StatusBadge status={c.status} label={d.enums.ContractStatus[c.status]} />
            {canWrite
              ? actions.filter(([to]) => canTransitionContract(c.status, to)).map(([to, label, variant]) => (
                  <InlineAction key={to} action={setContractStatusAction} hidden={{ contractId: c.id, to }} label={label} variant={variant} />
                ))
              : null}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={d.common.details} />
            <CardBody>
              <DescriptionList items={[
                [d.contracts.startDate, formatDay(c.startDate, locale)],
                [d.contracts.endDate, formatDay(c.endDate, locale)],
                [d.contracts.renewalNoticeDays, formatNumber(c.renewalNoticeDays, locale)],
                [d.contracts.autoRenew, c.autoRenew ? d.common.yes : d.common.no],
                [d.contracts.slaHours, c.slaResponseHours ? formatNumber(c.slaResponseHours, locale) : null],
                [d.contracts.serviceScope, c.serviceScope],
              ]} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={d.contracts.lines} />
            <Table>
              <thead><tr><Th>{d.contracts.location}</Th><Th>{d.contracts.category}</Th><Th>{d.contracts.frequency}</Th><Th>{d.contracts.billingUnit}</Th><Th numeric>{d.contracts.unitPrice}</Th></tr></thead>
              <tbody>
                {c.lines.map((l) => (
                  <tr key={l.id}>
                    <Td>{l.serviceLocation.label}</Td>
                    <Td>{name(l.wasteCategory)}</Td>
                    <Td>{d.enums.Frequency[l.frequency]}</Td>
                    <Td>{d.enums.BillingUnit[l.billingUnit]}</Td>
                    <Td numeric><span className="num">{formatMoney(l.unitPrice, locale, ctx.org.currency)}</span></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
          {tonneLines.length ? (
            <Card>
              <CardHeader title={d.contracts.pricingTerms} description={d.contracts.pricingLead} />
              <CardBody className="space-y-6">
                {tonneLines.map((l) => {
                  const tiers = readTiers(l.tiers);
                  const summary = [
                    ...(l.minimumCharge != null ? [d.contracts.minimumSummary.replace("{price}", money(l.minimumCharge))] : []),
                    ...tiers.map((x) => d.contracts.tierSummary.replace("{t}", formatNumber(x.aboveKg / 1000, locale)).replace("{price}", money(x.unitPrice))),
                  ];
                  return (
                    <section key={l.id} className="space-y-2">
                      <h3 className="font-medium text-ink-900">{l.serviceLocation.label} · {name(l.wasteCategory)} · <span className="num">{money(l.unitPrice)}</span></h3>
                      <p className="text-sm text-ink-700">{summary.length ? summary.join(" · ") : d.contracts.noTerms}</p>
                      {canWrite ? <LinePricingForm contractId={c.id} lineId={l.id} minimumCharge={l.minimumCharge?.toString() ?? null} tiers={tiers.map((x) => ({ aboveTonnes: String(x.aboveKg / 1000), unitPrice: x.unitPrice }))} /> : null}
                    </section>
                  );
                })}
              </CardBody>
            </Card>
          ) : null}
          <Card>
            <CardHeader title={d.contracts.surcharges} description={d.contracts.surchargesLead} />
            <CardBody className="space-y-4">
              {c.surcharges.length === 0 ? <p className="text-sm text-ink-600">{d.contracts.noSurcharges}</p> : (
                <ul className="divide-y divide-ink-100">
                  {c.surcharges.map((sc) => (
                    <li key={sc.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                      <span>
                        <span className="font-medium text-ink-900">{sc.label}</span>{" "}
                        <span className="text-ink-600">· {d.enums.SurchargeKind[sc.kind]} · <span className="num">{sc.kind === "PERCENT" ? `${formatNumber(sc.value, locale)} %` : money(sc.value)}</span></span>
                      </span>
                      {canWrite ? <InlineAction action={removeSurchargeAction} hidden={{ contractId: c.id, surchargeId: sc.id }} label={d.contracts.removeSurcharge} variant="danger" /> : null}
                    </li>
                  ))}
                </ul>
              )}
              {canWrite ? <SurchargeForm contractId={c.id} /> : null}
            </CardBody>
          </Card>
        </div>
        <Card>
          <CardHeader title={d.common.history} />
          <ol className="space-y-3 px-5 py-4 text-sm">
            {c.history.map((h) => (
              <li key={h.id}>
                <div className="font-medium text-ink-800">{d.auditActions[h.action.replace("contract.", "") as keyof typeof d.auditActions] ?? h.action}{h.data && typeof h.data === "object" && "to" in h.data ? ` → ${d.enums.ContractStatus[(h.data as { to: ContractStatus }).to]}` : ""}</div>
                <div className="text-xs text-ink-500">{formatDateTime(h.createdAt, locale, ctx.org.timezone)}</div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
