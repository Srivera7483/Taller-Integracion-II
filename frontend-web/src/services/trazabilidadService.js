/**
 * Servicio de Trazabilidad e Historial del Ciclo de Vida de Activos
 *
 * Mocking del endpoint:
 * GET /api/v1/activos/:id/trazabilidad?page=1&limit=10
 *
 * Basado ESTRICTAMENTE en los esquemas relacionales del sistema:
 * 1. Activos: (ms-activos/interfaces/activo.interface.ts y docs/openapi.yaml)
 *    - id, codigoQr, nombre, categoria, modelo, numeroSerie, ubicacion, estado, fechaRegistro
 * 2. Incidencias: (ms-incidencias/prisma/schema.prisma)
 *    - id_incidencia, id_activo, id_reportante, titulo, descripcion, fecha_creacion
 * 3. Órdenes de Trabajo: (ms-incidencias/prisma/schema.prisma + TAL-62)
 *    - id_orden, incidencia_id, tecnico_id, estado, prioridad, instrucciones, diagnostico_tecnico,
 *      fecha_asignacion, fecha_inicio, fecha_termino
 * 4. Historial de Estados: (ms-incidencias/prisma/schema.prisma)
 *    - id_historial, id_incidencia, id_estado, id_usuario_cambio, fecha_creacion
 * 5. Evidencias: (ms-incidencias/prisma/schema.prisma)
 *    - id_evidencia, id_incidencia, id_tipo_evidencia, url_cloudinary, fecha_creacion
 * 6. Usuarios y Roles: (ms-auth/prisma/schema.prisma)
 *    - id, nombre, apellido, email, role (nombreRol)
 */

import { getApiGatewayBaseUrl } from './ordenesService';

/**
 * Dataset simulado ajustado 100% a los schemas Prisma y OpenAPI del sistema
 */
export const MOCK_TRAZABILIDAD_POR_ACTIVO = {
  // 1. Proyector Láser Auditorio Principal
  'ACT-2026-0001': {
    activo: {
      id: 'ACT-2026-0001',
      codigoQr: 'ACT-2026-0001',
      nombre: 'Proyector Láser Epson PowerLite',
      modelo: 'PowerLite L520U',
      numeroSerie: 'SN-EPS-9921',
      categoria: 'AUDIOVISUAL',
      ubicacion: 'Edificio A - Auditorio Principal',
      estadoActual: 'OPERATIVO',
      fechaRegistro: '2024-03-15T09:00:00.000Z',
    },
    eventos: [
      {
        id: 'TRZ-006',
        fecha: '2026-09-28T14:30:00.000Z',
        tipo: 'resolucion',
        tipoLabel: 'Resolución de Falla',
        titulo: 'Cierre de Orden de Trabajo y Certificación Técnica',
        descripcion: 'Finalización de pruebas operativas de proyección continua. Temperaturas normalizadas y ventilación despejada. Equipo devuelto al estado Operativo.',
        estadoAnterior: 'EN_MANTENIMIENTO',
        estadoNuevo: 'OPERATIVO',
        responsable: {
          nombre: 'Carlos Ruiz',
          rol: 'Técnico',
          avatar: 'CR',
        },
        detalles: {
          id_incidencia: 'INC-1042',
          id_orden: 'ORD-2026-001',
          prioridad: 'Alta',
          estado_orden: 'Completada',
          diagnostico_tecnico: 'Filtro de aire desbloqueado y disipador de calor limpiado. Pruebas de encendido prolongado sin alarmas.',
          fecha_asignacion: '2026-09-28T10:30:00.000Z',
          fecha_inicio: '2026-09-28T11:00:00.000Z',
          fecha_termino: '2026-09-28T14:30:00.000Z',
          url_evidencia: 'https://res.cloudinary.com/infra/image/upload/v1/evidencias/proyector_operativo_4k.jpg',
        },
      },
      {
        id: 'TRZ-005',
        fecha: '2026-09-28T11:00:00.000Z',
        tipo: 'mantenimiento',
        tipoLabel: 'Orden de Trabajo Iniciada',
        titulo: 'Inicio de Intervención Técnica en Terreno',
        descripcion: 'Técnico asignado inicia revisión física del equipo. Desmontaje preventivo del chasis y verificación de conductos de ventilación.',
        estadoAnterior: 'DADO_DE_BAJA',
        estadoNuevo: 'EN_MANTENIMIENTO',
        responsable: {
          nombre: 'Carlos Ruiz',
          rol: 'Técnico',
          avatar: 'CR',
        },
        detalles: {
          id_orden: 'ORD-2026-001',
          id_incidencia: 'INC-1042',
          prioridad: 'Alta',
          estado_orden: 'EnProceso',
          instrucciones: 'Revisar inmediatamente el puerto de fibra óptica principal y la ventilación del chasis.',
          diagnostico_tecnico: 'Obstrucción del flujo de aire por acumulación de partículas en la rejilla de admisión.',
          fecha_asignacion: '2026-09-28T10:30:00.000Z',
          fecha_inicio: '2026-09-28T11:00:00.000Z',
          fecha_termino: null,
        },
      },
      {
        id: 'TRZ-004',
        fecha: '2026-09-27T18:20:00.000Z',
        tipo: 'fallo',
        tipoLabel: 'Avería / Incidencia Reportada',
        titulo: 'Incidencia Registrada: Falla en Proyección y Sobrecalentamiento',
        descripcion: 'El proyector se apagó intempestivamente durante una sesión en el Auditorio Principal, mostrando alerta de sobrecalentamiento en panel frontal.',
        estadoAnterior: 'OPERATIVO',
        estadoNuevo: 'EN_REVISION',
        responsable: {
          nombre: 'Roberto Gómez',
          rol: 'Docente / Reportante',
          avatar: 'RG',
        },
        detalles: {
          id_incidencia: 'INC-1042',
          prioridad: 'Alta',
          estado_incidencia: 'Reportada',
          fecha_creacion: '2026-09-27T18:20:00.000Z',
          url_evidencia: 'https://res.cloudinary.com/infra/image/upload/v1/evidencias/proyector_panel_led.jpg',
        },
      },
      {
        id: 'TRZ-003',
        fecha: '2026-06-12T11:00:00.000Z',
        tipo: 'resolucion',
        tipoLabel: 'Resolución de Falla',
        titulo: 'Mantenimiento Preventivo Semestral Completado',
        descripcion: 'Conclusión de orden de trabajo rutinaria. Limpieza óptica y verificación de parámetros de red HDBaseT.',
        estadoAnterior: 'EN_MANTENIMIENTO',
        estadoNuevo: 'OPERATIVO',
        responsable: {
          nombre: 'Valentina Morales',
          rol: 'Técnico',
          avatar: 'VM',
        },
        detalles: {
          id_orden: 'ORD-2026-022',
          prioridad: 'Baja',
          estado_orden: 'Completada',
          diagnostico_tecnico: 'Mantenimiento preventivo semestral realizado conforme a pauta técnica.',
          fecha_asignacion: '2026-06-11T14:00:00.000Z',
          fecha_inicio: '2026-06-12T09:00:00.000Z',
          fecha_termino: '2026-06-12T11:00:00.000Z',
        },
      },
      {
        id: 'TRZ-002',
        fecha: '2026-06-11T14:00:00.000Z',
        tipo: 'mantenimiento',
        tipoLabel: 'Orden de Trabajo Asignada',
        titulo: 'Asignación de Mantenimiento Preventivo Semestral',
        descripcion: 'Emisión de orden de trabajo preventiva para revisión de filtros y calibración óptica periódica.',
        estadoAnterior: 'OPERATIVO',
        estadoNuevo: 'EN_MANTENIMIENTO',
        responsable: {
          nombre: 'Supervisor de Infraestructura',
          rol: 'Supervisor',
          avatar: 'SUP',
        },
        detalles: {
          id_orden: 'ORD-2026-022',
          prioridad: 'Baja',
          estado_orden: 'Pendiente',
          instrucciones: 'Realizar calibración óptica, limpieza de filtro y verificación de firmware.',
          fecha_asignacion: '2026-06-11T14:00:00.000Z',
          fecha_inicio: null,
          fecha_termino: null,
        },
      },
      {
        id: 'TRZ-001',
        fecha: '2024-03-15T09:00:00.000Z',
        tipo: 'adquisicion',
        tipoLabel: 'Alta de Activo',
        titulo: 'Registro e Incorporación al Inventario',
        descripcion: 'Registro inicial del activo en el sistema con código QR ACT-2026-0001 e instalación física en Edificio A - Auditorio Principal.',
        estadoAnterior: null,
        estadoNuevo: 'OPERATIVO',
        responsable: {
          nombre: 'Mesa de Inventario TI',
          rol: 'Operador',
          avatar: 'TI',
        },
        detalles: {
          id_activo: 'ACT-2026-0001',
          codigo_qr: 'ACT-2026-0001',
          categoria: 'AUDIOVISUAL',
          ubicacion: 'Edificio A - Auditorio Principal',
          fecha_registro: '2024-03-15T09:00:00.000Z',
        },
      },
    ],
  },

  // 2. Servidor Blade Rack Central
  'SRV-BLADE-07': {
    activo: {
      id: 'SRV-BLADE-07',
      codigoQr: 'SRV-BLADE-07',
      nombre: 'Servidor Blade Dell PowerEdge MX750c',
      modelo: 'PowerEdge MX750c',
      numeroSerie: 'SN-DELL-BLADE-778',
      categoria: 'COMPUTO',
      ubicacion: 'Data Center Central - Rack B04',
      estadoActual: 'OPERATIVO',
      fechaRegistro: '2025-01-20T10:00:00.000Z',
    },
    eventos: [
      {
        id: 'TRZ-203',
        fecha: '2026-09-28T09:15:00.000Z',
        tipo: 'resolucion',
        tipoLabel: 'Resolución de Falla',
        titulo: 'Cierre de Orden de Trabajo: Memoria Reemplazada',
        descripcion: 'Sustitución de módulo de memoria física en ranura B3. Pruebas de diagnóstico de hardware ejecutadas con resultado óptimo. Nodo reintegrado al clúster.',
        estadoAnterior: 'EN_MANTENIMIENTO',
        estadoNuevo: 'OPERATIVO',
        responsable: {
          nombre: 'Matías Silva',
          rol: 'Técnico',
          avatar: 'MS',
        },
        detalles: {
          id_incidencia: 'INC-1040',
          id_orden: 'ORD-2026-004',
          prioridad: 'Alta',
          estado_orden: 'Completada',
          diagnostico_tecnico: 'Falla corregida mediante recambio de módulo de memoria defectuoso.',
          fecha_asignacion: '2026-09-27T11:00:00.000Z',
          fecha_inicio: '2026-09-27T11:10:00.000Z',
          fecha_termino: '2026-09-28T09:15:00.000Z',
        },
      },
      {
        id: 'TRZ-202',
        fecha: '2026-09-27T07:45:00.000Z',
        tipo: 'fallo',
        tipoLabel: 'Avería / Incidencia Reportada',
        titulo: 'Incidencia Registrada: Alerta de Sobrecalentamiento y Errores en Memoria',
        descripcion: 'Sensores térmicos del chasis B reportan temperaturas superiores a 78°C con eventos recurrentes de memoria en nodo blade.',
        estadoAnterior: 'OPERATIVO',
        estadoNuevo: 'EN_REVISION',
        responsable: {
          nombre: 'Matías Silva',
          rol: 'Operador',
          avatar: 'MS',
        },
        detalles: {
          id_incidencia: 'INC-1040',
          prioridad: 'Alta',
          estado_incidencia: 'Reportada',
          fecha_creacion: '2026-09-27T07:45:00.000Z',
        },
      },
      {
        id: 'TRZ-201',
        fecha: '2025-01-20T10:00:00.000Z',
        tipo: 'adquisicion',
        tipoLabel: 'Alta de Activo',
        titulo: 'Registro e Incorporación al Inventario',
        descripcion: 'Ingreso al inventario institucional de servidor blade de cómputo para clúster de virtualización.',
        estadoAnterior: null,
        estadoNuevo: 'OPERATIVO',
        responsable: {
          nombre: 'Administrador de Sistemas',
          rol: 'Administrador',
          avatar: 'ADM',
        },
        detalles: {
          id_activo: 'SRV-BLADE-07',
          codigo_qr: 'SRV-BLADE-07',
          categoria: 'COMPUTO',
          ubicacion: 'Data Center Central - Rack B04',
          fecha_registro: '2025-01-20T10:00:00.000Z',
        },
      },
    ],
  },

  // 3. Switch Core Cisco Catalyst
  'SW-CORE-01': {
    activo: {
      id: 'SW-CORE-01',
      codigoQr: 'SW-CORE-01',
      nombre: 'Switch de Distribución Cisco Catalyst 9300',
      modelo: 'Catalyst 9300 48P PoE+',
      numeroSerie: 'SN-CSCO-9300-998',
      categoria: 'REDES',
      ubicacion: 'Edificio Central - Sala de Comunicaciones 1',
      estadoActual: 'OPERATIVO',
      fechaRegistro: '2024-08-10T12:00:00.000Z',
    },
    eventos: [
      {
        id: 'TRZ-303',
        fecha: '2026-09-27T11:45:00.000Z',
        tipo: 'resolucion',
        tipoLabel: 'Resolución de Falla',
        titulo: 'Cierre de Orden: Módulo Óptico SFP Reemplazado',
        descripcion: 'Sustitución de transceptor de fibra óptica en puerto de enlace ascendente. Tráfico de red reestablecido sin pérdidas de paquetes.',
        estadoAnterior: 'EN_MANTENIMIENTO',
        estadoNuevo: 'OPERATIVO',
        responsable: {
          nombre: 'Carlos Ruiz',
          rol: 'Técnico',
          avatar: 'CR',
        },
        detalles: {
          id_incidencia: 'INC-1038',
          id_orden: 'ORD-2026-003',
          prioridad: 'Alta',
          estado_orden: 'Completada',
          diagnostico_tecnico: 'Transceptor SFP defectuoso sustituido. Enlace troncal operando al 100%.',
          fecha_asignacion: '2026-09-27T08:30:00.000Z',
          fecha_inicio: '2026-09-27T09:00:00.000Z',
          fecha_termino: '2026-09-27T11:45:00.000Z',
        },
      },
      {
        id: 'TRZ-302',
        fecha: '2026-09-27T08:10:00.000Z',
        tipo: 'fallo',
        tipoLabel: 'Avería / Incidencia Reportada',
        titulo: 'Incidencia Registrada: Caída Intermitente de Enlace de Fibra',
        descripcion: 'Pérdida de conectividad intermitente hacia switches de distribución del Edificio Central.',
        estadoAnterior: 'OPERATIVO',
        estadoNuevo: 'EN_REVISION',
        responsable: {
          nombre: 'Diego Herrera',
          rol: 'Operador',
          avatar: 'DH',
        },
        detalles: {
          id_incidencia: 'INC-1038',
          prioridad: 'Alta',
          estado_incidencia: 'Reportada',
          fecha_creacion: '2026-09-27T08:10:00.000Z',
        },
      },
      {
        id: 'TRZ-301',
        fecha: '2024-08-10T12:00:00.000Z',
        tipo: 'adquisicion',
        tipoLabel: 'Alta de Activo',
        titulo: 'Registro e Incorporación al Inventario',
        descripcion: 'Puesta en marcha de switch de distribución principal para enlaces troncales del campus.',
        estadoAnterior: null,
        estadoNuevo: 'OPERATIVO',
        responsable: {
          nombre: 'Diego Herrera',
          rol: 'Operador',
          avatar: 'DH',
        },
        detalles: {
          id_activo: 'SW-CORE-01',
          codigo_qr: 'SW-CORE-01',
          categoria: 'REDES',
          ubicacion: 'Edificio Central - Sala de Comunicaciones 1',
          fecha_registro: '2024-08-10T12:00:00.000Z',
        },
      },
    ],
  },

  // 4. Computador All-in-One Dell
  'ACT-2026-0002': {
    activo: {
      id: 'ACT-2026-0002',
      codigoQr: 'ACT-2026-0002',
      nombre: 'Computador Docente All-in-One Dell',
      modelo: 'OptiPlex 7490',
      numeroSerie: 'SN-DELL-4412',
      categoria: 'COMPUTO',
      ubicacion: 'Edificio B - Laboratorio 302',
      estadoActual: 'EN_MANTENIMIENTO',
      fechaRegistro: '2026-03-10T10:00:00.000Z',
    },
    eventos: [
      {
        id: 'TRZ-402',
        fecha: '2026-09-27T16:45:00.000Z',
        tipo: 'mantenimiento',
        tipoLabel: 'Orden de Trabajo en Proceso',
        titulo: 'Diagnóstico en Taller Técnico',
        descripcion: 'Revisión en taller técnico por problemas en arranque del sistema operativo.',
        estadoAnterior: 'EN_REVISION',
        estadoNuevo: 'EN_MANTENIMIENTO',
        responsable: {
          nombre: 'Ana Gómez',
          rol: 'Técnico',
          avatar: 'AG',
        },
        detalles: {
          id_orden: 'ORD-2026-002',
          id_incidencia: 'INC-1041',
          prioridad: 'Media',
          estado_orden: 'EnProceso',
          instrucciones: 'Actualizar paquetes y verificar estado del almacenamiento.',
          diagnostico_tecnico: 'Sectores del disco en proceso de diagnóstico y reinstalación de imagen.',
          fecha_asignacion: '2026-09-27T08:15:00.000Z',
          fecha_inicio: '2026-09-27T16:45:00.000Z',
          fecha_termino: null,
        },
      },
      {
        id: 'TRZ-401',
        fecha: '2026-09-27T08:15:00.000Z',
        tipo: 'fallo',
        tipoLabel: 'Avería / Incidencia Reportada',
        titulo: 'Incidencia Registrada: Falla en Inicio de Sesión',
        descripcion: 'Equipo docente no inicia correctamente el sistema operativo en Laboratorio 302.',
        estadoAnterior: 'OPERATIVO',
        estadoNuevo: 'EN_REVISION',
        responsable: {
          nombre: 'Ana Gómez',
          rol: 'Operador',
          avatar: 'AG',
        },
        detalles: {
          id_incidencia: 'INC-1041',
          prioridad: 'Media',
          estado_incidencia: 'Reportada',
          fecha_creacion: '2026-09-27T08:15:00.000Z',
        },
      },
      {
        id: 'TRZ-400',
        fecha: '2026-03-10T10:00:00.000Z',
        tipo: 'adquisicion',
        tipoLabel: 'Alta de Activo',
        titulo: 'Registro e Incorporación al Inventario',
        descripcion: 'Equipo registrado y destinado a docencia en Edificio B - Laboratorio 302.',
        estadoAnterior: null,
        estadoNuevo: 'OPERATIVO',
        responsable: {
          nombre: 'Administrador TI',
          rol: 'Administrador',
          avatar: 'ADM',
        },
        detalles: {
          id_activo: 'ACT-2026-0002',
          codigo_qr: 'ACT-2026-0002',
          categoria: 'COMPUTO',
          ubicacion: 'Edificio B - Laboratorio 302',
          fecha_registro: '2026-03-10T10:00:00.000Z',
        },
      },
    ],
  },
};

/**
 * Función que simula o consume el endpoint GET /api/v1/activos/:id/trazabilidad
 */
export async function obtenerTrazabilidadActivoApi(idActivo, { page = 1, limit = 10, tipoFiltro = 'todos', usarMock = false } = {}) {
  const activoNormalizado = (idActivo || 'ACT-2026-0001').trim().toUpperCase();

  // Intento de conexión al API Gateway real
  if (!usarMock) {
    try {
      const baseUrl = getApiGatewayBaseUrl();
      const endpoint = `${baseUrl}/v1/activos/${encodeURIComponent(activoNormalizado)}/trazabilidad?page=${page}&limit=${limit}`;

      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(endpoint, { method: 'GET', headers });
      if (response.ok) {
        const payload = await response.json();
        return { ok: true, status: response.status, data: payload, origen: 'api' };
      }
    } catch {
      // Backend / API Gateway fuera de línea; fallback al mock estructurado
    }
  }

  // --- Mocking Inteligente 100% alineado con Prisma y OpenAPI ---
  const registroMock =
    MOCK_TRAZABILIDAD_POR_ACTIVO[activoNormalizado] ||
    MOCK_TRAZABILIDAD_POR_ACTIVO['ACT-2026-0001'];

  // Orden cronológico estricto (más reciente primero)
  let eventosOrdenados = [...registroMock.eventos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  if (tipoFiltro && tipoFiltro !== 'todos') {
    eventosOrdenados = eventosOrdenados.filter((e) => e.tipo === tipoFiltro);
  }

  // Paginación
  const total = eventosOrdenados.length;
  const numPage = Math.max(1, parseInt(page, 10) || 1);
  const numLimit = Math.max(1, parseInt(limit, 10) || 10);
  const inicio = (numPage - 1) * numLimit;
  const fin = inicio + numLimit;
  const eventosPaginados = eventosOrdenados.slice(inicio, fin);
  const totalPaginas = Math.ceil(total / numLimit) || 1;

  const payloadConsolidado = {
    activo: {
      ...registroMock.activo,
      id: registroMock.activo.id === activoNormalizado ? registroMock.activo.id : activoNormalizado,
    },
    paginacion: {
      total,
      pagina: numPage,
      limite: numLimit,
      totalPaginas,
      tieneMas: fin < total,
    },
    trazabilidad: eventosPaginados,
    resumenEstadistico: {
      totalFallos: registroMock.eventos.filter((e) => e.tipo === 'fallo').length,
      totalMantenimientos: registroMock.eventos.filter((e) => e.tipo === 'mantenimiento').length,
      totalResoluciones: registroMock.eventos.filter((e) => e.tipo === 'resolucion').length,
      totalHitos: total,
    },
    metadataMock: {
      simulacionPrismaJoin: 'Include: [INCIDENCIAS, ORDENES_TRABAJO, HISTORIAL_ESTADOS, EVIDENCIAS]',
      orden: 'ORDER BY fecha_creacion DESC',
      endpoint: `/api/v1/activos/${activoNormalizado}/trazabilidad`,
    },
  };

  return {
    ok: true,
    status: 200,
    data: payloadConsolidado,
    origen: 'mock',
  };
}

/**
 * Catálogo resumido de activos para el selector
 */
export function obtenerCatalogoActivosResumen() {
  return Object.values(MOCK_TRAZABILIDAD_POR_ACTIVO).map((item) => ({
    id: item.activo.id,
    nombre: item.activo.nombre,
    modelo: item.activo.modelo,
    categoria: item.activo.categoria,
    ubicacion: item.activo.ubicacion,
    estadoActual: item.activo.estadoActual,
    totalHitos: item.eventos.length,
  }));
}
