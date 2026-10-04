#!/usr/bin/env bash
# Выкатка планера на VPS. deploy.sh <sha>, архив коммита уже в /opt/planer/incoming/planer-<sha>.tgz.
# Сборка в releases/<sha> от пользователя planer, живой процесс смотрит в current,
# откат — перевесить current на прошлый релиз. Образец — /opt/crm/deploy.sh.
set -euo pipefail

SHA="$1"
ROOT=/opt/planer
# Каталог релиза уникален: повторная выкатка того же sha не должна стирать живой
# релиз, а откат — указывать на самого себя.
REL="$ROOT/releases/$SHA-$(date -u +%Y%m%d%H%M%S)"
# Архив в каталоге root:700, а не в /tmp: planer (скрипты npm) мог бы подложить свой.
ARCHIVE="$ROOT/incoming/planer-$SHA.tgz"
PORT=3002
AS=(runuser -u planer -- env HOME="$ROOT/home")

[ -f "$ARCHIVE" ] || { echo "нет $ARCHIVE" >&2; exit 1; }

rm -rf "$REL"
install -d -o planer -g planer "$REL"
tar -xzf "$ARCHIVE" -C "$REL"
chown -R planer:planer "$REL"
# NEXT_PUBLIC_* вшиваются при сборке — файл обязан быть на месте до build.
ln -sf "$ROOT/shared/.env.production" "$REL/.env.production"

cd "$REL"
"${AS[@]}" npm ci --no-audit --no-fund
"${AS[@]}" npm run build

PREV="$(readlink "$ROOT/current" 2>/dev/null || true)"

start_release() {
  ln -sfn "$1" "$ROOT/current.new"
  mv -T "$ROOT/current.new" "$ROOT/current"
  systemctl restart planer
}

healthy() {
  for _ in $(seq 1 30); do
    code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/login" || true)"
    [ "$code" = "200" ] && return 0
    sleep 1
  done
  return 1
}

start_release "$REL"
if healthy; then
  echo "OK: $SHA на :$PORT"
else
  echo "СМОУК НЕ ПРОШЁЛ: $SHA" >&2
  if [ -n "$PREV" ]; then
    start_release "$PREV"
    healthy && echo "откат на $(basename "$PREV")" >&2
  fi
  exit 1
fi

ls -1dt "$ROOT"/releases/*/ | tail -n +4 | while read -r old; do
  [ "$(realpath "$old")" = "$(realpath "$ROOT/current")" ] || rm -rf "$old"
done
rm -f "$ARCHIVE"
