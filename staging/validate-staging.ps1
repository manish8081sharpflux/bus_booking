$ErrorActionPreference='Stop'
$Root=Split-Path -Parent $PSScriptRoot
Push-Location $Root
$env:BUSGO_API_URL='http://localhost:4000'
$env:BUSGO_WEB_URL='http://localhost:5173'
$env:BUSGO_ADMIN_URL='http://localhost:5174'
npm run validate:system
npm run validate:live
npm run test:e2e:browser
Pop-Location
