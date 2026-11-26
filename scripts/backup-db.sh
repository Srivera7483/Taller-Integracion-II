#!/usr/bin/env bash
# TAL-211: respaldo de bases de datos del proyecto InfraManager.
set -Eeuo pipefail
umask 077

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"


ENV_FILE="$PROJECT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

# Para producción, montar BACKUP_DIR en almacenamiento persistente aislado.
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DB_USER="${DB_USER:-postgres}"
TIMESTAMP="$(date +'%Y-%m-%d_%H-%M-%S')"
TEMP_FILE=''

log() { printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$*"; }
cleanup() { if [[ -n "$TEMP_FILE" && -e "$TEMP_FILE" ]]; then rm -f -- "$TEMP_FILE"; fi; }
on_error() {
  local status=$?
  log "ERROR: respaldo interrumpido (código $status). Revisar Docker, PostgreSQL, permisos y espacio disponible."
  if command -v df >/dev/null 2>&1; then df -h -- "$BACKUP_DIR" >&2 || true; fi
  exit "$status"
}
trap cleanup EXIT
trap on_error ERR

for command_name in docker gzip openssl find mktemp; do
  command -v "$command_name" >/dev/null 2>&1 || { log "ERROR: falta $command_name"; exit 1; }
done
[[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] || { log 'ERROR: RETENTION_DAYS debe ser entero no negativo'; exit 1; }
[[ "$BACKUP_DIR" = /* ]] || { log 'ERROR: BACKUP_DIR debe ser una ruta absoluta'; exit 1; }

[[ -n "${ENCRYPT_PASS:-}" ]] || { log 'ERROR: definir ENCRYPT_PASS para cifrar auth_db'; exit 1; }

mkdir -p -- "$BACKUP_DIR"
[[ -w "$BACKUP_DIR" ]] || { log "ERROR: directorio no escribible: $BACKUP_DIR"; exit 1; }
log "Comenzando respaldo en $BACKUP_DIR"

backup_one() {
  local db="$1" container="$2" output="$3" kind="$4"
  local path="$BACKUP_DIR/$output"
  TEMP_FILE="$(mktemp "$BACKUP_DIR/.${db}_${TIMESTAMP}.XXXXXX.tmp")"
  log "Respaldando $db..."
  if [[ "$kind" == 'encrypted' ]]; then
    # No exponer la clave en los argumentos del proceso.
    export ENCRYPT_PASS
    docker exec "$container" pg_dump -U "$DB_USER" "$db" \
      | gzip -c \
      | openssl enc -aes-256-cbc -salt -pbkdf2 -pass env:ENCRYPT_PASS -out "$TEMP_FILE"
  else
    docker exec "$container" pg_dump -U "$DB_USER" "$db" | gzip -c > "$TEMP_FILE"
  fi
  [[ -s "$TEMP_FILE" ]] || { log "ERROR: respaldo vacío para $db"; return 1; }
  mv -- "$TEMP_FILE" "$path"
  TEMP_FILE=''
  log "OK: $path ($(du -h -- "$path" | cut -f1))"
}

backup_one 'activos_db' 'activos_db' "activos_db_${TIMESTAMP}.sql.gz" 'plain'
backup_one 'incidencias_db' 'incidencias_db' "incidencias_db_${TIMESTAMP}.sql.gz" 'plain'
backup_one 'auth_db' 'auth_db' "auth_db_${TIMESTAMP}.sql.gz.enc" 'encrypted'

# Solo después de completar los tres respaldos se purgan archivos antiguos.
log "Eliminando respaldos con más de $RETENTION_DAYS días..."
find "$BACKUP_DIR" -maxdepth 1 -type f \
  \( -name 'activos_db_*.sql.gz' -o -name 'incidencias_db_*.sql.gz' -o -name 'auth_db_*.sql.gz.enc' \) \
  -mtime "+$((RETENTION_DAYS - 1))" -print -delete
log 'OK: respaldos completos y retención aplicada.'
