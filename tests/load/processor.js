'use strict';

const fs = require('node:fs');
const path = require('node:path');

function leerClaveEnvRaiz(claveBuscada) {
  const rutaEnv = path.resolve(__dirname, '..', '..', '.env');
  if (!fs.existsSync(rutaEnv)) return '';
  const lineas = fs.readFileSync(rutaEnv, 'utf8').split(/\r?\n/);
  for (const l of lineas) {
    const t = l.trim();
    if (!t || t.startsWith('#')) continue;
    const idx = t.indexOf('=');
    if (idx <= 0) continue;
    if (t.slice(0, idx).trim() === claveBuscada) {
      return t.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    }
  }
  return '';
}

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const SEED_EMAIL = process.env.LOAD_TEST_EMAIL || 'reportante.demo@ejemplo.local';
const SEED_PASSWORD =
  process.env.LOAD_TEST_PASSWORD ||
  process.env.SEED_DEFAULT_PASSWORD ||
  leerClaveEnvRaiz('SEED_DEFAULT_PASSWORD');

const ACTIVOS_SEED = [
  { id_activo: '18bc668e-1d4f-4c7a-b6cf-09ee1dcac7b9', codigo_qr: 'UCT-PRJ-01' },
  { id_activo: '745f09dc-83b9-4ab8-b77a-596eedda9065', codigo_qr: 'UCT-PRJ-02' },
  { id_activo: '014d6161-333f-4aac-9a77-65b9dd0b9744', codigo_qr: 'UCT-PRJ-03' },
  { id_activo: '47e81580-9817-4d92-9927-be73169c4b6b', codigo_qr: 'UCT-PRJ-04' },
  { id_activo: 'b7a6b942-608f-45dd-9506-cd079c4a9bd8', codigo_qr: 'UCT-PC-01' },
];

const PRIORIDADES = ['media', 'media', 'alta', 'baja', 'critica'];

let tokenPromise = null;
let cachedToken = process.env.LOAD_TEST_JWT || null;
let requestCounter = 0;

async function fetchSeedToken() {
  if (cachedToken) {
    return cachedToken;
  }
  if (!tokenPromise) {
    tokenPromise = (async () => {
      const response = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correo: SEED_EMAIL,
          password: SEED_PASSWORD,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Error autenticando usuario seed (${response.status}): ${text}`);
      }

      const data = await response.json();
      const token = data.token || data.access_token;
      if (!token) {
        throw new Error('La respuesta de login no incluyó un token JWT válido.');
      }
      cachedToken = token;
      return cachedToken;
    })();
  }
  return tokenPromise;
}

function prepararContextoConcurrencia(requestParams, context, ee, next) {
  fetchSeedToken()
    .then((token) => {
      requestCounter += 1;
      const activo = ACTIVOS_SEED[requestCounter % ACTIVOS_SEED.length];
      const prioridad = PRIORIDADES[requestCounter % PRIORIDADES.length];

      context.vars.jwt_token = token;
      context.vars.id_activo = activo.id_activo;
      context.vars.codigo_qr = activo.codigo_qr;
      context.vars.titulo = `Prueba estres TAL-10 #${requestCounter}`;
      context.vars.descripcion = `Incidencia generada en prueba de concurrencia 50 req/s (#${requestCounter}).`;
      context.vars.prioridad = prioridad;

      return next();
    })
    .catch((err) => next(err));
}

module.exports = {
  prepararContextoConcurrencia,
};
