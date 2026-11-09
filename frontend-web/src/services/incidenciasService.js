import api from './api';

/**
 * Obtiene el listado de incidencias reales desde el backend.
 * Utiliza paginación por defecto si no se especifican parámetros.
 */
export const fetchIncidencias = async (params = {}) => {
  const response = await api.get('/incidencias', { params });
  return response.data.data || response.data || [];
};

/**
 * Obtiene el listado de las incidencias más recientes (las últimas 5)
 */
export const fetchIncidenciasRecientes = async () => {
  try {
    // Parámetros para forzar límite en 5
    const response = await api.get('/incidencias', { params: { limit: 5, sort: 'desc' } });
    const data = response.data.data || response.data || [];
    return data;
  } catch {
    return [];
  }
};

/**
 * Crea una nueva incidencia en el backend a través del API Gateway.
 */
export const createIncidencia = async (payload) => {
  const response = await api.post('/incidencias', payload);
  return response.data;
};

/**
 * Exporta el historial de incidencias a Excel (.xlsx) o CSV.
 * Solicita los datos binarios en modo blob al backend
 * y fuerza la descarga en el navegador mediante window.URL.createObjectURL y <a> temporal.
 * 
 * @param {Object} [filtros={}] - Filtros opcionales para la exportación
 * @param {'xlsx'|'excel'|'csv'} [filtros.formato='xlsx'] - Formato de archivo deseado
 * @param {string} [filtros.id_activo] - Filtrar por UUID de activo
 * @param {number} [filtros.id_estado] - Filtrar por ID de estado
 * @param {string} [filtros.fecha_inicio] - Filtrar desde fecha (ISO)
 * @param {string} [filtros.fecha_fin] - Filtrar hasta fecha (ISO)
 * @returns {Promise<{ filename: string, totalBytes: number }>}
 */
export const exportarReporteIncidencias = async ({
  formato = 'xlsx',
  id_activo,
  id_estado,
  fecha_inicio,
  fecha_fin,
} = {}) => {
  const params = { formato };
  if (id_activo) params.id_activo = id_activo;
  if (id_estado !== undefined && id_estado !== null && id_estado !== '') {
    params.id_estado = id_estado;
  }
  if (fecha_inicio) params.fecha_inicio = fecha_inicio;
  if (fecha_fin) params.fecha_fin = fecha_fin;

  const response = await api.get('/incidencias/exportar', {
    params,
    responseType: 'blob',
  });

  // Intentar extraer el nombre del archivo desde el header Content-Disposition
  let filename = '';
  const disposition = response.headers?.['content-disposition'] || response.headers?.['Content-Disposition'];
  if (disposition && typeof disposition === 'string') {
    const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)["']?/i);
    if (match && match[1]) {
      filename = decodeURIComponent(match[1].trim());
    }
  }

  // Fallback si no viene el header
  if (!filename) {
    const timestamp = new Date().toISOString().slice(0, 10);
    filename = `reporte_incidencias_${timestamp}.${formato}`;
  }

  // Crear Blob y disparar la descarga por el navegador
  const blob = new Blob([response.data], {
    type:
      formato === 'csv'
        ? 'text/csv;charset=utf-8;'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  // Limpieza de memoria y DOM
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }, 150);

  return {
    filename,
    totalBytes: blob.size,
  };
};

// ============================================================================
// Helpers de sesión técnica y respaldo en memoria/localStorage para vistas
// de órdenes y cierre técnico.
// ============================================================================

const INCIDENCIAS_RESPALDO_KEY = 'scgi_incidencias_respaldo';
const TECNICO_STORAGE_KEY = 'tecnico_sesion_activa';

export const TECNICOS_EXISTENTES = [
  {
    id: 'tec-01',
    nombre: 'Carlos Ruiz',
    especialidad: 'Redes y Conectividad',
    turno: 'Mañana (08:00 - 16:00)',
    disponibilidad: 'Disponible',
    avatar: 'CR',
  },
  {
    id: 'tec-02',
    nombre: 'Ana Gómez',
    especialidad: 'Hardware y Servidores',
    turno: 'Tarde (14:00 - 22:00)',
    disponibilidad: 'Disponible',
    avatar: 'AG',
  },
  {
    id: 'tec-03',
    nombre: 'Matías Silva',
    especialidad: 'Software y Seguridad',
    turno: 'Mañana (08:00 - 16:00)',
    disponibilidad: 'En Tarea',
    avatar: 'MS',
  },
  {
    id: 'tec-04',
    nombre: 'Valentina Morales',
    especialidad: 'Soporte General e Infraestructura',
    turno: 'Tarde (14:00 - 22:00)',
    disponibilidad: 'Disponible',
    avatar: 'VM',
  },
  {
    id: 'tec-05',
    nombre: 'Diego Herrera',
    especialidad: 'Telecomunicaciones y Audio/Video',
    turno: 'Noche (22:00 - 06:00)',
    disponibilidad: 'Disponible',
    avatar: 'DH',
  },
];

const INCIDENCIAS_INICIALES = [
  {
    id: 'INC-1042',
    titulo: 'Fallo en sistema de correos',
    id_activo: 'SRV-MAIL-01',
    categoria: 'software',
    prioridad: 'Alta',
    estado: 'En Progreso',
    asignado: 'Carlos Ruiz',
    fecha: 'Hoy, 10:30',
    descripcion: 'Errores intermitentes al autenticar por IMAP/SMTP.',
    esTemporal: false,
    evidencias: [],
  },
  {
    id: 'INC-1041',
    titulo: 'Actualización y parches de base de datos',
    id_activo: 'SN-RC-1111-042',
    categoria: 'redes',
    prioridad: 'Media',
    estado: 'Pendiente',
    asignado: 'Sin asignar',
    fecha: 'Hoy, 08:15',
    descripcion: 'Ventana de mantenimiento programada para el router principal.',
    esTemporal: false,
    evidencias: [],
  },
];

function leerRespaldoLocal() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(INCIDENCIAS_RESPALDO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function guardarRespaldoLocal(lista) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(INCIDENCIAS_RESPALDO_KEY, JSON.stringify(lista));
  } catch {
    // Sin acción si el almacenamiento local no está disponible
  }
}

export function getIncidencias() {
  const guardadas = leerRespaldoLocal();
  if (Array.isArray(guardadas) && guardadas.length > 0) {
    const idsGuardados = new Set(guardadas.map((item) => item.id));
    const inicialesNoModificadas = INCIDENCIAS_INICIALES.filter((item) => !idsGuardados.has(item.id));
    return [...guardadas, ...inicialesNoModificadas];
  }
  return INCIDENCIAS_INICIALES;
}

export function saveIncidencia(nuevaIncidencia) {
  const guardadas = leerRespaldoLocal() || [];
  const itemConMetadata = {
    ...nuevaIncidencia,
    esTemporal: true,
    fecha: 'Recién creada',
    asignado: nuevaIncidencia.asignado || 'Sin asignar',
  };
  const listaActualizada = [itemConMetadata, ...guardadas];
  guardarRespaldoLocal(listaActualizada);
  return itemConMetadata;
}

export function completarMantenimientoTecnico({
  incidenciaId,
  ordenId,
  resolucion,
  horasInvertidas,
  materialesUsados = [],
  tecnicoNombre,
  tecnicoId,
}) {
  const guardadas = leerRespaldoLocal() || [];
  const todas = getIncidencias();
  const encontrada = todas.find((item) => item.id === incidenciaId);

  const fechaCierre = new Date().toLocaleString([], {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const incidenciaActualizada = {
    ...(encontrada || { id: incidenciaId, titulo: 'Mantenimiento Técnico', id_activo: 'ACT-01' }),
    estado: 'Completada',
    resolucion: resolucion.trim(),
    horasInvertidas: Number(horasInvertidas),
    materialesUsados: Array.isArray(materialesUsados) ? materialesUsados : [],
    fechaCierre,
    cerradoPor: tecnicoNombre || encontrada?.asignado || 'Técnico Responsable',
    cerradoPorId: tecnicoId || 'tec-01',
    ordenId: ordenId || `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
    esTemporal: true,
  };

  const listaSinPrevia = guardadas.filter((item) => item.id !== incidenciaId);
  guardarRespaldoLocal([incidenciaActualizada, ...listaSinPrevia]);
  return incidenciaActualizada;
}

export function rechazarIncidenciaTecnico({
  incidenciaId,
  ordenId,
  motivoRechazo,
  tecnicoNombre,
  tecnicoId,
}) {
  const guardadas = leerRespaldoLocal() || [];
  const todas = getIncidencias();
  const encontrada = todas.find((item) => item.id === incidenciaId);

  const fechaRechazo = new Date().toLocaleString([], {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const incidenciaActualizada = {
    ...(encontrada || { id: incidenciaId, titulo: 'Incidencia', id_activo: 'ACT-01' }),
    estado: 'RECHAZADO',
    motivoRechazo: motivoRechazo.trim(),
    motivo_rechazo: motivoRechazo.trim(),
    fechaRechazo,
    rechazadoPor: tecnicoNombre || encontrada?.asignado || 'Técnico Responsable',
    rechazadoPorId: tecnicoId || 'tec-01',
    ordenId: ordenId || encontrada?.ordenId || `ORD-${incidenciaId}`,
    esTemporal: true,
  };

  const listaSinPrevia = guardadas.filter((item) => item.id !== incidenciaId);
  guardarRespaldoLocal([incidenciaActualizada, ...listaSinPrevia]);
  return incidenciaActualizada;
}

export function getTecnicoActual() {
  try {
    if (typeof localStorage !== 'undefined') {
      const sesionManual = localStorage.getItem(TECNICO_STORAGE_KEY);
      if (sesionManual) {
        return JSON.parse(sesionManual);
      }

      const usuarioAuth = localStorage.getItem('usuario');
      if (usuarioAuth) {
        const u = JSON.parse(usuarioAuth);
        return {
          id: u.id_usuario || u.id || 'tec-01',
          nombre: `${u.nombre || ''} ${u.apellido || ''}`.trim() || u.email || 'Carlos Ruiz',
          email: u.correo || u.email || 'carlos.r@empresa.com',
          especialidad: 'Técnico de Soporte e Infraestructura',
          avatar: (u.nombre?.[0] || 'T').toUpperCase(),
        };
      }
    }
  } catch {
    // Fallback
  }
  return TECNICOS_EXISTENTES[0];
}

export function setTecnicoActual(tecnico) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TECNICO_STORAGE_KEY, JSON.stringify(tecnico));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('tecnico-cambiado'));
    }
  } catch {
    // Sin acción
  }
}

export function adjuntarEvidenciaIncidencia(incidenciaId, urlEvidencia, nombreArchivo = 'evidencia.webp') {
  const guardadas = leerRespaldoLocal() || [];
  const todas = getIncidencias();
  const encontrada = todas.find((item) => item.id === incidenciaId);

  const prevEvidencias = encontrada?.evidencias || [];
  const nuevaListaEvidencias = [...prevEvidencias, urlEvidencia];

  const incidenciaActualizada = {
    ...(encontrada || { id: incidenciaId, titulo: 'Incidencia', id_activo: 'N/A' }),
    evidencias: nuevaListaEvidencias,
    imagenAdjuntaNombre: nombreArchivo,
    esTemporal: true,
  };

  const listaSinPrevia = guardadas.filter((item) => item.id !== incidenciaId);
  guardarRespaldoLocal([incidenciaActualizada, ...listaSinPrevia]);
  return incidenciaActualizada;
}


