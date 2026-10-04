#!/usr/bin/env bash
# Ночной дамп базы планера (01:45 МСК). Забирает на ПК scripts/backup/pull-vps-backup.ps1.
set -euo pipefail
umask 077
DIR=/var/backups/planer
KEEP_DAYS=30
install -d -m 700 "$DIR"
OUT="$DIR/planer_$(date -u +%Y-%m-%d_%H-%M).sql.gz"
TMP="$OUT.part"

docker exec planer-db-db-1 pg_dump -U supabase_admin -d postgres | gzip -6 > "$TMP"

gzip -t "$TMP"
SIZE=$(stat -c %s "$TMP")
[ "$SIZE" -gt 50000 ] || { echo "дамп подозрительно мал: $SIZE байт" >&2; exit 1; }
{ zcat "$TMP" || true; } | grep -q '^COPY public.task ' || { echo "в дампе нет таблицы task" >&2; exit 1; }
mv "$TMP" "$OUT"
ln -sfn "$OUT" "$DIR/latest.sql.gz"
find "$DIR" -name 'planer_*.sql.gz' -mtime +"$KEEP_DAYS" -delete
find "$DIR" -name '*.part' -delete
echo "[$(date -u +%FT%TZ)] OK $OUT $SIZE"
