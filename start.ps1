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


# Sincronización preventiva de JWT_SECRET
if (Test-Path "ms-auth\.env") {
    $lineaAuth = Get-Content "ms-auth\.env" | Where-Object { $_ -match "^JWT_SECRET=(.+)" }
    if ($lineaAuth -and ($lineaAuth -match "^JWT_SECRET=(.+)")) {
        $secretAuth = $matches[1].Trim()
        if (Test-Path "ms-incidencias\.env") {
            $contenido = Get-Content "ms-incidencias\.env"
            $contenido -replace "^JWT_SECRET=.*", "JWT_SECRET=$secretAuth" | Set-Content "ms-incidencias\.env"
            Write-Host "  [OK] JWT_SECRET sincronizado en ms-incidencias." -ForegroundColor Green
        }
    }
}

# Sincronización de credenciales de Cloudinary desde .env raíz hacia ms-incidencias y frontend-web
if (Test-Path ".env") {
    $cName = ""
    $cPreset = ""
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^\s*CLOUDINARY_CLOUD_NAME\s*=\s*(.+)") { $cName = $matches[1].Trim() }
        if ($_ -match "^\s*CLOUDINARY_UPLOAD_PRESET\s*=\s*(.+)") { $cPreset = $matches[1].Trim() }
    }

    if ($cName -and $cPreset) {
        if (Test-Path "ms-incidencias\.env") {
            $cInc = Get-Content "ms-incidencias\.env"
            if ($cInc -match "CLOUDINARY_CLOUD_NAME=") {
                $cInc = $cInc -replace "^CLOUDINARY_CLOUD_NAME=.*", "CLOUDINARY_CLOUD_NAME=$cName"
            } else {
                $cInc += "CLOUDINARY_CLOUD_NAME=$cName"
            }
            if ($cInc -match "CLOUDINARY_UPLOAD_PRESET=") {
                $cInc = $cInc -replace "^CLOUDINARY_UPLOAD_PRESET=.*", "CLOUDINARY_UPLOAD_PRESET=$cPreset"
            } else {
                $cInc += "CLOUDINARY_UPLOAD_PRESET=$cPreset"
            }
            $cInc | Set-Content "ms-incidencias\.env"
            Write-Host "  [OK] Credenciales Cloudinary sincronizadas en ms-incidencias." -ForegroundColor Green
        }

        # Generar o actualizar frontend-web\.env
        $frontendEnvPath = "frontend-web\.env"
        $frontendEnvLines = @(
            "VITE_API_URL=http://localhost:3000/api/v1",
            "VITE_CLOUDINARY_CLOUD_NAME=$cName",
            "VITE_CLOUDINARY_UPLOAD_PRESET=$cPreset",
            "CLOUDINARY_CLOUD_NAME=$cName",
            "CLOUDINARY_UPLOAD_PRESET=$cPreset"
        )
        $frontendEnvLines | Set-Content $frontendEnvPath
        Write-Host "  [OK] Credenciales Cloudinary sincronizadas en frontend-web." -ForegroundColor Green
    }
}

# Sincronizar dependencias de MS Notificaciones antes de Docker
Write-Host "  -> Sincronizando dependencias de ms-notificaciones..." -ForegroundColor Cyan

Push-Location "ms-notificaciones"
try {
    pnpm.cmd install

    if ($LASTEXITCODE -ne 0) {
        throw "Error al instalar dependencias de ms-notificaciones"
    }
}
finally {
    Pop-Location
}


Write-Host "`n[3/7] Levantando contenedores..." -ForegroundColor Yellow

# Evitar conflictos de directorios/nombres
$contenedores = @("auth_db", "activos_db", "incidencias_db", "ms-notificaciones")
foreach ($c in $contenedores) {
    $existe = docker ps -a -q -f "name=^/${c}$"
    if ($existe) {
        docker rm -f $c > $null 2>&1
    }
}
docker compose up -d --build --remove-orphans

if ($LASTEXITCODE -ne 0) {
    throw "Error al construir o iniciar los contenedores Docker"
}

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


Write-Host "`n[5/7] Sincronizando bases de datos desde schema.prisma..." -ForegroundColor Yellow

$serviciosPrisma = @("ms-auth", "ms-activos", "ms-incidencias")

foreach ($srv in $serviciosPrisma) {
    Write-Host "  -> Procesando $srv..." -ForegroundColor Cyan

    Push-Location $srv

    try {
        if (-not (Test-Path "node_modules")) {
            Write-Host "     Instalando dependencias con pnpm..." -ForegroundColor DarkGray

            pnpm.cmd install

            if ($LASTEXITCODE -ne 0) {
                throw "Error instalando dependencias de $srv"
            }
        }

        Write-Host "     Sincronizando schema.prisma..." -ForegroundColor DarkGray

        pnpm.cmd exec prisma db push

        if ($LASTEXITCODE -ne 0) {
            throw "Error ejecutando prisma db push en $srv"
        }

        Write-Host "     Generando Prisma Client..." -ForegroundColor DarkGray

        pnpm.cmd exec prisma generate

        if ($LASTEXITCODE -ne 0) {
            throw "Error generando Prisma Client en $srv"
        }

        Write-Host "     [OK] $srv sincronizado correctamente." -ForegroundColor Green
    }
    finally {
        Pop-Location
    }
}


# sixseven xddxdxd
# [6/7] Aplicando migraciones y agregando datos de prueba...
Write-Host "`n[6/7] Ejecutando seeds de datos iniciales..." -ForegroundColor Yellow

# Seed de MS Auth
Push-Location "ms-auth"
try {
    Write-Host "  -> Ejecutando seed de ms-auth..." -ForegroundColor Cyan

    node prisma/seed.cjs

    if ($LASTEXITCODE -ne 0) {
        throw "Error ejecutando seed de ms-auth"
    }

    Write-Host "     [OK] Seed de ms-auth completado." -ForegroundColor Green
}
finally {
    Pop-Location
}

# Seed de MS Incidencias
Push-Location "ms-incidencias"
try {
    Write-Host "  -> Ejecutando seed de ms-incidencias..." -ForegroundColor Cyan

    pnpm.cmd exec prisma db seed

    if ($LASTEXITCODE -ne 0) {
        throw "Error ejecutando seed de ms-incidencias"
    }

    Write-Host "     [OK] Seed de ms-incidencias completado." -ForegroundColor Green
}
finally {
    Pop-Location
}

# Seed raíz
if (Test-Path "seed.cjs") {
    Write-Host "  -> Ejecutando seed raíz..." -ForegroundColor Cyan

    node seed.cjs

    if ($LASTEXITCODE -ne 0) {
        throw "Error ejecutando seed raíz"
    }

    Write-Host "     [OK] Seed raíz completado." -ForegroundColor Green
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
