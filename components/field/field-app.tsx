"use client";
import { SignaturePad } from "@/components/signature-pad";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { StatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form";
import { compressImage } from "@/lib/client/compress-image";
import { INTL_LOCALE } from "@/lib/i18n/config";
import { logoutAction } from "@/app/actions/public";
import {
  fetchBundle, kvGet, kvSet, newRef, openFieldDb, outboxAdd, outboxAll, outboxDelete, outboxPut, overlay, sendItem,
  type FieldBundle, type OutboxItem, wipeSentFieldData,
} from "@/lib/client/field-store";

type Job = FieldBundle["jobs"][number];
const SYNC_EVERY_MS = 60_000;
const FAILURE_REASONS = ["NO_ACCESS", "CUSTOMER_ABSENT", "WASTE_NOT_READY", "WRONG_WASTE_TYPE", "VEHICLE_BREAKDOWN", "UNSAFE_CONDITIONS", "OTHER"] as const;

function algiersDay(offset = 0) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Algiers", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() + offset * 86_400_000));
}

/** Offline-capable driver app (D-77): jobs and outbox live in IndexedDB; the server is told when the network allows. */
export function FieldApp({ membershipId }: { membershipId: string }) {
  const { dict: d, locale, t } = useI18n();
  const f = d.fieldApp;
  const intl = INTL_LOCALE[locale];
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [bundle, setBundle] = useState<FieldBundle | null>(null);
  const [outbox, setOutbox] = useState<OutboxItem[]>([]);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const busy = useRef(false);
  const wiped = useRef(false);

  const refreshOutbox = useCallback(async (h: IDBDatabase) => setOutbox(await outboxAll(h)), []);

  const sync = useCallback(async (h: IDBDatabase | null = db) => {
    if (!h || busy.current || (typeof navigator !== "undefined" && !navigator.onLine)) return;
    busy.current = true;
    setSyncing(true);
    try {
      const blocked = new Set<string>();
      for (const item of await outboxAll(h)) {
        if (item.error) { blocked.add(item.workOrderId); continue; }
        if (blocked.has(item.workOrderId)) continue; // keep the driver's order within one job
        const r = await sendItem(item);
        if (r.result === "sent") await outboxDelete(h, item.seq!);
        else if (r.result === "rejected") { await outboxPut(h, { ...item, error: r.error }); blocked.add(item.workOrderId); }
        else if (r.result === "unauthorized") { setUnauthorized(true); return; }
        else return; // network or server trouble: try again later, nothing lost
      }
      const res = await fetchBundle();
      if (res.unauthorized) setUnauthorized(true);
      else if (res.bundle) {
        const at = new Date().toISOString();
        await kvSet(h, "bundle", res.bundle);
        await kvSet(h, "syncedAt", at);
        setBundle(res.bundle);
        setSyncedAt(at);
        setUnauthorized(false);
      }
    } finally {
      busy.current = false;
      setSyncing(false);
      await refreshOutbox(h).catch(() => undefined);
    }
  }, [db, refreshOutbox]);

  // Open storage, show the saved copy at once, then try the network.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const h = await openFieldDb(membershipId);
        if (cancelled) return;
        setDb(h);
        setBundle((await kvGet<FieldBundle>(h, "bundle")) ?? null);
        setSyncedAt((await kvGet<string>(h, "syncedAt")) ?? null);
        await refreshOutbox(h);
        setLoaded(true);
        void sync(h);
      } catch {
        setStorageError(true);
        setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membershipId]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => { setOnline(true); void sync(); };
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    const timer = window.setInterval(() => void sync(), SYNC_EVERY_MS);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); window.clearInterval(timer); };
  }, [sync]);

  // Service worker: keeps this page and its scripts on the phone for the next offline opening.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/field-sw.js", { scope: "/" }).then(async () => {
      const reg = await navigator.serviceWorker.ready;
      const urls = performance.getEntriesByType("resource").map((e) => e.name).filter((u) => u.includes("/_next/static/"));
      reg.active?.postMessage({ type: "precache", urls });
    }).catch(() => undefined);
  }, []);

  const enqueue = useCallback(async (item: Omit<OutboxItem, "id" | "occurredAt">) => {
    if (!db) return;
    await outboxAdd(db, { ...item, id: newRef(), occurredAt: new Date().toISOString() });
    await refreshOutbox(db);
    void sync();
  }, [db, refreshOutbox, sync]);

  const discard = useCallback(async (seq: number) => {
    if (!db) return;
    await outboxDelete(db, seq);
    await refreshOutbox(db);
    void sync();
  }, [db, refreshOutbox, sync]);

  // Work still to do comes first (in progress, then assigned), then finished jobs; by day within each group.
  const jobs = useMemo(() => {
    const rank: Record<string, number> = { IN_PROGRESS: 0, ASSIGNED: 1 };
    return overlay(bundle?.jobs ?? [], outbox).sort((a, b) => (rank[a.status] ?? 2) - (rank[b.status] ?? 2) || a.scheduledDate.localeCompare(b.scheduledDate) || a.number.localeCompare(b.number));
  }, [bundle, outbox]);
  const pending = outbox.filter((o) => !o.error).length;
  const rejected = outbox.filter((o) => o.error).length;
  const job = selected ? jobs.find((j) => j.id === selected) ?? null : null;

  const dayLabel = (iso: string) => {
    if (iso === algiersDay(0)) return f.today;
    if (iso === algiersDay(-1)) return f.yesterday;
    if (iso === algiersDay(1)) return f.tomorrow;
    return new Intl.DateTimeFormat(intl, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
  };
  const time = (iso: string) => new Intl.DateTimeFormat(intl, { timeStyle: "short", timeZone: "Africa/Algiers" }).format(new Date(iso));

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col bg-ink-50">
      <header className="sticky top-0 z-10 border-b border-ink-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-ink-900">{f.myJobs}</h1>
          <span role="status" data-testid="net-status" className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${online ? "bg-success-100 text-success-700" : "bg-warning-100 text-warning-700"}`}>
            <span aria-hidden className={`size-2 rounded-full ${online ? "bg-success-700" : "bg-warning-700"}`} />
            {online ? f.online : f.offline.split(":")[0]}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-sm">
          <span data-testid="pending" className={pending ? "font-medium text-warning-700" : "text-ink-600"}>
            {pending ? f.pending.replace("{n}", String(pending)) : f.allSent}
          </span>
          <button type="button" onClick={() => void sync()} disabled={!online || syncing || !db} className={buttonClass("secondary", "md", "min-h-11")}>
            {syncing ? f.syncing : f.syncNow}
          </button>
        </div>
        {syncedAt ? <p className="mt-1 text-xs text-ink-500">{f.updated.replace("{time}", time(syncedAt))}</p> : null}
      </header>

      <main id="main" className="flex-1 space-y-3 px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        {!online ? <Banner tone="warning">{f.offline}</Banner> : null}
        {storageError ? <Banner tone="danger">{f.storageError}</Banner> : null}
        {unauthorized ? (
          <Banner tone="danger">
            {f.sessionExpired}{" "}
            <a className="font-semibold underline" href={`/${locale}/login`}>{f.signIn}</a>
          </Banner>
        ) : null}
        {rejected && !job ? <Banner tone="danger">{f.rejected}: {rejected}</Banner> : null}

        {!loaded ? null : job ? (
          <JobView key={job.id} job={job} items={outbox.filter((o) => o.workOrderId === job.id)} destinations={bundle?.destinations ?? []}
            onBack={() => setSelected(null)} enqueue={enqueue} discard={discard} online={online} dayLabel={dayLabel} />
        ) : !bundle ? (
          storageError ? null : <Banner tone="info">{f.noData}</Banner>
        ) : jobs.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-ink-200 bg-white p-6 text-center text-ink-700">{f.empty}</p>
        ) : (
          <ul className="space-y-3" aria-label={f.myJobs}>
            {jobs.map((j) => (
              <li key={j.id}>
                <button type="button" onClick={() => { setSelected(j.id); window.scrollTo(0, 0); }}
                  className="block w-full rounded-[var(--radius-card)] border border-ink-200 bg-white p-4 text-start shadow-[var(--shadow-card)] active:bg-ink-50">
                  <span className="flex items-center justify-between gap-2">
                    <span className="num font-semibold text-ink-900">{j.number}</span>
                    <StatusBadge status={j.status} label={d.enums.WorkOrderStatus[j.status]} />
                  </span>
                  <span className="mt-1 block text-base text-ink-900">{j.title}</span>
                  {j.address ? <span className="block text-sm text-ink-600">{j.address}</span> : null}
                  <span className="mt-1 block text-xs text-ink-500">
                    {dayLabel(j.scheduledDate)}{j.plate ? <> · <bdi className="num">{j.plate}</bdi></> : null}
                    {outbox.some((o) => o.workOrderId === j.id && !o.error) ? <> · <span className="font-medium text-warning-700">{f.saved}</span></> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {bundle && !online ? <p className="text-xs text-ink-500">{f.stale}</p> : null}
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 bg-white px-4 py-3 text-sm">
        <a href={`/${locale}/app/work-orders`} className="text-brand-800 underline">{d.workOrders.myWork}</a>
        <form action={logoutAction} onSubmit={async (e) => {
          if (wiped.current) return;
          if (pending && !window.confirm(f.signOutPending.replace("{n}", String(pending)))) { e.preventDefault(); return; }
          e.preventDefault();
          const form = e.currentTarget;
          db?.close();
          await wipeSentFieldData();
          wiped.current = true;
          form.requestSubmit();
        }}>
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className={buttonClass("ghost", "md", "min-h-11")}>{f.signOut}</button>
        </form>
        <p className="w-full text-xs text-ink-500">{f.installTip}</p>
      </footer>
    </div>
  );
}

function Banner({ tone, children }: { tone: "warning" | "danger" | "info"; children: React.ReactNode }) {
  const cls = tone === "danger" ? "border-danger-700/25 bg-danger-100 text-danger-700" : tone === "warning" ? "border-warning-700/25 bg-warning-100 text-warning-700" : "border-info-700/25 bg-info-100 text-info-700";
  return <div role={tone === "danger" ? "alert" : "status"} className={`rounded-[var(--radius-card)] border p-3 text-sm ${cls}`}>{children}</div>;
}

function JobView({ job, items, destinations, onBack, enqueue, discard, online, dayLabel }: {
  job: Job; items: OutboxItem[]; destinations: FieldBundle["destinations"]; onBack: () => void;
  enqueue: (i: Omit<OutboxItem, "id" | "occurredAt">) => Promise<void>; discard: (seq: number) => Promise<void>;
  online: boolean; dayLabel: (iso: string) => string;
}) {
  const { dict: d, locale, t } = useI18n();
  const f = d.fieldApp;
  const intl = INTL_LOCALE[locale];
  const [mode, setMode] = useState<"idle" | "fail" | "sign">("idle");
  const [ink, setInk] = useState<string | null>(null);
  const [signer, setSigner] = useState("");
  const canSign = job.kind === "COLLECTION" && !job.signed && (job.status === "IN_PROGRESS" || job.status === "COMPLETED");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [weightError, setWeightError] = useState<string | null>(null);
  const category = job.category ? job.category[locale] : null;
  const firstErrorSeq = items.find((i) => i.error)?.seq;
  const big = "min-h-14 w-full text-lg";

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    try {
      const small = await compressImage(file);
      await enqueue({ kind: "photo", workOrderId: job.id, photo: { blob: small, name: small.name || "photo.jpg", kind: "AFTER" } });
    } finally {
      setPhotoBusy(false);
    }
  }

  async function onWeight(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const gross = Number(String(fd.get("grossKg") ?? "").replace(",", "."));
    const tare = Number(String(fd.get("tareKg") ?? "0").replace(",", ".") || "0");
    if (!(gross > 0) || !(tare >= 0)) { setWeightError(d.errors.validation); return; }
    if (tare > gross) { setWeightError(f.tareAboveGross); return; }
    setWeightError(null);
    const data: Record<string, unknown> = { grossKg: String(gross), tareKg: String(tare) };
    const dest = String(fd.get("destinationId") ?? "");
    const ticket = String(fd.get("ticketNumber") ?? "").trim();
    if (dest) data.destinationId = dest;
    if (ticket) data.ticketNumber = ticket;
    e.currentTarget.reset();
    await enqueue({ kind: "weight", workOrderId: job.id, data });
  }

  async function onSign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = signer.trim();
    if (!ink || name.length < 2) return;
    // data: URL → Blob decoded here, without fetch (offline emulation and some browsers refuse fetch() while offline).
    const bin = atob(ink.slice(ink.indexOf(",") + 1));
    const blob = new Blob([Uint8Array.from(bin, (c) => c.charCodeAt(0))], { type: "image/png" });
    await enqueue({ kind: "signature", workOrderId: job.id, data: { signerName: name }, photo: { blob, name: "signature.png", kind: "SIGNATURE" } });
    setInk(null);
    setSigner("");
    setMode("idle");
  }

  async function onFail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const notes = String(fd.get("failureNotes") ?? "").trim();
    await enqueue({ kind: "fail", workOrderId: job.id, data: { failureReason: String(fd.get("failureReason")), ...(notes ? { failureNotes: notes } : {}) } });
    setMode("idle");
  }

  return (
    <article className="space-y-3" aria-labelledby="job-title">
      <button type="button" onClick={onBack} className={buttonClass("ghost", "md", "min-h-11 -ms-2")}>
        <span aria-hidden className="rtl:rotate-180">←</span> {f.back}
      </button>
      <section className="rounded-[var(--radius-card)] border border-ink-200 bg-white p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-2">
          <span className="num text-sm font-semibold text-ink-700">{job.number}</span>
          <StatusBadge status={job.status} label={d.enums.WorkOrderStatus[job.status]} />
        </div>
        <h2 id="job-title" className="mt-1 text-xl font-semibold text-ink-900">{job.title}</h2>
        {job.address ? <p className="text-ink-700">{job.address}</p> : null}
        <p className="mt-1 text-sm text-ink-600">
          {dayLabel(job.scheduledDate)}{category ? <> · {category}</> : null}{job.plate ? <> · <bdi className="num">{job.plate}</bdi></> : null}
        </p>
        {job.instructions ? <p className="mt-3 text-sm"><span className="font-medium text-ink-900">{f.instructions}: </span>{job.instructions}</p> : null}
        {job.accessNotes ? <p className="mt-1 text-sm"><span className="font-medium text-ink-900">{f.access}: </span>{job.accessNotes}</p> : null}
        {job.lat != null && job.lng != null ? (
          <a className="mt-3 inline-block text-sm font-medium text-brand-800 underline" href={`geo:${job.lat},${job.lng}`}>{f.openMap}</a>
        ) : null}
        <p className="mt-3 flex gap-4 text-sm text-ink-700">
          <span data-testid="photo-count">{f.photos.replace("{n}", String(job.evidenceCount))}</span>
          <span>{f.weights.replace("{n}", String(job.ticketCount))}</span>
        </p>
      </section>

      {job.status === "ASSIGNED" && mode === "idle" ? (
        <div className="space-y-2">
          <button type="button" className={buttonClass("primary", "lg", big)} onClick={() => void enqueue({ kind: "start", workOrderId: job.id })}>{f.start}</button>
          <button type="button" className={buttonClass("secondary", "lg", big)} onClick={() => setMode("fail")}>{f.cannotDo}</button>
        </div>
      ) : null}

      {job.status === "IN_PROGRESS" && mode === "idle" ? (
        <div className="space-y-3">
          <label className={buttonClass("secondary", "lg", `${big} cursor-pointer ${photoBusy ? "pointer-events-none opacity-60" : ""}`)}>
            {photoBusy ? "…" : f.takePhoto}
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={onPhoto} disabled={photoBusy} data-testid="photo-input" />
          </label>
          {job.kind === "COLLECTION" ? (
            <form onSubmit={onWeight} className="space-y-3 rounded-[var(--radius-card)] border border-ink-200 bg-white p-4" noValidate>
              <h3 className="font-semibold text-ink-900">{f.weight}</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-ink-800">{f.gross}
                  <Input name="grossKg" inputMode="decimal" required className="mt-1 h-12 text-lg" dir="ltr" />
                </label>
                <label className="block text-sm font-medium text-ink-800">{f.tare}
                  <Input name="tareKg" inputMode="decimal" defaultValue="0" className="mt-1 h-12 text-lg" dir="ltr" />
                </label>
              </div>
              <label className="block text-sm font-medium text-ink-800">{f.destination}
                <Select name="destinationId" className="mt-1 h-12" defaultValue="">
                  <option value="">{f.noDestination}</option>
                  {destinations.map((x) => <option key={x.id} value={x.id}>{x.name} · {d.enums.DestinationKind[x.kind as keyof typeof d.enums.DestinationKind] ?? x.kind}</option>)}
                </Select>
              </label>
              <label className="block text-sm font-medium text-ink-800">{f.ticketNumber}
                <Input name="ticketNumber" className="mt-1 h-12" maxLength={60} />
              </label>
              {weightError ? <p role="alert" className="text-sm text-danger-700">{weightError}</p> : null}
              <button type="submit" className={buttonClass("secondary", "lg", big)}>{f.saveWeight}</button>
            </form>
          ) : null}
          {job.evidenceCount < 1 ? <p className="text-sm text-warning-700">{f.photoNeeded}</p> : null}
          <button type="button" disabled={job.evidenceCount < 1} className={buttonClass("primary", "lg", big)} onClick={() => void enqueue({ kind: "complete", workOrderId: job.id, data: {} })}>{f.finish}</button>
          <button type="button" className={buttonClass("ghost", "lg", big)} onClick={() => setMode("fail")}>{f.cannotDo}</button>
        </div>
      ) : null}

      {canSign && mode === "idle" ? (
        <button type="button" className={buttonClass("secondary", "lg", big)} onClick={() => setMode("sign")} data-testid="sign-open">{f.signature}</button>
      ) : null}
      {job.signed ? <p className="text-center text-sm font-medium text-brand-800" data-testid="signed">{f.signed}</p> : null}

      {mode === "sign" ? (
        <form onSubmit={onSign} className="space-y-3 rounded-[var(--radius-card)] border border-ink-200 bg-white p-4" noValidate>
          <h3 className="font-semibold text-ink-900">{f.signature}</h3>
          <label className="block text-sm font-medium text-ink-800">{f.signerName}
            <Input name="signerName" value={signer} onChange={(e) => setSigner(e.target.value)} maxLength={120} autoComplete="off" className="mt-1 h-12 text-lg" />
          </label>
          <div>
            <p className="mb-1 text-sm font-medium text-ink-800">{f.signHere}</p>
            <SignaturePad label={f.signHere} clearLabel={f.clear} onInk={setInk} />
          </div>
          {!ink || signer.trim().length < 2 ? <p className="text-sm text-ink-600">{f.signatureEmpty}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={buttonClass("secondary", "lg", "min-h-14")} onClick={() => setMode("idle")}>{f.cancel}</button>
            <button type="submit" disabled={!ink || signer.trim().length < 2} className={buttonClass("primary", "lg", "min-h-14")}>{f.saveSignature}</button>
          </div>
        </form>
      ) : null}

      {mode === "fail" ? (
        <form onSubmit={onFail} className="space-y-3 rounded-[var(--radius-card)] border border-ink-200 bg-white p-4">
          <h3 className="font-semibold text-ink-900">{f.cannotDo}</h3>
          <label className="block text-sm font-medium text-ink-800">{f.reason}
            <Select name="failureReason" required className="mt-1 h-12" defaultValue="">
              <option value="" disabled>—</option>
              {FAILURE_REASONS.map((r) => <option key={r} value={r}>{d.enums.FailureReason[r]}</option>)}
            </Select>
          </label>
          <label className="block text-sm font-medium text-ink-800">{f.notes}
            <Textarea name="failureNotes" rows={3} maxLength={2000} className="mt-1" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={buttonClass("secondary", "lg", "min-h-14")} onClick={() => setMode("idle")}>{f.cancel}</button>
            <button type="submit" className={buttonClass("danger", "lg", "min-h-14")}>{f.confirm}</button>
          </div>
        </form>
      ) : null}

      {items.length ? (
        <section className="rounded-[var(--radius-card)] border border-ink-200 bg-white p-4" aria-label={f.pending.replace("{n}", String(items.length))}>
          <ul className="divide-y divide-ink-100">
            {items.map((it) => (
              <li key={it.seq} className="flex items-start justify-between gap-3 py-2 text-sm" data-testid="outbox-item">
                <span>
                  <span className="font-medium text-ink-900">{f.kinds[it.kind]}</span>{" "}
                  <span className="text-ink-500">{new Intl.DateTimeFormat(intl, { timeStyle: "short", timeZone: "Africa/Algiers" }).format(new Date(it.occurredAt))}</span>
                  <span className={`block ${it.error ? "text-danger-700" : "text-ink-600"}`}>
                    {it.error ? `${f.rejected}: ${t(it.error)}` : firstErrorSeq != null && it.seq! > firstErrorSeq ? f.blocked : online ? f.retry : f.saved}
                  </span>
                </span>
                {it.error ? <button type="button" className={buttonClass("danger", "sm", "min-h-10")} onClick={() => void discard(it.seq!)}>{f.discard}</button> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {online ? <a href={`/${locale}/app/work-orders/${job.id}`} className="block text-center text-sm text-brand-800 underline">{f.fullPage}</a> : null}
    </article>
  );
}
