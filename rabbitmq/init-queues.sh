#!/bin/sh
set -eu

API_URL="${RABBITMQ_API_URL:-http://rabbitmq:15672/api}"
API_USER="${RABBITMQ_DEFAULT_USER:-inframanager}"
API_PASS="${RABBITMQ_DEFAULT_PASS:-inframanager-local}"
VHOST_ENCODED='%2F'
QUEUE='incidencias_criticas'
DLQ="${QUEUE}.dlq"
DLX="${QUEUE}.dlx"
ROUTING_KEY="$QUEUE"

attempt=0
until curl --fail --silent --show-error \
  --user "${API_USER}:${API_PASS}" \
  "${API_URL}/overview" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    printf 'ERROR: RabbitMQ Management API no respondió después de 60 segundos.\n' >&2
    exit 1
  fi
  sleep 2
done

curl --fail --silent --show-error \
  --user "${API_USER}:${API_PASS}" \
  --request PUT \
  --header 'content-type: application/json' \
  --data '{"type":"direct","durable":true,"auto_delete":false,"internal":false,"arguments":{}}' \
  "${API_URL}/exchanges/${VHOST_ENCODED}/${DLX}"

curl --fail --silent --show-error \
  --user "${API_USER}:${API_PASS}" \
  --request PUT \
  --header 'content-type: application/json' \
  --data '{"durable":true,"auto_delete":false,"arguments":{}}' \
  "${API_URL}/queues/${VHOST_ENCODED}/${DLQ}"

curl --fail --silent --show-error \
  --user "${API_USER}:${API_PASS}" \
  --request PUT \
  --header 'content-type: application/json' \
  --data "{\"durable\":true,\"auto_delete\":false,\"arguments\":{\"x-dead-letter-exchange\":\"${DLX}\",\"x-dead-letter-routing-key\":\"${ROUTING_KEY}\"}}" \
  "${API_URL}/queues/${VHOST_ENCODED}/${QUEUE}"

curl --fail --silent --show-error \
  --user "${API_USER}:${API_PASS}" \
  --request POST \
  --header 'content-type: application/json' \
  --data "{\"routing_key\":\"${ROUTING_KEY}\",\"arguments\":{}}" \
  "${API_URL}/bindings/${VHOST_ENCODED}/e/${DLX}/q/${DLQ}"

printf 'RabbitMQ exchange, queue and DLQ declared successfully.\n'
