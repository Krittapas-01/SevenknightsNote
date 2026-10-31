# 7K Note - one-click deploy to Cloudflare (free)
# Run in PowerShell:  cd C:\Dev\7k-note ; powershell -ExecutionPolicy Bypass -File .\deploy.ps1
$ErrorActionPreference = "Stop"
# Read tool output as UTF-8 (otherwise box-drawing lines from wrangler show up as mojibake)
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$OutputEncoding = [Text.Encoding]::UTF8
$root = $PSScriptRoot
$project = "7k-note"

$script:step = "start"
function Step($msg) { $script:step = $msg; Write-Host "`n==> $msg" -ForegroundColor Yellow }

# Run a command, show its output live (so prompts/progress are visible) and
# return it as text. Windows PowerShell treats anything a tool prints to stderr
# (even a harmless wrangler WARNING) as a fatal error when "Stop" is on, so
# relax it while running.
function Capture([scriptblock]$cmd, [switch]$Quiet) {
  $old = $ErrorActionPreference; $ErrorActionPreference = "Continue"
  try { (& $cmd 2>&1 | ForEach-Object { $l = "$_"; if (-not $Quiet) { Write-Host $l }; $l }) -join "`n" } finally { $ErrorActionPreference = $old }
}

# ---------- deploy.log (not committed: *.log) ----------
# One line per run: time, git commit (+ changed files), patch version, and what went live or where it failed.
# Lets Claude check what is live without asking (read C:\Dev\7k-note\deploy.log).
$logFile = "$root\deploy.log"
function GitOut($gitArgs) {
  $old = $ErrorActionPreference; $ErrorActionPreference = "Continue"
  try { $o = (& git -C $root @gitArgs 2>$null) -join "`n"; if ($LASTEXITCODE -eq 0) { $o.Trim() } else { "" } } catch { "" } finally { $ErrorActionPreference = $old }
}
function DeployInfo {
  $commit = GitOut @('rev-parse', '--short', 'HEAD'); if (-not $commit) { $commit = "?" }
  $dirty = @((GitOut @('status', '--porcelain', '--untracked-files=no')) -split "`n" | Where-Object { $_.Trim() }).Count
  $v = Select-String -Path "$root\web\src\lib\changelog.ts" -Pattern "version: '([^']+)'" -ErrorAction SilentlyContinue | Select-Object -First 1
  $ver = if ($v) { $v.Matches[0].Groups[1].Value } else { "?" }
  $d = if ($dirty) { " (+$dirty changed files)" } else { "" }
  "commit $commit$d | patch $ver"
}
function LogLine([string]$status, [string]$detail) {
  try {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $status  $(DeployInfo)"
    if ($detail) { $line += " | $detail" }
    Add-Content -Path $logFile -Value $line -Encoding UTF8
  } catch { Write-Host "Could not write deploy.log: $_" -ForegroundColor DarkYellow }
}
# Any error below stops the script: note where in deploy.log, then stop.
trap { LogLine "FAILED" "at '$($script:step)': $($_.Exception.Message)"; break }

# ---------- API ----------
Set-Location "$root\api"
Step "Installing API packages"
npm install --no-audit --no-fund | Out-Null

Step "Checking Cloudflare login (a browser window may open - click Allow)"
$who = Capture -Quiet { npx wrangler whoami }
if ($who -match "not authenticated|You are not") { npx wrangler login }

$toml = Get-Content "$root\api\wrangler.toml" -Raw -Encoding UTF8
if ($toml -match '(?m)^database_id = "00000000-0000-0000-0000-000000000000"') {
  Step "Creating D1 database"
  $out = Capture { npx wrangler d1 create $project }
  if ($out -match '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})') {
    $toml = $toml -replace '(?m)^database_id = "00000000-0000-0000-0000-000000000000"', "database_id = `"$($Matches[1])`""
    [IO.File]::WriteAllText("$root\api\wrangler.toml", $toml)
  } else { throw "Could not read database_id. If the database already exists, run: npx wrangler d1 list  and paste the id into api\wrangler.toml" }
}

Step "Creating tables (safe to re-run, data is kept)"
npx wrangler d1 execute $project --remote --file=schema.sql -y

Step "Applying database updates (migrations)"
$env:CI = "true"   # skip the y/n prompt
npx wrangler d1 migrations apply $project --remote
$migrateExit = $LASTEXITCODE
Remove-Item Env:CI
if ($migrateExit -ne 0) { throw "Database migration failed - stopped before deploying the API (nothing new is live)" }

# Starter data (ThousandSunny + Pandoara/Drinkeenassu) is already in production - no automatic seeding any more.
# (Before: if a marker file went missing, deploy re-seeded - wiping edited teams and resetting the guild password.)
# Manual only, if ever needed: cd api ; node ..\scripts\seed-pandoara.mjs ; npx wrangler d1 execute 7k-note --remote --file=seed-pandoara.sql
$pandoaraKey = if (Test-Path "$root\api\.pandoara-key") { (Get-Content "$root\api\.pandoara-key" -Raw).Trim() } else { "" }

# Nightly database backup bucket (private). Create it once if it is missing - the API deploy fails without it.
Step "Checking backup bucket (R2)"
$bucket = "7k-note-backup"
$r2 = Capture -Quiet { npx wrangler r2 bucket list }
if ($r2 -notmatch "(?m)name:\s+$bucket\s*$") {
  $made = Capture { npx wrangler r2 bucket create $bucket }
  if ($made -notmatch "(?i)created|already exists|10004") {
    throw "Could not create the R2 bucket '$bucket'. Open the Cloudflare dashboard -> R2 once (enable R2), then run deploy again."
  }
}

Step "Deploying API"
$dep = Capture { npx wrangler deploy }
if ($dep -notmatch '(https://[\w\.-]+\.workers\.dev)') {
  if ($dep -match 'workers\.dev subdomain') { Write-Host "`nFirst time only: run  cd api ; npx wrangler deploy  and pick a workers.dev name, then run deploy.ps1 again." -ForegroundColor Magenta }
  throw "API deploy failed (see above)"
}
$apiUrl = $Matches[1]
$apiVersion = if ($dep -match 'Version ID:\s*([0-9a-f-]+)') { $Matches[1] } else { "?" }
Write-Host "API: $apiUrl" -ForegroundColor Green

# ---------- WEB ----------
Set-Location "$root\web"
Step "Building web"
[IO.File]::WriteAllText("$root\web\.env.production", "VITE_API_URL=$apiUrl`n")
npm install --no-audit --no-fund | Out-Null
npm run build
# Without this check a failed build still uploads the OLD dist and looks like a successful deploy.
if ($LASTEXITCODE -ne 0) { throw "Web build failed - the website was NOT uploaded (old website still live; the API above is already new)" }

Step "Deploying web to Cloudflare Pages"
# Deploy straight away (no hidden "project list" check - it could hang silently).
# Only the very first time, when the project does not exist yet, create it and deploy again.
$pages = Capture { npx --yes wrangler pages deploy dist --project-name $project --branch main --commit-dirty=true }
if ($pages -match "(?i)project not found|could not find project|8000007") {
  Step "Creating the Pages project (first time only)"
  Capture { npx --yes wrangler pages project create $project --production-branch main } | Out-Null
  $pages = Capture { npx --yes wrangler pages deploy dist --project-name $project --branch main --commit-dirty=true }
}
if ($pages -notmatch "(?i)deployment complete|https://[\w-]+\.$project\.pages\.dev") { throw "Website upload failed (see above)" }
$a = Select-String -Path "$root\web\dist\index.html" -Pattern 'assets/(index-[^"]+\.js)' -ErrorAction SilentlyContinue | Select-Object -First 1
$webAsset = if ($a) { $a.Matches[0].Groups[1].Value } else { "?" }
LogLine "OK" "web $webAsset | api version $apiVersion"

Set-Location $root
Write-Host "`nDONE!" -ForegroundColor Green
Write-Host "Website : https://$project.pages.dev  (may take ~1 min the first time)" -ForegroundColor Green
Write-Host "API     : $apiUrl" -ForegroundColor Green
if ($pandoaraKey) {
  Write-Host "Drinkeenassu (edit): https://$project.pages.dev/g/RtXRcvAp?key=$pandoaraKey" -ForegroundColor Cyan
  Write-Host "Drinkeenassu (view): https://$project.pages.dev/g/RtXRcvAp" -ForegroundColor Cyan
}
Write-Host "ThousandSunny  : https://$project.pages.dev/g/iWMpFr9g  (add ?key=<your key> to edit)" -ForegroundColor Cyan
