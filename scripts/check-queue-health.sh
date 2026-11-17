#!/usr/bin/env bash
set -Eeuo pipefail

API_URL="${RABBITMQ_API_URL:-http://127.0.0.1:15672/api}"
API_USER="${RABBITMQ_API_USER:-inframanager}"
API_PASS="${RABBITMQ_API_PASS:-inframanager-local}"
VHOST="${RABBITMQ_VHOST:-/}"
QUEUES="${RABBITMQ_QUEUES:-incidencias_criticas}"
DLQ_SUFFIX="${RABBITMQ_DLQ_SUFFIX:-.dlq}"
CONTAINER="${RABBITMQ_CONTAINER:-rabbitmq}"
MIN_CONSUMERS="${RABBITMQ_MIN_CONSUMERS:-1}"
MAX_PENDING="${RABBITMQ_MAX_PENDING_MESSAGES:-1000}"

if ! command -v curl >/dev/null 2>&1; then
  printf 'ERROR: curl es requerido.\n' >&2
  exit 2
fi
if ! command -v jq >/dev/null 2>&1; then
  printf 'ERROR: jq es requerido.\n' >&2
  exit 2
fi
if ! command -v docker >/dev/null 2>&1; then
  printf 'ERROR: Docker CLI es requerido para comprobar la salud del contenedor.\n' >&2
  exit 2
fi
if [[ ! "$MIN_CONSUMERS" =~ ^[0-9]+$ || ! "$MAX_PENDING" =~ ^[0-9]+$ ]]; then
  printf 'ERROR: Los umbrales de consumidores y mensajes deben ser enteros no negativos.\n' >&2
  exit 2
fi

COLOR_GREEN=''
COLOR_YELLOW=''
COLOR_RED=''
COLOR_RESET=''
if [[ -t 1 && -z "${NO_COLOR:-}" && "${TERM:-}" != 'dumb' ]]; then
  COLOR_GREEN=$'\033[32m'
  COLOR_YELLOW=$'\033[33m'
  COLOR_RED=$'\033[31m'
  COLOR_RESET=$'\033[0m'
fi

overall=0
has_critical=0
report() {
  local level="$1"
  local label="$2"
  local message="$3"
  local color="$COLOR_GREEN"

  case "$level" in
    WARN)
      color="$COLOR_YELLOW"
      (( overall < 1 )) && overall=1
      ;;
    CRITICAL)
      color="$COLOR_RED"
      overall=1
      has_critical=1
      ;;
  esac

  printf '%b[%s]%b %s: %s\n' "$color" "$level" "$COLOR_RESET" "$label" "$message"
}

printf 'RabbitMQ queue health report\n'
printf 'Management API: %s\n' "$API_URL"
printf 'Container: %s\n' "$CONTAINER"

if container_state="$(docker inspect --format '{{json .State}}' "$CONTAINER" 2>/dev/null)"; then
  if ! jq -e 'type == "object"' >/dev/null 2>&1 <<<"$container_state"; then
    report CRITICAL "Contenedor" "Docker devolvió un estado no válido para '$CONTAINER'"
    exit 2
  fi
  docker_status="$(jq -r '.Status // "unknown"' <<<"$container_state")"
  docker_health="$(jq -r '.Health.Status // "not-configured"' <<<"$container_state")"
  if [[ "$docker_status" == 'running' && "$docker_health" == 'healthy' ]]; then
    report OK "Contenedor" "running / healthy"
  elif [[ "$docker_status" == 'running' && "$docker_health" == 'not-configured' ]]; then
    report WARN "Contenedor" "running, sin healthcheck Docker configurado"
  else
    report CRITICAL "Contenedor" "estado=${docker_status}, health=${docker_health}"
  fi
else
  report CRITICAL "Contenedor" "no se pudo inspeccionar '$CONTAINER'"
fi

if ! queue_data="$(curl --fail --silent --show-error \
  --user "${API_USER}:${API_PASS}" \
  --get --data-urlencode "columns=name,vhost,consumers,messages,message_stats" \
  "${API_URL%/}/queues" 2>/dev/null)"; then
  report CRITICAL "Management API" "no se pudo consultar /api/queues; revisa URL y credenciales"
  exit 2
fi

if ! jq -e 'type == "array"' >/dev/null 2>&1 <<<"$queue_data"; then
  report CRITICAL "Management API" "la respuesta de /api/queues no es un arreglo JSON"
  exit 2
fi
report OK "Management API" "conexión y autenticación correctas"

IFS=',' read -r -a queue_names <<<"$QUEUES"
if [[ "${#queue_names[@]}" -eq 0 || -z "${queue_names[0]//[[:space:]]/}" ]]; then
  printf 'ERROR: RABBITMQ_QUEUES no contiene nombres de cola.\n' >&2
  exit 2
fi

for queue_name in "${queue_names[@]}"; do
  queue_name="${queue_name//[[:space:]]/}"
  [[ -z "$queue_name" ]] && continue
  dlq_name="${queue_name}${DLQ_SUFFIX}"

  queue_json="$(jq -c --arg name "$queue_name" --arg vhost "$VHOST" \
    '[.[] | select(.name == $name and .vhost == $vhost)][0] // empty' \
    <<<"$queue_data")"
  if [[ -z "$queue_json" ]]; then
    report CRITICAL "Cola ${queue_name}" "no existe en vhost '${VHOST}'"
    continue
  fi

  consumers="$(jq -r '.consumers // 0' <<<"$queue_json")"
  pending="$(jq -r '.messages // 0' <<<"$queue_json")"
  publish_rate="$(jq -r '(.message_stats.publish_details.rate // 0)' <<<"$queue_json")"
  deliver_rate="$(jq -r '(.message_stats.deliver_details.rate // 0)' <<<"$queue_json")"
  report OK "Cola ${queue_name}" \
    "consumidores=${consumers}, pendientes=${pending}, entrada=${publish_rate}/s, salida=${deliver_rate}/s"

  if (( consumers == 0 )); then
    report CRITICAL "Consumidores ${queue_name}" "no hay consumidores activos"
  elif (( consumers < MIN_CONSUMERS )); then
    report WARN "Consumidores ${queue_name}" "${consumers} activo(s), mínimo configurado=${MIN_CONSUMERS}"
  fi

  if (( pending > MAX_PENDING )); then
    report WARN "Backlog ${queue_name}" "${pending} mensajes; umbral=${MAX_PENDING}"
  fi

  dlq_json="$(jq -c --arg name "$dlq_name" --arg vhost "$VHOST" \
    '[.[] | select(.name == $name and .vhost == $vhost)][0] // empty' \
    <<<"$queue_data")"
  if [[ -z "$dlq_json" ]]; then
    report CRITICAL "DLQ ${dlq_name}" "no existe en vhost '${VHOST}'"
    continue
  fi

  dlq_messages="$(jq -r '.messages // 0' <<<"$dlq_json")"
  if (( dlq_messages > 0 )); then
    report CRITICAL "DLQ ${dlq_name}" "${dlq_messages} mensaje(s) pendientes"
  else
    report OK "DLQ ${dlq_name}" "sin mensajes pendientes"
  fi
done

if (( overall == 0 )); then
  printf '%bEstado general: SALUDABLE%b\n' "$COLOR_GREEN" "$COLOR_RESET"
elif (( has_critical == 0 )); then
  printf '%bEstado general: ADVERTENCIA%b\n' "$COLOR_YELLOW" "$COLOR_RESET"
else
  printf '%bEstado general: ALERTA%b\n' "$COLOR_RED" "$COLOR_RESET"
fi
exit "$overall"
