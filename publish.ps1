$ErrorActionPreference = "Stop"

$VAULT_PATH = "C:\Users\aptht\Desktop\Новая папка\Obsidian NAS\G"
$SITE_PATH = "$env:USERPROFILE\quartz-site"

Write-Host "Syncing notes from Obsidian..."

robocopy "$VAULT_PATH" "$SITE_PATH\content" /E /XD .obsidian .trash /NFL /NDL /NJH /NJS /NC /NS

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
