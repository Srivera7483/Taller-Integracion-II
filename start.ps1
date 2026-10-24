# Script de Inicialización Automatizado de Microservicios
# ------------------------------------------------------------------------------
$ErrorActionPreference = "Stop"


Write-Host "   INICIALIZANDO PROYECTO DE MICROSERVICIOS   " -ForegroundColor Cyan
Write-Host "----------------------------------------------" -ForegroundColor Cyan


Write-Host "`n[1/7] Verificando Docker Desktop..." -ForegroundColor Yellow
try {
    docker info > $null 2>&1
    Write-Host "  -> Docker daemon detectado y funcionando correctamente." -ForegroundColor Green
} catch {
    Write-Host "`n[ERROR] Docker Desktop no esta iniciado." -ForegroundColor Red
    Write-Host "Por favor, abre la aplicacion Docker Desktop en Windows y vuelve a ejecutar .\start.ps1" -ForegroundColor Yellow
    exit 1
}


Write-Host "`n[2/7] Verificando variables de entorno (.env)..." -ForegroundColor Yellow
$carpetasEnv = @(".", "api gateway", "ms-auth", "ms-activos", "ms-incidencias")

foreach ($carpeta in $carpetasEnv) {
    $rutaEnv = Join-Path $carpeta ".env"
    $rutaExample = Join-Path $carpeta ".env.example"

    if (-not (Test-Path $rutaEnv)) {
        if (Test-Path $rutaExample) {
            Copy-Item $rutaExample $rutaEnv
            Write-Host "  [CREADO] $rutaEnv (a partir de .env.example)" -ForegroundColor Green
        } else {
            Write-Host "  [AVISO] No se encontro $rutaExample" -ForegroundColor DarkGray
        }
    } else {
        Write-Host "  [OK] $rutaEnv detectado (se conserva tu configuracion actual)." -ForegroundColor DarkGray
    }
}


Write-Host "`n[3/7] Levantando contenedores..." -ForegroundColor Yellow
docker compose up -d --remove-orphans


Write-Host "`n[4/7] Verificando conexion a bases de datos PostgreSQL..." -ForegroundColor Yellow

$bases = @("auth_db", "activos_db", "incidencias_db")
foreach ($db in $bases) {
    $listo = $false
    $intentos = 0
    while (-not $listo -and $intentos -lt 25) {
        $resultado = docker exec $db pg_isready -U postgres 2>&1
        if ($resultado -like "*accepting connections*") {
            $listo = $true
            Write-Host "  -> Base de datos '$db' esta lista para recibir consultas." -ForegroundColor Green
        } else {
            $intentos++
            Start-Sleep -Milliseconds 600
        }
    }
    if (-not $listo) {
        Write-Host "  [ADVERTENCIA] '$db' tardo mas de lo esperado en responder." -ForegroundColor Red
    }
}


Write-Host "`n[5/7] Verificando dependencias y migraciones de Prisma..." -ForegroundColor Yellow

$serviciosPrisma = @("ms-auth", "ms-activos", "ms-incidencias")
foreach ($srv in $serviciosPrisma) {
    Write-Host "  -> Procesando $srv..." -ForegroundColor DarkGray
    Push-Location $srv
    try {
        if (-not (Test-Path "node_modules")) {
            Write-Host "     Instalando paquetes con pnpm..." -ForegroundColor DarkGray
            pnpm.cmd install --silent
        }
        pnpm.cmd exec prisma generate > $null 2>&1
        pnpm.cmd exec prisma migrate deploy
        Write-Host "     Esquema y migraciones de $srv sincronizadas exitosamente." -ForegroundColor Green
    } catch {
        Write-Host "     [AVISO] Ocurrio un detalle durante la migracion de $($srv): $_" -ForegroundColor Yellow
    } finally {
        Pop-Location
    }
}

# sixseven xddxdxd
Write-Host "`n[6/7] Agregando datos de prueba..." -ForegroundColor Yellow


Push-Location "ms-auth"
try {
    Write-Host "Ingreso a ms-auth" -ForegroundColor Cyan
    node create-user.js | Out-Null 
   Write-Host "  -> Usuarios base asegurados en MS Auth (Admin, Tecnico, Usuario)." -ForegroundColor Green
    Write-Host "  -> La contrasena para ingresar a estos es: password123" -ForegroundColor Green
} catch {
    Write-Host "  [AVISO] No se pudo ejecutar create-user.js: $_" -ForegroundColor Yellow
} finally {
    Pop-Location
}


Push-Location "ms-activos"
try {
    Write-Host "Ingreso a ms-activos" -ForegroundColor Cyan
    pnpm.cmd exec prisma db seed | Out-Null
    Write-Host " -> Activos de prueba ingresados correctamente." -ForegroundColor Green
} catch {
    Write-Host "  [AVISO] No se pudo ejecutar prisma db seed en ms-activos: $_" -ForegroundColor Yellow
} finally {
    Pop-Location
}


Push-Location "ms-incidencias"
try {
    Write-Host "Ingreso a ms-incidencias" -ForegroundColor Cyan
    pnpm.cmd exec prisma db seed | Out-Null
    Write-Host "  -> Estados de incidencia ingresados correctamente." -ForegroundColor Green
} catch {
    Write-Host "  [AVISO] No se pudo ejecutar prisma db seed en ms-incidencias: $_" -ForegroundColor Yellow
} finally {
    Pop-Location
}


if (Test-Path "seed-rapido.cjs") {
    try {
        node seed-rapido.cjs | Out-Null
        Write-Host "  -> 40 incidencias de pruebas ingresadas a la DB (seed-rapido.cjs)." -ForegroundColor Green
    } catch {
        Write-Host "  [AVISO] No se pudo ejecutar seed-rapido.cjs: $_" -ForegroundColor Yellow
    }
}

Write-Host "`n[7/7] Levantando microservicios en ventanas de Powershell..." -ForegroundColor Yellow

$servicios = @(
    @{ Name = "MS Auth";        Dir = "ms-auth";        Cmd = "pnpm.cmd run start:dev"; Port = "3001" },
    @{ Name = "MS Activos";     Dir = "ms-activos";     Cmd = "pnpm.cmd run start:dev"; Port = "3003" },
    @{ Name = "MS Incidencias"; Dir = "ms-incidencias"; Cmd = "pnpm.cmd run start:dev"; Port = "3002" },
    @{ Name = "API Gateway";    Dir = "api gateway";    Cmd = "pnpm.cmd run dev";       Port = "3000" },
    @{ Name = "Frontend Web";   Dir = "frontend-web";   Cmd = "pnpm.cmd run dev";       Port = "5173" }
)

foreach ($s in $servicios) {
    Write-Host "  -> Iniciando $($s.Name) en puerto $($s.Port)..." -ForegroundColor Cyan
    $titulo = "$($s.Name) (:$($s.Port))"
    $comando = "cd '$($s.Dir)'; `$Host.UI.RawUI.WindowTitle = '$titulo'; if (!(Test-Path 'node_modules')) { pnpm.cmd install }; $($s.Cmd)"
    Start-Process powershell -ArgumentList "-NoExit -Command ""$comando"""
}


Write-Host "       TODOS LOS SERVICIOS HAN SIDO INICIALIZADOS         " -ForegroundColor Green
Write-Host "----------------------------------------------------------" -ForegroundColor Green
Write-Host "  Frontend Web:      http://localhost:5173" -ForegroundColor White
Write-Host "  API Gateway:       http://localhost:3000" -ForegroundColor White
Write-Host "  MS Auth:           http://localhost:3001" -ForegroundColor White
Write-Host "  MS Incidencias:    http://localhost:3002" -ForegroundColor White
Write-Host "  MS Activos:        http://localhost:3003" -ForegroundColor White
Write-Host "  MS Notificaciones: http://localhost:3004 (Docker loopback)" -ForegroundColor White
Write-Host "----------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "NOTA: Cerrar las ventanas no acaba realmente los procesos del todo, para realmente detener todos los servicios y liberar puertos, RAM, ejecuta .\stop.ps1" -ForegroundColor Yellow
