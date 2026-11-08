require('dotenv').config();

const Fastify = require('fastify');
const proxy = require('@fastify/http-proxy');
const fastifyCors = require('@fastify/cors');
const rateLimit = require('@fastify/rate-limit');
const RateLimitStore = require('./rate-limit-store');
const KillSwitchManager = require('./kill-switch');

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

    return fastify;
};

const start = async () => {
    const fastify = buildGateway();
    const port = Number(process.env.GATEWAY_PORT ?? process.env.PORT ?? 3000);

    try {
        await fastify.listen({ port, host: '0.0.0.0' });
        fastify.log.info(`API Gateway ejecutándose en http://localhost:${port}`);
    } catch (error) {
        fastify.log.error(error);
        process.exit(1);
    }
};

if (require.main === module) {
    start();
}

module.exports = { buildGateway, start };