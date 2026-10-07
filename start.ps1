# Script para levantar todo el proyecto Taller-Integracion-II localmente

Write-Host "1. Levantando bases de datos de PostgreSQL con Docker Compose..." -ForegroundColor Green
docker-compose up -d

Write-Host "2. Iniciando MS Auth..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command ""cd 'ms-auth'; if (!(Test-Path 'node_modules')) { npm install }; npm run start:dev"""

Write-Host "3. Iniciando MS Activos..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command ""cd 'ms-activos'; if (!(Test-Path 'node_modules')) { npm install }; npm run start:dev"""

Write-Host "4. Iniciando MS Incidencias..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command ""cd 'ms-incidencias'; if (!(Test-Path 'node_modules')) { npm install }; npm run start:dev"""

Write-Host "5. Iniciando API Gateway (Corregido)..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit -Command ""cd 'api gateway'; if (!(Test-Path 'node_modules')) { npm install }; npm run dev"""

Write-Host "6. Iniciando Frontend Web..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit -Command ""cd 'frontend-web'; if (!(Test-Path 'node_modules')) { npm install }; npm run dev"""

Write-Host "¡Todos los servicios han sido relanzados correctamente!" -ForegroundColor Green
Write-Host "Por favor, espera a que desaparezca el texto de 'npm install' y veas que dice 'ready' o 'started'." -ForegroundColor Yellow
