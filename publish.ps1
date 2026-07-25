$ErrorActionPreference = "Stop"

$VAULT_PATH = "C:\Users\aptht\Desktop\Новая папка\Obsidian NAS\G"
$SITE_PATH = "$env:USERPROFILE\quartz-site"

Write-Host "Syncing notes from Obsidian..."

# Очищаем content
Remove-Item -Path "$SITE_PATH\content\*" -Recurse -Force -ErrorAction SilentlyContinue

# Копируем все файлы и папки из vault (кроме .obsidian и .trash)
Get-ChildItem -LiteralPath $VAULT_PATH -Exclude ".obsidian",".trash" | ForEach-Object {
    $dest = Join-Path "$SITE_PATH\content" $_.Name
    if ($_.PSIsContainer) {
        Copy-Item -LiteralPath $_.FullName -Destination $dest -Recurse -Force
    } else {
        Copy-Item -LiteralPath $_.FullName -Destination $dest -Force
    }
}

# Удаляем все PDF-файлы (ссылки ведут на Google Drive)
Get-ChildItem -Path "$SITE_PATH\content" -Recurse -Filter "*.pdf" | Remove-Item -Force -ErrorAction SilentlyContinue
Write-Host "Excluded all PDF files from sync."

# === ПРОВЕРКИ ПОСЛЕ СИНХРОНИЗАЦИИ ===

# 1. Удаляем любые вложенные .git-папки (ломают git clone на Cloudflare)
$gitFolders = Get-ChildItem -Path "$SITE_PATH\content" -Directory -Recurse -Filter ".git" -Force
if ($gitFolders) {
    $gitFolders | Remove-Item -Recurse -Force
    Write-Host "Removed $($gitFolders.Count) nested .git folder(s) from content."
}

# 2. Гарантируем наличие index.md в корне content (Quartz требует его для главной страницы)
$rootIndex = Join-Path "$SITE_PATH\content" "index.md"
if (-not (Test-Path $rootIndex)) {
    $found = Get-ChildItem -Path "$SITE_PATH\content" -Recurse -Filter "index.md" | Select-Object -First 1
    if ($found) {
        Copy-Item -LiteralPath $found.FullName -Destination $rootIndex -Force
        Write-Host "Restored index.md to content root from: $($found.FullName)"
    } else {
        # Создаём заглушку — Quartz не соберётся без index.md
        @"
---
title: Российское законодательство по информационной безопасности
---
> **Страница в разработке**
> Скоро здесь будет главная страница базы знаний.
"@ | Out-File -FilePath $rootIndex -Encoding utf8
        Write-Host "WARNING: index.md not found — created stub at content root."
    }
}

# 3. Предупреждаем о файлах с длинными путями (>250 символов — риск пропуска при копировании)
$longPaths = Get-ChildItem -Path "$SITE_PATH\content" -Recurse -File | Where-Object { $_.FullName.Length -gt 250 }
if ($longPaths) {
    Write-Host "WARNING: $($longPaths.Count) file(s) have paths longer than 250 chars (may be truncated on some systems):"
    $longPaths | Select-Object -First 5 | ForEach-Object { Write-Host "  $($_.FullName) ($($_.FullName.Length) chars)" }
    if ($longPaths.Count -gt 5) { Write-Host "  ...and $($longPaths.Count - 5) more." }
}

Set-Location "$SITE_PATH"

Write-Host "Building Quartz site..."
npx quartz build

git add .

$changes = git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "No changes, nothing to publish."
    exit 0
}

$date = Get-Date -Format "yyyy-MM-dd HH:mm"
git commit -m "Update knowledge base $date"
git push origin main

Write-Host "Deploying to Cloudflare Workers..."
npx wrangler deploy 2>&1

Write-Host "Done! Site: https://obsidian-knowledge-base.apthtc78.workers.dev"