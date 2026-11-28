import api, { isNetworkOrTimeoutError } from './api.js';
import { hasPermission } from './authService.js';

// Alineado 1:1 con PERMISOS_AUDITORIA_PBAC del API Gateway (TAL-178) y la matriz PBAC (TAL-222),
// donde solo el rol ADMINISTRADOR posee estos permisos sin depender de validaciones duras por nombre de rol.
export const PERMISOS_AUDITORIA = [
  'auditoria:ver',
  'usuarios:gestionar',
  'estadisticas:ver',
];

export const LIMITE_POR_DEFECTO_AUDITORIA = 20;
export const LIMITE_MAXIMO_AUDITORIA = 100;

export const OPCIONES_LIMITE_PAGINA = [10, 20, 50];

export const METODOS_HTTP_MUTANTES = ['POST', 'PUT', 'PATCH', 'DELETE'];

export const CATALOGO_MICROSERVICIOS = [
  {
    identificador: 'ms-auth',
    titulo: 'Autenticación y Usuarios',
    descripcion: 'Emisión JWT, roles PBAC y directorio institucional.',
  },
  {
    identificador: 'ms-incidencias',
    titulo: 'Incidencias y Órdenes',
    descripcion: 'Ciclo de vida de incidencias, órdenes y métricas MTTR.',
  },
  {
    identificador: 'ms-activos',
    titulo: 'Activos y Mantenimientos',
    descripcion: 'Inventario de infraestructura TI, trazabilidad y agenda.',
  },
  {
    identificador: 'ms-notificaciones',
    titulo: 'Notificaciones y Eventos',
    descripcion: 'Despacho de alertas en tiempo real y cola de auditoría.',
  },
];

export const OPCIONES_SERVICIO_DESTINO = [
  { valor: '', etiqueta: 'Todos los servicios' },
  ...CATALOGO_MICROSERVICIOS.map((microservicio) => ({
    valor: microservicio.identificador,
    etiqueta: `${microservicio.identificador} — ${microservicio.titulo}`,
  })),
  { valor: 'api-gateway', etiqueta: 'api-gateway — Controles de perímetro' },
];

export const OPCIONES_CODIGO_HTTP = [
  { valor: '', etiqueta: 'Todos los códigos' },
  { valor: '2xx', etiqueta: '2xx — Éxito' },
  { valor: '4xx', etiqueta: '4xx — Error de cliente' },
  { valor: '5xx', etiqueta: '5xx — Error de servidor' },
  { valor: 'error', etiqueta: 'Todos los errores (4xx / 5xx)' },
  { valor: '200', etiqueta: '200 — OK' },
  { valor: '201', etiqueta: '201 — Created' },
  { valor: '400', etiqueta: '400 — Bad Request' },
  { valor: '401', etiqueta: '401 — Unauthorized' },
  { valor: '403', etiqueta: '403 — Forbidden' },
  { valor: '404', etiqueta: '404 — Not Found' },
  { valor: '409', etiqueta: '409 — Conflict' },
  { valor: '500', etiqueta: '500 — Internal Server Error' },
  { valor: '502', etiqueta: '502 — Bad Gateway' },
  { valor: '503', etiqueta: '503 — Service Unavailable' },
];

export const tienePermisoAuditoria = (permisosPersonalizados = null) => {
  if (Array.isArray(permisosPersonalizados)) {
    return PERMISOS_AUDITORIA.some((permisoRequerido) =>
      permisosPersonalizados.includes(permisoRequerido),
    );
  }
  return hasPermission(PERMISOS_AUDITORIA);
};

export const normalizarEstadoSalud = (estadoCrudo) => {
  const estadoNormalizado = String(estadoCrudo || '')
    .trim()
    .toUpperCase();

  if (estadoNormalizado === 'UP' || estadoNormalizado === 'OK' || estadoNormalizado === 'HEALTHY') {
    return 'UP';
  }
  if (estadoNormalizado === 'DEGRADED' || estadoNormalizado === 'DEGRADADO') {
    return 'DEGRADED';
  }
  return 'DOWN';
};

export const redondearMilisegundos = (valorCrudo) => {
  if (valorCrudo === null || valorCrudo === undefined || valorCrudo === '') {
    return null;
  }
  const valorNumerico = Number(valorCrudo);
  if (!Number.isFinite(valorNumerico) || valorNumerico < 0) {
    return null;
  }
  return Math.round(valorNumerico * 100) / 100;
};

export const formatearLatenciaMilisegundos = (latenciaMilisegundos) => {
  const valorNormalizado = redondearMilisegundos(latenciaMilisegundos);
  if (valorNormalizado === null) {
    return 'N/D';
  }
  return `${valorNormalizado.toFixed(valorNormalizado >= 100 ? 0 : 1)} ms`;
};

export const formatearDuracionUptime = (segundosTotales) => {
  if (segundosTotales === null || segundosTotales === undefined || segundosTotales === '') {
    return 'N/D';
  }
  const segundosEnteros = Math.floor(Number(segundosTotales));
  if (!Number.isFinite(segundosEnteros) || segundosEnteros < 0) {
    return 'N/D';
  }
  const dias = Math.floor(segundosEnteros / 86400);
  const horas = Math.floor((segundosEnteros % 86400) / 3600);
  const minutos = Math.floor((segundosEnteros % 3600) / 60);
  const segundos = segundosEnteros % 60;

  if (dias > 0) {
    return `${dias}d ${horas}h ${minutos}m`;
  }
  if (horas > 0) {
    return `${horas}h ${minutos}m`;
  }
  if (minutos > 0) {
    return `${minutos}m ${segundos}s`;
  }
  return `${segundos}s`;
};

export const formatearFechaHoraAuditoria = (marcaTemporalIso) => {
  if (!marcaTemporalIso) {
    return { fecha: 'Sin fecha', hora: '--:--:--' };
  }
  const fechaObjeto = new Date(marcaTemporalIso);
  if (Number.isNaN(fechaObjeto.getTime())) {
    return { fecha: String(marcaTemporalIso), hora: '' };
  }

  return {
    fecha: fechaObjeto.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
    hora: fechaObjeto.toLocaleTimeString('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }),
  };
};

export const obtenerEstiloEstadoServicio = (estadoCrudo) => {
  const estado = normalizarEstadoSalud(estadoCrudo);
  if (estado === 'UP') {
    return {
      estado: 'UP',
      etiqueta: 'UP',
      descripcionEstado: 'Operativo',
      claseInsignia: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      clasePunto: 'bg-emerald-500',
      claseBordeTarjeta: 'border-emerald-200/80',
      claseFondoIcono: 'bg-emerald-50 text-emerald-700',
    };
  }
  if (estado === 'DEGRADED') {
    return {
      estado: 'DEGRADED',
      etiqueta: 'DEGRADED',
      descripcionEstado: 'Degradado',
      claseInsignia: 'bg-amber-50 text-amber-800 border-amber-200',
      clasePunto: 'bg-amber-500',
      claseBordeTarjeta: 'border-amber-200',
      claseFondoIcono: 'bg-amber-50 text-amber-700',
    };
  }
  return {
    estado: 'DOWN',
    etiqueta: 'DOWN',
    descripcionEstado: 'No disponible',
    claseInsignia: 'bg-red-50 text-red-800 border-red-200',
    clasePunto: 'bg-red-500',
    claseBordeTarjeta: 'border-red-200',
    claseFondoIcono: 'bg-red-50 text-red-700',
  };
};

export const obtenerEstiloCodigoHttp = (codigoCrudo) => {
  const codigoNumerico = Number(codigoCrudo);
  if (!Number.isFinite(codigoNumerico)) {
    return {
      codigo: 'N/D',
      categoria: 'desconocido',
      claseInsignia: 'bg-gray-100 text-gray-700 border-gray-200',
    };
  }

  if (codigoNumerico >= 200 && codigoNumerico < 300) {
    return {
      codigo: String(codigoNumerico),
      categoria: 'exito',
      claseInsignia: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    };
  }
  if (codigoNumerico >= 300 && codigoNumerico < 400) {
    return {
      codigo: String(codigoNumerico),
      categoria: 'redireccion',
      claseInsignia: 'bg-blue-50 text-blue-800 border-blue-200',
    };
  }
  if (codigoNumerico >= 400 && codigoNumerico < 500) {
    return {
      codigo: String(codigoNumerico),
      categoria: 'cliente',
      claseInsignia: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  }
  return {
    codigo: String(codigoNumerico),
    categoria: 'servidor',
    claseInsignia: 'bg-red-50 text-red-800 border-red-200',
  };
};

export const obtenerEstiloMetodoHttp = (metodoCrudo) => {
  const metodo = String(metodoCrudo || 'POST')
    .trim()
    .toUpperCase();

  switch (metodo) {
    case 'POST':
      return {
        metodo,
        claseInsignia: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      };
    case 'PUT':
      return {
        metodo,
        claseInsignia: 'bg-blue-50 text-blue-800 border-blue-200',
      };
    case 'PATCH':
      return {
        metodo,
        claseInsignia: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    case 'DELETE':
      return {
        metodo,
        claseInsignia: 'bg-red-50 text-red-800 border-red-200',
      };
    default:
      return {
        metodo,
        claseInsignia: 'bg-gray-100 text-gray-700 border-gray-200',
      };
  }
};

export const obtenerEstiloRolUsuario = (rolCrudo) => {
  const rolNormalizado = String(rolCrudo || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  if (rolNormalizado === 'ADMINISTRADOR' || rolNormalizado === 'ADMIN') {
    return 'bg-red-50 text-red-700 border-red-200';
  }
  if (rolNormalizado === 'SUPERVISOR' || rolNormalizado === 'COORDINADOR') {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  if (rolNormalizado === 'TECNICO') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (rolNormalizado === 'REPORTANTE') {
    return 'bg-purple-50 text-purple-700 border-purple-200';
  }
  return 'bg-gray-100 text-gray-600 border-gray-200';
};

export const construirParametrosConsultaAuditoria = (filtros = {}) => {
  const paginaParseada = Number.parseInt(String(filtros.pagina ?? filtros.page ?? 1), 10);
  const paginaSegura = Number.isFinite(paginaParseada) && paginaParseada >= 1 ? paginaParseada : 1;

  const limiteParseado = Number.parseInt(
    String(filtros.limite ?? filtros.limit ?? LIMITE_POR_DEFECTO_AUDITORIA),
    10,
  );
  const limiteSeguro = Number.isFinite(limiteParseado)
    ? Math.min(LIMITE_MAXIMO_AUDITORIA, Math.max(1, limiteParseado))
    : LIMITE_POR_DEFECTO_AUDITORIA;

  const parametros = {
    page: paginaSegura,
    limit: limiteSeguro,
  };

  const usuarioLimpio = String(filtros.usuario || '').trim();
  if (usuarioLimpio) {
    parametros.usuario = usuarioLimpio;
  }

  const servicioLimpio = String(filtros.servicio || '').trim();
  if (servicioLimpio) {
    parametros.servicio = servicioLimpio;
  }

  const metodoLimpio = String(filtros.metodo || '').trim().toUpperCase();
  if (metodoLimpio) {
    parametros.metodo = metodoLimpio;
  }

  const codigoHttpLimpio = String(filtros.codigoHttp ?? filtros.statusCode ?? '').trim();
  if (codigoHttpLimpio) {
    parametros.statusCode = codigoHttpLimpio;
  }

  const busquedaLibre = String(filtros.busqueda ?? filtros.search ?? '').trim();
  if (busquedaLibre) {
    parametros.search = busquedaLibre;
  }

  if (typeof filtros.incluirSalud === 'boolean') {
    parametros.includeHealth = filtros.incluirSalud;
  } else if (typeof filtros.includeHealth === 'boolean') {
    parametros.includeHealth = filtros.includeHealth;
  }

  return parametros;
};

export const normalizarMicroserviciosSalud = (listaCruda = []) => {
  const mapaPorNombre = new Map();
  if (Array.isArray(listaCruda)) {
    listaCruda.forEach((entrada) => {
      if (!entrada || typeof entrada !== 'object') return;
      const identificador = String(entrada.nombre || '').trim().toLowerCase();
      if (identificador) {
        mapaPorNombre.set(identificador, entrada);
      }
    });
  }

  return CATALOGO_MICROSERVICIOS.map((definicion) => {
    const datoRemoto = mapaPorNombre.get(definicion.identificador);
    if (!datoRemoto) {
      return {
        nombre: definicion.identificador,
        titulo: definicion.titulo,
        descripcion: definicion.descripcion,
        estado: 'DOWN',
        operativo: false,
        codigoHttp: null,
        latenciaMilisegundos: null,
        detalle: 'Sin telemetría de salud reportada por el API Gateway',
      };
    }

    const estadoNormalizado = normalizarEstadoSalud(datoRemoto.estado);
    return {
      nombre: definicion.identificador,
      titulo: definicion.titulo,
      descripcion: definicion.descripcion,
      estado: estadoNormalizado,
      operativo:
        typeof datoRemoto.operativo === 'boolean'
          ? datoRemoto.operativo
          : estadoNormalizado === 'UP',
      codigoHttp:
        datoRemoto.codigo_http !== undefined && datoRemoto.codigo_http !== null
          ? Number(datoRemoto.codigo_http)
          : null,
      latenciaMilisegundos: redondearMilisegundos(datoRemoto.latencia_ms),
      detalle: datoRemoto.detalle ? String(datoRemoto.detalle) : null,
    };
  });
};

export const normalizarRespuestaAuditoria = (respuestaCruda = {}) => {
  const registrosCrudos = Array.isArray(respuestaCruda?.data)
    ? respuestaCruda.data
    : Array.isArray(respuestaCruda?.datos)
      ? respuestaCruda.datos
      : [];

  const registros = registrosCrudos.map((registro, indice) => {
    const usuarioCrudo = registro?.usuario && typeof registro.usuario === 'object' ? registro.usuario : {};
    return {
      idAuditoria: String(registro?.id_auditoria || `auditoria-${indice}`),
      timestamp: registro?.timestamp ? String(registro.timestamp) : '',
      metodo: String(registro?.metodo || 'POST').toUpperCase(),
      ruta: String(registro?.ruta || '/api/v1/'),
      servicioDestino: String(registro?.servicio_destino || 'api-gateway'),
      accion: String(registro?.accion || 'EVENTO_SISTEMA'),
      entidad: String(registro?.entidad || 'sistema'),
      idEntidad: String(registro?.id_entidad || 'N/A'),
      codigoHttp: Number(registro?.status_code) || 0,
      latenciaMilisegundos: redondearMilisegundos(registro?.latencia_ms),
      ipOrigen: String(registro?.ip_origen || 'desconocida'),
      usuario: {
        id: String(usuarioCrudo.id || 'anonimo'),
        correo: usuarioCrudo.email ? String(usuarioCrudo.email) : null,
        rol: String(usuarioCrudo.rol || 'ANONIMO').toUpperCase(),
        autenticado: Boolean(usuarioCrudo.autenticado),
      },
    };
  });

  const paginacionCruda = respuestaCruda?.paginacion || {};
  const total = Math.max(0, Number(paginacionCruda.total) || 0);
  const limite = Math.max(1, Number(paginacionCruda.limit) || LIMITE_POR_DEFECTO_AUDITORIA);
  const totalPaginas = Math.max(
    1,
    Number(paginacionCruda.total_paginas) || Math.ceil(total / limite) || 1,
  );
  const pagina = Math.min(totalPaginas, Math.max(1, Number(paginacionCruda.page) || 1));

  const paginacion = {
    total,
    pagina,
    limite,
    totalPaginas,
    capacidadBuffer: Math.max(0, Number(paginacionCruda.capacidad_buffer) || 0),
    registrosEnBuffer: Math.max(0, Number(paginacionCruda.registros_en_buffer) || 0),
    almacenamientoEfimero: Boolean(paginacionCruda.almacenamiento_efimero),
  };

  const serviciosCrudos = respuestaCruda?.servicios || null;
  const servicios = serviciosCrudos
    ? {
        estadoGeneral: normalizarEstadoSalud(serviciosCrudos.estado_general),
        timestamp: serviciosCrudos.timestamp ? String(serviciosCrudos.timestamp) : null,
        gateway: serviciosCrudos.gateway
          ? {
              nombre: String(serviciosCrudos.gateway.nombre || 'api-gateway'),
              estado: normalizarEstadoSalud(serviciosCrudos.gateway.estado),
              operativo: Boolean(serviciosCrudos.gateway.operativo),
              uptimeSegundos: Number(serviciosCrudos.gateway.uptime_segundos) || 0,
            }
          : null,
        microservicios: normalizarMicroserviciosSalud(serviciosCrudos.microservicios),
      }
    : null;

  return {
    registros,
    paginacion,
    servicios,
  };
};

export const normalizarSaludGateway = (respuestaCruda = {}, latenciaMedidaMilisegundos = null) => {
  const estado = normalizarEstadoSalud(respuestaCruda?.status || respuestaCruda?.estado);
  const tieneUptime =
    respuestaCruda?.uptime !== null &&
    respuestaCruda?.uptime !== undefined &&
    respuestaCruda?.uptime !== '' &&
    Number.isFinite(Number(respuestaCruda.uptime));

  return {
    nombre: 'api-gateway',
    estado,
    operativo: estado === 'UP',
    uptimeSegundos: tieneUptime ? Math.round(Number(respuestaCruda.uptime)) : null,
    latenciaMilisegundos: redondearMilisegundos(latenciaMedidaMilisegundos),
    timestamp: respuestaCruda?.timestamp ? String(respuestaCruda.timestamp) : new Date().toISOString(),
    errorDetalle: null,
  };
};

export const extraerMensajeErrorAuditoria = (error) => {
  if (!error) {
    return 'No fue posible consultar la bitácora de auditoría.';
  }
  const estadoHttp = error.response?.status;
  if (estadoHttp === 401) {
    return 'Tu sesión ha expirado o el token JWT no es válido para consultar auditoría.';
  }
  if (estadoHttp === 403) {
    return 'Acceso denegado: tu cuenta no posee permisos PBAC administrativos para inspeccionar la auditoría.';
  }
  if (estadoHttp === 502 || estadoHttp === 503 || estadoHttp === 504) {
    return 'El API Gateway o los servicios de diagnóstico están temporalmente no disponibles.';
  }
  if (isNetworkOrTimeoutError(error)) {
    return 'Sin conectividad con el API Gateway. Verifica la red e intenta refrescar manualmente.';
  }
  return (
    error.response?.data?.mensaje ||
    error.response?.data?.message ||
    error.message ||
    'Ocurrió un error al consultar la bitácora de auditoría.'
  );
};

export const obtenerBitacoraAuditoria = async (filtros = {}) => {
  const parametros = construirParametrosConsultaAuditoria(filtros);
  // Se omite el manejador global de errores y la caché offline para que la consola administrativa
  // muestre siempre estado real de disponibilidad en pantalla sin redirigir a /500.
  const respuesta = await api.get('/auditoria', {
    params: parametros,
    skipGlobalErrorHandler: true,
    useOfflineCache: false,
  });
  return normalizarRespuestaAuditoria(respuesta.data);
};

export const obtenerSaludGateway = async () => {
  const marcaInicio =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();

  try {
    const respuesta = await api.get('/health', {
      skipGlobalErrorHandler: true,
      skipRetry: true,
      useOfflineCache: false,
    });
    const marcaFin =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();

    return normalizarSaludGateway(respuesta.data, marcaFin - marcaInicio);
  } catch (error) {
    const marcaFin =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();

    return {
      nombre: 'api-gateway',
      estado: 'DOWN',
      operativo: false,
      uptimeSegundos: null,
      latenciaMilisegundos: redondearMilisegundos(marcaFin - marcaInicio),
      timestamp: new Date().toISOString(),
      errorDetalle: extraerMensajeErrorAuditoria(error),
    };
  }
};
