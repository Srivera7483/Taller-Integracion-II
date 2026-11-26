/**
 * TAL-196: Service Worker de InfraManager (estrategia `injectManifest` de vite-plugin-pwa).
 *
 * Responsabilidades:
 * 1. Precaché de la aplicación (equivalente al `generateSW` usado desde TAL-170) con fallback a `index.html`.
 * 2. Evento `sync` (Background Sync API): al volver la conexión, el Service Worker despierta, lee la cola de
 *    acciones pendientes de IndexedDB (TAL-195) e invoca el endpoint de sincronización masiva (TAL-192).
 */
import {
  SYNC_TAG,
  sincronizarColaEnServiceWorker,
} from './services/sync/backgroundSync.js';

const PREFIJO_PRECACHE = 'inframanager-precache-';
const PREFIJO_RUNTIME = 'inframanager-assets-';
const PREFIJO_PRECACHE_ANTERIOR = 'workbox-precache';

// vite-plugin-pwa reemplaza esta expresión por la lista de archivos generados en el build.
// TAL-203: Deduplicar URLs para evitar que Cache.addAll() rechace por solicitudes duplicadas.
const manifiesto = self.__WB_MANIFEST || [];
const urlsPrecache = Array.from(
  new Set(manifiesto.map((entrada) => (typeof entrada === 'string' ? entrada : entrada.url))),
);

const calcularHash = (texto) => {
  let hash = 0;
  for (let i = 0; i < texto.length; i += 1) {
    hash = (hash * 31 + texto.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16);
};

const HASH_BUILD = calcularHash(JSON.stringify(manifiesto));
const NOMBRE_CACHE = `${PREFIJO_PRECACHE}${HASH_BUILD}`;
const NOMBRE_CACHE_RUNTIME = `${PREFIJO_RUNTIME}${HASH_BUILD}`;

let rutasPrecacheCache = null;
const obtenerRutasPrecache = () => {
  if (!rutasPrecacheCache) {
    rutasPrecacheCache = new Set(
      urlsPrecache.map((url) => new URL(url, self.registration.scope).pathname),
    );
  }
  return rutasPrecacheCache;
};

const obtenerUrlIndex = () => new URL('index.html', self.registration.scope).href;

/**
 * Avisa a todas las pestañas abiertas del resultado de la sincronización.
 */
const notificarClientes = async (mensaje) => {
  const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clientes.forEach((cliente) => cliente.postMessage(mensaje));
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(NOMBRE_CACHE);
      if (urlsPrecache.length > 0) {
        await cache.addAll(urlsPrecache.map((url) => new Request(url, { cache: 'reload' })));
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(
        nombres
          .filter(
            (nombre) =>
              nombre !== NOMBRE_CACHE &&
              nombre !== NOMBRE_CACHE_RUNTIME &&
              (nombre.startsWith(PREFIJO_PRECACHE) ||
                nombre.startsWith(PREFIJO_RUNTIME) ||
                nombre.startsWith(PREFIJO_PRECACHE_ANTERIOR)),
          )
          .map((nombre) => caches.delete(nombre)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    if (url.pathname.startsWith('/api')) return;
    event.respondWith(caches.match(obtenerUrlIndex()).then((cacheada) => cacheada || fetch(request)));
    return;
  }

  if (obtenerRutasPrecache().has(url.pathname)) {
    event.respondWith(caches.match(request).then((cacheada) => cacheada || fetch(request)));
    return;
  }

  // TAL-203: Estrategia Cache-First bajo demanda para chunks con hash generados por Vite (/assets/*)
  if (url.pathname.startsWith('/assets/') && !url.pathname.endsWith('.map')) {
    event.respondWith(
      caches.open(NOMBRE_CACHE_RUNTIME).then(async (cache) => {
        const cacheada = await cache.match(request);
        if (cacheada) return cacheada;
        const respuesta = await fetch(request);
        if (respuesta && respuesta.ok) {
          void cache.put(request, respuesta.clone());
        }
        return respuesta;
      }),
    );
  }
});

// Criterio 1 (TAL-196): sincronización automática sin intervención manual del usuario.
self.addEventListener('sync', (event) => {
  if (event.tag !== SYNC_TAG) return;
  event.waitUntil(sincronizarColaEnServiceWorker({ notificar: notificarClientes }));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
