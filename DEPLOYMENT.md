# Deployment

**Nothing has been deployed.** This is the procedure and the release gates. Production deployment, purchases of hosting and DNS changes require explicit approval from the project owner.

## 1. Requirements

- Node.js 22 LTS
- PostgreSQL 16 with `postgis` (3.4+) and `citext` extensions available to the migration role
- S3-compatible object storage (implement `StorageProvider` — local disk is for development only)
- HTTPS termination (cookies are `Secure` in production)

## 2. Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | yes | app role; least privilege (no superuser) |
| `PAYMENT_WEBHOOK_SECRET` | if webhooks used | ≥32 random bytes |
| `UPLOAD_DIR` | dev only | replaced by object storage config in production |
| `APP_URL` | yes | used for invitation links |
| `NEXT_PUBLIC_MAP_TILE_URL`, `NEXT_PUBLIC_MAP_ATTRIBUTION` | yes for production | contracted or self-hosted tiles (public OSM tiles are not allowed for production traffic) |
| `SALES_EMAIL` | optional | contact-form recipient for the outbox worker |
| `APP_ENCRYPTION_KEY` | **yes** | 32 random bytes, base64. Encrypts 2FA secrets and organizations' payment keys. Back it up separately from the database; losing it makes those unreadable (users re-enroll 2FA, organizations re-enter keys) |
| `CHARGILY_SECRET_KEY` | optional | **NEXVO's own** Chargily account, used only for paying NEXVO subscription invoices; webhook `${APP_URL}/api/webhooks/chargily`. Collection companies enter their own keys in Settings; their webhook is `${APP_URL}/api/webhooks/chargily/org/<organizationId>` (shown to them) |
| `CHARGILY_MODE` | optional | `test` (default) or `live` for the platform account. **Switching to `live` changes payment behaviour: owner approval required** (AGENTS.md rule 8). Live mode requires an https `APP_URL` |
| `ANTHROPIC_API_KEY` | optional | enables AI suggestions (civic triage, operations brief). Data sent is described in PRIVACY-AND-COMPLIANCE.md §6; **owner approval required before enabling for customers** |
| **Never set in production:** `NEXVO_FAST_HASH`, `NEXVO_E2E`, `RATE_LIMIT_SCALE`, `AI_DEMO_PROVIDER` (ignored unless `APP_URL` is localhost) | | test-only switches (`RATE_LIMIT_SCALE` is ignored unless `APP_URL` is localhost) |

Jobs (cron or the hosting scheduler):

```bash
npm run billing:run      # daily: NEXVO subscription invoices, dunning; idempotent; also flushes the outbox
npm run outbox:work      # every minute: delivers queued emails (no-op without SMTP_URL)
npm run retention:run    # daily: GPS (90 d), sensor readings (400 d), sent emails (180 d), AI chats (90 d), expired sessions/tokens
```

Retention windows: `GPS_RETENTION_DAYS`, `SENSOR_RETENTION_DAYS`, `EMAIL_RETENTION_DAYS`, `AI_CHAT_RETENTION_DAYS` (defaults above, pending legal review).

PDF: set `CHROMIUM_PATH` to a Chromium/Chrome binary (e.g. the distro package `chromium`) to enable invoice PDFs and PDF attachments; without it, print view only.

All CLI scripts run with `--conditions=react-server` (set in package.json) because shared modules are guarded by `server-only`.

```bash
```

Email: set `SMTP_URL` (e.g. `smtps://user:password@smtp.provider.dz:465`) and `MAIL_FROM` (e.g. `NEXVO <factures@your-domain.dz>`), with SPF/DKIM for that domain. Without `SMTP_URL` emails stay queued and are sent once it is configured. **Turning on email = external communication: owner approval required** (AGENTS rule 8).

LoRaWAN: in the IoT page, add an integration (ChirpStack or The Things Stack) to get a URL and an `Authorization` header; register each device with its DevEUI as serial number. ChirpStack: Application → Integrations → HTTP, encoding JSON. TTN: Application → Integrations → Webhooks → Custom, format JSON, enable "Uplink message". The device codec / payload formatter must output `fillPct` (or `fill_level`), `batteryPct`, `temperatureC`, or `lat`/`lng` for trackers.

IoT: direct devices post to `${APP_URL}/api/iot/v1/ingest` with their device key; LoRaWAN network servers post to `${APP_URL}/api/iot/v1/lorawan/{chirpstack|ttn}` (see above).

Lost 2FA device for a staff member: `npm run platform:reset-2fa -- <email>` (or an admin in /platform/staff).

Housekeeping: call `purgeRateLimits()` (server/rate-limit.ts) from a periodic job to delete expired buckets.

Platform operator: create the first owner once, from a machine with database access, after that person has registered an account:

```bash
npm run platform:role -- owner@your-company.dz OWNER
```

The owner then manages admins and support agents in `/platform/staff`. Support agents reach a tenant only through that tenant's grant.

## 3. Release procedure

```bash
npm ci
npx prisma generate
npm run typecheck && npm run test:unit
npm run test:integration          # against a disposable DB
npm run build && npm run test:e2e # against a disposable DB
npx prisma migrate deploy         # production DB, after backup
npm run start                     # behind HTTPS reverse proxy
curl -f https://<host>/api/health
```

Local development setup (what was done in this environment):

```bash
sudo apt-get install postgresql-16-postgis-3
sudo -u postgres psql -c "CREATE ROLE nexvo LOGIN PASSWORD '…' CREATEDB"
sudo -u postgres createdb -O nexvo nexvo_dev && sudo -u postgres createdb -O nexvo nexvo_test
for db in nexvo_dev nexvo_test template1; do sudo -u postgres psql -d $db -c "CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS citext;"; done
cp .env.example .env && npm ci && npx prisma migrate dev && npm run db:seed && npm run dev
```

(`template1` gets the extensions so Prisma's shadow database can apply the migration in development.)

## 4. Backups and recovery

- Managed Postgres point-in-time recovery, or nightly `pg_dump -Fc` + WAL archiving; keep 30 days; copy off-site (encrypted).
- Object storage versioning on.
- Scripts: `scripts/ops/db-backup.sh <db-url> <file.dump>` (excludes PostGIS `spatial_ref_sys` data) and `scripts/ops/restore-drill.sh <file.dump> <empty-db-url>` (stops on first error, checks migrations and the append-only audit trigger). Uploaded files (`UPLOAD_DIR`) are not in the dump — back them up separately.
- **Restore drill executed locally on 2026-11-01** (PILOT-READINESS.md §3): clean restore in < 2 s, identical row counts, app up on the copy with login and invoice. Repeat it once on the real server before the pilot.
- Before any destructive migration: backup, rehearse on a restored copy, approval.

### Database accounts and encrypted backups (2026-11-06)

1. As the database administrator, create the application role once: `sudo -u postgres psql -d nexvo -v app_role=nexvo_app -v app_password='<random>' -f scripts/ops/db-roles.sql`.
2. `DATABASE_URL` for the running app = the `nexvo_app` role. Migrations (`npx prisma migrate deploy`) run with the owner role's URL, never the app role. Re-run step 1 after each release that adds tables only if default privileges were not set (the script sets them).
3. Generate the backup key pair **on the owner's computer**: `age-keygen -o nexvo-backup-key.txt`. Keep that file offline (safe, password manager). Put only its public key (`age1…`) on the server as `BACKUP_AGE_RECIPIENT`.
4. Nightly: `BACKUP_AGE_RECIPIENT=age1… scripts/ops/db-backup.sh "$OWNER_URL" /backups/nexvo-$(date +%F).dump.age`, then copy off-site. Encrypt `UPLOAD_DIR` archives the same way (`tar c uploads | age -r age1… > uploads.tar.age`).
5. Restore drill: `AGE_IDENTITY=nexvo-backup-key.txt scripts/ops/restore-drill.sh backup.dump.age <empty-db-url>`; remove the key file afterwards.
6. If the database is on another machine, add `?sslmode=require` to both URLs; use full-disk encryption on the database server (cloud volume encryption or LUKS).

## 5. Release gates (Definition of Done for production)

- [ ] All suites green in CI (`.github/workflows/ci.yml`)
- [x] Security gaps 1–3 in SECURITY.md closed (shared rate limiter, password reset, CSP); HSTS added in the pre-pilot review
- [ ] Object storage provider implemented and tested
- [x] Notification worker (email at least) implemented (`npm run outbox:work`)
- [ ] Legal review items in PRIVACY-AND-COMPLIANCE.md §5 completed
- [x] Restore drill executed and recorded (locally, PILOT-READINESS.md §3 — repeat on the real server)
- [ ] Monitoring: uptime check on `/api/health`, error tracking, DB disk/CPU alerts
- [ ] Invoice legal format validated by an accountant

## 6. Monitoring (planned)

Health endpoint + external uptime monitor; structured server logs (no PII, no tokens); alerts on 5xx rate, DB connections, storage growth; monthly review of audit exports.
