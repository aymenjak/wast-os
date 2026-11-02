import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "../db";
import { hasPermission, requirePermission, type OrgContext } from "../context";
import { DomainError, ForbiddenError, NotFoundError } from "../domain/errors";
import { audit } from "../audit";
import { hashToken } from "../auth/tokens";
import { parse, requiredText } from "../validation";
import { forecastFill, type Forecast } from "../domain/fill-forecast";
import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * IoT: bin fill-level sensors and vehicle GPS trackers.
 *
 * Devices push JSON over HTTPS to POST /api/iot/v1/ingest with `Authorization: Bearer <device key>`.
 * The key identifies the device AND its organization, so a device can only write into its own organization
 * and only for the container or vehicle it is linked to. Keys are random 256-bit values shown once;
 * only their SHA-256 is stored. Batches are idempotent per (device, timestamp).
 * Alerts open automatically (fill ≥ threshold, battery ≤ 15 %, temperature ≥ 60 °C) and the fill alert
 * closes by itself when the bin is emptied. Creating a collection stays a human decision.
 */
const BATTERY_LOW = 15;
const FIRE_RISK_C = 60;
const MAX_BATCH = 100;

// ── Management (organization users) ──

const deviceSchema = z.object({
  kind: z.enum(["FILL_SENSOR", "GPS_TRACKER"]),
  name: requiredText(80),
  // LoRaWAN devices: the serial is the DevEUI, normalised to 16 upper-case hex digits.
  serial: requiredText(80).transform((v) => (isEui(v) ? normalizeEui(v) : v)),
  containerId: z.string().max(64).optional().transform((v) => v || undefined),
  vehicleId: z.string().max(64).optional().transform((v) => v || undefined),
});

export async function registerDevice(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "fleet.write");
  const data = parse(deviceSchema, input);
  if (data.kind === "FILL_SENSOR" && !data.containerId) throw new DomainError("errors.validation", { fields: { containerId: "errors.validation" } });
  if (data.kind === "GPS_TRACKER" && !data.vehicleId) throw new DomainError("errors.validation", { fields: { vehicleId: "errors.validation" } });
  if (data.containerId && !(await prisma.container.findFirst({ where: { id: data.containerId, organizationId: ctx.org.id } }))) throw new NotFoundError("Container");
  if (data.vehicleId && !(await prisma.vehicle.findFirst({ where: { id: data.vehicleId, organizationId: ctx.org.id } }))) throw new NotFoundError("Vehicle");
  if (await prisma.iotDevice.findFirst({ where: { organizationId: ctx.org.id, serial: data.serial } })) throw new DomainError("errors.iot.serialExists");
  const key = `nxd_${randomBytes(32).toString("base64url")}`;
  const device = await prisma.$transaction(async (tx) => {
    const d = await tx.iotDevice.create({
      data: {
        organizationId: ctx.org.id, kind: data.kind, name: data.name, serial: data.serial, keyHash: hashToken(key), keyPrefix: key.slice(0, 10),
        containerId: data.kind === "FILL_SENSOR" ? data.containerId : null, vehicleId: data.kind === "GPS_TRACKER" ? data.vehicleId : null, createdById: ctx.userId,
      },
    });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "iot.device_registered", entityType: "IotDevice", entityId: d.id, data: { kind: d.kind, serial: d.serial } });
    return d;
  });
  return { device, key };
}

export async function revokeDevice(ctx: OrgContext, deviceId: string) {
  requirePermission(ctx, "fleet.write");
  const r = await prisma.iotDevice.updateMany({ where: { id: deviceId, organizationId: ctx.org.id, revokedAt: null }, data: { revokedAt: new Date() } });
  if (r.count === 0) throw new NotFoundError("IotDevice");
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "iot.device_revoked", entityType: "IotDevice", entityId: deviceId });
}

export async function resolveAlert(ctx: OrgContext, alertId: string) {
  requirePermission(ctx, "fleet.write");
  const r = await prisma.iotAlert.updateMany({ where: { id: alertId, organizationId: ctx.org.id, resolvedAt: null }, data: { resolvedAt: new Date(), resolvedById: ctx.userId } });
  if (r.count === 0) throw new NotFoundError("IotAlert");
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "iot.alert_resolved", entityType: "IotAlert", entityId: alertId });
}

export async function iotOverview(ctx: OrgContext) {
  requirePermission(ctx, "fleet.read");
  const [devices, alerts, containers, vehicles] = await Promise.all([
    prisma.iotDevice.findMany({ where: { organizationId: ctx.org.id }, orderBy: [{ revokedAt: { sort: "asc", nulls: "first" } }, { name: "asc" }], include: { container: { select: { id: true, code: true } }, vehicle: { select: { id: true, plateNumber: true } } } }),
    prisma.iotAlert.findMany({
      where: { organizationId: ctx.org.id, resolvedAt: null }, orderBy: { openedAt: "desc" },
      include: { device: { select: { name: true } }, container: { select: { id: true, code: true, serviceLocation: { select: { id: true, label: true, customerId: true } } } } },
    }),
    prisma.container.findMany({ where: { organizationId: ctx.org.id, status: { not: "RETIRED" } }, select: { id: true, code: true }, orderBy: { code: "asc" } }),
    prisma.vehicle.findMany({ where: { organizationId: ctx.org.id, status: { not: "RETIRED" } }, select: { id: true, plateNumber: true }, orderBy: { plateNumber: "asc" } }),
  ]);
  return { devices, alerts, containers, vehicles };
}

/** Containers with a sensor, their latest fill and the forecast, soonest-to-fill first. */
export async function fillForecasts(ctx: OrgContext, now = new Date()) {
  requirePermission(ctx, "fleet.read");
  const since = new Date(now.getTime() - 21 * 86400_000);
  const containers = await prisma.container.findMany({
    where: { organizationId: ctx.org.id, devices: { some: { revokedAt: null, kind: "FILL_SENSOR" } } },
    select: { id: true, code: true, fillThresholdPct: true, lastFillPct: true, lastFillAt: true, serviceLocation: { select: { label: true, customer: { select: { name: true } } } } },
  });
  const readings = await prisma.sensorReading.findMany({
    where: { organizationId: ctx.org.id, containerId: { in: containers.map((c) => c.id) }, fillPct: { not: null }, measuredAt: { gte: since } },
    select: { containerId: true, fillPct: true, measuredAt: true },
    orderBy: { measuredAt: "asc" },
  });
  const by = new Map<string, { at: Date; fillPct: number }[]>();
  for (const r of readings) by.set(r.containerId!, [...(by.get(r.containerId!) ?? []), { at: r.measuredAt, fillPct: r.fillPct! }]);
  const rows = containers.map((c) => ({ ...c, forecast: forecastFill(by.get(c.id) ?? [], c.fillThresholdPct, now) as Forecast | null }));
  const key = (r: (typeof rows)[number]) => (r.lastFillPct !== null && r.lastFillPct >= r.fillThresholdPct ? 0 : r.forecast?.thresholdAt?.getTime() ?? Infinity);
  return rows.sort((a, b) => key(a) - key(b));
}

export async function containerTelemetry(ctx: OrgContext, containerId: string) {
  requirePermission(ctx, "fleet.read");
  const c = await prisma.container.findFirst({ where: { id: containerId, organizationId: ctx.org.id }, select: { id: true, fillThresholdPct: true } });
  if (!c) throw new NotFoundError("Container");
  const readings = await prisma.sensorReading.findMany({
    where: { organizationId: ctx.org.id, containerId, measuredAt: { gte: new Date(Date.now() - 14 * 86400_000) } },
    orderBy: { measuredAt: "asc" }, select: { fillPct: true, temperatureC: true, batteryPct: true, measuredAt: true },
  });
  const fill = readings.filter((r) => r.fillPct !== null).map((r) => ({ at: r.measuredAt, fillPct: r.fillPct! }));
  return { readings, forecast: forecastFill(fill, c.fillThresholdPct), threshold: c.fillThresholdPct };
}

// ── Ingestion (devices) ──

const iso = z.string().datetime({ offset: true }).transform((s) => new Date(s));
const ingestSchema = z.object({
  readings: z.array(z.object({
    measuredAt: iso,
    fillPct: z.number().int().min(0).max(100).optional(),
    temperatureC: z.number().min(-60).max(200).optional(),
    batteryPct: z.number().int().min(0).max(100).optional(),
  })).max(MAX_BATCH).optional(),
  positions: z.array(z.object({
    recordedAt: iso,
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    speedKmh: z.number().int().min(0).max(300).optional(),
    heading: z.number().int().min(0).max(359).optional(),
  })).max(MAX_BATCH).optional(),
});

export async function authenticateDevice(bearer: string | null) {
  const key = bearer?.match(/^Bearer\s+(nxd_[A-Za-z0-9_-]{43})$/)?.[1];
  if (!key) return null;
  const d = await prisma.iotDevice.findUnique({ where: { keyHash: hashToken(key) }, include: { organization: { select: { suspendedAt: true } } } });
  if (!d || d.revokedAt || d.organization.suspendedAt) return null;
  return d;
}

type Device = NonNullable<Awaited<ReturnType<typeof authenticateDevice>>>;

async function openAlert(tx: Prisma.TransactionClient, d: Device, kind: "FILL_HIGH" | "BATTERY_LOW" | "FIRE_RISK", value: number) {
  // Partial unique index (one open alert per device+kind) + ON CONFLICT DO NOTHING: safe under concurrent batches.
  const r = await tx.iotAlert.createMany({ data: [{ organizationId: d.organizationId, kind, deviceId: d.id, containerId: d.containerId, value }], skipDuplicates: true });
  return r.count === 1;
}

export async function ingest(device: Device, body: unknown) {
  const data = ingestSchema.parse(body);
  const now = Date.now();
  const inWindow = (t: Date) => t.getTime() <= now + 5 * 60_000 && t.getTime() >= now - 30 * 86400_000;
  let accepted = 0, duplicates = 0, rejected = 0, alerts = 0;

  if (data.readings?.length) {
    if (device.kind !== "FILL_SENSOR") throw new ForbiddenError("iot.kind");
    const rows = data.readings.filter((r) => inWindow(r.measuredAt));
    rejected += data.readings.length - rows.length;
    const created = await prisma.sensorReading.createMany({
      data: rows.map((r) => ({ organizationId: device.organizationId, deviceId: device.id, containerId: device.containerId, fillPct: r.fillPct ?? null, temperatureC: r.temperatureC ?? null, batteryPct: r.batteryPct ?? null, measuredAt: r.measuredAt })),
      skipDuplicates: true,
    });
    accepted += created.count;
    duplicates += rows.length - created.count;
    const latest = [...rows].sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime())[0];
    if (latest) {
      alerts += await prisma.$transaction(async (tx) => {
        let n = 0;
        const battery = latest.batteryPct ?? device.batteryPct;
        await tx.iotDevice.update({ where: { id: device.id }, data: { lastSeenAt: new Date(), batteryPct: battery ?? null } });
        if (device.containerId && latest.fillPct !== undefined) {
          const c = await tx.container.findFirstOrThrow({ where: { id: device.containerId, organizationId: device.organizationId } });
          if (!c.lastFillAt || latest.measuredAt >= c.lastFillAt) await tx.container.update({ where: { id: c.id }, data: { lastFillPct: latest.fillPct, lastFillAt: latest.measuredAt } });
          if (latest.fillPct >= c.fillThresholdPct) n += Number(await openAlert(tx, device, "FILL_HIGH", latest.fillPct));
          // Emptied: close the fill alert automatically.
          if (latest.fillPct <= c.fillThresholdPct - 20) await tx.iotAlert.updateMany({ where: { deviceId: device.id, kind: "FILL_HIGH", resolvedAt: null }, data: { resolvedAt: new Date(), autoResolved: true } });
        }
        if (battery !== undefined && battery !== null && battery <= BATTERY_LOW) n += Number(await openAlert(tx, device, "BATTERY_LOW", battery));
        const hot = rows.find((r) => r.temperatureC !== undefined && r.temperatureC >= FIRE_RISK_C);
        if (hot) n += Number(await openAlert(tx, device, "FIRE_RISK", hot.temperatureC!));
        return n;
      });
    }
  }

  if (data.positions?.length) {
    if (device.kind !== "GPS_TRACKER" || !device.vehicleId) throw new ForbiddenError("iot.kind");
    const rows = data.positions.filter((p) => inWindow(p.recordedAt));
    rejected += data.positions.length - rows.length;
    const created = await prisma.vehiclePosition.createMany({
      data: rows.map((p) => ({ organizationId: device.organizationId, deviceId: device.id, vehicleId: device.vehicleId!, latitude: p.lat.toFixed(6), longitude: p.lng.toFixed(6), speedKmh: p.speedKmh ?? null, heading: p.heading ?? null, recordedAt: p.recordedAt })),
      skipDuplicates: true,
    });
    accepted += created.count;
    duplicates += rows.length - created.count;
    const latest = [...rows].sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0];
    if (latest) {
      await prisma.iotDevice.update({ where: { id: device.id }, data: { lastSeenAt: new Date() } });
      await prisma.vehicle.updateMany({
        where: { id: device.vehicleId, organizationId: device.organizationId, OR: [{ lastPositionAt: null }, { lastPositionAt: { lte: latest.recordedAt } }] },
        data: { lastLatitude: latest.lat.toFixed(6), lastLongitude: latest.lng.toFixed(6), lastPositionAt: latest.recordedAt, lastSpeedKmh: latest.speedKmh ?? null },
      });
    }
  }
  return { accepted, duplicates, rejected, alerts };
}

/** Aggregate IoT figures for dashboards and the AI brief (no locations, no customer names). */
export async function iotKpis(ctx: OrgContext) {
  // Defence in depth: callers (dashboard, assistant tools) already check, but aggregates stay behind a permission too.
  if (!hasPermission(ctx, "reports.read") && !hasPermission(ctx, "fleet.read")) throw new ForbiddenError("reports.read");
  const [devices, openAlerts, forecasts] = await Promise.all([
    prisma.iotDevice.count({ where: { organizationId: ctx.org.id, revokedAt: null } }),
    prisma.iotAlert.groupBy({ by: ["kind"], where: { organizationId: ctx.org.id, resolvedAt: null }, _count: true }),
    ctx.permissions.has("fleet.read") ? fillForecasts(ctx) : Promise.resolve([]),
  ]);
  const in48h = Date.now() + 48 * 3600_000;
  return {
    devices,
    openAlerts: Object.fromEntries(openAlerts.map((a) => [a.kind, a._count])) as Partial<Record<"FILL_HIGH" | "BATTERY_LOW" | "FIRE_RISK", number>>,
    binsFullWithin48h: forecasts.filter((f) => (f.lastFillPct ?? 0) >= f.fillThresholdPct || (f.forecast?.thresholdAt && f.forecast.thresholdAt.getTime() <= in48h)).length,
    forecasts,
  };
}

// ── LoRaWAN network servers (ChirpStack v4, The Things Stack v3) ──
//
// Payload shapes verified against the projects' own source (2026-10-31):
//  - ChirpStack v4 `chirpstack/src/integration/http.rs`: POST to the configured URL with query `?event=up|join|ack|…`,
//    configurable extra headers, JSON when "JSON" encoding is selected (else protobuf). Uplink JSON (pbjson, camelCase,
//    `api/proto/integration/integration.proto` UplinkEvent): `time`, `deviceInfo.devEui`, `deviceInfo.deviceName`, `object` (codec output), `data`.
//  - The Things Stack v3 `api/ttn/lorawan/v3/messages.proto` ApplicationUp, JSON with proto names (`UseProtoNames: true`):
//    `end_device_ids.dev_eui` (hex), `end_device_ids.device_id`, `received_at`, `uplink_message.decoded_payload`,
//    `uplink_message.received_at`; webhooks support custom `headers` (applicationserver_web.proto).
// The device's payload formatter/codec must output fill/battery/temperature or position fields (see FIELD_ALIASES).

export function isEui(v: string) {
  return /^[0-9a-fA-F]{16}$/.test(v.replace(/[\s:-]/g, ""));
}
export function normalizeEui(v: string) {
  return v.replace(/[\s:-]/g, "").toUpperCase();
}

const FIELD_ALIASES = {
  fillPct: ["fillPct", "fill_pct", "fillLevel", "fill_level", "fill"],
  batteryPct: ["batteryPct", "battery_pct", "battery", "batteryLevel", "battery_level"],
  temperatureC: ["temperatureC", "temperature_c", "temperature", "temp"],
  lat: ["lat", "latitude"],
  lng: ["lng", "lon", "longitude"],
  speedKmh: ["speedKmh", "speed_kmh", "speed"],
  heading: ["heading", "course"],
} as const;

/** Picks known fields from a decoded payload (codec output). Unknown fields are ignored. */
export function mapDecoded(obj: unknown) {
  const o = (obj && typeof obj === "object" ? obj : {}) as Record<string, unknown>;
  const pick = (names: readonly string[]) => {
    for (const n of names) {
      const v = o[n];
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
    }
    return undefined;
  };
  const out = Object.fromEntries(Object.entries(FIELD_ALIASES).map(([k, names]) => [k, pick(names)])) as Record<keyof typeof FIELD_ALIASES, number | undefined>;
  return out;
}

export async function registerIntegration(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "fleet.write");
  const data = parse(z.object({ provider: z.enum(["CHIRPSTACK", "TTN"]), name: requiredText(80) }), input);
  const key = `nxi_${randomBytes(32).toString("base64url")}`;
  const integration = await prisma.$transaction(async (tx) => {
    const i = await tx.iotIntegration.create({ data: { organizationId: ctx.org.id, provider: data.provider, name: data.name, keyHash: hashToken(key), keyPrefix: key.slice(0, 10), createdById: ctx.userId } });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "iot.integration_created", entityType: "IotIntegration", entityId: i.id, data: { provider: i.provider } });
    return i;
  });
  return { integration, key };
}

export async function revokeIntegration(ctx: OrgContext, id: string) {
  requirePermission(ctx, "fleet.write");
  const r = await prisma.iotIntegration.updateMany({ where: { id, organizationId: ctx.org.id, revokedAt: null }, data: { revokedAt: new Date() } });
  if (r.count === 0) throw new NotFoundError("IotIntegration");
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "iot.integration_revoked", entityType: "IotIntegration", entityId: id });
}

export async function listIntegrations(ctx: OrgContext) {
  requirePermission(ctx, "fleet.read");
  return prisma.iotIntegration.findMany({ where: { organizationId: ctx.org.id }, orderBy: { createdAt: "desc" } });
}

export async function authenticateIntegration(bearer: string | null, provider: "CHIRPSTACK" | "TTN") {
  const key = bearer?.match(/^Bearer\s+(nxi_[A-Za-z0-9_-]{43})$/)?.[1];
  if (!key) return null;
  const i = await prisma.iotIntegration.findUnique({ where: { keyHash: hashToken(key) }, include: { organization: { select: { suspendedAt: true } } } });
  if (!i || i.revokedAt || i.organization.suspendedAt || i.provider !== provider) return null;
  return i;
}

const chirpstackUp = z.object({
  time: z.string().optional(),
  deviceInfo: z.object({ devEui: z.string(), deviceName: z.string().optional() }).passthrough(),
  object: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const ttnUp = z.object({
  end_device_ids: z.object({ dev_eui: z.string().optional(), device_id: z.string() }).passthrough(),
  received_at: z.string().optional(),
  uplink_message: z.object({ decoded_payload: z.record(z.string(), z.unknown()).optional(), received_at: z.string().optional() }).passthrough().optional(),
}).passthrough();

export type LoraResult = { outcome: "ignored_event" | "unknown_device" | "no_decoded_fields" | "ingested"; detail?: Awaited<ReturnType<typeof ingest>> };

/**
 * Translates one network-server uplink into our ingest format. Devices are matched inside the integration's
 * organization only, by DevEUI (= device serial).
 */
export async function ingestLorawan(integration: NonNullable<Awaited<ReturnType<typeof authenticateIntegration>>>, body: unknown, event: string | null): Promise<LoraResult> {
  await prisma.iotIntegration.update({ where: { id: integration.id }, data: { lastEventAt: new Date() } });
  let eui: string | undefined, at: string | undefined, decoded: unknown;
  if (integration.provider === "CHIRPSTACK") {
    if (event !== "up") return { outcome: "ignored_event" };
    const u = chirpstackUp.parse(body);
    eui = u.deviceInfo.devEui; at = u.time; decoded = u.object;
  } else {
    const u = ttnUp.parse(body);
    if (!u.uplink_message) return { outcome: "ignored_event" };
    eui = u.end_device_ids.dev_eui; at = u.uplink_message.received_at ?? u.received_at; decoded = u.uplink_message.decoded_payload;
  }
  if (!eui || !isEui(eui)) return { outcome: "unknown_device" };
  const device = await prisma.iotDevice.findFirst({
    where: { organizationId: integration.organizationId, serial: normalizeEui(eui), revokedAt: null },
    include: { organization: { select: { suspendedAt: true } } },
  });
  if (!device) return { outcome: "unknown_device" };
  const f = mapDecoded(decoded);
  const when = at && !Number.isNaN(Date.parse(at)) ? new Date(at).toISOString() : new Date().toISOString();
  if (device.kind === "FILL_SENSOR") {
    if (f.fillPct === undefined && f.batteryPct === undefined && f.temperatureC === undefined) return { outcome: "no_decoded_fields" };
    const clampPct = (v: number | undefined) => (v === undefined ? undefined : Math.round(Math.min(100, Math.max(0, v))));
    return { outcome: "ingested", detail: await ingest(device, { readings: [{ measuredAt: when, fillPct: clampPct(f.fillPct), batteryPct: clampPct(f.batteryPct), temperatureC: f.temperatureC }] }) };
  }
  if (f.lat === undefined || f.lng === undefined) return { outcome: "no_decoded_fields" };
  return {
    outcome: "ingested",
    detail: await ingest(device, { positions: [{ recordedAt: when, lat: f.lat, lng: f.lng, speedKmh: f.speedKmh === undefined ? undefined : Math.round(f.speedKmh), heading: f.heading === undefined ? undefined : Math.round(f.heading) % 360 }] }),
  };
}

/** Latest GPS fixes for the live map (last 24 h), tenant-scoped. */
export async function vehiclePositions(ctx: OrgContext) {
  requirePermission(ctx, "fleet.read");
  const since = new Date(Date.now() - 24 * 3600_000);
  const rows = await prisma.vehicle.findMany({
    where: { organizationId: ctx.org.id, lastPositionAt: { gte: since }, lastLatitude: { not: null }, lastLongitude: { not: null } },
    select: { id: true, plateNumber: true, label: true, lastLatitude: true, lastLongitude: true, lastPositionAt: true, lastSpeedKmh: true },
    orderBy: { plateNumber: "asc" },
  });
  return rows.map((v) => ({ id: v.id, plate: v.plateNumber, label: v.label, lat: Number(v.lastLatitude), lng: Number(v.lastLongitude), at: v.lastPositionAt!.toISOString(), speedKmh: v.lastSpeedKmh }));
}
