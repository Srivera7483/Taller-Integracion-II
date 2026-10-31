# Script de Parada y Limpieza de Microservicios
# ------------------------------------------------------------------------------
$ErrorActionPreference = "SilentlyContinue"

Write-Host "       DETENIENDO ECOSISTEMA DE MICROSERVICIOS           " -ForegroundColor Yellow
Write-Host "---------------------------------------------------------" -ForegroundColor Yellow


Write-Host "`n[1/2] Deteniendo contenedores Docker..." -ForegroundColor Yellow
docker compose down


Write-Host "`n[2/2] Liberando puertos de desarrollo (3000, 3001, 3002, 3003, 5173)..." -ForegroundColor Yellow
$puertos = @(3000, 3001, 3002, 3003, 5173)

foreach ($pto in $puertos) {
    $conexiones = Get-NetTCPConnection -LocalPort $pto -ErrorAction SilentlyContinue
    if ($conexiones) {
        $pids = $conexiones.OwningProcess | Select-Object -Unique
        foreach ($p in $pids) {
            if ($p -and $p -ne 0) {
                Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
                Write-Host "  -> Proceso $p liberado en puerto $pto." -ForegroundColor DarkGray
            }
        }
    }
}


Write-Host "  TODOS LOS SERVICIOS Y CONTENEDORES HAN SIDO DETENIDOS   " -ForegroundColor Green
Write-Host "----------------------------------------------------------" -ForegroundColor Green
