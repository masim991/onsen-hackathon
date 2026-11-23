# Windows 작업 스케줄러용 실행기: 키는 사용자 환경변수(SUPABASE_SERVICE_ROLE_KEY)에서만 읽는다. 파일에 키를 쓰지 않는다.
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$outDir = Join-Path $root 'tools\monitor\out'
New-Item -ItemType Directory -Force $outDir | Out-Null
$log = Join-Path $outDir 'local-run.log'
if (-not $env:SUPABASE_SERVICE_ROLE_KEY) { $env:SUPABASE_SERVICE_ROLE_KEY = [Environment]::GetEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY', 'User') }
$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
if (-not $env:SUPABASE_SERVICE_ROLE_KEY) { Add-Content $log "$stamp SKIP: SUPABASE_SERVICE_ROLE_KEY not set"; exit 0 }
if (Test-Path $log) { if ((Get-Item $log).Length -gt 1MB) { Move-Item -Force $log "$log.old" } }
$env:SUPABASE_URL = 'https://frncsllpkxrsgxyqsfwd.supabase.co'
if (-not $env:AUTO_APPLY) { $env:AUTO_APPLY = 'strict' }
Add-Content $log "$stamp START"
Set-Location $root
& node tools/monitor/worker.mjs --run --sink rest --limit 120 2>&1 | Select-Object -Last 15 | Add-Content $log
Add-Content $log "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') END exit=$LASTEXITCODE"
