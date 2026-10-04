#!/usr/bin/env bash
# Приёмник деплоя из GitHub Actions — принудительная команда ключа CI планера в
# /root/.ssh/authorized_keys: этим ключом нельзя ничего, кроме этого скрипта.
#   git archive --format=tar.gz <sha> | ssh root@vps <sha>
set -euo pipefail

SHA="${SSH_ORIGINAL_COMMAND:-}"
[[ "$SHA" =~ ^[0-9a-f]{7,40}$ ]] || { echo "ожидался sha коммита, пришло: '$SHA'" >&2; exit 2; }

# Замок и архив не в /tmp: туда пишет planer (скрипты npm), а при protected_regular=2
# root не откроет чужой заранее созданный файл.
exec 9>/run/planer-deploy.lock
flock 9

install -d -m 700 /opt/planer/incoming
cat > "/opt/planer/incoming/planer-$SHA.tgz"
exec /opt/planer/deploy.sh "$SHA"
