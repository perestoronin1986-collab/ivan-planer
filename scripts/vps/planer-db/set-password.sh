#!/usr/bin/env bash
# Задать пароль входа в планер. Запускает владелец:
#   ssh -t root@147.45.253.77 /opt/planer-db/set-password.sh you@example.com
set -euo pipefail
export EMAIL="$1"
cd /opt/planer-db
# shellcheck disable=SC1091
. ./.env
ID=$(curl -sf "http://127.0.0.1:9998/admin/users?per_page=50" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  | python3 -c 'import sys,json,os; print(next(u["id"] for u in json.load(sys.stdin)["users"] if u["email"]==os.environ["EMAIL"]))') \
  || { echo "нет учётки $EMAIL" >&2; exit 1; }
read -rsp "Новый пароль (от 10 символов): " P1; echo
read -rsp "Ещё раз: " P2; echo
[ "$P1" = "$P2" ] || { echo "не совпали" >&2; exit 1; }
# Пароль идёт через stdin, не через argv — его не видно в ps.
printf '%s' "$P1" | python3 -c 'import sys,json; print(json.dumps({"password": sys.stdin.read()}))' \
  | curl -sf -X PUT "http://127.0.0.1:9998/admin/users/$ID" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
      -H "Content-Type: application/json" --data @- -o /dev/null
echo "пароль задан для $EMAIL"
