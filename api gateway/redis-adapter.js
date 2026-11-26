const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

/**
 * Configura el adaptador de Redis para Socket.IO con resistencia a desconexiones
 * y fallback automático al adaptador en memoria local.
 */
async function attachRedisAdapter(io, options = {}) {
  const logger = options.logger || console;
  const redisEnabled = (options.enabled ?? process.env.REDIS_ENABLED ?? 'true') !== 'false';

  if (!redisEnabled) {
    logger.info('[Socket.io - Redis] Adaptador deshabilitado por configuración; operando en modo local.');
    return { mode: 'local', pubClient: null, subClient: null, close: async () => {} };
  }

  const redisUrl =
    options.redisUrl ||
    process.env.REDIS_URL ||
    `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`;

  const connectTimeout = Number(options.connectTimeoutMs ?? 2000);

  const pubClient = createClient({
    url: redisUrl,
    socket: {
      connectTimeout,
      reconnectStrategy: (retries) => {
        // Reintento exponencial acotado a máximo 5 segundos sin botar el proceso
        return Math.min(retries * 200, 5000);
      },
    },
  });

  const subClient = pubClient.duplicate();

  let state = { mode: 'local', connected: false };

  const handleRedisError = (clientName) => (err) => {
    if (state.connected) {
      logger.warn(
        `[Socket.io - Redis] Desconexión detectada en ${clientName} (${err.message}). Activando fallback local...`
      );
      state.connected = false;
      state.mode = 'local-fallback';
    }
  };

  pubClient.on('error', handleRedisError('pubClient'));
  subClient.on('error', handleRedisError('subClient'));

  pubClient.on('ready', () => {
    if (!state.connected) {
      logger.info(`[Socket.io - Redis] Conexión activa con Redis (${redisUrl}). Modo distribuido operativo.`);
      state.connected = true;
      state.mode = 'redis';
    }
  });

  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    state.connected = true;
    state.mode = 'redis';
    logger.info(`[Socket.io - Redis] Adaptador Pub/Sub acoplado correctamente en ${redisUrl}`);
  } catch (err) {
    logger.warn(
      `[Socket.io - Redis] Redis no disponible al iniciar (${err.message}). Continuando con fallback local en memoria.`
    );
    state.connected = false;
    state.mode = 'local-fallback';
  }

  const close = async () => {
    try {
      if (pubClient.isOpen) await pubClient.quit();
      if (subClient.isOpen) await subClient.quit();
    } catch {
      // Ignorar errores al cerrar clientes ya desconectados
    }
  };

  return {
    get mode() {
      return state.mode;
    },
    get isRedisConnected() {
      return state.connected;
    },
    pubClient,
    subClient,
    close,
  };
}

module.exports = { attachRedisAdapter };