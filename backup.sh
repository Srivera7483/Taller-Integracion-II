#!/bin/bash

# ==========================================
# Configuración de Variables
# ==========================================
PROJECT_DIR="/ruta/absoluta/a/tu/proyecto" # por determinar (Kubero)
BACKUP_DIR="$PROJECT_DIR/backups"

DATE=$(date +"%Y-%m-%d_%H-%M-%S")
DB_USER="postgres"

# ==========================================
# Carga de Variables de Entorno (.env)
# ==========================================
if [ -f "$PROJECT_DIR/.env" ]; then
    # exporta las variables ignorando líneas comentadas
    export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
else
    echo "[$(date)] ❌ ERROR: Archivo .env no encontrado en $PROJECT_DIR"
    exit 1
fi

if [ -z "$ENCRYPT_PASS" ]; then
    echo "[$(date)] ❌ ERROR: La variable ENCRYPT_PASS no está definida en el archivo .env"
    exit 1
fi

# ==========================================
# Ejecución del Respaldo
# ==========================================
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Iniciando volcado de bases de datos..."

docker exec activos_db pg_dump -U "$DB_USER" activos_db | gzip > "$BACKUP_DIR/activos_db_$DATE.sql.gz"
echo "[$(date)] activos_db respaldada exitosamente."

docker exec incidencias_db pg_dump -U "$DB_USER" incidencias_db | gzip > "$BACKUP_DIR/incidencias_db_$DATE.sql.gz"
echo "[$(date)] incidencias_db respaldada exitosamente."

docker exec auth_db pg_dump -U "$DB_USER" auth_db | gzip | openssl enc -aes-256-cbc -salt -pbkdf2 -pass pass:"$ENCRYPT_PASS" > "$BACKUP_DIR/auth_db_$DATE.sql.gz.enc"
echo "[$(date)] auth_db respaldada y ENCRIPTADA exitosamente."

echo "[$(date)] Proceso de backup finalizado."