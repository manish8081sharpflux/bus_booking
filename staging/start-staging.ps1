$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $PSScriptRoot '.env.staging'
$Example = Join-Path $PSScriptRoot '.env.staging.example'
if (-not (Test-Path $EnvFile)) {
  Copy-Item $Example $EnvFile
  Write-Host "Created staging/.env.staging. Change the placeholder secrets, then run this script again." -ForegroundColor Yellow
  exit 2
}

Write-Host "[1/6] Starting PostgreSQL, Redis and backend services..." -ForegroundColor Cyan
docker compose --env-file $EnvFile -f (Join-Path $PSScriptRoot 'docker-compose.staging.yml') up -d --build

Write-Host "[2/6] Waiting for API Gateway..." -ForegroundColor Cyan
$ready=$false
for ($i=0; $i -lt 60; $i++) {
  try { $r=Invoke-WebRequest 'http://localhost:4000/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -lt 500) {$ready=$true;break} } catch {}
  Start-Sleep -Seconds 2
}
if (-not $ready) { throw 'API Gateway did not become ready. Run docker compose logs.' }

Write-Host "[3/6] Running database migrations..." -ForegroundColor Cyan
Push-Location $Root
$env:DATABASE_URL='postgres://busgo:change_me_staging_postgres@localhost:5433/busgo_staging'
# If you changed DB credentials, set DATABASE_URL in this shell before running.
npm run db:migrate
Write-Host "[4/6] Seeding staging data..." -ForegroundColor Cyan
npm run db:seed

Write-Host "[5/6] Running automated system validation..." -ForegroundColor Cyan
npm run validate:system

Write-Host "[6/6] Backend staging is ready." -ForegroundColor Green
Write-Host "API: http://localhost:4000"
Write-Host "Next terminals:"
Write-Host "  frontend: Copy staging/frontend.env.staging to frontend/.env.staging then npm --workspace ionic-busgo run dev -- --host 0.0.0.0 --port 5173 --mode staging"
Write-Host "  admin:    Copy staging/admin.env.staging to admin-panel/.env.staging then npm --workspace metronic-vite run dev -- --host 0.0.0.0 --port 5174 --mode staging"
Pop-Location
