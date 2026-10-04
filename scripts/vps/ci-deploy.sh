#!/usr/bin/env bash
# Приёмник деплоя из GitHub Actions — принудительная команда ключа CI планера в
# /root/.ssh/authorized_keys: этим ключом нельзя ничего, кроме этого скрипта.
#   git archive --format=tar.gz <sha> | ssh root@vps <sha>
set -euo pipefail

SHA="${SSH_ORIGINAL_COMMAND:-}"
[[ "$SHA" =~ ^[0-9a-f]{7,40}$ ]] || { echo "ожидался sha коммита, пришло: '$SHA'" >&2; exit 2; }

exec 9>/tmp/planer-deploy.lock
flock 9

cat > "/tmp/planer-$SHA.tgz"
exec /opt/planer/deploy.sh "$SHA"
