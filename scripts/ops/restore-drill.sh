#!/usr/bin/env bash
# Restore drill (DEPLOYMENT.md §4). Usage: [AGE_IDENTITY=key.txt] scripts/ops/restore-drill.sh <backup.dump[.age]> <empty-target-database-url>
# Encrypted backups (.age) need AGE_IDENTITY: the private key file, brought for the drill and removed afterwards.
# The target database must exist, be empty and have the postgis and citext extensions available.
# Fails on the first error (--exit-on-error). Extension comments are skipped (only their owner may set them).
set -euo pipefail
dump="${1:?dump file}"; url="${2:?target database url}"
start=$(date +%s)
if [[ "$dump" == *.age ]]; then
  : "${AGE_IDENTITY:?set AGE_IDENTITY to the age private key file to decrypt $dump}"
  age -d -i "$AGE_IDENTITY" "$dump" | pg_restore --no-owner --no-comments --exit-on-error --dbname="$url"
else
  pg_restore --no-owner --no-comments --exit-on-error --dbname="$url" "$dump"
fi
DATABASE_URL="$url" npx prisma migrate status
psql "$url" -Atc 'SELECT count(*) FROM pg_trigger WHERE tgname = '"'"'AuditEvent_append_only'"'"'' | grep -q '^1$' || { echo "append-only audit trigger missing"; exit 1; }
echo "restore OK in $(( $(date +%s) - start )) s — now start the app on this database and check /api/health, a login and one invoice."
