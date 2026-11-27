$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..\..")
$GatewayDir = Join-Path $RepoRoot "api gateway"
$RunTestsScript = Join-Path $ScriptDir "run-load-tests.ps1"

$gwPid = (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess
if ($gwPid) {
    Stop-Process -Id $gwPid -Force
    Start-Sleep -Seconds 1
}

$env:RATE_LIMIT_GLOBAL_MAX = "100000"
$tmpGw = Start-Process -FilePath "node" -ArgumentList "index.js" -WorkingDirectory $GatewayDir -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 2

try {
    powershell -ExecutionPolicy Bypass -File $RunTestsScript
}
finally {
    Stop-Process -Id $tmpGw.Id -Force -ErrorAction SilentlyContinue
    Remove-Item Env:RATE_LIMIT_GLOBAL_MAX -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Start-Process -FilePath "node" -ArgumentList "index.js" -WorkingDirectory $GatewayDir -WindowStyle Hidden
    Start-Sleep -Seconds 2
    Invoke-RestMethod -Uri "http://localhost:3000/health" | ConvertTo-Json -Compress
}
