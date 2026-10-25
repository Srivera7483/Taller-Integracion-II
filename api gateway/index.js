require('dotenv').config();

const Fastify = require('fastify');
const proxy = require('@fastify/http-proxy');
const fastifyCors = require('@fastify/cors');
const rateLimit = require('@fastify/rate-limit');
const RateLimitStore = require('./rate-limit-store');

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

    fastify.register(rateLimit, {
        global: false,
        store: RateLimitStore,
    });

    fastify.get('/', async () => ({ status: 'OK' }));

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
    });

    fastify.register(proxy, {
        upstream: options.activosUrl || process.env.MS_ACTIVOS_URL || 'http://localhost:3003',
        prefix: '/api/v1/activos',
        rewritePrefix: '/api/v1/activos',
        replyOptions: { onError: handleProxyError }
    });

    fastify.register(proxy, {
        upstream: options.incidenciasUrl || process.env.MS_INCIDENCIAS_URL || 'http://localhost:3002',
        prefix: '/api/v1/incidencias',
        rewritePrefix: '/api/v1/incidencias',
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
        rewritePrefix: '/auth', // ESTÁNDAR! Los otros deben seguir este
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
