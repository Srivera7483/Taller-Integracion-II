import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CATALOGO_MICROSERVICIOS,
  PERMISOS_AUDITORIA,
  construirParametrosConsultaAuditoria,
  formatearDuracionUptime,
  formatearLatenciaMilisegundos,
  normalizarRespuestaAuditoria,
  normalizarSaludGateway,
  tienePermisoAuditoria,
} from './auditoriaService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('TAL-179: PERMISOS_AUDITORIA y tienePermisoAuditoria validan PBAC sin depender del nombre de rol', () => {
  assert.deepEqual(PERMISOS_AUDITORIA, ['auditoria:ver', 'usuarios:gestionar', 'estadisticas:ver']);
  assert.equal(tienePermisoAuditoria(['usuarios:gestionar']), true);
  assert.equal(tienePermisoAuditoria(['auditoria:ver']), true);
  assert.equal(tienePermisoAuditoria(['incidencias:ver', 'incidencias:crear']), false);
});

test('TAL-179: construirParametrosConsultaAuditoria acota paginación y limpia filtros', () => {
  const params = construirParametrosConsultaAuditoria({
    pagina: -4,
    limite: 500,
    usuario: '  admin@uct.cl  ',
    servicio: ' ms-activos ',
    metodo: ' delete ',
    codigoHttp: ' 200 ',
    busqueda: ' /api/v1/activos ',
    incluirSalud: false,
  });

  assert.deepEqual(params, {
    page: 1,
    limit: 100,
    usuario: 'admin@uct.cl',
    servicio: 'ms-activos',
    metodo: 'DELETE',
    statusCode: '200',
    search: '/api/v1/activos',
    includeHealth: false,
  });
});

test('TAL-179: normalizarRespuestaAuditoria y normalizarSaludGateway manejan null/undefined sin falsos 0 ms', () => {
  assert.equal(formatearLatenciaMilisegundos(null), 'N/D');
  assert.equal(formatearLatenciaMilisegundos(undefined), 'N/D');
  assert.equal(formatearLatenciaMilisegundos(14.37), '14.4 ms');
  assert.equal(formatearDuracionUptime(null), 'N/D');
  assert.equal(formatearDuracionUptime(3665), '1h 1m');

  const gwCaido = normalizarSaludGateway({}, null);
  assert.equal(gwCaido.estado, 'DOWN');
  assert.equal(gwCaido.uptimeSegundos, null);
  assert.equal(gwCaido.latenciaMilisegundos, null);

  const respuesta = normalizarRespuestaAuditoria({
    data: [
      {
        id_auditoria: 'aud-1',
        timestamp: '2026-11-28T12:00:00.000Z',
        metodo: 'post',
        ruta: '/api/v1/incidencias',
        servicio_destino: 'ms-incidencias',
        accion: 'CREAR_INCIDENCIA',
        entidad: 'incidencias',
        id_entidad: 'INC-1',
        status_code: 201,
        latencia_ms: 18.4,
        usuario: { id: 'usr-1', email: 'admin@uct.cl', rol: 'ADMINISTRADOR', autenticado: true },
      },
    ],
    paginacion: {
      total: 1,
      page: 1,
      limit: 20,
      total_paginas: 1,
      capacidad_buffer: 500,
      registros_en_buffer: 1,
      almacenamiento_efimero: true,
    },
    servicios: {
      estado_general: 'DEGRADED',
      gateway: { nombre: 'api-gateway', estado: 'UP', operativo: true, uptime_segundos: 120 },
      microservicios: [
        { nombre: 'ms-auth', estado: 'UP', operativo: true, codigo_http: 200, latencia_ms: 4.2 },
      ],
    },
  });

  assert.equal(respuesta.registros.length, 1);
  assert.equal(respuesta.registros[0].metodo, 'POST');
  assert.equal(respuesta.registros[0].codigoHttp, 201);
  assert.equal(respuesta.servicios.microservicios.length, CATALOGO_MICROSERVICIOS.length);
  assert.equal(respuesta.servicios.microservicios[0].estado, 'UP');
  assert.equal(respuesta.servicios.microservicios[1].estado, 'DOWN');
});

test('TAL-179 (Kubero & PBAC): Auditoria.jsx y auditoriaService.js no contienen URLs localhost fijas y protegen ruta con ProtectedRoute', () => {
  const vista = fs.readFileSync(path.resolve(__dirname, '../views/Auditoria.jsx'), 'utf8');
  const servicio = fs.readFileSync(path.resolve(__dirname, './auditoriaService.js'), 'utf8');
  const app = fs.readFileSync(path.resolve(__dirname, '../App.jsx'), 'utf8');
  const layout = fs.readFileSync(path.resolve(__dirname, '../components/Layout.jsx'), 'utf8');

  assert.doesNotMatch(vista, /localhost|127\.0\.0\.1/, 'Auditoria.jsx no debe fijar localhost');
  assert.doesNotMatch(servicio, /localhost|127\.0\.0\.1/, 'auditoriaService.js no debe fijar localhost');
  assert.match(app, /requiredPermission=\{PERMISOS_AUDITORIA\}/, 'App.jsx debe proteger /auditoria con PERMISOS_AUDITORIA');
  assert.match(layout, /path:\s*'\/auditoria'[\s\S]{0,120}requiredPermission:\s*PERMISOS_AUDITORIA/, 'Layout.jsx debe proteger el enlace Auditoría con PBAC');
});
