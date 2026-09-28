/**
 * Servicio de almacenamiento temporal mediante Cookies para pruebas del Frontend.
 * Permite persistir y recuperar incidencias creadas durante la sesión de pruebas
 * sin requerir conexión inmediata al backend o base de datos.
 */

const COOKIE_NAME = 'temp_incidencias';
const COOKIE_EXPIRY_DAYS = 1; // 24 horas de vigencia para pruebas

const INCIDENCIAS_INICIALES = [
  {
    id: 'INC-1042',
    titulo: 'Fallo en sistema de correos y exchange',
    id_activo: 'SRV-MAIL-01',
    categoria: 'software',
    prioridad: 'Alta',
    estado: 'En Progreso',
    asignado: 'Carlos Ruiz',
    fecha: 'Hoy, 10:30',
    descripcion: 'Errores intermitentes al autenticar por IMAP/SMTP y caídas de buzones.',
    esTemporal: false,
    orden_trabajo: {
      id_orden: 'ORD-2026-001',
      prioridad: 'Alta',
      estado: 'EnProceso',
      tecnico_id: 'tec-01',
      instrucciones: 'Revisar certificados TLS y cola de mensajes SMTP.',
    },
  },
  {
    id: 'INC-1041',
    titulo: 'Actualización y parches de base de datos',
    id_activo: 'SN-RC-1111-042',
    categoria: 'redes',
    prioridad: 'Media',
    estado: 'Pendiente',
    asignado: 'Ana Gómez',
    fecha: 'Hoy, 08:15',
    descripcion: 'Ventana de mantenimiento programada para el router principal.',
    esTemporal: false,
    orden_trabajo: {
      id_orden: 'ORD-2026-002',
      prioridad: 'Media',
      estado: 'Pendiente',
      tecnico_id: 'tec-02',
      instrucciones: 'Actualizar firmware a versión LTS recomendada.',
    },
  },
  {
    id: 'INC-1040',
    titulo: 'Alerta de sobrecalentamiento en servidor blade',
    id_activo: 'SRV-BLADE-07',
    categoria: 'hardware',
    prioridad: 'Alta',
    estado: 'Pendiente',
    asignado: 'Sin asignar',
    fecha: 'Hoy, 07:45',
    descripcion: 'Sensores térmicos del chasis B reportan temperaturas superiores a 78°C.',
    esTemporal: false,
    orden_trabajo: null,
  },
  {
    id: 'INC-1039',
    titulo: 'Limpieza preventiva y calibración de escáner',
    id_activo: 'SCN-DOC-03',
    categoria: 'hardware',
    prioridad: 'Baja',
    estado: 'Pendiente',
    asignado: 'Valentina Morales',
    fecha: 'Ayer, 16:20',
    descripcion: 'Mantenimiento semestral rutinario sin detención operativa.',
    esTemporal: false,
    orden_trabajo: {
      id_orden: 'ORD-2026-003',
      prioridad: 'Baja',
      estado: 'Pendiente',
      tecnico_id: 'tec-04',
      instrucciones: 'Limpieza óptica con alcohol isopropílico.',
    },
  },
  {
    id: 'INC-1038',
    titulo: 'Configuración de VLAN para impresoras de piso 3',
    id_activo: 'SW-ACC-03',
    categoria: 'redes',
    prioridad: 'Baja',
    estado: 'Pendiente',
    asignado: 'Sin asignar',
    fecha: 'Ayer, 14:10',
    descripcion: 'Segmentación de tráfico de periféricos hacia la subred de impresión.',
    esTemporal: false,
    orden_trabajo: null,
  },
];


/**
 * Lee una cookie por su nombre y parsea su valor JSON
 */
function getCookie(name) {
  try {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      const cookieVal = parts.pop().split(';').shift();
      return JSON.parse(decodeURIComponent(cookieVal));
    }
  } catch (error) {
    console.warn(`[Cookies] Error al leer cookie ${name}:`, error);
  }
  return null;
}

/**
 * Escribe una cookie con expiración en días y atributos seguros
 */
function setCookie(name, value, days = COOKIE_EXPIRY_DAYS) {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    const serialized = encodeURIComponent(JSON.stringify(value));
    document.cookie = `${name}=${serialized}; expires=${expires}; path=/; SameSite=Lax`;
  } catch (error) {
    console.error(`[Cookies] Error al guardar cookie ${name}:`, error);
  }
}

/**
 * Elimina una cookie expirándola
 */
function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}

/**
 * Obtiene todas las incidencias (combinando las de prueba de la cookie con las iniciales)
 */
export function getIncidencias() {
  const guardadasEnCookie = getCookie(COOKIE_NAME);
  if (Array.isArray(guardadasEnCookie) && guardadasEnCookie.length > 0) {
    return [...guardadasEnCookie, ...INCIDENCIAS_INICIALES];
  }
  return INCIDENCIAS_INICIALES;
}

/**
 * Guarda una nueva incidencia en la cookie temporal
 */
export function saveIncidencia(nuevaIncidencia) {
  const guardadasEnCookie = getCookie(COOKIE_NAME) || [];

  const itemConMetadata = {
    ...nuevaIncidencia,
    esTemporal: true,
    fecha: 'Recién creada',
    asignado: nuevaIncidencia.asignado || 'Sin asignar',
  };

  const listaActualizada = [itemConMetadata, ...guardadasEnCookie];
  setCookie(COOKIE_NAME, listaActualizada);
  return itemConMetadata;
}

export const TECNICOS_EXISTENTES = [
  {
    id: 'tec-01',
    nombre: 'Carlos Ruiz',
    especialidad: 'Redes y Conectividad',
    turno: 'Mañana (08:00 - 16:00)',
    disponibilidad: 'Disponible',
    avatar: 'CR'
  },
  {
    id: 'tec-02',
    nombre: 'Ana Gómez',
    especialidad: 'Hardware y Servidores',
    turno: 'Tarde (14:00 - 22:00)',
    disponibilidad: 'Disponible',
    avatar: 'AG'
  },
  {
    id: 'tec-03',
    nombre: 'Matías Silva',
    especialidad: 'Software y Seguridad',
    turno: 'Mañana (08:00 - 16:00)',
    disponibilidad: 'En Tarea',
    avatar: 'MS'
  },
  {
    id: 'tec-04',
    nombre: 'Valentina Morales',
    especialidad: 'Soporte General e Infraestructura',
    turno: 'Tarde (14:00 - 22:00)',
    disponibilidad: 'Disponible',
    avatar: 'VM'
  },
  {
    id: 'tec-05',
    nombre: 'Diego Herrera',
    especialidad: 'Telecomunicaciones y Audio/Video',
    turno: 'Noche (22:00 - 06:00)',
    disponibilidad: 'Disponible',
    avatar: 'DH'
  },
];

/**
 * Asigna un técnico a una incidencia existente y actualiza su prioridad
 */
export function asignarTecnicoIncidencia(incidenciaId, tecnicoNombre, notas = '', prioridad = '') {
  const guardadasEnCookie = getCookie(COOKIE_NAME) || [];
  const todas = getIncidencias();
  const encontrada = todas.find((item) => item.id === incidenciaId);

  const incidenciaActualizada = {
    ...(encontrada || { id: incidenciaId, titulo: 'Incidencia', id_activo: 'N/A' }),
    asignado: tecnicoNombre,
    estado: 'Asignada',
    ...(prioridad ? { prioridad } : {}),
    notasAsignacion: notas,
    fechaAsignacion: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    esTemporal: true,
  };

  // Reemplazar o insertar en la lista de cookies
  const listaSinPrevia = guardadasEnCookie.filter((item) => item.id !== incidenciaId);
  const nuevaLista = [incidenciaActualizada, ...listaSinPrevia];
  setCookie(COOKIE_NAME, nuevaLista);

  return incidenciaActualizada;
}


/**
 * Restablece las incidencias temporales a las originales
 */
export function clearTempIncidencias() {
  deleteCookie(COOKIE_NAME);
}

