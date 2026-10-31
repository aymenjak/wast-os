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
| **Never set in production:** `NEXVO_FAST_HASH`, `NEXVO_E2E`, `RATE_LIMIT_SCALE` | | test-only switches |

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
- **Restore drill before launch** (not yet executed): restore latest dump into a fresh instance → `prisma migrate status` → run integration smoke (`/api/health`, login, open an invoice) → record time to restore.
- Before any destructive migration: backup, rehearse on a restored copy, approval.

## 5. Release gates (Definition of Done for production)

- [ ] All suites green in CI (`.github/workflows/ci.yml`)
- [ ] Security gaps 1–3 in SECURITY.md closed (shared rate limiter, password reset, CSP)
- [ ] Object storage provider implemented and tested
- [ ] Notification worker (email at least) implemented
- [ ] Legal review items in PRIVACY-AND-COMPLIANCE.md §5 completed
- [ ] Restore drill executed and recorded
- [ ] Monitoring: uptime check on `/api/health`, error tracking, DB disk/CPU alerts
- [ ] Invoice legal format validated by an accountant

## 6. Monitoring (planned)

Health endpoint + external uptime monitor; structured server logs (no PII, no tokens); alerts on 5xx rate, DB connections, storage growth; monthly review of audit exports.
