require('dotenv').config();

const Fastify = require('fastify');
const proxy = require('@fastify/http-proxy');
const fastifyCors = require('@fastify/cors');
const rateLimit = require('@fastify/rate-limit');
const RateLimitStore = require('./rate-limit-store');
const KillSwitchManager = require('./kill-switch');
const { AuditLogger } = require('./audit-logger');
const { Server: IoServer } = require('socket.io');
const { io: createIoClient } = require('socket.io-client');
const { attachRedisAdapter } = require('./redis-adapter');
const jwt = require('jsonwebtoken');

const DEFAULT_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:4173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://localhost:8081',
    'http://localhost:19006',
    'capacitor://localhost',
    'ionic://localhost',
];

const getAllowedOrigins = (customOrigins) => {
    const rawOrigins = customOrigins ?? process.env.CORS_ORIGINS ?? process.env.CORS_ALLOWED_ORIGINS;
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
 * Extrae el token JWT del handshake de Socket.io priorizando:
 * 1. socket.handshake.auth.token (enviado por socket.io-client vía opción auth)
 * 2. Cabecera Authorization: Bearer ...
 * 3. Parámetro query ?token=...
 * 4. Cookie HttpOnly (access_token o token)
 * @param {Object} socket - Instancia de socket de Socket.io
 * @returns {string|null} - El token JWT limpio o null si no se encuentra
 */
const extractTokenFromHandshake = (socket) => {
    const handshake = socket?.handshake || {};

    // 1. Prioridad máxima: socket.handshake.auth.token
    if (handshake.auth && typeof handshake.auth.token === 'string' && handshake.auth.token.trim()) {
        const rawAuthToken = handshake.auth.token.trim();
        return rawAuthToken.startsWith('Bearer ') ? rawAuthToken.slice(7).trim() : rawAuthToken;
    }

    // 2. Fallback: Cabecera Authorization: Bearer ...
    const authHeader = handshake.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        const bearerToken = authHeader.slice(7).trim();
        if (bearerToken) return bearerToken;
    }

    // 3. Fallback: Parámetro ?token=...
    const queryToken = handshake.query?.token;
    if (queryToken) {
        const resolved = Array.isArray(queryToken) ? queryToken[0] : queryToken;
        if (typeof resolved === 'string' && resolved.trim()) {
            return resolved.trim();
        }
    }

    // 4. Fallback: Cookie (access_token o token)
    const cookieHeader = handshake.headers?.cookie;
    if (typeof cookieHeader === 'string' && cookieHeader.trim()) {
        for (const fragment of cookieHeader.split(';')) {
            const [rawName, ...rest] = fragment.trim().split('=');
            if (rawName === 'access_token' || rawName === 'token') {
                const cookieVal = decodeURIComponent(rest.join('=').trim());
                if (cookieVal) return cookieVal;
            }
        }
    }

    return null;
};

/**
 * Verifica criptográficamente y decodifica un token JWT de acceso.
 * Lanza error con err.data = { code: 4401 } si falta, expiró, firma inválida o es un refresh token.
 * @param {string} token - El token JWT
 * @param {string} jwtSecret - Secreto compartido con ms-auth
 * @returns {Object} - Payload verificado del JWT
 */
const verifyJWT = (token, jwtSecret) => {
    if (!token) {
        const err = new Error('Token de acceso requerido');
        err.data = { code: 4401 };
        throw err;
    }

    let payload;
    try {
        payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
    } catch (err) {
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

    if (payload?.tokenUse && payload.tokenUse !== 'access') {
        const err = new Error('Tipo de token inválido para WebSocket: se requiere access token');
        err.data = { code: 4401 };
        throw err;
    }

    return payload;
};

const ROLES_COORDINADORES = new Set(['COORDINADOR', 'SUPERVISOR', 'ADMINISTRADOR']);
const ROLES_AUTENTICADOS_INCIDENCIAS = new Set([
    'REPORTANTE',
    'TECNICO',
    'SUPERVISOR',
    'COORDINADOR',
    'ADMINISTRADOR',
]);

const esUsuarioCoordinador = (user) => {
    if (!user) return false;
    const rol = String(user.rol || '').toUpperCase();
    const perms = Array.isArray(user.permissions) ? user.permissions : [];
    return (
        ROLES_COORDINADORES.has(rol) ||
        perms.includes('COORDINADOR') ||
        perms.includes('ordenes:asignar')
    );
};

const tieneAccesoLecturaIncidencias = (user) => {
    if (!user) return false;
    const rol = String(user.rol || '').toUpperCase();
    const perms = Array.isArray(user.permissions) ? user.permissions : [];
    return perms.includes('incidencias:ver') || ROLES_AUTENTICADOS_INCIDENCIAS.has(rol);
};

/**
 * Valida mediante PBAC si un socket autenticado puede suscribirse a una sala específica.
 * Previene escalación horizontal/vertical por spoofing de nombres de sala o roles.
 */
const esSalaAutorizadaPBAC = (roomName, user) => {
    if (typeof roomName !== 'string') return false;
    const cleanRoom = roomName.trim();
    if (!cleanRoom) return false;

    if (cleanRoom === 'coordinadores') {
        return esUsuarioCoordinador(user);
    }

    if (cleanRoom.startsWith('rol_')) {
        const targetRol = cleanRoom.slice(4).toUpperCase();
        return Boolean(user?.rol) && String(user.rol).toUpperCase() === targetRol;
    }

    if (cleanRoom === 'incidencias') {
        return tieneAccesoLecturaIncidencias(user);
    }

    if (cleanRoom.startsWith('incidencia_') || cleanRoom.startsWith('edificio_')) {
        const suffix = cleanRoom.slice(cleanRoom.indexOf('_') + 1).trim();
        return Boolean(suffix) && tieneAccesoLecturaIncidencias(user);
    }

    return false;
};

const buildGateway = (options = {}) => {
    const fastify = Fastify({
        logger: options.logger ?? true,
        trustProxy: getTrustProxy(options.trustProxy ?? process.env.GATEWAY_TRUST_PROXY),
    });

    const killSwitch = options.killSwitchManager || new KillSwitchManager(options);
    fastify.killSwitch = killSwitch;

    const activosTargetUrl = options.activosUrl || process.env.MS_ACTIVOS_URL || 'http://localhost:3003';
    const incidenciasTargetUrl = options.incidenciasUrl || process.env.MS_INCIDENCIAS_URL || 'http://localhost:3002';
    const authTargetUrl = options.authUrl || process.env.MS_AUTH_URL || 'http://localhost:3001';
    const notificacionesTargetUrl =
        options.notificacionesUrl || process.env.MS_NOTIFICACIONES_URL || 'http://127.0.0.1:3004';

    const auditLogger =
        options.auditLogger ||
        new AuditLogger({
            ...options,
            authUrl: authTargetUrl,
            incidenciasUrl: incidenciasTargetUrl,
            activosUrl: activosTargetUrl,
            notificacionesUrl: notificacionesTargetUrl,
            adminApiKey: killSwitch.adminApiKey,
            fastifyLogger: fastify.log,
        });
    fastify.auditLogger = auditLogger;

    const AUDIT_START_NS = Symbol('auditStartNs');

    // TAL-4 & TAL-178: Hook de inicio de petición (marca temporal de alta resolución + Kill Switch)
    fastify.addHook('onRequest', async (request, reply) => {
        if (auditLogger.isMutatingMethod(request.method)) {
            request[AUDIT_START_NS] = process.hrtime.bigint();
        }

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

    // TAL-178: Registro estructurado no bloqueante (< 2 ms) de transacciones mutantes (POST, PUT, PATCH, DELETE)
    fastify.addHook('onResponse', async (request, reply) => {
        if (auditLogger.isMutatingMethod(request.method)) {
            auditLogger.recordTransaction(request, reply, request[AUDIT_START_NS]);
        }
    });

    const rawGlobalMax = Number(
        options.globalRateLimitMax ?? process.env.RATE_LIMIT_GLOBAL_MAX ?? 300
    );
    const rawGlobalWindowMs = Number(
        options.globalRateLimitWindowMs ?? process.env.RATE_LIMIT_GLOBAL_WINDOW_MS ?? 15 * 60 * 1000
    );

    // TAL-19: Rate Limiting base por IP (con cuotas aisladas para login en TAL-126)
    fastify.register(rateLimit, {
        global: true,
        max: Number.isFinite(rawGlobalMax) && rawGlobalMax > 0 ? rawGlobalMax : 300,
        timeWindow: Number.isFinite(rawGlobalWindowMs) && rawGlobalWindowMs > 0 ? rawGlobalWindowMs : 15 * 60 * 1000,
        allowList: (request) => {
            const url = request.raw?.url || request.url || '';
            return (
                url === '/' ||
                url.startsWith('/health') ||
                url.startsWith('/api/v1/health') ||
                url.startsWith('/api/v1/kill-switch')
            );
        },
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

    // TAL-178: Consulta administrativa paginada de auditoría y salud de microservicios (PBAC)
    fastify.get('/api/v1/auditoria', async (request, reply) => {
        const authResult = auditLogger.authorizeAuditAccess(request);
        if (!authResult.authorized) {
            const nowIso = new Date().toISOString();
            return reply.code(authResult.statusCode).send({
                statusCode: authResult.statusCode,
                error: authResult.error,
                codigo: authResult.codigo,
                mensaje: authResult.mensaje,
                message: authResult.mensaje,
                timestamp: nowIso,
                path: '/api/v1/auditoria',
            });
        }

        const query = request.query || {};
        const resultadoLogs = auditLogger.queryLogs(query);
        const includeHealth = String(query.includeHealth ?? 'true').toLowerCase() !== 'false';
        const servicios = includeHealth ? await auditLogger.checkMicroservicesHealth() : null;

        return reply.code(200).send({
            ...resultadoLogs,
            ...(servicios ? { servicios } : {}),
        });
    });

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
        routes: ['/inicio-sesion'],
        httpMethods: ['POST'],
        rewritePrefix: '/autenticacion',
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

    // 1. Middleware CORS del lado de Socket.io sincronizado con HTTP (rechazo perimetral inmediato)
    io.use((socket, next) => {
        const origin = socket.handshake.headers.origin;
        const currentAllowed = getAllowedOrigins(options.corsOrigins);
        if (!origin || currentAllowed.includes('*') || currentAllowed.includes(origin)) {
            socket.data.origin = origin;
            return next();
        }
        return next(new Error('[Ciberseguridad - CORS] Origen no autorizado para Socket.io'));
    });

    // 2. Middleware de autenticación JWT y extracción de claims PBAC en handshake (TAL-184)
    const gatewayJwtSecret =
        options.jwtSecret ||
        process.env.JWT_SECRET ||
        (process.env.NODE_ENV === 'production' ? '' : 'super_secret_key_change_me');

    io.use((socket, next) => {
        try {
            if (!gatewayJwtSecret) {
                const cfgErr = new Error('JWT_SECRET no configurado en API Gateway');
                cfgErr.data = { code: 4401 };
                return next(cfgErr);
            }

            const token = extractTokenFromHandshake(socket);
            const payload = verifyJWT(token, gatewayJwtSecret);
            const normalizedRol = String(payload.rol || payload.role || '')
                .trim()
                .toUpperCase();

            // Adjuntar claims del JWT verificado — CERO CONFIANZA en parámetros query del cliente
            socket.data.user = {
                sub: payload.sub || payload.userId,
                email: payload.email,
                rol: normalizedRol,
                permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
                userId: payload.userId || payload.sub,
                tokenUse: payload.tokenUse || 'access',
                exp: payload.exp,
                iat: payload.iat,
            };

            return next();
        } catch (err) {
            fastify.log.warn(
                { err: err.message, code: err.data?.code || 4401 },
                `[Socket.io] Fallo en la autenticación JWT para socket ${socket.id}`
            );
            if (!err.data) {
                err.data = { code: 4401 };
            }
            return next(err);
        }
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

    const anticipoEmisionMs = Number.isFinite(options.tokenExpiryLeadMs)
        ? Math.max(0, options.tokenExpiryLeadMs)
        : 30000;

    io.on('connection', (socket) => {
        // Claims verificados exclusivamente desde el JWT firmado por ms-auth (TAL-184)
        const user = socket.data.user || { sub: 'anonymous', rol: 'ANONIMO', permissions: [] };
        const query = socket.handshake.query || {};

        fastify.log.info(
            `[Socket.io] Cliente conectado: ${socket.id}, user: ${user.sub || 'anonymous'}, rol: ${user.rol}`
        );

        // Sala general de incidencias (validada por PBAC)
        if (tieneAccesoLecturaIncidencias(user)) {
            socket.join('incidencias');
        }

        // Asignación automática de salas de rol y coordinación SOLO desde claims verificados del JWT
        if (esUsuarioCoordinador(user)) {
            socket.join('coordinadores');
        }
        if (user.rol) {
            socket.join(`rol_${user.rol}`);
        }

        // Suscripción contextual opcional de incidencia/edificio si el usuario posee permiso de lectura
        if (query.incidencia && tieneAccesoLecturaIncidencias(user)) {
            const roomInc = `incidencia_${query.incidencia}`;
            socket.join(roomInc);
            upstreamSocket?.emit('join_room', { room: roomInc });
        }
        if (query.edificio && tieneAccesoLecturaIncidencias(user)) {
            const roomEd = `edificio_${query.edificio}`;
            socket.join(roomEd);
            upstreamSocket?.emit('join_room', { room: roomEd });
        }

        // Eventos dinámicos join_room / unirse_sala filtrados estrictamente con PBAC (cero spoofing)
        const handleJoinRoom = (data, ack) => {
            const solicitadas = new Set();

            if (typeof data === 'string' && data.trim()) {
                solicitadas.add(data.trim());
            } else if (data && typeof data === 'object') {
                const roomName = data.room || data.sala;
                if (typeof roomName === 'string' && roomName.trim()) {
                    solicitadas.add(roomName.trim());
                }
                const roomList = Array.isArray(data.rooms)
                    ? data.rooms
                    : Array.isArray(data.salas)
                      ? data.salas
                      : [];
                for (const r of roomList) {
                    if (typeof r === 'string' && r.trim()) {
                        solicitadas.add(r.trim());
                    }
                }
                if (data.id_incidencia) {
                    solicitadas.add(`incidencia_${data.id_incidencia}`);
                }
                if (data.id_edificio) {
                    solicitadas.add(`edificio_${data.id_edificio}`);
                }
                if (data.rol) {
                    const rolSolicitado = String(data.rol).trim().toUpperCase();
                    solicitadas.add(`rol_${rolSolicitado}`);
                    if (ROLES_COORDINADORES.has(rolSolicitado)) {
                        solicitadas.add('coordinadores');
                    }
                }
            }

            const salasUnidas = [];
            const salasDenegadas = [];

            for (const candidate of solicitadas) {
                if (esSalaAutorizadaPBAC(candidate, user)) {
                    socket.join(candidate);
                    salasUnidas.push(candidate);
                } else {
                    salasDenegadas.push(candidate);
                }
            }

            if (salasUnidas.length > 0) {
                upstreamSocket?.emit('join_room', { rooms: salasUnidas });
            }

            const response = {
                status: 'joined',
                rooms: salasUnidas,
                ...(salasDenegadas.length > 0 ? { denied: salasDenegadas } : {}),
            };
            if (typeof ack === 'function') {
                ack(response);
            }
            return response;
        };

        const handleLeaveRoom = (data, ack) => {
            const room = typeof data === 'string' ? data.trim() : String(data?.room || data?.sala || '').trim();
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

        // TAL-184: Temporizador proactivo de expiración de token basado en el claim 'exp' del JWT
        let tokenExpiryTimeout = null;
        if (user.tokenUse === 'access' && typeof user.exp === 'number') {
            const tiempoHastaExpiracion = user.exp * 1000 - Date.now();
            if (tiempoHastaExpiracion > 0) {
                const delayMs = Math.max(25, tiempoHastaExpiracion - anticipoEmisionMs);
                tokenExpiryTimeout = setTimeout(() => {
                    const restanteSegundos = Math.max(
                        0,
                        Math.ceil((user.exp * 1000 - Date.now()) / 1000)
                    );
                    fastify.log.info(`[Socket.io] Emitiendo token_expirado para socket ${socket.id}`);
                    socket.emit('token_expirado', {
                        message: 'Su token de acceso está por expirar. Renueve su sesión.',
                        timeRemaining: restanteSegundos,
                        requiresRefresh: true,
                    });
                }, delayMs);
            }
        }

        socket.data.tokenExpiryTimeout = tokenExpiryTimeout;

        socket.on('disconnect', (reason) => {
            fastify.log.info(`[Socket.io] Cliente desconectado: ${socket.id}, reason: ${reason}`);
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