#!/usr/bin/env bash
# Logical backup of the NEXVO database (custom format). Usage: scripts/ops/db-backup.sh <database-url> <output.dump>
# - PostGIS's spatial_ref_sys is recreated by the extension: its data is excluded (restoring it as the app role fails).
# - Uploaded files (UPLOAD_DIR or object storage) are NOT in this dump: back them up separately.
# - Copy the dump off-site, encrypted (e.g. `age`/`gpg`), and keep 30 days (DEPLOYMENT.md §4).
set -euo pipefail
url="${1:?database url}"; out="${2:?output file}"
pg_dump --format=custom --exclude-table-data=public.spatial_ref_sys --file="$out" "$url"
echo "backup written: $out ($(du -h "$out" | cut -f1))"
