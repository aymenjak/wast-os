/**
 * Phone-side storage for the offline driver app (D-77), plain IndexedDB, one database per membership so two
 * drivers sharing a phone never send each other's work.
 *   kv:     "bundle" (jobs + destinations from /api/field/v1/bundle) and "syncedAt"
 *   outbox: queued actions in the order the driver did them (auto-increment seq); photos keep their Blob here
 */
import type { FieldBundle } from "@/server/services/field";

export type OutboxKind = "start" | "complete" | "fail" | "weight" | "photo";
export type OutboxItem = {
  seq?: number;
  id: string; // clientRef, made on the phone
  kind: OutboxKind;
  workOrderId: string;
  occurredAt: string;
  data?: Record<string, unknown>;
  photo?: { blob: Blob; name: string; kind: "BEFORE" | "AFTER" };
  error?: string; // set when the server refused it (permanent)
};

export type { FieldBundle };

function req<T>(r: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export async function openFieldDb(membershipId: string): Promise<IDBDatabase> {
  const open = indexedDB.open(`nexvo-field-${membershipId}`, 1);
  open.onupgradeneeded = () => {
    const db = open.result;
    if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
    if (!db.objectStoreNames.contains("outbox")) db.createObjectStore("outbox", { keyPath: "seq", autoIncrement: true });
  };
  return req(open);
}

export async function kvGet<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return req(db.transaction("kv").objectStore("kv").get(key)) as Promise<T | undefined>;
}

export async function kvSet(db: IDBDatabase, key: string, value: unknown) {
  const tx = db.transaction("kv", "readwrite");
  tx.objectStore("kv").put(value, key);
  await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
}

export async function outboxAll(db: IDBDatabase): Promise<OutboxItem[]> {
  return req(db.transaction("outbox").objectStore("outbox").getAll()) as Promise<OutboxItem[]>;
}

export async function outboxAdd(db: IDBDatabase, item: OutboxItem) {
  const tx = db.transaction("outbox", "readwrite");
  tx.objectStore("outbox").add(item);
  await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
}

export async function outboxPut(db: IDBDatabase, item: OutboxItem) {
  const tx = db.transaction("outbox", "readwrite");
  tx.objectStore("outbox").put(item);
  await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
}

export async function outboxDelete(db: IDBDatabase, seq: number) {
  const tx = db.transaction("outbox", "readwrite");
  tx.objectStore("outbox").delete(seq);
  await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
}

export function newRef() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

type Job = FieldBundle["jobs"][number];

/** The jobs as the driver sees them: server copy plus what is still waiting in the outbox (in order). */
export function overlay(jobs: Job[], outbox: OutboxItem[]): Job[] {
  const byId = new Map(jobs.map((j) => [j.id, { ...j }]));
  for (const o of outbox) {
    if (o.error) continue;
    const j = byId.get(o.workOrderId);
    if (!j) continue;
    if (o.kind === "start" && j.status === "ASSIGNED") j.status = "IN_PROGRESS";
    if (o.kind === "complete" && j.status === "IN_PROGRESS") j.status = "COMPLETED";
    if (o.kind === "fail" && (j.status === "IN_PROGRESS" || j.status === "ASSIGNED")) j.status = "FAILED";
    if (o.kind === "photo") j.evidenceCount += 1;
    if (o.kind === "weight") j.ticketCount += 1;
  }
  return [...byId.values()];
}

export type SendResult = "sent" | "rejected" | "stop" | "unauthorized";

/**
 * Sends one queued item. "rejected": the server refused it for good (business rule, forbidden, not found) →
 * keep it with its error for the driver. "stop": network down, server error or rate limit → try again later.
 */
export async function sendItem(item: OutboxItem): Promise<{ result: SendResult; error?: string }> {
  const headers: Record<string, string> = { "x-nexvo-field": "1" };
  let res: Response;
  try {
    if (item.kind === "photo") {
      const fd = new FormData();
      fd.set("workOrderId", item.workOrderId);
      fd.set("kind", item.photo?.kind ?? "AFTER");
      fd.set("clientRef", item.id);
      fd.set("file", item.photo!.blob, item.photo!.name);
      res = await fetch("/api/field/v1/evidence", { method: "POST", headers, body: fd, credentials: "same-origin" });
    } else {
      res = await fetch("/api/field/v1/actions", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ id: item.id, type: item.kind, workOrderId: item.workOrderId, occurredAt: item.occurredAt, data: item.data }),
      });
    }
  } catch {
    return { result: "stop" };
  }
  if (res.ok) return { result: "sent" };
  if (res.status === 401) return { result: "unauthorized" };
  if ([403, 404, 413, 422].includes(res.status)) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    return { result: "rejected", error: body?.error ?? "errors.generic" };
  }
  return { result: "stop" };
}

export async function fetchBundle(): Promise<{ bundle?: FieldBundle; unauthorized?: boolean }> {
  try {
    const res = await fetch("/api/field/v1/bundle", { headers: { "x-nexvo-field": "1" }, credentials: "same-origin", cache: "no-store" });
    if (res.status === 401) return { unauthorized: true };
    if (!res.ok) return {};
    return { bundle: (await res.json()) as FieldBundle };
  } catch {
    return {};
  }
}
