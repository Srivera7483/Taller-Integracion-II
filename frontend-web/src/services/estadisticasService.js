import api, { isNetworkOrTimeoutError } from './api.js';
import { getUsuarioActual, hasPermission } from './authService.js';
import { obtenerActivosOffline, obtenerOrdenesOffline } from './storage/offlineDb.js';

/**
 * TAL-207: Servicio de consumo, normalización y blindaje arquitectónico de métricas analíticas:
 * 1. GET /api/v1/activos/estadisticas (TAL-6 — ms-activos)
 * 2. GET /api/v1/estadisticas/tiempo-resolucion y GET /api/v1/incidencias/estadisticas/tiempo-resolucion (TAL-128 — ms-incidencias)
 *
 * Cubre de forma no intrusiva (sin alterar microservicios de otros integrantes):
 * - Diagrama de Casos de Uso actualizado ("Visualizar métricas y KPIs" exclusivo de ADMINISTRADOR + permiso `estadisticas:ver`).
 * - Compatibilidad dual `camelCase` y `snake_case` (regla de nomenclatura OpenAPI).
 * - Compatibilidad con respuestas planas (TAL-6 actual) y estructuras relacionales del MER (`EDIFICIOS`, `UBICACIONES`, `CATEGORIAS`).
 * - Cálculo derivado de `tasaResolucion` cuando el backend no la incluye directamente.
 * - Fallback desde `/incidencias` si TAL-128 aún no ha sido fusionada en `dev` (404 en ambas rutas) y respaldo PWA Offline desde IndexedDB (TAL-195).
 */

const ETIQUETAS_CATEGORIA = {
  AUDIOVISUAL: 'Audiovisual',
  COMPUTO: 'Cómputo',
  REDES: 'Redes',
  ELECTRICO: 'Eléctrico',
  MOBILIARIO: 'Mobiliario',
  OTRO: 'Otro',
};

const redondear = (valor, decimales = 2) => {
  const num = Number(valor);
  if (!Number.isFinite(num)) return 0;
  const factor = 10 ** decimales;
  return Math.round(num * factor) / factor;
};

/**
 * Extrae el rol normalizado en mayúsculas sin tildes desde un objeto usuario.
 */
export const extraerRolNormalizado = (usuario = getUsuarioActual()) => {
  const rawRol = usuario?.rol?.nombre_rol || usuario?.rol || usuario?.role || '';
  return String(rawRol)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export const esRolAdministrador = (usuario = getUsuarioActual()) => {
  const rol = extraerRolNormalizado(usuario);
  return rol === 'ADMINISTRADOR' || rol === 'ADMIN';
};

/**
 * Alineado al Diagrama de Casos de Uso actualizado ("Visualizar métricas y KPIs" -> Actor Administrador)
 * y a TAL-97 / TAL-128: requiere el permiso granular `estadisticas:ver` y rol `ADMINISTRADOR`,
 * evitando exponer KPIs ni disparar errores 403 en sesiones de SUPERVISOR, TECNICO o REPORTANTE.
 */
export const puedeVisualizarMetricasKpis = (
  usuarioOverride = undefined,
  permisosOverride = null,
) => {
  const tienePermiso = Array.isArray(permisosOverride)
    ? permisosOverride.includes('estadisticas:ver')
    : hasPermission('estadisticas:ver');
  if (!tienePermiso) return false;

  const usuario = usuarioOverride !== undefined ? usuarioOverride : getUsuarioActual();
  return esRolAdministrador(usuario);
};

export const puedeVerEstadisticasActivos = (
  permisosOverride = null,
  usuarioOverride = undefined,
) => puedeVisualizarMetricasKpis(usuarioOverride, permisosOverride);

export const puedeVerMetricasMttr = (usuarioOverride = undefined, permisosOverride = null) =>
  puedeVisualizarMetricasKpis(usuarioOverride, permisosOverride);

export const formatearNombreCategoria = (clave = '') => {
  const limpia = String(clave || '').trim();
  if (!limpia) return 'Sin categoría';
  const upper = limpia.toUpperCase();
  if (ETIQUETAS_CATEGORIA[upper]) return ETIQUETAS_CATEGORIA[upper];
  return limpia.charAt(0).toUpperCase() + limpia.slice(1).toLowerCase();
};

export const extraerEdificioDeUbicacion = (ubicacion = '') => {
  const limpia = String(ubicacion || '').trim();
  if (!limpia) return 'Sin ubicación';
  const partes = limpia.split(' - ');
  return partes[0].trim() || limpia;
};

/**
 * Convierte tanto mapas planos `Record<string, number>` como arreglos relacionales del MER
 * (ej. `[{ nombre_categoria, total }]` o `[{ nombre_espacio, edificio: { nombre_edificio }, cantidad }]`)
 * en pares `[clave, total]`.
 */
const extraerEntradasConteo = (fuente, resolverClave) => {
  if (!fuente) return [];
  if (Array.isArray(fuente)) {
    const acumulado = new Map();
    fuente.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const clave = resolverClave(item);
      const cantidad = Math.max(
        0,
        Number(item.total ?? item.cantidad ?? item.count ?? item._count ?? 0) || 0,
      );
      if (clave && cantidad > 0) {
        acumulado.set(clave, (acumulado.get(clave) || 0) + cantidad);
      }
    });
    return Array.from(acumulado.entries());
  }
  if (typeof fuente === 'object') {
    return Object.entries(fuente);
  }
  return [];
};

/**
 * Normaliza la respuesta de GET /api/v1/activos/estadisticas (TAL-6), soportando
 * tanto `camelCase` como `snake_case` (OpenAPI) y estructuras planas o relacionales del MER.
 */
export const normalizarEstadisticasActivos = (raw, origenDatos = 'backend') => {
  const payload = raw?.datos || raw?.data || raw || {};
  const totalActivos = Math.max(
    0,
    Number(payload.totalActivos ?? payload.total_activos) || 0,
  );

  const porEstadoRaw = payload.porEstado || payload.por_estado || {};
  const operativos = Math.max(
    0,
    Number(porEstadoRaw.operativos ?? porEstadoRaw.OPERATIVO) || 0,
  );
  const enMantenimiento = Math.max(
    0,
    Number(
      porEstadoRaw.enMantenimiento ??
        porEstadoRaw.en_mantenimiento ??
        porEstadoRaw.EN_MANTENIMIENTO,
    ) || 0,
  );
  const enRevision = Math.max(
    0,
    Number(
      porEstadoRaw.enRevision ?? porEstadoRaw.en_revision ?? porEstadoRaw.EN_REVISION,
    ) || 0,
  );
  const dadosDeBaja = Math.max(
    0,
    Number(
      porEstadoRaw.dadosDeBaja ?? porEstadoRaw.dados_de_baja ?? porEstadoRaw.DADO_DE_BAJA,
    ) || 0,
  );

  const porcentajesRaw = payload.porcentajes || {};
  const calcularPct = (cantidad) =>
    totalActivos > 0 ? redondear((cantidad / totalActivos) * 100, 1) : 0;

  const tasaOpRaw = porcentajesRaw.tasaOperatividad ?? porcentajesRaw.tasa_operatividad;
  const tasaMantRaw = porcentajesRaw.tasaMantenimiento ?? porcentajesRaw.tasa_mantenimiento;
  const tasaRevRaw = porcentajesRaw.tasaRevision ?? porcentajesRaw.tasa_revision;
  const tasaBajaRaw = porcentajesRaw.tasaBaja ?? porcentajesRaw.tasa_baja;

  const porcentajes = {
    tasaOperatividad: tasaOpRaw !== undefined ? redondear(tasaOpRaw, 2) : calcularPct(operativos),
    tasaMantenimiento:
      tasaMantRaw !== undefined ? redondear(tasaMantRaw, 2) : calcularPct(enMantenimiento),
    tasaRevision: tasaRevRaw !== undefined ? redondear(tasaRevRaw, 2) : calcularPct(enRevision),
    tasaBaja: tasaBajaRaw !== undefined ? redondear(tasaBajaRaw, 2) : calcularPct(dadosDeBaja),
  };

  const entradasCategoria = extraerEntradasConteo(
    payload.porCategoria ?? payload.por_categoria,
    (item) => item.nombre_categoria || item.categoria || item.nombre || '',
  );
  const distribucionCategorias = entradasCategoria
    .map(([clave, valor]) => {
      const total = Math.max(0, Number(valor) || 0);
      return {
        clave,
        etiqueta: formatearNombreCategoria(clave),
        total,
        porcentaje: calcularPct(total),
      };
    })
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total || a.etiqueta.localeCompare(b.etiqueta));

  const entradasUbicacion = extraerEntradasConteo(
    payload.porUbicacion ?? payload.por_ubicacion,
    (item) => {
      const ed =
        item.edificio?.nombre_edificio || item.nombre_edificio || item.edificio || '';
      const esp = item.nombre_espacio || item.ubicacion || item.nombre || '';
      if (ed && esp) return `${ed} - ${esp}`;
      return esp || ed;
    },
  );

  const mapaEdificios = new Map();
  const distribucionUbicaciones = entradasUbicacion
    .map(([ubicacion, valor]) => {
      const total = Math.max(0, Number(valor) || 0);
      const edificio = extraerEdificioDeUbicacion(ubicacion);
      if (total > 0) {
        mapaEdificios.set(edificio, (mapaEdificios.get(edificio) || 0) + total);
      }
      return {
        etiqueta: ubicacion || 'Sin ubicación',
        edificio,
        total,
        porcentaje: calcularPct(total),
      };
    })
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total || a.etiqueta.localeCompare(b.etiqueta));

  // Si el backend provee explícitamente desglose relacional `porEdificio` / `por_edificio` (MER tabla EDIFICIOS), priorizarlo
  const entradasEdificioDirectas = extraerEntradasConteo(
    payload.porEdificio ?? payload.por_edificio,
    (item) => item.nombre_edificio || item.edificio || item.nombre || '',
  );
  if (entradasEdificioDirectas.length > 0) {
    mapaEdificios.clear();
    entradasEdificioDirectas.forEach(([edificio, valor]) => {
      const total = Math.max(0, Number(valor) || 0);
      if (edificio && total > 0) {
        mapaEdificios.set(edificio, (mapaEdificios.get(edificio) || 0) + total);
      }
    });
  }

  const distribucionEdificios = Array.from(mapaEdificios.entries())
    .map(([edificio, total]) => ({
      edificio,
      total,
      porcentaje: calcularPct(total),
    }))
    .sort((a, b) => b.total - a.total || a.edificio.localeCompare(b.edificio));

  const resumenRaw = payload.resumen || {};
  const disponibles =
    resumenRaw.disponibles !== undefined ? Number(resumenRaw.disponibles) || 0 : operativos;
  const noDispRaw = resumenRaw.noDisponibles ?? resumenRaw.no_disponibles;
  const noDisponibles =
    noDispRaw !== undefined ? Number(noDispRaw) || 0 : enMantenimiento + enRevision + dadosDeBaja;

  return {
    totalActivos,
    total_activos: totalActivos,
    porEstado: {
      operativos,
      enMantenimiento,
      enRevision,
      dadosDeBaja,
    },
    porcentajes,
    resumen: {
      disponibles,
      noDisponibles,
    },
    distribucionCategorias,
    distribucionUbicaciones,
    distribucionEdificios,
    origenDatos,
    estaVacio:
      totalActivos === 0 &&
      distribucionCategorias.length === 0 &&
      distribucionUbicaciones.length === 0,
  };
};

/**
 * Construye estadísticas de activos localmente a partir de una colección de activos (respaldo Offline IndexedDB).
 */
export const construirEstadisticasDesdeListaActivos = (activos = [], origenDatos = 'offline_indexeddb') => {
  const porCategoria = {};
  const porUbicacion = {};
  let operativos = 0;
  let enMantenimiento = 0;
  let enRevision = 0;
  let dadosDeBaja = 0;

  activos.forEach((act) => {
    const est = String(
      typeof act.estado === 'object' ? act.estado?.nombre_estado : act.estado || 'Operativo',
    )
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (est.includes('MANTENIMIENTO')) enMantenimiento += 1;
    else if (est.includes('REVISION')) enRevision += 1;
    else if (est.includes('BAJA')) dadosDeBaja += 1;
    else operativos += 1;

    const cat =
      typeof act.categoria === 'object'
        ? act.categoria?.nombre_categoria || 'General'
        : act.categoria || 'General';
    porCategoria[cat] = (porCategoria[cat] || 0) + 1;

    const ubi =
      typeof act.ubicacion === 'object'
        ? [act.ubicacion?.edificio?.nombre_edificio, act.ubicacion?.nombre_espacio]
            .filter(Boolean)
            .join(' - ') || 'Sin ubicación'
        : act.ubicacion || 'Sin ubicación';
    porUbicacion[ubi] = (porUbicacion[ubi] || 0) + 1;
  });

  return normalizarEstadisticasActivos(
    {
      totalActivos: activos.length,
      porEstado: { operativos, enMantenimiento, enRevision, dadosDeBaja },
      porCategoria,
      porUbicacion,
    },
    origenDatos,
  );
};

export const formatearHorasMttr = (horas) => {
  const num = redondear(horas, 2);
  if (num <= 0) return '0 h';
  return `${num} h`;
};

/**
 * Normaliza la respuesta de GET /api/v1/estadisticas/tiempo-resolucion (TAL-128),
 * soportando tanto `camelCase` como `snake_case` (OpenAPI) y calculando `tasaResolucion` cuando no viene explícita.
 */
export const normalizarMetricasTiempoResolucion = (raw, origenDatos = 'backend') => {
  const payload = raw?.datos || raw?.data || raw || {};
  const promedioHorasTotal = Math.max(
    0,
    redondear(payload.promedioHorasTotal ?? payload.promedio_horas_total, 2),
  );
  const totalOrdenesCerradas = Math.max(
    0,
    Number(payload.totalOrdenesCerradas ?? payload.total_ordenes_cerradas) || 0,
  );

  const conteoEstadoFuente = payload.conteoPorEstado ?? payload.conteo_por_estado;
  const conteoPorEstadoRaw =
    conteoEstadoFuente && typeof conteoEstadoFuente === 'object' ? conteoEstadoFuente : {};
  let totalIncidenciasGlobal = 0;
  let totalFinalizadasEstado = 0;

  const distribucionEstados = Object.entries(conteoPorEstadoRaw)
    .map(([estado, conteo]) => {
      const cantidad = Math.max(0, Number(conteo) || 0);
      totalIncidenciasGlobal += cantidad;
      const norm = estado.trim().toLowerCase();
      if (norm === 'resuelta' || norm === 'completada' || norm === 'cerrada') {
        totalFinalizadasEstado += cantidad;
      }
      return { estado, total: cantidad };
    })
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);

  const baseIncidencias = Math.max(totalIncidenciasGlobal, totalOrdenesCerradas);
  const numeradorResueltas =
    totalFinalizadasEstado > 0 ? totalFinalizadasEstado : totalOrdenesCerradas;
  const tasaExplicita = payload.tasaResolucion ?? payload.tasa_resolucion;
  const tasaResolucion =
    tasaExplicita !== undefined
      ? Math.min(100, Math.max(0, redondear(tasaExplicita, 1)))
      : baseIncidencias > 0
        ? Math.min(100, redondear((numeradorResueltas / baseIncidencias) * 100, 1))
        : 0;

  const conteoPrioFuente = payload.conteoPorPrioridad ?? payload.conteo_por_prioridad;
  const conteoPorPrioridadRaw =
    conteoPrioFuente && typeof conteoPrioFuente === 'object' ? conteoPrioFuente : {};
  const distribucionPrioridades = Object.entries(conteoPorPrioridadRaw)
    .map(([prioridad, conteo]) => ({
      prioridad,
      total: Math.max(0, Number(conteo) || 0),
    }))
    .filter((item) => item.total > 0);

  const listaTecnicosFuente = payload.desglosePorTecnico ?? payload.desglose_por_tecnico;
  const rawTecnicos = Array.isArray(listaTecnicosFuente) ? listaTecnicosFuente : [];
  const maxHorasTecnico = rawTecnicos.reduce(
    (max, t) => Math.max(max, Number(t?.promedioHoras ?? t?.promedio_horas) || 0),
    0,
  );
  const desglosePorTecnico = rawTecnicos
    .map((item, idx) => {
      const idTecnico = String(item?.id_tecnico || item?.idTecnico || `tec-${idx + 1}`);
      const promedioHoras = Math.max(
        0,
        redondear(item?.promedioHoras ?? item?.promedio_horas, 2),
      );
      const ordenes = Math.max(
        0,
        Number(item?.totalOrdenesCerradas ?? item?.total_ordenes_cerradas) || 0,
      );
      const nombreLimpio =
        typeof item?.nombre_tecnico === 'string' && item.nombre_tecnico.trim()
          ? item.nombre_tecnico.trim()
          : typeof item?.nombreTecnico === 'string' && item.nombreTecnico.trim()
            ? item.nombreTecnico.trim()
            : `Técnico ${idTecnico.substring(0, 8)}`;
      return {
        id_tecnico: idTecnico,
        nombre_tecnico: nombreLimpio,
        totalOrdenesCerradas: ordenes,
        promedioHoras,
        porcentajeBarra:
          maxHorasTecnico > 0
            ? Math.max(6, redondear((promedioHoras / maxHorasTecnico) * 100, 1))
            : 0,
      };
    })
    .sort(
      (a, b) => a.promedioHoras - b.promedioHoras || b.totalOrdenesCerradas - a.totalOrdenesCerradas,
    );

  const listaActivosFuente = payload.desglosePorActivo ?? payload.desglose_por_activo;
  const rawActivos = Array.isArray(listaActivosFuente) ? listaActivosFuente : [];
  const maxHorasActivo = rawActivos.reduce(
    (max, a) => Math.max(max, Number(a?.promedioHoras ?? a?.promedio_horas) || 0),
    0,
  );
  const desglosePorActivo = rawActivos
    .map((item, idx) => {
      const idActivo = String(item?.id_activo || item?.idActivo || `act-${idx + 1}`);
      const promedioHoras = Math.max(
        0,
        redondear(item?.promedioHoras ?? item?.promedio_horas, 2),
      );
      const ordenes = Math.max(
        0,
        Number(item?.totalOrdenesCerradas ?? item?.total_ordenes_cerradas) || 0,
      );
      const nombreLimpio =
        typeof item?.nombre_activo === 'string' && item.nombre_activo.trim()
          ? item.nombre_activo.trim()
          : typeof item?.nombreActivo === 'string' && item.nombreActivo.trim()
            ? item.nombreActivo.trim()
            : `Activo ${idActivo.substring(0, 8)}`;
      return {
        id_activo: idActivo,
        nombre_activo: nombreLimpio,
        totalOrdenesCerradas: ordenes,
        promedioHoras,
        porcentajeBarra:
          maxHorasActivo > 0
            ? Math.max(6, redondear((promedioHoras / maxHorasActivo) * 100, 1))
            : 0,
      };
    })
    .sort(
      (a, b) => b.promedioHoras - a.promedioHoras || b.totalOrdenesCerradas - a.totalOrdenesCerradas,
    );

  return {
    promedioHorasTotal,
    promedio_horas_total: promedioHorasTotal,
    mttrFormateado: formatearHorasMttr(promedioHorasTotal),
    totalOrdenesCerradas,
    total_ordenes_cerradas: totalOrdenesCerradas,
    totalIncidenciasGlobal: baseIncidencias,
    tasaResolucion,
    tasa_resolucion: tasaResolucion,
    distribucionEstados,
    distribucionPrioridades,
    desglosePorTecnico,
    desglosePorActivo,
    origenDatos,
    sinOrdenesResueltas: totalOrdenesCerradas === 0,
    estaVacio:
      totalOrdenesCerradas === 0 &&
      distribucionEstados.length === 0 &&
      distribucionPrioridades.length === 0,
  };
};

/**
 * Calcula métricas MTTR e indicadores a partir de una colección de incidencias
 * respetando estrictamente el MER (sin depender de columna `fecha_cierre` en ORDENES_TRABAJO:
 * usa la transición a "Resuelta" en historial o marca temporal disponible frente a `orden_trabajo.fecha_creacion`).
 */
export const construirMetricasDesdeIncidencias = (
  incidencias = [],
  origenDatos = 'fallback_incidencias',
) => {
  const conteoPorEstado = {};
  const conteoPorPrioridad = {};
  const acumuladorTecnicos = new Map();
  const acumuladorActivos = new Map();
  let sumaHorasTotal = 0;
  let totalCerradas = 0;

  incidencias.forEach((inc) => {
    const estadoNombre =
      typeof inc.estado === 'object' && inc.estado !== null
        ? inc.estado.nombre_estado || inc.estado.nombre || 'Reportada'
        : inc.estado || 'Reportada';
    conteoPorEstado[estadoNombre] = (conteoPorEstado[estadoNombre] || 0) + 1;

    const prio = String(inc.prioridad || 'media').toLowerCase();
    conteoPorPrioridad[prio] = (conteoPorPrioridad[prio] || 0) + 1;

    const ordenVigente =
      inc.orden_trabajo ||
      (Array.isArray(inc.ordenes_trabajo) && inc.ordenes_trabajo.length > 0
        ? inc.ordenes_trabajo[0]
        : null);

    const estadoLower = String(estadoNombre).trim().toLowerCase();
    const historial = Array.isArray(inc.historial_estados)
      ? inc.historial_estados
      : Array.isArray(inc.historial)
        ? inc.historial
        : [];
    const hitoResuelta = historial.find((h) => {
      const nom = h?.estado?.nombre_estado || h?.nombre_estado || h?.estado || '';
      return String(nom).trim().toLowerCase() === 'resuelta';
    });

    const esResuelta = Boolean(hitoResuelta) || estadoLower === 'resuelta';
    if (!ordenVigente || !esResuelta) return;

    const inicioMs = new Date(
      ordenVigente.fecha_creacion || inc.fecha_asignacion || inc.fecha_creacion || 0,
    ).getTime();
    const finMs = new Date(
      hitoResuelta?.fecha_creacion || inc.actualizado_en || ordenVigente.fecha_creacion || 0,
    ).getTime();

    const horas =
      Number.isFinite(inicioMs) && Number.isFinite(finMs) && finMs >= inicioMs
        ? redondear((finMs - inicioMs) / 3_600_000, 2)
        : 0;

    sumaHorasTotal += horas;
    totalCerradas += 1;

    const idTec = ordenVigente.id_tecnico || inc.id_tecnico;
    if (idTec) {
      const prevTec = acumuladorTecnicos.get(idTec) || {
        id_tecnico: idTec,
        nombre_tecnico: ordenVigente.nombre_tecnico || inc.nombre_tecnico || null,
        sumaHoras: 0,
        totalOrdenesCerradas: 0,
      };
      prevTec.sumaHoras += horas;
      prevTec.totalOrdenesCerradas += 1;
      acumuladorTecnicos.set(idTec, prevTec);
    }

    if (inc.id_activo) {
      const prevAct = acumuladorActivos.get(inc.id_activo) || {
        id_activo: inc.id_activo,
        nombre_activo: inc.nombre_activo || inc.codigo_qr_activo || null,
        sumaHoras: 0,
        totalOrdenesCerradas: 0,
      };
      prevAct.sumaHoras += horas;
      prevAct.totalOrdenesCerradas += 1;
      acumuladorActivos.set(inc.id_activo, prevAct);
    }
  });

  return normalizarMetricasTiempoResolucion(
    {
      promedioHorasTotal: totalCerradas > 0 ? redondear(sumaHorasTotal / totalCerradas, 2) : 0,
      totalOrdenesCerradas: totalCerradas,
      desglosePorTecnico: Array.from(acumuladorTecnicos.values()).map((t) => ({
        id_tecnico: t.id_tecnico,
        nombre_tecnico: t.nombre_tecnico,
        totalOrdenesCerradas: t.totalOrdenesCerradas,
        promedioHoras: redondear(t.sumaHoras / t.totalOrdenesCerradas, 2),
      })),
      desglosePorActivo: Array.from(acumuladorActivos.values()).map((a) => ({
        id_activo: a.id_activo,
        nombre_activo: a.nombre_activo,
        totalOrdenesCerradas: a.totalOrdenesCerradas,
        promedioHoras: redondear(a.sumaHoras / a.totalOrdenesCerradas, 2),
      })),
      conteoPorEstado,
      conteoPorPrioridad,
    },
    origenDatos,
  );
};

/**
 * Consume GET /api/v1/activos/estadisticas (TAL-6) con respaldo PWA Offline desde IndexedDB (TAL-195).
 */
export const fetchEstadisticasActivos = async (filtros = {}) => {
  const params = {};
  if (filtros.categoria) params.categoria = filtros.categoria;
  if (filtros.ubicacion) params.ubicacion = filtros.ubicacion;

  try {
    const response = await api.get('/activos/estadisticas', {
      params,
      skipGlobalErrorHandler: true,
    });
    return normalizarEstadisticasActivos(response.data, 'backend');
  } catch (error) {
    if (isNetworkOrTimeoutError(error) || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      const activosOffline = await obtenerActivosOffline(filtros).catch(() => []);
      if (activosOffline.length > 0) {
        return construirEstadisticasDesdeListaActivos(activosOffline, 'offline_indexeddb');
      }
    }
    throw error;
  }
};

/**
 * Consume GET /api/v1/estadisticas/tiempo-resolucion con:
 * 1. Fallback inmediato ante 404 hacia GET /api/v1/incidencias/estadisticas/tiempo-resolucion (alineado al proxy `/incidencias` del Diagrama de Software).
 * 2. Síntesis de respaldo desde `/incidencias?limite=50` únicamente si ambas rutas devuelven 404 (cuando TAL-128 aún no está desplegada en `dev`).
 * 3. Respaldo PWA Offline desde IndexedDB (`obtenerOrdenesOffline`) si no hay red.
 */
export const fetchMetricasTiempoResolucion = async () => {
  try {
    const response = await api.get('/estadisticas/tiempo-resolucion', {
      skipGlobalErrorHandler: true,
    });
    return normalizarMetricasTiempoResolucion(response.data, 'backend');
  } catch (errorPrimario) {
    if (errorPrimario?.response?.status === 404) {
      try {
        const fallbackResponse = await api.get('/incidencias/estadisticas/tiempo-resolucion', {
          skipGlobalErrorHandler: true,
        });
        return normalizarMetricasTiempoResolucion(fallbackResponse.data, 'backend');
      } catch (errorSecundario) {
        if (errorSecundario?.response?.status === 404) {
          const incResp = await api.get('/incidencias?limite=50', {
            skipGlobalErrorHandler: true,
          });
          const lista = incResp.data?.datos || incResp.data?.data || incResp.data || [];
          return construirMetricasDesdeIncidencias(
            Array.isArray(lista) ? lista : [],
            'fallback_incidencias',
          );
        }
        throw errorSecundario;
      }
    }

    if (
      isNetworkOrTimeoutError(errorPrimario) ||
      (typeof navigator !== 'undefined' && !navigator.onLine)
    ) {
      const ordenesOffline = await obtenerOrdenesOffline().catch(() => []);
      if (ordenesOffline.length > 0) {
        return construirMetricasDesdeIncidencias(ordenesOffline, 'offline_indexeddb');
      }
    }

    throw errorPrimario;
  }
};
