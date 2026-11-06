#!/usr/bin/env bash
# Encrypted logical backup of the NEXVO database (pg_dump custom format, encrypted with `age`).
# Usage: BACKUP_AGE_RECIPIENT=age1… scripts/ops/db-backup.sh <database-url> <output.dump.age>
#   BACKUP_AGE_RECIPIENT  public key(s) from `age-keygen` (comma-separated). The private key stays OFF the server
#                         (owner's safe / password manager): a stolen server or backup copy cannot be read.
#   --plaintext           write an unencrypted dump instead (local drills only; never for copies leaving the server).
# The dump is streamed into age: no unencrypted copy is ever written to disk.
# - PostGIS's spatial_ref_sys is recreated by the extension: its data is excluded (restoring it as the app role fails).
# - Uploaded files (UPLOAD_DIR or object storage) are NOT in this dump: back them up separately, also with age.
# - Copy off-site and keep 30 days (DEPLOYMENT.md §4).
set -euo pipefail
plaintext=0
if [[ "${1:-}" == "--plaintext" ]]; then plaintext=1; shift; fi
url="${1:?database url}"; out="${2:?output file}"
umask 077
if (( plaintext )); then
  pg_dump --format=custom --exclude-table-data=public.spatial_ref_sys --file="$out" "$url"
  echo "UNENCRYPTED backup written: $out ($(du -h "$out" | cut -f1)) — do not copy it off this machine." >&2
  exit 0
fi
: "${BACKUP_AGE_RECIPIENT:?set BACKUP_AGE_RECIPIENT (age public key) or pass --plaintext for a local drill}"
command -v age >/dev/null || { echo "age is not installed (apt-get install age)"; exit 1; }
args=(); IFS=',' read -ra keys <<< "$BACKUP_AGE_RECIPIENT"; for k in "${keys[@]}"; do args+=(-r "$k"); done
pg_dump --format=custom --exclude-table-data=public.spatial_ref_sys "$url" | age "${args[@]}" -o "$out"
echo "encrypted backup written: $out ($(du -h "$out" | cut -f1))"
