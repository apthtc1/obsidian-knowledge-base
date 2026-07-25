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

Write-Host "Done! Cloudflare will rebuild automatically."