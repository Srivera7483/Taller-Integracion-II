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

    // Middleware CORS del lado de Socket.io sincronizado con HTTP
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

        upstreamSocket.on('incidencia_actualizada', (payload) => {
            io.to('incidencias').emit('incidencia_actualizada', payload);
            io.to('coordinadores').emit('incidencia_actualizada', payload);
            if (payload?.id_incidencia) {
                io.to(`incidencia_${payload.id_incidencia}`).emit('incidencia_actualizada', payload);
            }
            if (payload?.id_edificio) {
                io.to(`edificio_${payload.id_edificio}`).emit('incidencia_actualizada', payload);
            }
        });

        upstreamSocket.on('nueva-incidencia', (payload) => {
            io.to('incidencias').emit('nueva_incidencia', payload);
            io.to('incidencias').emit('nueva-incidencia', payload);
            io.to('coordinadores').emit('nueva_incidencia', payload);
        });

        upstreamSocket.on('nueva_incidencia', (payload) => {
            io.to('incidencias').emit('nueva_incidencia', payload);
            io.to('incidencias').emit('nueva-incidencia', payload);
            io.to('coordinadores').emit('nueva_incidencia', payload);
        });
    }

    io.on('connection', (socket) => {
        const origin = socket.handshake.headers.origin;
        const query = socket.handshake.query || {};
        const userId = query.userId || 'anonymous';

        fastify.log.info(`[Socket.io] Cliente conectado: ${socket.id}, origen: ${origin || 'direct'}, userId: ${userId}`);

        // Unirse a la sala general de incidencias y salas por query (compatibilidad TAL-185 / TAL-186)
        socket.join('incidencias');

        if (query.incidencia) {
            const roomInc = `incidencia_${query.incidencia}`;
            socket.join(roomInc);
            upstreamSocket?.emit('join_room', { room: roomInc });
        }
        if (query.edificio) {
            const roomEd = `edificio_${query.edificio}`;
            socket.join(roomEd);
            upstreamSocket?.emit('join_room', { room: roomEd });
        }
        if (query.rol) {
            const rolUpper = String(query.rol).toUpperCase();
            socket.join(`rol_${rolUpper}`);
            if (['COORDINADOR', 'SUPERVISOR', 'ADMINISTRADOR'].includes(rolUpper)) {
                socket.join('coordinadores');
            }
        }

        const handleJoinRoom = (data, ack) => {
            const salasUnidas = [];
            if (typeof data === 'string' && data) {
                socket.join(data);
                salasUnidas.push(data);
            } else if (data && typeof data === 'object') {
                const roomName = data.room || data.sala;
                if (roomName) {
                    socket.join(roomName);
                    salasUnidas.push(roomName);
                }
                const roomList = Array.isArray(data.rooms) ? data.rooms : Array.isArray(data.salas) ? data.salas : [];
                for (const room of roomList) {
                    if (room) {
                        socket.join(room);
                        salasUnidas.push(room);
                    }
                }
                if (data.id_incidencia) {
                    const roomInc = `incidencia_${data.id_incidencia}`;
                    socket.join(roomInc);
                    salasUnidas.push(roomInc);
                }
                if (data.id_edificio) {
                    const roomEd = `edificio_${data.id_edificio}`;
                    socket.join(roomEd);
                    salasUnidas.push(roomEd);
                }
                if (data.rol) {
                    const rolUpper = String(data.rol).toUpperCase();
                    socket.join(`rol_${rolUpper}`);
                    salasUnidas.push(`rol_${rolUpper}`);
                    if (['COORDINADOR', 'SUPERVISOR', 'ADMINISTRADOR'].includes(rolUpper)) {
                        socket.join('coordinadores');
                        salasUnidas.push('coordinadores');
                    }
                }
            }
            if (salasUnidas.length > 0) {
                upstreamSocket?.emit('join_room', { rooms: salasUnidas });
            }
            const response = { status: 'joined', rooms: salasUnidas };
            if (typeof ack === 'function') {
                ack(response);
            }
            return response;
        };

        const handleLeaveRoom = (data, ack) => {
            const room = typeof data === 'string' ? data : (data?.room || data?.sala);
            if (room) {
                socket.leave(room);
                upstreamSocket?.emit('leave_room', { room });
                const response = { status: 'left', room };
                if (typeof ack === 'function') {
                    ack(response);
                }
                return response;
            }
            const errResponse = { status: 'error', message: 'Sala no especificada' };
            if (typeof ack === 'function') {
                ack(errResponse);
            }
            return errResponse;
        };

        socket.on('join_room', handleJoinRoom);
        socket.on('unirse_sala', handleJoinRoom);
        socket.on('leave_room', handleLeaveRoom);
        socket.on('dejar_sala', handleLeaveRoom);

        socket.on('disconnect', (reason) => {
            fastify.log.info(`[Socket.io] Cliente desconectado: ${socket.id}, reason: ${reason}`);
            // Limpiar listeners y descriptores para evitar fugas de memoria (CA-2 TAL-2)
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