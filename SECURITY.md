# Security

Reference: OWASP ASVS 4.x (S-62). This document records what is implemented and tested; **it is not a certification or a substitute for an independent review.**

## Threat model (summary)

| Asset | Threat | Mitigation | Test |
|-------|--------|------------|------|
| Tenant data (customers, contracts, invoices, evidence) | Cross-tenant access by ID guessing/IDOR | Services filter by `ctx.org.id`; composite FKs; cuid IDs; 404 for foreign records | `tenant-isolation.test.ts`, e2e F |
| Role boundaries | Field worker/finance/portal escalation | Permission map per role & org kind; team scoping; portal scoped to `customerId`; ADMIN grantable only by OWNER | `security-primitives.test.ts`, business-flow A/D/portal |
| Money | Double payment, overpayment, race | Idempotency key unique, row lock, CHECK constraints | `payments-idempotency.test.ts` |
| Payment status | Forged "paid" from browser | Paid only via staff record or HMAC-verified webhook | webhook tests |
| Sessions | Theft/fixation/CSRF | HttpOnly, SameSite=Lax, Secure in prod, hashed tokens, new token on login; server actions enforce Origin check (Next.js) | — |
| Credentials | Offline cracking, enumeration | scrypt N=2^17; dummy-hash timing; generic login error; rate limit | unit |
| Uploads | Malware/XSS via files, metadata leak | magic-byte allowlist (JPEG/PNG/WebP/PDF), 5 MB, random keys, no user path, EXIF/XMP/IPTC strip, served with nosniff + sandbox CSP + attachment for PDF | unit + integration + e2e D |
| Citizen privacy | Reporter identity/location exposure | Name/contact optional, never on public endpoints; public map coarsened to ~100 m, verified reports only, 90 days | civic-flow tests |
| Injection | SQL / XSS / CSV formula | Prisma parameterized + tagged `$queryRaw`; React escaping; Leaflet popups HTML-escaped; CSV cells prefixed | unit CSV |
| Abuse | Brute force, spam reports | Rate limits on login, register, invite, contact, civic submit/feedback | unit |
| Clickjacking/MIME | — | `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; `x-powered-by` removed | e2e |
| XSS (defence in depth) | Injected script on HTML pages | Per-request nonce CSP in `proxy.ts`: `script-src 'self' 'nonce-…' 'strict-dynamic'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, map-tile origin only in `img-src`. `style-src 'unsafe-inline'` is kept (React style attributes, Leaflet) | e2e `platform.spec` (header, fresh nonce per request, no CSP console violations) |
| Credential stuffing | Many passwords on one account | Lockout after 5 failures for 15 min; locked accounts still run the full hash (no timing oracle); same generic error; `user.locked` audited; counter reset on success | `security-hardening.test.ts` |
| Abuse across instances | Per-process limits bypassed by scaling out | Rate limiter in Postgres (`RateLimitBucket`, one atomic upsert per check); `RATE_LIMIT_SCALE` honoured only when `APP_URL` is localhost (fail closed) | `security-hardening.test.ts` |
| Online payments | Forged/replayed/underpaid "paid" events | Chargily webhook: HMAC-SHA256 over raw body, constant-time compare, 64 KB cap; checkout row locked `FOR UPDATE`; amount and currency must equal the checkout we created (metadata never trusted); idempotency key `chargily:<id>`; money for an already-settled invoice → `payment.reconcile_required` audit, never silently applied; live mode refuses to run without an https `APP_URL` | `payments-chargily.test.ts` (14) |
| Remote support | Vendor staff overreach, silent access | Access only after the customer's OWNER/ADMIN grants it (1/4/24 h, reason, revocable); staff act under their own identity as read-only VIEWER; every mutating server action refused in support sessions (`orgAction` guard); exports blocked; revoke/expiry/lost staff flag end the session on the next request; all grant/session events in the customer's audit log | `support-access.test.ts` (11), e2e |
| AI features | Prompt injection, data leakage, automated decisions | Off unless `ANTHROPIC_API_KEY` is set; citizen text wrapped as untrusted data; no names, contacts, photos or coordinates sent; brief uses aggregate KPIs only; output schema-validated; suggestions stored and never applied automatically; accept/dismiss audited and permission-checked | `ai-assist.test.ts` (7, fake provider) |
| Account takeover (staff) | Stolen password of a platform owner/admin/support agent | TOTP two-step verification (RFC 6238, ±1 step, replay refused via last-used step, 5 attempts per 10-min challenge, audited) **mandatory for all platform staff** in services and console layouts; 10 single-use recovery codes (SHA-256 stored); admin/CLI reset ends all sessions; optional for every other user | `mfa.test.ts` (10), unit RFC vectors, e2e |
| Secrets at rest | DB dump reveals TOTP secrets or merchants' payment keys | AES-256-GCM with `APP_ENCRYPTION_KEY` (fails closed when missing), random IV, auth tag | unit `totp-crypto.test.ts` |
| Money routing | A tenant's customer payments landing in another account | Each organization stores its OWN Chargily key (encrypted, write-only); per-organization webhook URL verified with that organization's key; checkout lookup filtered by organization. Platform key used only for NEXVO subscription invoices | `payments-chargily.test.ts`, `billing.test.ts` |
| Subscription billing | Duplicate or gapped invoice numbers, wrongful suspension | Unique (organization, period) + row-locked gapless counter; idempotent daily run; auto-suspension OFF by default (owner opt-in), only after due date + grace, lifted automatically on payment, never lifts a manual suspension | `billing.test.ts` (13) |
| IoT ingestion | Forged or cross-tenant sensor data, flooding | Per-device 256-bit key (hash stored, shown once, revocable); key fixes organization and linked container/vehicle; kind checks (sensor ≠ tracker); value ranges + DB CHECKs; timestamps within −30 d/+5 min; batches ≤ 100, 256 KB; 1 200 requests/h per device; idempotent per (device, timestamp); suspended organizations' devices refused | `iot.test.ts` (12), e2e |
| LoRaWAN webhooks | Forged uplinks, cross-tenant writes | Per-integration key (hash stored, provider-specific, revocable) sent as a custom header (both ChirpStack and TTN support headers); devices matched by DevEUI **inside the integration's organization only**; JSON required; same validation, idempotency and alerts as direct ingestion; unknown devices acknowledged (202) without effect | `lorawan-email-map.test.ts`, e2e |
| Email | Injection in emails, double sending, data leak | All values HTML-escaped (user messages, customer names, line descriptions), no remote images/tracking; outbox written in the business transaction; batch claim with `FOR UPDATE SKIP LOCKED` (no double send), backoff, failed after 5 attempts; sending an invoice needs invoices.write and is audited | `lorawan-email-map.test.ts`, e2e |
| Password reset | Account takeover via reset, enumeration | Same response for unknown emails; 256-bit single-use token (hash stored, 30 min, atomic use); new request invalidates old links; per-IP and per-email rate limits; success ends all sessions; 2FA still required; reset page `no-referrer`; email body erased after sending | `fixes-and-assistant.test.ts`, e2e |
| AI assistant | Data leakage, prompt injection, unwanted actions | Off until an organization owner/admin enables it (and the platform key exists); read-only tools only, filtered by the user's permissions and executed in their tenant; unknown tools / bad inputs return errors; tool output declared as data in the system prompt; 60 messages/h per user; conversations private, 90-day retention; audit records tools used, not content | `fixes-and-assistant.test.ts` (fake provider) |
| PDF rendering | SSRF / script execution through invoice text | Headless Chromium with JavaScript disabled and every non-`data:` request aborted; fonts embedded; optional (`CHROMIUM_PATH`) | test renders real PDF |
| Platform operator power | Abuse or mistakes by the company running NEXVO | Roles OWNER > ADMIN > SUPPORT (`User.platformRole`, DB CHECK keeps it consistent with the staff flag); console returns 404 to everyone else; every service re-checks the role; operator sees metadata and counts, not business records (those need the tenant's support grant); every action audited, tenant-related ones in the tenant's own log; last active owner cannot be removed or disabled; nobody changes their own role/account; admins cannot disable owners; first owner created only via CLI with database access | `platform-console.test.ts` (16), e2e `platform-owner.spec` |
| Recycling records | Inflated recovery claims, cross-tenant destinations, tampering after the fact | Recovery derived only from tickets (pessimistic rules, D-54); destination must be active and in the same organization (composite FK + service check); rejects bounded by a DB CHECK (0 ≤ rejectedKg ≤ netKg) and audited; special waste refused unless the destination has a recorded approval/licence number (law 01-19 art. 15/19 as amended, D-58); destinations and classification need settings.manage; report needs reports.read; certificate needs customers.read or a portal user of that customer; recovery ledger export permission-checked and audited like other exports | `recycling.test.ts`, e2e `recycling.spec` |
| Hazardous waste records | Forged or out-of-order signatures, transport without authorisation, cross-tenant access | Movements tenant-scoped (composite FKs) and numbered per organization; state changes are conditional updates on the expected status (no double transition), each audited; carrier signature = the signed-in user; authorisation validity checked at creation and pickup; DB CHECKs require signatures/labels/decontamination per status; declaration readable by customers.read or the customer's own portal user only | `hazardous.test.ts`, e2e |
| Sorting yard (R2) | Phantom stock, double sale of a bale, cash fraud, collector privacy | Stock derived from audited movements and never negative (advisory lock per yard; concurrency test); a bale can be on one sale line only (partial unique index) and changes state by conditional update; purchases/sales need invoices.write, payment marks need payments.record, baling/adjustments need workorders.dispatch, report needs reports.read; every operation audited; collectors: name + optional phone only; QR labels carry no URL or personal data | `yard.test.ts`, e2e `yard.spec` |
| Territory (R3) | Cross-tenant figures, misplaced containers | Reports, ledgers and campaigns filtered on the organization; reports need reports.read; drop-off points and container placement need fleet.write; campaigns need settings.manage or workorders.dispatch; local target needs settings.manage; a container cannot be both at a customer and at a drop-off point (service + DB CHECK); all changes audited | `territory.test.ts`, e2e |
| Offline driver app | Replayed or forged queued actions, CSRF on the JSON API, other drivers' jobs, backdated work | Session cookie (httpOnly, SameSite=Lax) + same-origin `Origin` check + required `x-nexvo-field` header (a cross-site form cannot set it) + per-user rate limit; every action re-checked by the online services (team membership, state machine, photo required, destinations in the organization); `clientRef` unique per organization so replays are no-ops; occurredAt limited to the last 7 days and clamped to server time; support sessions read-only; a duplicate reply still checks team membership so it reveals nothing; service worker never caches `/api`, and the cached page shell holds no job data | `field-offline.test.ts`, e2e `field-offline.spec` |
| Bulk data extraction | Exports by the wrong role | Exports permission-checked per kind, tenant-scoped, audited, `Cache-Control: no-store`; CSV formula-neutralised; XLSX cells written as typed values (no formulas) | `security-hardening.test.ts` |

## Secrets

- `.env` is git-ignored; `.env.example` holds placeholders only. No real credentials in the repo or seed (seed users are synthetic with a documented demo password — **never run the seed in production**; it refuses when `NODE_ENV=production`).
- `PAYMENT_WEBHOOK_SECRET` must be ≥32 random bytes in production.
- `CHARGILY_SECRET_KEY` (online payments) and `ANTHROPIC_API_KEY` (AI) are optional; each feature is disabled when its key is absent. `CHARGILY_MODE` defaults to `test`; only the literal `live` switches to real money.
- `NEXVO_FAST_HASH` (weak hashing) is ignored when `NODE_ENV=production`. `NEXVO_E2E`/`RATE_LIMIT_SCALE` must never be set in production.

## Audit trail

`AuditEvent` rows are written in the same transaction as: org creation/settings, member invite/join/role/status, customer/location changes, contract creation/status, request create/validate/reject, every work-order transition, evidence (with SHA-256), weights, invoice draft/issue/void, payments/reversals, civic submission/review/citizen feedback, CSV exports.

## Dependency hygiene

`npm audit --omit=dev` → 0 vulnerabilities (2026-10-30, re-run 2026-10-31). `exceljs` was rejected because its dependency tree had advisories; `write-excel-file` is used instead. Versions pinned exactly. Run `npm audit` in CI (see DEPLOYMENT.md).

## Insecure-defaults review (2026-10-31)

Checklist adapted from Trail of Bits' `insecure-defaults` skill (read, not installed — see `docs/skills/README.md`):

| Check | Finding | Action |
|-------|---------|--------|
| Fallback secrets | None: `CHARGILY_SECRET_KEY`, `ANTHROPIC_API_KEY`, `PAYMENT_WEBHOOK_SECRET` have no defaults; missing → feature off / signature fails | — |
| Fail-open | Live Chargily without https `APP_URL` would have produced relative callback URLs | Fixed: refuses (test) |
| Test switches in prod | `RATE_LIMIT_SCALE` could have relaxed limits anywhere | Fixed: honoured only on localhost (test); `NEXVO_FAST_HASH` ignored in production |
| Permissive access | `recordAiDecision` had no permission check; support sessions could have used any action their VIEWER role allowed | Fixed: permission + global read-only guard (tests) |
| Debug leakage | Errors map to translatable codes; unexpected errors logged server-side only; webhook returns no detail | — |
| Weak crypto | scrypt N=2^17, HMAC-SHA256, `timingSafeEqual`, 256-bit random tokens | — |
| Default credentials | Seed users exist only in development; seed refuses in production | — |

Also run: `npm audit --omit=dev` → 0 vulnerabilities (2026-10-31).

## Database and data protection (2026-11-06)

What protects the data if the database, a backup or the application is compromised. Checked against OWASP guidance (IDOR prevention, password storage, ASVS 5.0 cryptography) — sources in DECISIONS D-83–D-86.

| Layer | Measure | Verified by |
|---|---|---|
| Identifiers in URLs | Random 25-character ids (not sequential, not guessable) **and** a server-side organization + permission check on every read and write. OWASP's IDOR cheat sheet treats random ids as defence in depth only and advises *against* encrypting identifiers; the access check is the control. | `tenant-isolation.test.ts`, cross-tenant tests in every module |
| Passwords | scrypt (N=2^17, r=8, p=1, per-user salt), meets the OWASP minimum | `server/auth/password.ts` |
| Sessions, reset links, device keys | Stored as SHA-256 hashes only: a database copy holds no usable session or link | `server/auth/tokens.ts` |
| Secrets (2FA, payment keys) | AES-256-GCM with `APP_ENCRYPTION_KEY` (fails closed without it) | `mfa.test.ts`, `payments-chargily.test.ts` |
| Citizens' personal data | Name and contact on civic reports encrypted with AES-256-GCM; shown in clear only to reviewers, decrypted only to send the status email. Older rows: `scripts/ops/encrypt-existing-pii.ts` | `review-fixes.test.ts` |
| Application database account | Separate least-privilege role (`scripts/ops/db-roles.sql`): rows only — no TRUNCATE, ALTER, DROP, CREATE, no access to migration history; the append-only triggers on `AuditEvent` and `StockMovement` cannot be disabled by the app | manual check 2026-11-06 (every forbidden statement refused) |
| Append-only ledgers | Database triggers refuse UPDATE/DELETE on the audit trail and the stock ledger | `audit-trail.test.ts`, `stock.test.ts` |
| Backups | Streamed into `age` encryption with the owner's public key; the private key stays off the server; the script refuses to write a plain dump unless `--plaintext` | drill 2026-11-06: encrypted file, no readable data, restore OK |
| In transit | HTTPS + HSTS for users; `sslmode=require` on the database connection when the database is on another host (DEPLOYMENT.md §2) | header check |

**Next layer (planned, needs a dedicated change): PostgreSQL row-level security.** Policies `organizationId = current_setting('app.org_id', true)` with `FORCE ROW LEVEL SECURITY` on every tenant table, the tenant set per transaction with `set_config(..., true)` (transaction-scoped, safe with connection pools), and a Prisma client extension that wraps each request's queries. It makes the database itself refuse cross-tenant rows even if application code forgets a filter. It touches every query path (about 40 services), so it is done as its own reviewed change with the full test suite, not mixed into other work.

## Known gaps (must close before production)

Updated after the pre-pilot review (PILOT-READINESS.md, 2026-11-01).

1. ~~Per-process rate limiter~~ · ~~no CSP~~ · ~~no lockout~~ · ~~no password reset~~ · ~~no HSTS~~ (all done). Still missing: session list/revoke UI, WebAuthn/passkeys.
2. Lockout can be used to lock a known user out for 15 min (accepted trade-off; IP-based limit also applies).
3. No Postgres row-level security yet (defence in depth; tenant filtering verified by scan + tests). Plan in §Database and data protection. Since 2026-11-06 the app runs as a least-privilege database role.
4. No antivirus scanning of PDFs; PNG/WebP metadata not stripped (JPEG stripped; photos re-encoded on the phone carry no EXIF).
5. Audit trail is append-only in the database (trigger, verified) but not yet exported to external append-only storage.
6. No independent penetration test.
7. Uploaded files on local disk only (single-server pilot); S3-compatible provider still to implement for multi-instance.
8. Offline driver mode: jobs (customer names, addresses, instructions) and unsent photos are stored unencrypted in the phone browser's IndexedDB until sent; anyone holding an unlocked phone can read them. Mitigations today: one database per account, only yesterday–tomorrow, jobs list replaced on each sync. Since 2026-11-06 signing out (app header or offline page) deletes the phone's offline copies that have nothing left to send; a copy with unsent work is kept so nothing is lost. Still to do: a device policy (screen lock) for pilot phones.
