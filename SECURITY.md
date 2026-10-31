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
| Platform operator power | Abuse or mistakes by the company running NEXVO | Roles OWNER > ADMIN > SUPPORT (`User.platformRole`, DB CHECK keeps it consistent with the staff flag); console returns 404 to everyone else; every service re-checks the role; operator sees metadata and counts, not business records (those need the tenant's support grant); every action audited, tenant-related ones in the tenant's own log; last active owner cannot be removed or disabled; nobody changes their own role/account; admins cannot disable owners; first owner created only via CLI with database access | `platform-console.test.ts` (16), e2e `platform-owner.spec` |
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

## Known gaps (must close before production)

1. ~~Per-process rate limiter~~ (done: Postgres) · ~~no CSP on HTML~~ (done: nonce CSP) · ~~no lockout~~ (done).
2. ~~No 2FA~~ (done: TOTP, mandatory for staff). Still missing: password reset flow (needs an email provider), session list/revoke UI, WebAuthn/passkeys.
3. Lockout can be used to lock a known user out for 15 min (accepted trade-off; IP-based login limit also applies). Revisit with 2FA/captcha.
4. No Postgres row-level security (defence in depth).
5. No antivirus scanning of PDFs; PNG/WebP metadata not stripped (only JPEG).
6. Audit log is in the same database and writable by the app role — export to append-only storage.
7. No independent penetration test.
