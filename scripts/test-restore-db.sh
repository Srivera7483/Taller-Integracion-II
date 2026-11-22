#!/usr/bin/env bash
# TAL-211: restauración de prueba en bases TEMPORALES dentro de cada Postgres.
# NO modifica las bases originales.
set -Eeuo pipefail
umask 077

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
DB_USER="${DB_USER:-postgres}"
RUN_ID="$(date +'%Y%m%d_%H%M%S')_$$"
TEST_DB="tal211_restore_${RUN_ID}"
CURRENT_CONTAINER=''
CURRENT_CREATED=0

ENV_FILE="$PROJECT_DIR/.env"

if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

log() { printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S%z')" "$*"; }
drop_temp() {
  if [[ "$CURRENT_CREATED" == 1 && -n "$CURRENT_CONTAINER" ]]; then
    docker exec "$CURRENT_CONTAINER" psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 \
      -c "DROP DATABASE IF EXISTS \"$TEST_DB\" WITH (FORCE);" >/dev/null || log "ERROR: borrar manualmente $TEST_DB de $CURRENT_CONTAINER"
    CURRENT_CREATED=0
  fi
}
trap drop_temp EXIT
for command_name in docker gzip openssl; do
  command -v "$command_name" >/dev/null 2>&1 || { log "ERROR: falta $command_name"; exit 1; }
done

if [[ -z "${ENCRYPT_PASS:-}" && -f "$PROJECT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_DIR/.env"
  set +a
fi
[[ -n "${ENCRYPT_PASS:-}" ]] || { log 'ERROR: definir ENCRYPT_PASS'; exit 1; }
export ENCRYPT_PASS

latest_file() {
  local mask="$1" latest
  # Los timestamps en el nombre permiten ordenar lexicográficamente.
  latest="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name "$mask" -printf '%f\n' | LC_ALL=C sort | tail -n 1)"
  [[ -n "$latest" ]] || { log "ERROR: no hay respaldo: $mask"; return 1; }
  printf '%s/%s\n' "$BACKUP_DIR" "$latest"
}

restore_one() {
  local db="$1" container="$2" backup="$3" kind="$4"
  log "Probando restauración de $db desde $(basename "$backup")"
  CURRENT_CONTAINER="$container"
  docker exec "$container" psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 \
    -c "CREATE DATABASE \"$TEST_DB\";" >/dev/null
  CURRENT_CREATED=1
  if [[ "$kind" == 'encrypted' ]]; then
    openssl enc -d -aes-256-cbc -pbkdf2 -pass env:ENCRYPT_PASS -in "$backup" \
      | gzip -dc \
      | docker exec -i "$container" psql -X -U "$DB_USER" -d "$TEST_DB" -v ON_ERROR_STOP=1 >/dev/null
  else
    gzip -dc -- "$backup" \
      | docker exec -i "$container" psql -X -U "$DB_USER" -d "$TEST_DB" -v ON_ERROR_STOP=1 >/dev/null
  fi
  log "OK: $db restaurada en base temporal $TEST_DB"
  drop_temp
}

restore_one 'activos_db' 'activos_db' "$(latest_file 'activos_db_*.sql.gz')" 'plain'
restore_one 'incidencias_db' 'incidencias_db' "$(latest_file 'incidencias_db_*.sql.gz')" 'plain'
restore_one 'auth_db' 'auth_db' "$(latest_file 'auth_db_*.sql.gz.enc')" 'encrypted'
log 'OK: las tres restauraciones de prueba finalizaron correctamente.'
