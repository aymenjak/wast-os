# تشغيل NEXVO على جهاز شخصي · Running NEXVO on a personal computer

Tested path: Windows / macOS / Linux with Docker Desktop for the database. Synthetic demo data only.

## 1. البرامج المطلوبة (مرة واحدة) · Requirements

- Node.js 22 LTS (nodejs.org)
- Git (git-scm.com)
- Docker Desktop (docker.com), running

## 2. تنزيل المشروع · Get the code

```bash
git clone https://github.com/aymenjak/wast-os.git
cd wast-os
git checkout claude/nexvo-waste-saas-platform-wwbf1j
```

The repository is private: Git may ask you to sign in to GitHub.

## 3. قاعدة البيانات · Database (PostgreSQL 16 + PostGIS)

```bash
docker run -d --name nexvo-db -e POSTGRES_USER=nexvo -e POSTGRES_PASSWORD=nexvo_dev_only -e POSTGRES_DB=nexvo_dev -p 5432:5432 postgis/postgis:16-3.4
```

After a reboot: `docker start nexvo-db`.

## 4. ملف الإعدادات · Settings

```bash
copy .env.example .env        # Windows (macOS/Linux: cp .env.example .env)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Paste the printed value into `APP_ENCRYPTION_KEY=""` in `.env`. The other defaults match the Docker database above. Never commit `.env`.

## 5. التثبيت والجداول والبيانات التجريبية · Install, migrate, seed

```bash
npm ci
npx prisma migrate deploy
npm run db:seed
```

## 6. التشغيل · Run

```bash
npm run dev                    # http://localhost:3000/ar
```

Faster production build: `npm run build` then `npm start`.

## حسابات التجربة · Demo accounts

Password for all: `nexvo-demo-2026` (synthetic).

| Role | Email |
|---|---|
| Owner | `owner@demo-collecte.test` |
| Dispatcher | `dispatch@demo-collecte.test` |
| Driver (offline mode) | `driver@demo-collecte.test` |
| Finance | `finance@demo-collecte.test` |
| Municipality | `civic@demo-apc.test` |
| Customer portal | `portal@demo-client.test` |

Offline mode test: sign in as the driver → My work → Offline mode → in Chrome press F12 → Network → Offline → do a job → back online and watch it send.

## ملاحظات · Notes

- From a phone on the home network (`http://192.168.x.x:3000`) use `npm run dev`: the production build sends Secure cookies, which need HTTPS. Browsers allow service workers (offline opening) only on HTTPS or `localhost`, so offline opening on a phone needs HTTPS.
- Tests (`npm run test:integration`, `test:e2e`) also need `TEST_DATABASE_URL`: create it with `docker exec nexvo-db createdb -U nexvo nexvo_test`.
