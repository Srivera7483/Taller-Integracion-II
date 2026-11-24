/**
 * TAL-195: Implementación de IndexedDB en Frontend para Catálogo Offline.
 *
 * Almacena localmente en el navegador del técnico:
 * - `activos`: Catálogo de activos institucionales para consulta instantánea sin conexión.
 * - `ordenes`: Órdenes de trabajo asignadas e incidencias operativas del técnico.
 * - `estados`: Catálogo de estados de incidencias, órdenes y activos.
 * - `cola_acciones`: Cola persistente de mutaciones/acciones diferidas creadas sin conexión (base para TAL-196 y TAL-198).
 */

export const OFFLINE_DB_NAME = 'inframanager_offline_db';
// v2 (TAL-196): agrega la tienda `sync_meta` con las credenciales que usa el Service Worker.
export const OFFLINE_DB_VERSION = 2;

export const STORE_NAMES = Object.freeze({
  ACTIVOS: 'activos',
  ORDENES: 'ordenes',
  ESTADOS: 'estados',
  COLA_ACCIONES: 'cola_acciones',
  SYNC_META: 'sync_meta',
});

export const ESTADOS_CATALOGO_POR_DEFECTO = Object.freeze([
  { id: 'est-inc-1', id_estado: 1, nombre_estado: 'Reportada', tipo: 'incidencia' },
  { id: 'est-inc-2', id_estado: 2, nombre_estado: 'Pendiente', tipo: 'incidencia' },
  { id: 'est-inc-3', id_estado: 3, nombre_estado: 'Asignada', tipo: 'incidencia' },
  { id: 'est-inc-4', id_estado: 4, nombre_estado: 'En Progreso', tipo: 'incidencia' },
  { id: 'est-inc-5', id_estado: 5, nombre_estado: 'Completada', tipo: 'incidencia' },
  { id: 'est-inc-6', id_estado: 6, nombre_estado: 'Resuelta', tipo: 'incidencia' },
  { id: 'est-inc-7', id_estado: 7, nombre_estado: 'Rechazado', tipo: 'incidencia' },
  { id: 'est-inc-8', id_estado: 8, nombre_estado: 'Cerrada', tipo: 'incidencia' },
  { id: 'est-act-1', id_estado_activo: 1, nombre_estado: 'Operativo', tipo: 'activo' },
  { id: 'est-act-2', id_estado_activo: 2, nombre_estado: 'En Mantenimiento', tipo: 'activo' },
  { id: 'est-act-3', id_estado_activo: 3, nombre_estado: 'En Revisión', tipo: 'activo' },
  { id: 'est-act-4', id_estado_activo: 4, nombre_estado: 'Dado de Baja', tipo: 'activo' },
]);

export const OFFLINE_DB_SCHEMA = Object.freeze({
  dbName: OFFLINE_DB_NAME,
  version: OFFLINE_DB_VERSION,
  stores: Object.freeze({
    [STORE_NAMES.ACTIVOS]: Object.freeze({
      keyPath: 'id',
      indexes: Object.freeze([
        { name: 'id_activo', keyPath: 'id_activo', unique: false },
        { name: 'codigo_qr', keyPath: 'codigo_qr', unique: false },
        { name: 'codigoQr', keyPath: 'codigoQr', unique: false },
        { name: 'id_estado_activo', keyPath: 'id_estado_activo', unique: false },
        { name: 'id_categoria', keyPath: 'id_categoria', unique: false },
        { name: 'id_ubicacion', keyPath: 'id_ubicacion', unique: false },
        { name: 'categoria', keyPath: 'categoria', unique: false },
        { name: 'estado', keyPath: 'estado', unique: false },
        { name: 'ubicacion', keyPath: 'ubicacion', unique: false },
      ]),
    }),
    [STORE_NAMES.ORDENES]: Object.freeze({
      keyPath: 'id',
      indexes: Object.freeze([
        { name: 'id_incidencia', keyPath: 'id_incidencia', unique: false },
        { name: 'id_orden', keyPath: 'id_orden', unique: false },
        { name: 'id_tecnico', keyPath: 'id_tecnico', unique: false },
        { name: 'id_activo', keyPath: 'id_activo', unique: false },
        { name: 'id_reportante', keyPath: 'id_reportante', unique: false },
        { name: 'id_estado', keyPath: 'id_estado', unique: false },
        { name: 'estado', keyPath: 'estado_normalizado', unique: false },
      ]),
    }),
    [STORE_NAMES.ESTADOS]: Object.freeze({
      keyPath: 'id',
      indexes: Object.freeze([
        { name: 'id_estado', keyPath: 'id_estado', unique: false },
        { name: 'id_estado_activo', keyPath: 'id_estado_activo', unique: false },
        { name: 'tipo', keyPath: 'tipo', unique: false },
        { name: 'nombre_estado', keyPath: 'nombre_estado', unique: false },
      ]),
    }),
    [STORE_NAMES.COLA_ACCIONES]: Object.freeze({
      keyPath: 'id',
      indexes: Object.freeze([
        { name: 'estado_sincronizacion', keyPath: 'estado_sincronizacion', unique: false },
        { name: 'creado_en', keyPath: 'creado_en', unique: false },
        { name: 'endpoint', keyPath: 'endpoint', unique: false },
      ]),
    }),
    [STORE_NAMES.SYNC_META]: Object.freeze({
      keyPath: 'id',
      indexes: Object.freeze([]),
    }),
  }),
});

/**
 *orna la definición formal del esquema de IndexedDB para inspección y pruebas.
 */
export const getOfflineDbSchema = () => OFFLINE_DB_SCHEMA;

/**
 * Clona un objeto de forma segura para persistencia en IndexedDB.
 */
const clonarRegistro = (valor) => {
  if (valor === null || typeof valor !== 'object') return valor;
  try {
    return JSON.parse(JSON.stringify(valor));
  } catch {
    return { ...valor };
  }
};

/**
 * Implementación compatible con el estándar W3C IndexedDB en memoria para entornos
 * donde `globalThis.indexedDB` no está disponible (Node.js Test Runner, SSR o modo restringido).
 * Ejecuta exactamente el mismo flujo de `open`, `onupgradeneeded`, `createObjectStore`,
 * `createIndex`, `transaction` e `IDBRequest` que el navegador real.
 */
export const createInMemoryIndexedDB = () => {
  const databases = new Map();

  const createRequest = (executor) => {
    const req = {
      result: undefined,
      error: null,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    };

    queueMicrotask(() => {
      try {
        executor(req);
      } catch (err) {
        req.error = err;
        if (typeof req.onerror === 'function') {
          req.onerror({ target: req, error: err });
        }
      }
    });

    return req;
  };

  return {
    open(name, version = 1) {
      return createRequest((req) => {
        let dbEntry = databases.get(name);
        const isUpgrade = !dbEntry || dbEntry.version < version;

        if (!dbEntry) {
          dbEntry = {
            name,
            version,
            stores: new Map(),
          };
          databases.set(name, dbEntry);
        } else if (isUpgrade) {
          dbEntry.version = version;
        }

        const createStoreHandle = (storeMeta) => ({
          name: storeMeta.name,
          keyPath: storeMeta.keyPath,
          indexNames: {
            contains: (idxName) => storeMeta.indexes.has(idxName),
          },
          createIndex(indexName, keyPath, options = {}) {
            storeMeta.indexes.set(indexName, {
              name: indexName,
              keyPath,
              unique: Boolean(options.unique),
            });
            return storeMeta.indexes.get(indexName);
          },
          put(value) {
            return createRequest((opReq) => {
              const cloned = clonarRegistro(value);
              const key = cloned?.[storeMeta.keyPath];
              if (key === undefined || key === null || key === '') {
                throw new Error(`Clave primaria '${storeMeta.keyPath}' inválida en tienda '${storeMeta.name}'`);
              }
              storeMeta.records.set(String(key), cloned);
              opReq.result = key;
              if (typeof opReq.onsuccess === 'function') {
                opReq.onsuccess({ target: opReq });
              }
            });
          },
          get(key) {
            return createRequest((opReq) => {
              const found = storeMeta.records.get(String(key));
              opReq.result = found ? clonarRegistro(found) : undefined;
              if (typeof opReq.onsuccess === 'function') {
                opReq.onsuccess({ target: opReq });
              }
            });
          },
          getAll() {
            return createRequest((opReq) => {
              opReq.result = Array.from(storeMeta.records.values()).map(clonarRegistro);
              if (typeof opReq.onsuccess === 'function') {
                opReq.onsuccess({ target: opReq });
              }
            });
          },
          delete(key) {
            return createRequest((opReq) => {
              storeMeta.records.delete(String(key));
              opReq.result = undefined;
              if (typeof opReq.onsuccess === 'function') {
                opReq.onsuccess({ target: opReq });
              }
            });
          },
          clear() {
            return createRequest((opReq) => {
              storeMeta.records.clear();
              opReq.result = undefined;
              if (typeof opReq.onsuccess === 'function') {
                opReq.onsuccess({ target: opReq });
              }
            });
          },
        });

        const db = {
          name: dbEntry.name,
          version: dbEntry.version,
          objectStoreNames: {
            contains: (storeName) => dbEntry.stores.has(storeName),
          },
          createObjectStore(storeName, options = { keyPath: 'id' }) {
            const storeMeta = {
              name: storeName,
              keyPath: options.keyPath || 'id',
              indexes: new Map(),
              records: new Map(),
            };
            dbEntry.stores.set(storeName, storeMeta);
            return createStoreHandle(storeMeta);
          },
          transaction(storeNames) {
            const names = Array.isArray(storeNames) ? storeNames : [storeNames];
            names.forEach((n) => {
              if (!dbEntry.stores.has(n)) {
                throw new Error(`ObjectStore '${n}' no existe en '${dbEntry.name}'`);
              }
            });
            return {
              objectStore(storeName) {
                const storeMeta = dbEntry.stores.get(storeName);
                if (!storeMeta) {
                  throw new Error(`ObjectStore '${storeName}' no disponible en la transacción`);
                }
                return createStoreHandle(storeMeta);
              },
            };
          },
          close() {},
        };

        req.result = db;
        if (isUpgrade && typeof req.onupgradeneeded === 'function') {
          req.onupgradeneeded({ target: req });
        }
        if (typeof req.onsuccess === 'function') {
          req.onsuccess({ target: req });
        }
      });
    },
    deleteDatabase(name) {
      return createRequest((req) => {
        databases.delete(name);
        req.result = undefined;
        if (typeof req.onsuccess === 'function') {
          req.onsuccess({ target: req });
        }
      });
    },
  };
};

const fallbackIndexedDB = createInMemoryIndexedDB();
let customIndexedDBProvider = null;
let cachedDbPromise = null;

/**
 * Permite inyectar un proveedor IndexedDB personalizado en pruebas unitarias.
 */
export const setIndexedDBProvider = (provider) => {
  customIndexedDBProvider = provider || null;
  cachedDbPromise = null;
};

/**
 * Obtiene la instancia activa de IndexedDB (nativa del navegador o fallback en memoria).
 */
export const getIndexedDBProvider = () => {
  if (customIndexedDBProvider) return customIndexedDBProvider;
  if (typeof globalThis !== 'undefined' && globalThis.indexedDB) {
    return globalThis.indexedDB;
  }
  if (typeof window !== 'undefined' && window.indexedDB) {
    return window.indexedDB;
  }
  return fallbackIndexedDB;
};

/**
 * Configura las tiendas de objetos e índices durante el evento `onupgradeneeded`.
 */
const inicializarEsquemaIndexedDB = (db) => {
  Object.entries(OFFLINE_DB_SCHEMA.stores).forEach(([storeName, storeConfig]) => {
    if (!db.objectStoreNames.contains(storeName)) {
      const store = db.createObjectStore(storeName, { keyPath: storeConfig.keyPath });
      storeConfig.indexes.forEach((idx) => {
        if (!store.indexNames || !store.indexNames.contains(idx.name)) {
          store.createIndex(idx.name, idx.keyPath, { unique: idx.unique });
        }
      });
    }
  });
};

/**
 * Abre la conexión a IndexedDB asegurando la creación de las tiendas `activos`, `ordenes`, `estados` y `cola_acciones`.
 * @returns {Promise<IDBDatabase>}
 */
export const openOfflineDb = () => {
  if (cachedDbPromise) {
    return cachedDbPromise;
  }

  cachedDbPromise = new Promise((resolve, reject) => {
    try {
      const idb = getIndexedDBProvider();
      const request = idb.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event?.target?.result || request.result;
        inicializarEsquemaIndexedDB(db);
      };

      request.onsuccess = (event) => {
        const db = event?.target?.result || request.result;
        // Permite que otra pestaña o el Service Worker actualicen el esquema sin quedar bloqueados.
        db.onversionchange = () => {
          cachedDbPromise = null;
          if (typeof db.close === 'function') db.close();
        };
        resolve(db);
      };

      request.onerror = (event) => {
        cachedDbPromise = null;
        reject(event?.target?.error || request.error || new Error('Error al abrir IndexedDB'));
      };
    } catch (err) {
      cachedDbPromise = null;
      reject(err);
    }
  });

  return cachedDbPromise;
};

/**
 * Ejecuta una promesa sobre un IDBRequest estándar.
 */
const ejecutarRequest = (idbRequest) =>
  new Promise((resolve, reject) => {
    idbRequest.onsuccess = (event) => {
      resolve(event?.target?.result !== undefined ? event.target.result : idbRequest.result);
    };
    idbRequest.onerror = (event) => {
      reject(
        event?.target?.error ||
          idbRequest.error ||
          new Error('Error ejecutando operación en IndexedDB'),
      );
    };
  });

/**
 * Notifica eventos del almacenamiento offline al entorno navegador si existe `window`.
 */
const emitirEventoOffline = (nombreEvento, detail = {}) => {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      const evt =
        typeof CustomEvent === 'function'
          ? new CustomEvent(nombreEvento, { detail })
          : { type: nombreEvento, detail };
      window.dispatchEvent(evt);
    } catch {
      // Ignorar en entornos sin DOM Event completo
    }
  }
};

// ---------------------------------------------------------------------------
// Normalizadores de Entidades (Activos, Órdenes/Incidencias, Estados)
// ---------------------------------------------------------------------------

export const normalizarActivoOffline = (activo) => {
  if (!activo || typeof activo !== 'object') return null;
  const idRaw = activo.id || activo.id_activo || activo.codigoQr || activo.codigo_qr;
  if (!idRaw) return null;
  const id = String(idRaw).trim();
  if (!id) return null;

  const estadoTexto =
    typeof activo.estado === 'object'
      ? activo.estado?.nombre_estado || activo.estado?.nombre || 'Operativo'
      : activo.estado || 'Operativo';

  const idEstadoActivo =
    activo.id_estado_activo ??
    (typeof activo.estado === 'object' ? activo.estado?.id_estado_activo : null) ??
    null;

  const idCategoria =
    activo.id_categoria ??
    (typeof activo.categoria === 'object' ? activo.categoria?.id_categoria : null) ??
    null;

  const idUbicacion =
    activo.id_ubicacion ??
    (typeof activo.ubicacion === 'object' ? activo.ubicacion?.id_ubicacion : null) ??
    null;

  const numeroSerie = activo.numero_serie || activo.numeroSerie || null;

  return {
    ...clonarRegistro(activo),
    id,
    id_activo: activo.id_activo || id,
    codigo_qr: activo.codigo_qr || activo.codigoQr || id,
    codigoQr: activo.codigoQr || activo.codigo_qr || id,
    nombre: activo.nombre || `Activo ${id}`,
    descripcion: activo.descripcion ?? null,
    marca: activo.marca ?? null,
    modelo: activo.modelo ?? null,
    numero_serie: numeroSerie,
    numeroSerie,
    id_estado_activo: idEstadoActivo,
    id_categoria: idCategoria,
    id_ubicacion: idUbicacion,
    estado_objeto: typeof activo.estado === 'object' ? clonarRegistro(activo.estado) : null,
    categoria_objeto:
      typeof activo.categoria === 'object' ? clonarRegistro(activo.categoria) : null,
    ubicacion_objeto:
      typeof activo.ubicacion === 'object' ? clonarRegistro(activo.ubicacion) : null,
    categoria:
      typeof activo.categoria === 'object'
        ? activo.categoria?.nombre_categoria || activo.categoria?.nombre || 'General'
        : activo.categoria || 'General',
    ubicacion:
      typeof activo.ubicacion === 'object'
        ? activo.ubicacion?.nombre_espacio || activo.ubicacion?.nombre || 'Sin ubicación'
        : activo.ubicacion || 'Sin ubicación',
    estado: estadoTexto,
    fecha_creacion: activo.fecha_creacion || new Date().toISOString(),
    fecha_eliminacion: activo.fecha_eliminacion ?? null,
    actualizado_en: activo.actualizado_en || new Date().toISOString(),
  };
};

export const normalizarOrdenOffline = (orden) => {
  if (!orden || typeof orden !== 'object') return null;
  const ordenTrabajo =
    orden.orden_trabajo ||
    (Array.isArray(orden.ordenes_trabajo) && orden.ordenes_trabajo.length > 0
      ? orden.ordenes_trabajo[0]
      : null);

  const idRaw =
    orden.id ||
    orden.id_incidencia ||
    orden.id_orden ||
    ordenTrabajo?.id_orden ||
    orden.incidencia_id;
  if (!idRaw) return null;
  const id = String(idRaw).trim();
  if (!id) return null;

  const idIncidencia = String(
    orden.id_incidencia || orden.incidencia_id || ordenTrabajo?.id_incidencia || id,
  );
  const idOrden = String(orden.id_orden || ordenTrabajo?.id_orden || id);
  const idTecnico =
    orden.id_tecnico ||
    orden.id_tecnico_asignado ||
    ordenTrabajo?.id_tecnico ||
    orden.tecnico_id ||
    null;

  const idEstado =
    orden.id_estado ??
    (typeof orden.estado === 'object' ? orden.estado?.id_estado : null) ??
    null;

  const estadoNormalizado =
    typeof orden.estado === 'object'
      ? orden.estado?.nombre_estado || orden.estado?.nombre || 'Pendiente'
      : orden.estado || 'Pendiente';

  const diagnosticoTecnico =
    orden.diagnostico_tecnico ??
    ordenTrabajo?.diagnostico_tecnico ??
    orden.resolucion ??
    null;

  return {
    ...clonarRegistro(orden),
    id,
    id_incidencia: idIncidencia,
    id_orden: idOrden,
    id_tecnico: idTecnico ? String(idTecnico) : null,
    id_activo: orden.id_activo || orden.incidencia?.id_activo || null,
    id_reportante: orden.id_reportante || orden.incidencia?.id_reportante || null,
    id_estado: idEstado,
    prioridad: orden.prioridad || 'media',
    diagnostico_tecnico: diagnosticoTecnico,
    evidencias: Array.isArray(orden.evidencias) ? orden.evidencias : [],
    estado_normalizado: estadoNormalizado,
    fecha_creacion:
      orden.fecha_creacion || ordenTrabajo?.fecha_creacion || new Date().toISOString(),
    actualizado_en: orden.actualizado_en || new Date().toISOString(),
  };
};

export const normalizarEstadoOffline = (estado, tipoPorDefecto = 'incidencia') => {
  if (!estado) return null;
  if (typeof estado === 'string') {
    const limp = estado.trim();
    if (!limp) return null;
    return {
      id: `est-${tipoPorDefecto}-${limp.toLowerCase().replace(/\s+/g, '_')}`,
      nombre_estado: limp,
      tipo: tipoPorDefecto,
      actualizado_en: new Date().toISOString(),
    };
  }
  if (typeof estado === 'object') {
    const nombre = estado.nombre_estado || estado.nombre || '';
    const tipo = estado.tipo || (estado.id_estado_activo ? 'activo' : tipoPorDefecto);
    const idRaw =
      estado.id ||
      (estado.id_estado ? `est-inc-${estado.id_estado}` : null) ||
      (estado.id_estado_activo ? `est-act-${estado.id_estado_activo}` : null) ||
      (nombre ? `est-${tipo}-${String(nombre).toLowerCase().replace(/\s+/g, '_')}` : null);
    if (!idRaw) return null;
    return {
      ...clonarRegistro(estado),
      id: String(idRaw),
      nombre_estado: nombre || String(idRaw),
      tipo,
      actualizado_en: new Date().toISOString(),
    };
  }
  return null;
};

// ---------------------------------------------------------------------------
// 1. Tienda `activos`: Catálogo de Activos Offline
// ---------------------------------------------------------------------------

/**
 * Guarda o actualiza en segundo plano una lista (o elemento único) de activos en IndexedDB.
 * Extrae y persiste además los estados de activos detectados.
 * @param {Array<Object>|Object} activosInput
 * @returns {Promise<Array<Object>>} Activos normalizados guardados
 */
export const guardarActivosOffline = async (activosInput = []) => {
  const lista = Array.isArray(activosInput) ? activosInput : [activosInput];
  const normalizados = lista.map(normalizarActivoOffline).filter(Boolean);
  if (normalizados.length === 0) return [];

  const db = await openOfflineDb();
  const tx = db.transaction([STORE_NAMES.ACTIVOS, STORE_NAMES.ESTADOS], 'readwrite');
  const storeActivos = tx.objectStore(STORE_NAMES.ACTIVOS);
  const storeEstados = tx.objectStore(STORE_NAMES.ESTADOS);

  const estadosExtraidos = new Map();
  for (const item of normalizados) {
    await ejecutarRequest(storeActivos.put(item));
    const fuenteEstado = item.estado_objeto || item.estado;
    if (fuenteEstado) {
      const est = normalizarEstadoOffline(fuenteEstado, 'activo');
      if (est) estadosExtraidos.set(est.id, est);
    }
  }

  for (const est of estadosExtraidos.values()) {
    await ejecutarRequest(storeEstados.put(est));
  }

  emitirEventoOffline('offline-activos-updated', { total: normalizados.length });
  return normalizados;
};

/**
 * Consulta el catálogo de activos almacenado en IndexedDB con soporte de filtros locales.
 * @param {Object} [filtros]
 * @param {string} [filtros.busqueda]
 * @param {string} [filtros.categoria]
 * @param {string} [filtros.estado]
 * @param {string} [filtros.id_activo]
 * @returns {Promise<Array<Object>>}
 */
export const obtenerActivosOffline = async (filtros = {}) => {
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_NAMES.ACTIVOS, 'readonly');
  const store = tx.objectStore(STORE_NAMES.ACTIVOS);
  const registros = (await ejecutarRequest(store.getAll())) || [];

  const filtrados = registros.filter((item) => {
    const idTarget = filtros.id_activo || filtros.codigo_qr || filtros.codigoQr;
    if (idTarget) {
      const target = String(idTarget).toLowerCase();
      const coincideId =
        String(item.id || '').toLowerCase() === target ||
        String(item.id_activo || '').toLowerCase() === target ||
        String(item.codigo_qr || '').toLowerCase() === target ||
        String(item.codigoQr || '').toLowerCase() === target;
      if (!coincideId) return false;
    }
    if (filtros.id_categoria !== undefined && filtros.id_categoria !== null && filtros.id_categoria !== '') {
      if (Number(item.id_categoria) !== Number(filtros.id_categoria)) return false;
    }
    if (filtros.id_estado_activo !== undefined && filtros.id_estado_activo !== null && filtros.id_estado_activo !== '') {
      if (Number(item.id_estado_activo) !== Number(filtros.id_estado_activo)) return false;
    }
    if (filtros.categoria && String(item.categoria).toLowerCase() !== String(filtros.categoria).toLowerCase()) {
      return false;
    }
    if (filtros.estado && String(item.estado).toLowerCase() !== String(filtros.estado).toLowerCase()) {
      return false;
    }
    if (filtros.busqueda && String(filtros.busqueda).trim()) {
      const q = String(filtros.busqueda).toLowerCase().trim();
      const texto = [
        item.id,
        item.id_activo,
        item.codigo_qr,
        item.codigoQr,
        item.nombre,
        item.descripcion,
        item.marca,
        item.modelo,
        item.categoria,
        item.ubicacion,
        item.numeroSerie,
        item.numero_serie,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!texto.includes(q)) return false;
    }
    return true;
  });

  const limite = Number(filtros.limite || filtros.limit || 0);
  return limite > 0 ? filtrados.slice(0, limite) : filtrados;
};

/**
 * Busca un activo específico en IndexedDB por su `id`, `id_activo` o `codigoQr`.
 * @param {string} idActivo
 * @returns {Promise<Object|null>}
 */
export const obtenerActivoPorIdOffline = async (idActivo) => {
  if (!idActivo) return null;
  const clave = String(idActivo).trim();
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_NAMES.ACTIVOS, 'readonly');
  const store = tx.objectStore(STORE_NAMES.ACTIVOS);

  const directo = await ejecutarRequest(store.get(clave));
  if (directo) return directo;

  const todos = (await ejecutarRequest(store.getAll())) || [];
  const target = clave.toLowerCase();
  return (
    todos.find(
      (a) =>
        String(a.id || '').toLowerCase() === target ||
        String(a.id_activo || '').toLowerCase() === target ||
        String(a.codigoQr || '').toLowerCase() === target ||
        String(a.codigo_qr || '').toLowerCase() === target,
    ) || null
  );
};

// ---------------------------------------------------------------------------
// 2. Tienda `ordenes`: Órdenes Asignadas e Incidencias del Técnico
// ---------------------------------------------------------------------------

/**
 * Guarda o actualiza en segundo plano las órdenes e incidencias del técnico en IndexedDB.
 * Extrae y persiste además los estados detectados en la tienda `estados`.
 * @param {Array<Object>|Object} ordenesInput
 * @returns {Promise<Array<Object>>}
 */
export const guardarOrdenesOffline = async (ordenesInput = []) => {
  const lista = Array.isArray(ordenesInput) ? ordenesInput : [ordenesInput];
  const normalizadas = lista.map(normalizarOrdenOffline).filter(Boolean);
  if (normalizadas.length === 0) return [];

  const db = await openOfflineDb();
  const tx = db.transaction([STORE_NAMES.ORDENES, STORE_NAMES.ESTADOS], 'readwrite');
  const storeOrdenes = tx.objectStore(STORE_NAMES.ORDENES);
  const storeEstados = tx.objectStore(STORE_NAMES.ESTADOS);

  const estadosExtraidos = new Map();
  for (const item of normalizadas) {
    await ejecutarRequest(storeOrdenes.put(item));
    const est = normalizarEstadoOffline(item.estado || item.estado_normalizado, 'incidencia');
    if (est) estadosExtraidos.set(est.id, est);
  }

  for (const est of estadosExtraidos.values()) {
    await ejecutarRequest(storeEstados.put(est));
  }

  emitirEventoOffline('offline-ordenes-updated', { total: normalizadas.length });
  return normalizadas;
};

/**
 * Consulta las órdenes de trabajo / incidencias almacenadas en IndexedDB.
 * @param {Object} [filtros]
 * @param {string} [filtros.id_tecnico] - Filtra órdenes asignadas a un técnico específico
 * @param {string} [filtros.estado] - Filtra por nombre de estado
 * @param {string} [filtros.id_activo] - Filtra por activo asociado
 * @param {string} [filtros.busqueda] - Búsqueda por título, ID o activo
 * @returns {Promise<Array<Object>>}
 */
export const obtenerOrdenesOffline = async (filtros = {}) => {
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_NAMES.ORDENES, 'readonly');
  const store = tx.objectStore(STORE_NAMES.ORDENES);
  const registros = (await ejecutarRequest(store.getAll())) || [];

  const filtrados = registros.filter((item) => {
    if (filtros.id_tecnico) {
      const idTecFiltro = String(filtros.id_tecnico).toLowerCase();
      const idTecItem = String(
        item.id_tecnico || item.orden_trabajo?.id_tecnico || '',
      ).toLowerCase();
      if (idTecItem !== idTecFiltro) return false;
    }
    if (filtros.id_incidencia) {
      if (String(item.id_incidencia || '').toLowerCase() !== String(filtros.id_incidencia).toLowerCase()) {
        return false;
      }
    }
    if (filtros.id_activo) {
      if (String(item.id_activo || '').toLowerCase() !== String(filtros.id_activo).toLowerCase()) {
        return false;
      }
    }
    if (filtros.id_estado !== undefined && filtros.id_estado !== null && filtros.id_estado !== '') {
      const idEstItem = item.id_estado ?? item.estado?.id_estado;
      if (Number(idEstItem) !== Number(filtros.id_estado)) {
        return false;
      }
    }
    if (filtros.estado && filtros.estado !== 'Todas') {
      const estActual = String(item.estado_normalizado || '').toLowerCase();
      if (estActual !== String(filtros.estado).toLowerCase()) return false;
    }
    if (filtros.busqueda && String(filtros.busqueda).trim()) {
      const q = String(filtros.busqueda).toLowerCase().trim();
      const texto = [
        item.id,
        item.id_incidencia,
        item.id_orden,
        item.titulo,
        item.descripcion,
        item.diagnostico_tecnico,
        item.id_activo,
        item.nombre_activo,
        item.codigo_qr_activo,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!texto.includes(q)) return false;
    }
    return true;
  });

  const limite = Number(filtros.limite || filtros.limit || 0);
  return limite > 0 ? filtrados.slice(0, limite) : filtrados;
};

/**
 * Obtiene una orden o incidencia específica desde IndexedDB por `id`, `id_orden` o `id_incidencia`.
 * @param {string} idOrdenOIncidencia
 * @returns {Promise<Object|null>}
 */
export const obtenerOrdenPorIdOffline = async (idOrdenOIncidencia) => {
  if (!idOrdenOIncidencia) return null;
  const clave = String(idOrdenOIncidencia).trim();
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_NAMES.ORDENES, 'readonly');
  const store = tx.objectStore(STORE_NAMES.ORDENES);

  const directo = await ejecutarRequest(store.get(clave));
  if (directo) return directo;

  const todas = (await ejecutarRequest(store.getAll())) || [];
  const target = clave.toLowerCase();
  return (
    todas.find(
      (o) =>
        String(o.id || '').toLowerCase() === target ||
        String(o.id_orden || '').toLowerCase() === target ||
        String(o.id_incidencia || '').toLowerCase() === target ||
        String(o.orden_trabajo?.id_orden || '').toLowerCase() === target,
    ) || null
  );
};

// ---------------------------------------------------------------------------
// 3. Tienda `estados`: Catálogo de Estados Offline
// ---------------------------------------------------------------------------

/**
 * Guarda una lista de estados en la tienda `estados` de IndexedDB.
 * @param {Array<Object|string>} estadosInput
 * @param {string} [tipoPorDefecto='incidencia']
 * @returns {Promise<Array<Object>>}
 */
export const guardarEstadosOffline = async (estadosInput = [], tipoPorDefecto = 'incidencia') => {
  const lista = Array.isArray(estadosInput) ? estadosInput : [estadosInput];
  const normalizados = lista
    .map((e) => normalizarEstadoOffline(e, tipoPorDefecto))
    .filter(Boolean);
  if (normalizados.length === 0) return [];

  const db = await openOfflineDb();
  const tx = db.transaction(STORE_NAMES.ESTADOS, 'readwrite');
  const store = tx.objectStore(STORE_NAMES.ESTADOS);

  for (const est of normalizados) {
    await ejecutarRequest(store.put(est));
  }

  return normalizados;
};

/**
 * Obtiene los estados almacenados en IndexedDB (sembrando el catálogo base si está vacío).
 * @param {string|null} [tipo=null] - 'incidencia' | 'activo' | null
 * @returns {Promise<Array<Object>>}
 */
export const obtenerEstadosOffline = async (tipo = null) => {
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_NAMES.ESTADOS, 'readonly');
  const store = tx.objectStore(STORE_NAMES.ESTADOS);
  let registros = (await ejecutarRequest(store.getAll())) || [];

  if (registros.length === 0) {
    await guardarEstadosOffline(ESTADOS_CATALOGO_POR_DEFECTO);
    registros = [...ESTADOS_CATALOGO_POR_DEFECTO];
  }

  if (tipo) {
    return registros.filter((e) => String(e.tipo).toLowerCase() === String(tipo).toLowerCase());
  }
  return registros;
};

// ---------------------------------------------------------------------------
// 4. Tienda `cola_acciones`: Encolado de Mutaciones sin Conexión
// ---------------------------------------------------------------------------

let secuenciaColaAcciones = 0;

const generarIdAccionOffline = () => {
  secuenciaColaAcciones += 1;
  const randomHex = Math.random().toString(16).slice(2, 10);
  return `offline-act-${Date.now()}-${secuenciaColaAcciones}-${randomHex}`;
};

/**
 * Encola una mutación realizada sin conexión en la tienda `cola_acciones` de IndexedDB.
 * @param {Object} accion
 * @param {string} [accion.id]
 * @param {string} [accion.tipo] - Ej. 'CREAR_INCIDENCIA', 'ACTUALIZAR_ESTADO_ORDEN', 'CERRAR_ORDEN'
 * @param {string} [accion.metodo='POST'] - 'POST' | 'PUT' | 'PATCH' | 'DELETE'
 * @param {string} accion.endpoint - Ruta destino (ej. '/incidencias', '/ordenes-trabajo/asignar')
 * @param {Object} [accion.payload={}] - Cuerpo de la mutación
 * @param {string} [accion.id_usuario] - Identificador del técnico que originó la acción
 * @returns {Promise<Object>} Registro persistido en `cola_acciones`
 */
export const encolarAccionOffline = async (accion = {}) => {
  if (!accion || typeof accion !== 'object') {
    throw new Error('Se requiere un objeto de acción válido para encolar en IndexedDB');
  }

  const endpoint = String(accion.endpoint || accion.url || '').trim();
  if (!endpoint) {
    throw new Error('La acción offline debe especificar un endpoint o url destino');
  }

  const ahora = new Date().toISOString();
  const registro = {
    id: accion.id ? String(accion.id) : generarIdAccionOffline(),
    tipo: accion.tipo || accion.accion || 'MUTACION_OFFLINE',
    metodo: String(accion.metodo || accion.method || 'POST').toUpperCase(),
    endpoint,
    payload: clonarRegistro(accion.payload !== undefined ? accion.payload : accion.data || {}),
    id_usuario: accion.id_usuario || null,
    id_registro_local: accion.id_registro_local ? String(accion.id_registro_local) : null,
    estado_sincronizacion: accion.estado_sincronizacion || 'pendiente',
    intentos: typeof accion.intentos === 'number' ? accion.intentos : 0,
    ultimo_error: null,
    creado_en: accion.creado_en || ahora,
    actualizado_en: ahora,
  };

  const db = await openOfflineDb();
  const tx = db.transaction(STORE_NAMES.COLA_ACCIONES, 'readwrite');
  const store = tx.objectStore(STORE_NAMES.COLA_ACCIONES);
  await ejecutarRequest(store.put(registro));

  emitirEventoOffline('offline-queue-updated', {
    accion: 'encolada',
    registro,
  });

  return registro;
};

/**
 * Obtiene las mutaciones encoladas en `cola_acciones` ordenadas cronológicamente (FIFO).
 * @param {string|null} [estadoSincronizacion=null] - Filtra por estado ('pendiente', 'sincronizando', 'error', 'sincronizado')
 * @returns {Promise<Array<Object>>}
 */
export const obtenerColaAccionesOffline = async (estadoSincronizacion = null) => {
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_NAMES.COLA_ACCIONES, 'readonly');
  const store = tx.objectStore(STORE_NAMES.COLA_ACCIONES);
  const registros = (await ejecutarRequest(store.getAll())) || [];

  const filtrados = estadoSincronizacion
    ? registros.filter((item) => item.estado_sincronizacion === estadoSincronizacion)
    : registros;

  return filtrados.sort((a, b) =>
    String(a.creado_en || '').localeCompare(String(b.creado_en || '')),
  );
};

/**
 * Actualiza el estado de sincronización de una acción encolada en `cola_acciones`.
 * @param {string} idAccion
 * @param {string} nuevoEstado - 'pendiente' | 'sincronizando' | 'sincronizado' | 'error'
 * @param {Object} [detalles={}]
 * @returns {Promise<Object|null>}
 */
export const actualizarEstadoAccionOffline = async (idAccion, nuevoEstado, detalles = {}) => {
  if (!idAccion) return null;
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_NAMES.COLA_ACCIONES, 'readwrite');
  const store = tx.objectStore(STORE_NAMES.COLA_ACCIONES);

  const existente = await ejecutarRequest(store.get(String(idAccion)));
  if (!existente) return null;

  const ahora = new Date().toISOString();
  const actualizado = {
    ...existente,
    estado_sincronizacion: nuevoEstado,
    recurso_id:
      detalles.recurso_id !== undefined ? detalles.recurso_id : (existente.recurso_id ?? null),
    sincronizado_en:
      nuevoEstado === 'sincronizado'
        ? detalles.sincronizado_en || ahora
        : (existente.sincronizado_en ?? null),
    intentos:
      typeof detalles.intentos === 'number'
        ? detalles.intentos
        : nuevoEstado === 'error' || nuevoEstado === 'sincronizando'
          ? (existente.intentos || 0) + 1
          : existente.intentos || 0,
    ultimo_error:
      detalles.ultimo_error !== undefined ? detalles.ultimo_error : existente.ultimo_error,
    actualizado_en: ahora,
  };

  await ejecutarRequest(store.put(actualizado));
  emitirEventoOffline('offline-queue-updated', {
    accion: 'actualizada',
    registro: actualizado,
  });

  return actualizado;
};

/**
 * Elimina una acción específica de `cola_acciones` (por ejemplo, tras sincronizarse con éxito).
 * @param {string} idAccion
 * @returns {Promise<boolean>}
 */
export const eliminarAccionOffline = async (idAccion) => {
  if (!idAccion) return false;
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_NAMES.COLA_ACCIONES, 'readwrite');
  const store = tx.objectStore(STORE_NAMES.COLA_ACCIONES);
  await ejecutarRequest(store.delete(String(idAccion)));

  emitirEventoOffline('offline-queue-updated', {
    accion: 'eliminada',
    id: String(idAccion),
  });

  return true;
};

// ---------------------------------------------------------------------------
// 5. Criterio 3: Limpieza Segura de Datos al Cerrar Sesión
// ---------------------------------------------------------------------------

/**
 * Limpia de forma atómica y segura todas las tiendas de objetos de IndexedDB
 * (`activos`, `ordenes`, `estados`, `cola_acciones`) al cerrar sesión o expirar credenciales.
 * @returns {Promise<boolean>}
 */
export const limpiarDatosOffline = async () => {
  const db = await openOfflineDb();
  const todasLasTiendas = [
    STORE_NAMES.ACTIVOS,
    STORE_NAMES.ORDENES,
    STORE_NAMES.ESTADOS,
    STORE_NAMES.COLA_ACCIONES,
    STORE_NAMES.SYNC_META,
  ];

  const tx = db.transaction(todasLasTiendas, 'readwrite');
  for (const storeName of todasLasTiendas) {
    await ejecutarRequest(tx.objectStore(storeName).clear());
  }

  emitirEventoOffline('offline-db-cleared', {
    clearedAt: new Date().toISOString(),
  });

  return true;
};

// ---------------------------------------------------------------------------
// 6. TAL-196: Soporte de Background Sync (credenciales del Service Worker y reconciliación local)
// ---------------------------------------------------------------------------

export const SYNC_CONTEXT_ID = 'contexto_sync';

/**
 * Guarda el token y la URL base del API para que el Service Worker pueda autenticar la sincronización
 * en segundo plano aunque no haya pestañas abiertas. Se elimina en `limpiarDatosOffline` (cierre de sesión).
 */
export const guardarContextoSincronizacion = async ({ token, apiBaseUrl, id_usuario = null } = {}) => {
  if (!token || !apiBaseUrl) {
    throw new Error('El contexto de sincronización requiere token y apiBaseUrl');
  }
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_NAMES.SYNC_META, 'readwrite');
  await ejecutarRequest(
    tx.objectStore(STORE_NAMES.SYNC_META).put({
      id: SYNC_CONTEXT_ID,
      token: String(token),
      apiBaseUrl: String(apiBaseUrl).replace(/\/+$/, ''),
      id_usuario,
      actualizado_en: new Date().toISOString(),
    }),
  );
  return true;
};

export const obtenerContextoSincronizacion = async () => {
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_NAMES.SYNC_META, 'readonly');
  return (await ejecutarRequest(tx.objectStore(STORE_NAMES.SYNC_META).get(SYNC_CONTEXT_ID))) || null;
};

export const limpiarContextoSincronizacion = async () => {
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_NAMES.SYNC_META, 'readwrite');
  await ejecutarRequest(tx.objectStore(STORE_NAMES.SYNC_META).delete(SYNC_CONTEXT_ID));
  return true;
};

/**
 * Elimina una orden/incidencia local (por ejemplo, el registro temporal creado offline una vez que el
 * servidor confirma el identificador real).
 */
export const eliminarOrdenOffline = async (idOrden) => {
  if (!idOrden) return false;
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_NAMES.ORDENES, 'readwrite');
  await ejecutarRequest(tx.objectStore(STORE_NAMES.ORDENES).delete(String(idOrden)));
  return true;
};

/**
 * Reemplaza el payload de una acción encolada (reescritura de referencias a incidencias creadas offline).
 */
export const actualizarPayloadAccionOffline = async (idAccion, payload) => {
  if (!idAccion) return null;
  const db = await openOfflineDb();
  const tx = db.transaction(STORE_NAMES.COLA_ACCIONES, 'readwrite');
  const store = tx.objectStore(STORE_NAMES.COLA_ACCIONES);

  const existente = await ejecutarRequest(store.get(String(idAccion)));
  if (!existente) return null;

  const actualizado = {
    ...existente,
    payload: clonarRegistro(payload),
    actualizado_en: new Date().toISOString(),
  };
  await ejecutarRequest(store.put(actualizado));
  return actualizado;
};

// Alias en inglés para interoperabilidad con módulos de Background Sync (TAL-196)
export const saveActivosOffline = guardarActivosOffline;
export const getActivosOffline = obtenerActivosOffline;
export const getActivoByIdOffline = obtenerActivoPorIdOffline;
export const saveOrdenesOffline = guardarOrdenesOffline;
export const getOrdenesOffline = obtenerOrdenesOffline;
export const getOrdenByIdOffline = obtenerOrdenPorIdOffline;
export const saveEstadosOffline = guardarEstadosOffline;
export const getEstadosOffline = obtenerEstadosOffline;
export const enqueueOfflineAction = encolarAccionOffline;
export const getOfflineActionsQueue = obtenerColaAccionesOffline;
export const updateOfflineActionStatus = actualizarEstadoAccionOffline;
export const removeOfflineAction = eliminarAccionOffline;
export const clearOfflineDb = limpiarDatosOffline;

export default {
  OFFLINE_DB_NAME,
  OFFLINE_DB_VERSION,
  STORE_NAMES,
  OFFLINE_DB_SCHEMA,
  getOfflineDbSchema,
  openOfflineDb,
  guardarActivosOffline,
  obtenerActivosOffline,
  obtenerActivoPorIdOffline,
  guardarOrdenesOffline,
  obtenerOrdenesOffline,
  obtenerOrdenPorIdOffline,
  guardarEstadosOffline,
  obtenerEstadosOffline,
  encolarAccionOffline,
  obtenerColaAccionesOffline,
  actualizarEstadoAccionOffline,
  eliminarAccionOffline,
  limpiarDatosOffline,
  guardarContextoSincronizacion,
  obtenerContextoSincronizacion,
  limpiarContextoSincronizacion,
  eliminarOrdenOffline,
  actualizarPayloadAccionOffline,
};
