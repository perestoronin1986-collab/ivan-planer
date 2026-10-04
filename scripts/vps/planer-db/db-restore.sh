#!/usr/bin/env bash
# Разворачивает дамп планера в свою базу на VPS С НУЛЯ и проверяет результат.
#
#   /opt/planer-db/db-restore.sh <dump.sql.gz> [--compare-cloud]
#
# Стирает /opt/planer-db/data целиком — только для репетиции и переключения.
# --compare-cloud сверяет права и политики с облаком (строка в /opt/planer/shared/cloud.env).
#
# Грабли (из переезда CRM 01.10.2026):
#  - образ supabase/postgres выдаёт новым функциям EXECUTE для anon/authenticated по
#    умолчанию, дамп этого не отзывает → на время восстановления права по умолчанию снимаем;
#  - схемы auth/storage/realtime образ создаёт сам — сносим, дамп создаст свои.
set -euo pipefail

DUMP="$1"; COMPARE="${2:-}"
cd /opt/planer-db
# shellcheck disable=SC1091
. ./.env
C=planer-db-db-1
SQL=(docker exec -i "$C" psql -U supabase_admin -d postgres -q -v ON_ERROR_STOP=1)
EXPECTED='already exists|role "supabase_realtime_admin"|ensure_rls|Superuser owned event trigger'

[ -f "$DUMP" ] || { echo "нет дампа $DUMP" >&2; exit 1; }

echo "== база с нуля"
docker compose down
rm -rf ./data
docker compose up -d db
for _ in $(seq 1 60); do [ "$(docker inspect -f '{{.State.Health.Status}}' "$C")" = healthy ] && break; sleep 3; done
sleep 8  # init-скрипты образа догоняют после healthy

echo "== подготовка"
"${SQL[@]}" <<'EOF'
drop schema if exists auth cascade;
drop schema if exists storage cascade;
drop schema if exists realtime cascade;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;
alter default privileges for role supabase_admin in schema public revoke execute on functions from anon, authenticated;
EOF

echo "== восстановление $DUMP"
zcat "$DUMP" | docker exec -i "$C" psql -U supabase_admin -d postgres -q -v ON_ERROR_STOP=0 > /dev/null 2> /tmp/planer-restore.err || true
bad=$( { grep ERROR /tmp/planer-restore.err || true; } | { grep -vcE "$EXPECTED" || true; } )
echo "ошибок всего: $(grep -c ERROR /tmp/planer-restore.err || true), неожиданных: $bad"
[ "$bad" -eq 0 ] || { grep ERROR /tmp/planer-restore.err | grep -vE "$EXPECTED" | head; exit 1; }

"${SQL[@]}" -c "alter default privileges for role postgres in schema public grant execute on functions to anon, authenticated;" \
            -c "alter default privileges for role supabase_admin in schema public grant execute on functions to anon, authenticated;"

echo "== сверка строк с дампом"
checked=0; mism=0
while read -r t n; do
  r=$(docker exec "$C" psql -U supabase_admin -d postgres -tAc "select count(*) from $t" < /dev/null)
  checked=$((checked+1)); [ "$r" = "$n" ] || { mism=$((mism+1)); echo "РАСХОЖДЕНИЕ $t: дамп=$n база=$r"; }
done < <(zcat "$DUMP" | awk '/^COPY /{t=$2; n=0; inb=1; next} inb && /^\\\.$/{print t, n; inb=0; next} inb{n++}' | grep -E '^(public\.|auth\.users )')
echo "сверено таблиц: $checked, расхождений: $mism"
# 8 таблиц public (sphere, project, task, inbox_item, push_subscription, notification, habit, habit_log) + auth.users
[ "$checked" -ge 9 ] && [ "$mism" -eq 0 ] || exit 1

echo "== вход и REST"
docker compose up -d auth rest
for _ in $(seq 1 30); do curl -sf http://127.0.0.1:9998/health > /dev/null && break; sleep 2; done
sleep 3
echo "auth: $(curl -s http://127.0.0.1:9998/health)"
echo "rest(service, task): $(curl -s -H "Authorization: Bearer $SERVICE_ROLE_KEY" -H 'Prefer: count=exact' -I 'http://127.0.0.1:3012/task?select=id&limit=1' | grep -i content-range | tr -d '\r')"

if [ "$COMPARE" = "--compare-cloud" ]; then
  echo "== права и политики против облака"
  # shellcheck disable=SC1091
  . /opt/planer/shared/cloud.env
  psql "$CLOUD_DB_URL" -tA -F'|' -f /opt/planer-db/acl-check.sql | grep -v '^SET$' | sort > /tmp/planer-acl.cloud
  docker exec -i "$C" psql -U supabase_admin -d postgres -tA -F'|' < /opt/planer-db/acl-check.sql | grep -v '^SET$' | sort > /tmp/planer-acl.local
  if diff /tmp/planer-acl.cloud /tmp/planer-acl.local; then echo "права и политики совпадают"; else echo "РАСХОЖДЕНИЕ ПРАВ — см. выше"; exit 1; fi
fi
echo "ИТОГ: база развёрнута и проверена"
