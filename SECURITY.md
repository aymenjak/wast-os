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

## Secrets

- `.env` is git-ignored; `.env.example` holds placeholders only. No real credentials in the repo or seed (seed users are synthetic with a documented demo password — **never run the seed in production**; it refuses when `NODE_ENV=production`).
- `PAYMENT_WEBHOOK_SECRET` must be ≥32 random bytes in production.
- `NEXVO_FAST_HASH` (weak hashing) is ignored when `NODE_ENV=production`. `NEXVO_E2E`/`RATE_LIMIT_SCALE` must never be set in production.

## Audit trail

`AuditEvent` rows are written in the same transaction as: org creation/settings, member invite/join/role/status, customer/location changes, contract creation/status, request create/validate/reject, every work-order transition, evidence (with SHA-256), weights, invoice draft/issue/void, payments/reversals, civic submission/review/citizen feedback, CSV exports.

## Dependency hygiene

`npm audit --omit=dev` → 0 vulnerabilities (2026-10-30). Versions pinned exactly. Run `npm audit` in CI (see DEPLOYMENT.md).

## Known gaps (must close before production)

1. Rate limiter is per-process → shared store for multi-instance.
2. No 2FA, no password reset flow (needs an email provider), no session list/revoke UI.
3. No Content-Security-Policy on HTML pages yet (only on file responses) — add a nonce-based CSP.
4. No Postgres row-level security (defence in depth).
5. No antivirus scanning of PDFs; PNG/WebP metadata not stripped (only JPEG).
6. Audit log is in the same database and writable by the app role — export to append-only storage.
7. No independent penetration test.
