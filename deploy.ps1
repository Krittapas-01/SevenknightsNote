# 7K Note - one-click deploy to Cloudflare (free)
# Run in PowerShell:  cd C:\Dev\7k-note ; powershell -ExecutionPolicy Bypass -File .\deploy.ps1
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$project = "7k-note"

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Yellow }

# Run a command, show its output live (so prompts/progress are visible) and
# return it as text. Windows PowerShell treats anything a tool prints to stderr
# (even a harmless wrangler WARNING) as a fatal error when "Stop" is on, so
# relax it while running.
function Capture([scriptblock]$cmd, [switch]$Quiet) {
  $old = $ErrorActionPreference; $ErrorActionPreference = "Continue"
  try { ((& $cmd 2>&1) | ForEach-Object { $l = "$_"; if (-not $Quiet) { Write-Host $l }; $l }) -join "`n" } finally { $ErrorActionPreference = $old }
}

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
Remove-Item Env:CI

# Local data (ThousandSunny + Pandoara exported from dev): import only once
if ((Test-Path "$root\api\seed-local-data.sql") -and -not (Test-Path "$root\api\.local-data-imported")) {
  Step "Importing local data (ThousandSunny + Pandoara, first time only)"
  npx wrangler d1 execute $project --remote --file=seed-local-data.sql -y
  if ($LASTEXITCODE -ne 0) { throw "Import failed (see above)" }
  Set-Content "$root\api\.local-data-imported" "done"
  Set-Content "$root\api\.pandoara-seeded" "done"   # Pandoara came with the local data
}

# Pandoara comps: seed only once (re-running would bring back teams you already deleted)
if (-not (Test-Path "$root\api\.pandoara-seeded")) {
  Step "Adding guild Pandoara with all comps (first time only)"
  node "$root\scripts\seed-pandoara.mjs"
  npx wrangler d1 execute $project --remote --file=seed-pandoara.sql -y
  if ($LASTEXITCODE -eq 0) { Set-Content "$root\api\.pandoara-seeded" "done" }
}
$pandoaraKey = if (Test-Path "$root\api\.pandoara-key") { (Get-Content "$root\api\.pandoara-key" -Raw).Trim() } else { "" }

Step "Deploying API"
$dep = Capture { npx wrangler deploy }
if ($dep -notmatch '(https://[\w\.-]+\.workers\.dev)') {
  if ($dep -match 'workers\.dev subdomain') { Write-Host "`nFirst time only: run  cd api ; npx wrangler deploy  and pick a workers.dev name, then run deploy.ps1 again." -ForegroundColor Magenta }
  throw "API deploy failed (see above)"
}
$apiUrl = $Matches[1]
Write-Host "API: $apiUrl" -ForegroundColor Green

# ---------- WEB ----------
Set-Location "$root\web"
Step "Building web"
[IO.File]::WriteAllText("$root\web\.env.production", "VITE_API_URL=$apiUrl`n")
npm install --no-audit --no-fund | Out-Null
npm run build

Step "Deploying web to Cloudflare Pages"
# Deploy straight away (no hidden "project list" check - it could hang silently).
# Only the very first time, when the project does not exist yet, create it and deploy again.
$pages = Capture { npx wrangler pages deploy dist --project-name $project --branch main --commit-dirty=true }
if ($pages -match "(?i)project not found|could not find project|8000007") {
  Step "Creating the Pages project (first time only)"
  Capture { npx wrangler pages project create $project --production-branch main } | Out-Null
  $pages = Capture { npx wrangler pages deploy dist --project-name $project --branch main --commit-dirty=true }
}

Set-Location $root
Write-Host "`nDONE!" -ForegroundColor Green
Write-Host "Website : https://$project.pages.dev  (may take ~1 min the first time)" -ForegroundColor Green
Write-Host "API     : $apiUrl" -ForegroundColor Green
if ($pandoaraKey) {
  Write-Host "Pandoara (edit): https://$project.pages.dev/g/pandoara?key=$pandoaraKey" -ForegroundColor Cyan
  Write-Host "Pandoara (view): https://$project.pages.dev/g/pandoara" -ForegroundColor Cyan
}
Write-Host "ThousandSunny  : https://$project.pages.dev/g/iWMpFr9g  (add ?key=<your key> to edit)" -ForegroundColor Cyan
