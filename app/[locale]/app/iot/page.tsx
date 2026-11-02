import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { fillForecasts, iotOverview, listIntegrations } from "@/server/services/iot";
import { IntegrationForm } from "./integrations";
import { formatDateTime } from "@/lib/i18n/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { Meter } from "@/components/charts/charts";
import { InlineAction } from "@/components/inline-action";
import { resolveAlertAction, revokeDeviceAction, revokeIntegrationAction } from "@/app/actions/business";
import { DeviceForm } from "./forms";

const SILENT_MS = 24 * 3600_000;

export default async function IotPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale, ctx, d } = await appPage(params);
  const [o, forecasts, integrations] = await Promise.all([iotOverview(ctx), fillForecasts(ctx), listIntegrations(ctx)]);
  const canWrite = ctx.permissions.has("fleet.write");
  const now = Date.now();
  const when = (x: Date | null | undefined) => (x ? formatDateTime(x, locale, ctx.org.timezone) : "—");
  return (
    <>
      <PageHeader title={d.iot.title} description={d.iot.lead} />

      <Card className="mb-6">
        <CardHeader title={d.iot.alerts} description={d.iot.alertsLead} />
        {o.alerts.length === 0 ? <EmptyState art="done" title={d.iot.noAlerts} /> : (
          <Table>
            <thead><tr><Th>{d.iot.alert}</Th><Th>{d.iot.device}</Th><Th>{d.iot.container}</Th><Th>{d.iot.since}</Th><Th /></tr></thead>
            <tbody>
              {o.alerts.map((a) => (
                <tr key={a.id}>
                  <Td><Badge tone={a.kind === "FIRE_RISK" ? "danger" : a.kind === "FILL_HIGH" ? "warning" : "neutral"}>{d.iot.alertKinds[a.kind]}</Badge> <span className="num text-sm">{a.value.toString()}{a.kind === "FIRE_RISK" ? " °C" : " %"}</span></Td>
                  <Td>{a.device.name}</Td>
                  <Td>{a.container ? <Link className="num hover:underline" href={`/${locale}/app/containers/${a.container.id}`}>{a.container.code}</Link> : "—"}{a.container?.serviceLocation ? <div className="text-xs text-ink-600">{a.container.serviceLocation.label}</div> : null}</Td>
                  <Td className="text-xs">{when(a.openedAt)}</Td>
                  <Td className="space-x-2 text-end whitespace-nowrap rtl:space-x-reverse">
                    {a.kind === "FILL_HIGH" && a.container?.serviceLocation && ctx.permissions.has("requests.write")
                      ? <Link className="text-sm font-medium text-brand-700 hover:underline" href={`/${locale}/app/requests/new?customer=${a.container.serviceLocation.customerId}`}>{d.iot.createRequest}</Link> : null}
                    {canWrite ? <InlineAction action={resolveAlertAction} hidden={{ alertId: a.id }} label={d.iot.resolve} size="sm" /> : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card className="mb-6">
        <CardHeader title={d.iot.forecastTitle} description={d.iot.forecastLead} />
        {forecasts.length === 0 ? <EmptyState art="devices" title={d.iot.noSensors} /> : (
          <CardBody className="space-y-4">
            {forecasts.map((f) => (
              <div key={f.id}>
                <Meter value={f.lastFillPct ?? 0} max={100}
                  label={<><Link className="num font-medium hover:underline" href={`/${locale}/app/containers/${f.id}`}>{f.code}</Link> <span className="text-ink-600">{f.serviceLocation ? `${f.serviceLocation.customer.name} · ${f.serviceLocation.label}` : d.enums.ContainerStatus.IN_YARD}</span></>}
                  display={`⁨${f.lastFillPct ?? "—"} %⁩`} />
                <p className="mt-1 text-xs text-ink-600">
                  {f.lastFillPct !== null && f.lastFillPct >= f.fillThresholdPct ? d.iot.atThreshold
                    : f.forecast?.thresholdAt ? d.iot.reachesAt.replace("{pct}", String(f.fillThresholdPct)).replace("{date}", when(f.forecast.thresholdAt)).replace("{rate}", String(f.forecast.ratePctPerDay))
                    : d.iot.noForecast}
                </p>
              </div>
            ))}
          </CardBody>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title={d.iot.devices} />
          {o.devices.length === 0 ? <EmptyState art="devices" title={d.iot.noDevices} /> : (
            <Table>
              <thead><tr><Th>{d.common.name}</Th><Th>{d.iot.kind}</Th><Th>{d.iot.linkedTo}</Th><Th>{d.iot.lastSeen}</Th><Th>{d.iot.battery}</Th><Th /></tr></thead>
              <tbody>
                {o.devices.map((x) => {
                  const silent = !x.revokedAt && (!x.lastSeenAt || now - x.lastSeenAt.getTime() > SILENT_MS);
                  return (
                    <tr key={x.id}>
                      <Td>{x.name}<div className="num text-xs text-ink-600">{x.serial} · {x.keyPrefix}…</div></Td>
                      <Td>{d.iot.kinds[x.kind]}</Td>
                      <Td>{x.container ? <Link className="num hover:underline" href={`/${locale}/app/containers/${x.container.id}`}>{x.container.code}</Link> : x.vehicle ? <Link className="num hover:underline" href={`/${locale}/app/fleet/${x.vehicle.id}`}>{x.vehicle.plateNumber}</Link> : "—"}</Td>
                      <Td className="text-xs">{x.revokedAt ? <Badge tone="neutral">{d.iot.revoked}</Badge> : silent ? <Badge tone="warning">{d.iot.silent}</Badge> : when(x.lastSeenAt)}</Td>
                      <Td className="num">{x.batteryPct !== null ? `${x.batteryPct} %` : "—"}</Td>
                      <Td className="text-end">{canWrite && !x.revokedAt ? <InlineAction action={revokeDeviceAction} hidden={{ deviceId: x.id }} label={d.iot.revoke} variant="danger" size="sm" /> : null}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
        {canWrite ? (
          <Card className="lg:col-span-2">
            <CardHeader title={d.iot.register} description={d.iot.registerLead} />
            <CardBody><DeviceForm containers={o.containers} vehicles={o.vehicles} endpoint={`${process.env.APP_URL ?? ""}/api/iot/v1/ingest`} /></CardBody>
          </Card>
        ) : null}
      </div>
      <Card className="mt-6">
        <CardHeader title={d.iot.integrations} description={d.iot.integrationsLead} />
        {integrations.length ? (
          <Table>
            <thead><tr><Th>{d.common.name}</Th><Th>{d.iot.provider}</Th><Th>{d.iot.lastSeen}</Th><Th /></tr></thead>
            <tbody>
              {integrations.map((x) => (
                <tr key={x.id}>
                  <Td>{x.name}<div className="num text-xs text-ink-600">{x.keyPrefix}…</div></Td>
                  <Td>{x.provider === "CHIRPSTACK" ? "ChirpStack v4" : "The Things Stack"}</Td>
                  <Td className="text-xs">{x.revokedAt ? <Badge tone="neutral">{d.iot.revoked}</Badge> : when(x.lastEventAt)}</Td>
                  <Td className="text-end">{canWrite && !x.revokedAt ? <InlineAction action={revokeIntegrationAction} hidden={{ integrationId: x.id }} label={d.iot.revoke} variant="danger" size="sm" /> : null}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : null}
        {canWrite ? <CardBody className="border-t border-ink-100"><IntegrationForm base={process.env.APP_URL ?? ""} /></CardBody> : null}
      </Card>
    </>
  );
}
