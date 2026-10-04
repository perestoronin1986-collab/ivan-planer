param()
# Забирает с VPS ночной дамп базы планера (/opt/planer/backup-db.sh, 01:45 МСК).
# Задача Планировщика «IvanPlaner Backup». Копия на ПК — вторая, независимая от сервера.
# Внутри личные данные — папка Бэкап\ в .gitignore.
$ErrorActionPreference = 'Stop'
$scp  = "C:\Windows\System32\OpenSSH\scp.exe"
$key  = "$env:USERPROFILE\.ssh\id_ed25519"
$root = "c:\Claude\Code\Projects\IvanPlaner\" + [char]0x0411 + [char]0x044D + [char]0x043A + [char]0x0430 + [char]0x043F
New-Item -ItemType Directory -Force $root | Out-Null
$db = Join-Path $root ("planer_vps_" + (Get-Date -Format "yyyy-MM-dd") + ".sql.gz")
& $scp -q -i $key -o BatchMode=yes root@147.45.253.77:/var/backups/planer/latest.sql.gz $db
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $db) -or (Get-Item $db).Length -lt 50000) {
    Write-Output "$(Get-Date) planer pull FAILED (scp exit $LASTEXITCODE)"
    exit 1
}
Write-Output "$(Get-Date) planer pull OK: $db $((Get-Item $db).Length)"
Get-ChildItem $root -Filter "planer_vps_*.sql.gz" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | ForEach-Object { [System.IO.File]::Delete($_.FullName) }
