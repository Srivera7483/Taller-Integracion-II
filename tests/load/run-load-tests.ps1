param(
    [string]$GatewayUrl = "http://localhost:3000",
    [string]$RabbitApiUrl = "http://127.0.0.1:15672/api",
    [string]$RabbitUser = "inframanager",
    [string]$RabbitPass = "inframanager-local",
    [string]$SeedEmail = "reportante@uct.cl",
    [string]$SeedPassword = "password123"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ReportsDir = Join-Path $ScriptDir "reports"
New-Item -ItemType Directory -Force -Path $ReportsDir | Out-Null

function Get-RabbitQueueStatus {
    param([string]$QueueName)
    try {
        $pair = "${RabbitUser}:${RabbitPass}"
        $bytes = [System.Text.Encoding]::ASCII.GetBytes($pair)
        $base64 = [System.Convert]::ToBase64String($bytes)
        $headers = @{ Authorization = "Basic $base64" }
        $uri = "$RabbitApiUrl/queues/%2F/$QueueName"
        $q = Invoke-RestMethod -Uri $uri -Headers $headers -TimeoutSec 5
        return [PSCustomObject]@{
            Queue              = $QueueName
            Messages           = $q.messages
            MessagesReady      = $q.messages_ready
            MessagesUnacked    = $q.messages_unacknowledged
            Consumers          = $q.consumers
            State              = $q.state
        }
    } catch {
        return [PSCustomObject]@{
            Queue   = $QueueName
            Error   = $_.Exception.Message
        }
    }
}

Write-Host "=== 1. Verificando salud del API Gateway ($GatewayUrl/health) ===" -ForegroundColor Cyan
$health = Invoke-RestMethod -Uri "$GatewayUrl/health" -TimeoutSec 5
$health | ConvertTo-Json -Compress | Write-Host

Write-Host "`n=== 2. Capturando metricas Docker y RabbitMQ (ANTES) ===" -ForegroundColor Cyan
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | Out-File -FilePath (Join-Path $ReportsDir "docker-stats-before.txt") -Encoding utf8
Get-Content (Join-Path $ReportsDir "docker-stats-before.txt")

$rabbitBefore = @(
    (Get-RabbitQueueStatus -QueueName "incidencias_criticas"),
    (Get-RabbitQueueStatus -QueueName "incidencias_criticas.dlq")
)
$rabbitBefore | Format-Table -AutoSize
$rabbitBefore | ConvertTo-Json | Out-File -FilePath (Join-Path $ReportsDir "rabbitmq-before.json") -Encoding utf8

Write-Host "`n=== 3. Obteniendo JWT unico para escenario de concurrencia ===" -ForegroundColor Cyan
$loginBody = @{ correo = $SeedEmail; password = $SeedPassword } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Uri "$GatewayUrl/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$env:LOAD_TEST_JWT = if ($loginResp.token) { $loginResp.token } else { $loginResp.access_token }
if (-not $env:LOAD_TEST_JWT) { throw "No se pudo obtener JWT del usuario seed." }
Write-Host "JWT obtenido correctamente (longitud: $($env:LOAD_TEST_JWT.Length) chars)"

Write-Host "`n=== 4. Ejecutando escenario de concurrencia 50 req/s ===" -ForegroundColor Cyan
$concurrenciaReport = Join-Path $ReportsDir "concurrencia-50rps.json"
$concurrenciaYml = Join-Path $ScriptDir "artillery-concurrencia-50rps.yml"
npx --yes artillery run --output $concurrenciaReport $concurrenciaYml

Write-Host "`n=== 5. Ejecutando escenario de Rate Limit anti-fuerza bruta ===" -ForegroundColor Cyan
$rateLimitReport = Join-Path $ReportsDir "rate-limit.json"
$rateLimitYml = Join-Path $ScriptDir "artillery-rate-limit.yml"
npx --yes artillery run --output $rateLimitReport $rateLimitYml

Write-Host "`n=== 5. Capturando metricas Docker y RabbitMQ (DESPUES) ===" -ForegroundColor Cyan
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | Out-File -FilePath (Join-Path $ReportsDir "docker-stats-after.txt") -Encoding utf8
Get-Content (Join-Path $ReportsDir "docker-stats-after.txt")

$rabbitAfter = @(
    (Get-RabbitQueueStatus -QueueName "incidencias_criticas"),
    (Get-RabbitQueueStatus -QueueName "incidencias_criticas.dlq")
)
$rabbitAfter | Format-Table -AutoSize
$rabbitAfter | ConvertTo-Json | Out-File -FilePath (Join-Path $ReportsDir "rabbitmq-after.json") -Encoding utf8

Write-Host "`n=== Pruebas de estres TAL-10 finalizadas. Reportes en $ReportsDir ===" -ForegroundColor Green