require('dotenv').config();

const Fastify = require('fastify');
const proxy = require('@fastify/http-proxy');
const fastifyCors = require('@fastify/cors');
const rateLimit = require('@fastify/rate-limit');
const RateLimitStore = require('./rate-limit-store');
const KillSwitchManager = require('./kill-switch');
const { Server: IoServer } = require('socket.io');
const { io: createIoClient } = require('socket.io-client');
const { attachRedisAdapter } = require('./redis-adapter');
const jwt = require('jsonwebtoken');

const DEFAULT_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://localhost:8081',
    'http://localhost:19006',
];

const getAllowedOrigins = (customOrigins) => {
    const rawOrigins = customOrigins ?? process.env.CORS_ORIGINS;
    if (!rawOrigins) {
        return DEFAULT_ALLOWED_ORIGINS;
    }
    if (Array.isArray(rawOrigins)) {
        return rawOrigins;
    }
    return String(rawOrigins)
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0);
};

const getTrustProxy = (value) => {
    if (typeof value !== 'string') {
        return value ?? false;
    }

    const trustedProxies = value
        .split(',')
        .map((proxyAddress) => proxyAddress.trim())
        .filter(Boolean);

    if (trustedProxies.length === 0 || trustedProxies[0].toLowerCase() === 'false') {
        return false;
    }

    return trustedProxies.length === 1 ? trustedProxies[0] : trustedProxies;
};

/**
 * Extrae el token JWT de la handshake de Socket.io priorizando:
 * 1. socket.handshake.auth.token (set por socket.io-client con auth option)
 * 2. Authorization: Bearer ... header
 * 3. ?token=... query parameter
 * @param {Object} socket - Socket.io socket instance
 * @returns {string|null} - El token JWT o null si no se encuentra
 */
const extractTokenFromHandshake = (socket) => {
  const handshake = socket.handshake;

  // 1. Priority: socket.handshake.auth.token
  if (handshake.auth && handshake.auth.token) {
    return handshake.auth.token;
  }

  // 2. Fallback: Authorization: Bearer ... header
  const authHeader = handshake.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  // 3. Fallback: ?token=... query parameter
  const queryToken = handshake.query?.token;
  if (queryToken) {
    return typeof queryToken === 'string' ? queryToken : queryToken[0];
  }

  return null;
};

/**
 * Verifica y decodifica un token JWT usando el secret configurado.
 * Lanza error con data.code = 4401 si el token falta, es inválido o expirado.
 * @param {string} token - El token JWT
 * @param {string} JWT_SECRET - Secret clave para verification
 * @returns {Object} - Payload decodificado del JWT
 */
const verifyJWT = (token, JWT_SECRET) => {
  if (!token) {
    const err = new Error('Token de acceso requerido');
    err.data = { code: 4401 };
    throw err;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload;
  } catch (err) {
    // Si el token expiró, intentamos decodificar para obtener el claim 'exp'
    if (err.name === 'TokenExpiredError') {
      try {
        const expiredPayload = jwt.decode(token);
        err.exp = expiredPayload?.exp;
        err.iat = expiredPayload?.iat;
      } catch {}
    }
    err.data = { code: 4401 };
    throw err;
  }
};

const buildGateway = (options = {}) => {
    const fastify = Fastify({
        logger: options.logger ?? true,
        trustProxy: getTrustProxy(options.trustProxy ?? process.env.GATEWAY_TRUST_PROXY),
    });

    const killSwitch = options.killSwitchManager || new KillSwitchManager(options);
    fastify.killSwitch = killSwitch;

    // TAL-4: Middleware / Hook de Kill Switch para interceptar operaciones mutantes
    fastify.addHook('onRequest', async (request, reply) => {
        // Compatibilidad: Redirige internamente rutas /api/* a /api/v1/*
        if (request.raw.url && /^\/api\/(?!v1(\/|$))/.test(request.raw.url)) {
            request.raw.url = request.raw.url.replace(/^\/api\//, '/api/v1/');
        }

        if (killSwitch.isBlocked(request.method, request.url)) {
            const status = killSwitch.getStatus();
            reply
                .code(503)
                .header('X-Kill-Switch', 'true')
                .send({
                    statusCode: 503,
                    error: 'Service Unavailable',
                    mensaje: status.motivo,
                    motivo: status.motivo,
                    killSwitch: true,
                    servicios_afectados: status.servicios_afectados,
                    fecha_activacion: status.fecha_activacion,
                });
            return reply;
        }
    });

    fastify.register(rateLimit, {
        global: false,
        store: RateLimitStore,
    });

    fastify.get('/', async () => ({ status: 'OK' }));
    fastify.get('/health', async () => ({
        status: 'UP',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    }));
    fastify.get('/api/v1/health', async () => ({
        status: 'UP',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    }));

    // TAL-4: Endpoint de consulta de estado del Kill Switch para Frontend (TAL-188)
    const getKillSwitchStatus = async (request, reply) => {
        const status = killSwitch.getStatus();
        if (status.activo) {
            reply.header('X-Kill-Switch', 'true');
        }
        return status;
    };
    fastify.get('/api/v1/kill-switch', getKillSwitchStatus);
    fastify.get('/api/v1/kill-switch/status', getKillSwitchStatus);

    // TAL-4: Endpoint de control para ADMINISTRADOR
    const updateKillSwitchStatus = async (request, reply) => {
        const auth = killSwitch.verifyAdminAuth(request);
        if (!auth.authorized) {
            return reply.code(403).send({
                statusCode: 403,
                error: 'Forbidden',
                mensaje: auth.error,
            });
        }

        const body = request.body || {};
        const nuevoEstado = killSwitch.setKillSwitch({
            activo: body.activo,
            motivo: body.motivo,
            servicios_afectados: body.servicios_afectados,
        });

        fastify.log.warn(
            { killSwitch: nuevoEstado },
            `[KILL-SWITCH] Estado modificado por administrador: activo=${nuevoEstado.activo}`
        );

        return reply.code(200).send({
            statusCode: 200,
            message: 'Estado del Kill Switch actualizado exitosamente',
            status: nuevoEstado,
        });
    };
    fastify.post('/api/v1/kill-switch', updateKillSwitchStatus);
    fastify.post('/api/v1/admin/kill-switch', updateKillSwitchStatus);
    fastify.put('/api/v1/kill-switch', updateKillSwitchStatus);

    const handleProxyError = (reply, error) => {
        fastify.log.error(error, 'Fallo al conectar con el microservicio de destino');
        reply.code(502).send({
            error: 'Bad Gateway',
            message: 'El microservicio de destino se encuentra apagado o inaccesible en este momento.',
        });
    };

    fastify.register(fastifyCors, {
        origin: true,
        credentials: true,
        exposedHeaders: ['Content-Disposition', 'X-Kill-Switch'],
    });

    fastify.register(proxy, {
        upstream: options.activosUrl || process.env.MS_ACTIVOS_URL || 'http://localhost:3003',
        prefix: '/api/v1/activos',
        rewritePrefix: '/api/v1/activos',
        replyOptions: { onError: handleProxyError }
    });

    fastify.register(proxy, {
        upstream: options.activosUrl || process.env.MS_ACTIVOS_URL || 'http://localhost:3003',
        prefix: '/api/v1/mantenimientos',
        rewritePrefix: '/api/v1/mantenimientos',
        replyOptions: { onError: handleProxyError }
    });

    fastify.register(proxy, {
        upstream: options.incidenciasUrl || process.env.MS_INCIDENCIAS_URL || 'http://localhost:3002',
        prefix: '/api/v1/incidencias',
        rewritePrefix: '/api/v1/incidencias',
        replyOptions: { onError: handleProxyError }
    });

    // TAL-128: Proxy transparente para estadísticas de incidencias (MTTR e indicadores)
    fastify.register(proxy, {
        upstream: options.incidenciasUrl || process.env.MS_INCIDENCIAS_URL || 'http://localhost:3002',
        prefix: '/api/v1/estadisticas',
        rewritePrefix: '/api/v1/estadisticas',
        replyOptions: { onError: handleProxyError }
    });

    fastify.register(proxy, {
        upstream: options.incidenciasUrl || process.env.MS_INCIDENCIAS_URL || 'http://localhost:3002',
        prefix: '/api/v1/ordenes-trabajo',
        rewritePrefix: '/api/v1/ordenes-trabajo',
        replyOptions: { onError: handleProxyError }
    });

    fastify.register(proxy, {
        upstream: options.incidenciasUrl || process.env.MS_INCIDENCIAS_URL || 'http://localhost:3002',
        prefix: '/api/v1/estados-incidencia',
        rewritePrefix: '/api/v1/estados-incidencia',
        replyOptions: { onError: handleProxyError }
    });

    fastify.register(proxy, {
        upstream: options.incidenciasUrl || process.env.MS_INCIDENCIAS_URL || 'http://localhost:3002',
        prefix: '/api/v1/tipos-evidencia',
        rewritePrefix: '/api/v1/tipos-evidencia',
        replyOptions: { onError: handleProxyError }
    });

    fastify.register(proxy, {
        upstream: options.incidenciasUrl || process.env.MS_INCIDENCIAS_URL || 'http://localhost:3002',
        prefix: '/api/v1/sincronizacion',
        rewritePrefix: '/api/v1/sincronizacion',
        replyOptions: { onError: handleProxyError }
    });

    const authUrl = options.authUrl || process.env.MS_AUTH_URL || 'http://localhost:3001';

    fastify.register(proxy, {
        upstream: authUrl,
        prefix: '/api/v1/auth',
        routes: ['/login'],
        httpMethods: ['POST'],
        rewritePrefix: '/auth',
        config: {
            rateLimit: {
                max: 5,
                timeWindow: 15 * 60 * 1000,
            },
        },
        replyOptions: { onError: handleProxyError }
    });

    fastify.register(proxy, {
        upstream: authUrl,
        prefix: '/api/v1/auth',
        rewritePrefix: '/auth',
        replyOptions: { onError: handleProxyError }
    });

    fastify.register(proxy, {
        upstream: authUrl,
        prefix: '/api/v1/autenticacion',
        rewritePrefix: '/autenticacion',
        replyOptions: { onError: handleProxyError }
    });

    fastify.register(proxy, {
        upstream: authUrl,
        prefix: '/api/v1/usuarios',
        rewritePrefix: '/auth/usuarios',
        replyOptions: { onError: handleProxyError }
    });

    fastify.register(proxy, {
        upstream: options.notificacionesUrl || process.env.MS_NOTIFICACIONES_URL || 'http://127.0.0.1:3004',
        prefix: '/api/v1/notificaciones',
        rewritePrefix: '/notificar',
        replyOptions: { onError: handleProxyError }
    });

    // TAL-2: Configuración de Socket.io sobre el servidor HTTP nativo de Fastify
    const allowedOrigins = getAllowedOrigins(options.corsOrigins);
    const io = new IoServer(fastify.server, {
        cors: {
            origin: allowedOrigins,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
            credentials: true,
        },
        transports: ['websocket', 'polling'],
        allowEIO3: true,
    });

    // Middleware de autenticación JWT para handshake WebSocket (TAL-184)
    // Este debe ser el primer middleware en la pila io.use()
    io.use((socket, next) => {
      try {
        const token = extractTokenFromHandshake(socket);

        if (!token) {
          const err = new Error('Token de acceso requerido');
          err.data = { code: 4401 };
          return next(err);
        }

        const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
        const payload = verifyJWT(token, JWT_SECRET);

        // Adjuntar claims del JWT verificado - CERO CONFIANZA en parámetros query del cliente
        // Los claims vienen exclusivamente del JWT firmado por ms-auth
        socket.data.user = {
          sub: payload.sub,
          email: payload.email,
          rol: payload.rol,
          permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
          userId: payload.userId || payload.sub,
          tokenUse: payload.tokenUse,
        };

        return next();
      } catch (err) {
        fastify.log.warn(
          { err: err.message },
          `[Socket.io] Fallo en la autenticación JWT para socket ${socket.id}`
        );
        if (!err.data) {
          err.data = { code: 4401 };
        }
        return next(err);
      }
    });

    // Middleware CORS del lado de Socket.io sincronizado con HTTP
    // (Se ejecuta después de la autenticación JWT)
    io.use((socket, next) => {
        const origin = socket.handshake.headers.origin;
        const currentAllowed = getAllowedOrigins(options.corsOrigins);
        if (!origin || currentAllowed.includes('*') || currentAllowed.includes(origin)) {
            socket.data.origin = origin;
            return next();
        }
        return next(new Error('[Ciberseguridad - CORS] Origen no autorizado para Socket.io'));
    });

    let upstreamSocket = null;
    if (options.enableUpstreamSocket) {
        const incidenciasWsUrl = options.incidenciasUrl || process.env.MS_INCIDENCIAS_URL || 'http://localhost:3002';
        upstreamSocket = createIoClient(incidenciasWsUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            query: { rol: 'COORDINADOR', userId: 'api-gateway-bridge' },
        });

        const eventosActualizadasRecientes = new Set();
        const emitirIncidenciaActualizadaBridge = (payload) => {
            const id = payload?.id_incidencia || payload?.id;
            const subTipo =
                payload?.accion ||
                payload?.tipo_cambio ||
                (payload?.cambio_prioridad ? `prio_${payload?.prioridad}` : null) ||
                payload?.nuevo_estado ||
                payload?.estado ||
                payload?.prioridad ||
                '';
            const clave = id ? `act:${id}:${subTipo}` : null;
            if (clave) {
                if (eventosActualizadasRecientes.has(clave)) {
                    return;
                }
                eventosActualizadasRecientes.add(clave);
                setTimeout(() => eventosActualizadasRecientes.delete(clave), 3000);
            }

            let emisores = io.to('incidencias').to('coordinadores');
            if (payload?.id_incidencia) {
                emisores = emisores.to(`incidencia_${payload.id_incidencia}`);
            }
            if (payload?.id_edificio) {
                emisores = emisores.to(`edificio_${payload.id_edificio}`);
            }
            emisores.emit('incidencia_actualizada', payload);
        };

        upstreamSocket.on('incidencia_actualizada', emitirIncidenciaActualizadaBridge);

        const eventosNuevasRecientes = new Set();
        const emitirNuevaIncidenciaBridge = (payload) => {
            const id = payload?.id_incidencia || payload?.id;
            const clave = id ? `nueva:${id}` : null;
            if (clave) {
                if (eventosNuevasRecientes.has(clave)) {
                    return;
                }
                eventosNuevasRecientes.add(clave);
                setTimeout(() => eventosNuevasRecientes.delete(clave), 3000);
            }

            io.to('incidencias').to('coordinadores').emit('nueva_incidencia', payload);
            io.to('incidencias').to('coordinadores').emit('nueva-incidencia', payload);
        };

        upstreamSocket.on('nueva-incidencia', emitirNuevaIncidenciaBridge);
        upstreamSocket.on('nueva_incidencia', emitirNuevaIncidenciaBridge);
    }

    io.on('connection', (socket) => {
      // JWT authentication already ran via io.use() - socket.data.user is populated
      // No need to read from handshake.query - claims come from verified JWT only
      const user = socket.data.user || { sub: 'anonymous', rol: 'ANÓNIMO', permissions: [] };

      fastify.log.info(`[Socket.io] Cliente conectado: ${socket.id}, user: ${user.sub || 'anonymous'}`);

      // Unirse a la sala general de incidencias
      socket.join('incidencias');

      // ============================================================
      // TAL-184: Asignación de salas basada en PBAC (Permissions-Based Access Control)
      // ============================================================
      // Las salas se asignan exclusivamente basándose en los claims del JWT verificado,
      // NUNCA en parámetros de query del cliente (prevención de spoofing).
      //

      // Sala 'coordinadores': solo para usuarios con permiso COORDINADOR o superior
      const hasCoordinadorPermission = user.permissions &&
        user.permissions.includes('COORDINADOR') ||
        user.rol === 'COORDINADOR' ||
        user.rol === 'SUPERVISOR' ||
        user.rol === 'ADMINISTRADOR';

      if (hasCoordinadorPermission) {
        socket.join('coordinadores');
      }

      // Salas 'rol_*': solo si el usuario tiene el rol correspondiente en sus permisos
      if (user.rol && user.permissions) {
        const rolRoom = `rol_${user.rol}`;
        socket.join(rolRoom);
        // También unirse a coordinadores si el rol es COORDINADOR, SUPERVISOR o ADMINISTRADOR
        if (['COORDINADOR', 'SUPERVISOR', 'ADMINISTRADOR'].includes(user.rol)) {
          socket.join('coordinadores');
        }
      }

      // El manejo de salas incidencia_* y edificios_* se hace mediante eventos join_room
      // con validación PBAC, no en el handshake automático.

      // ============================================================
      // TAL-184: Temporizador de expiración de token
      // ============================================================
      // Programa la emisión de 'token_expirado' basándose en el claim 'exp' del JWT
      // antes de que el token corte realmente la sesión, permitiendo renovación transparente.
      let tokenExpiryTimeout = null;

      if (user.tokenUse === 'access' && user.exp) {
        const tiempoHastaExpiracion = (user.exp * 1000) - Date.now();
        // Emitir 'token_expirado' con al menos 30 segundos de antelación al vencimiento
        const anticipoEmision = 30000;

        if (tiempoHastaExpiracion > anticipoEmision) {
          tokenExpiryTimeout = setTimeout(() => {
            fastify.log.info(`[Socket.io] Emitiendo token_expirado para socket ${socket.id}`);
            socket.emit('token_expirado', {
              message: 'Su token de acceso está por expirar. Renueve su sesión.',
              timeRemaining: Math.max(0, Math.ceil(tiempoHastaExpiracion / 1000)),
              requiresRefresh: true
            });
          }, tiempoHastaExpiracion - anticipoEmision);
        }
      }

      // Guardar el identificador del timeout para limpiarlo en disconnect
      socket.data.tokenExpiryTimeout = tokenExpiryTimeout;

      socket.on('disconnect', (reason) => {
        fastify.log.info(`[Socket.io] Cliente desconectado: ${socket.id}, reason: ${reason}`);

        // Limpiar el temporizador de expiración de token para evitar fugas de memoria
        if (socket.data.tokenExpiryTimeout) {
          clearTimeout(socket.data.tokenExpiryTimeout);
          socket.data.tokenExpiryTimeout = null;
        }

        socket.removeAllListeners();
      });

      socket.on('error', (error) => {
        fastify.log.error(error, `[Socket.io] Error en socket ${socket.id}`);
        socket.disconnect();
      });
    });

    io.emitIncidencias = (event, data) => {
        io.to('incidencias').emit(event, data);
    };

    io.emitToClient = (socketId, event, data) => {
        io.to(socketId).emit(event, data);
    };

    // TAL-209: Inicialización del adaptador de Redis con fallback local
    let redisAdapterState = null;
    fastify.initRedisAdapter = async (redisOptions = {}) => {
        if (redisAdapterState) {
            return redisAdapterState;
        }
        redisAdapterState = await attachRedisAdapter(io, {
            logger: fastify.log,
            ...(options.redis || {}),
            ...redisOptions,
        });
        fastify.redisAdapter = redisAdapterState;
        return redisAdapterState;
    };

    fastify.addHook('onClose', async () => {
        if (upstreamSocket) {
            upstreamSocket.removeAllListeners();
            upstreamSocket.disconnect();
        }
        if (redisAdapterState) {
            await redisAdapterState.close();
            redisAdapterState = null;
        }
        await new Promise((resolve) => {
            io.close(() => resolve());
        });
    });

    fastify.io = io;
    fastify.fastify = fastify;
    fastify.httpServer = fastify.server;

    return fastify;
};

const start = async () => {
    const fastify = buildGateway({
        enableUpstreamSocket: process.env.GATEWAY_WS_BRIDGE !== 'false',
    });
    const port = Number(process.env.GATEWAY_PORT ?? process.env.PORT ?? 3000);

    try {
        await fastify.initRedisAdapter();
        await fastify.listen({ port, host: '0.0.0.0' });
        fastify.log.info(`API Gateway y Socket.io ejecutándose en http://localhost:${port}`);
    } catch (error) {
        fastify.log.error(error);
        process.exit(1);
    }
};

if (require.main === module) {
    start();
}

module.exports = { buildGateway, start, getAllowedOrigins, DEFAULT_ALLOWED_ORIGINS };