
require('dotenv').config();

// 1. Validación estricta (Graceful Shutdown)
const REQUIRED_ENVS = ['PORT', 'MS_ACTIVOS_URL', 'MS_INCIDENCIAS_URL', 'MS_AUTH_URL'];
const missing = REQUIRED_ENVS.filter(key => !process.env[key]);

if (missing.length > 0) {
    console.error(`[FATAL] El API Gateway no puede arrancar. Faltan variables en el .env: ${missing.join(', ')}`);
    process.exit(1);
}



const Fastify = require('fastify');
const proxy = require('@fastify/http-proxy');
const fastifyCors = require('@fastify/cors');
const winstonLogger = require('./logger');
// Traductor Winston a Pino, para Fastify
const fastifyLogger = {
    level: 'info',
    info: (msg, ...args) => winstonLogger.info(msg, ...args),
    error: (msg, ...args) => winstonLogger.error(msg, ...args),
    warn: (msg, ...args) => winstonLogger.warn(msg, ...args),
    fatal: (msg, ...args) => winstonLogger.error(msg, ...args),
    trace: (msg, ...args) => winstonLogger.silly(msg, ...args),
    debug: (msg, ...args) => winstonLogger.debug(msg, ...args),
    silent: () => {}, // Fastify usa esto para apagar logs temporalmente
    child: () => fastifyLogger // Fastify crea "hijos" por cada request, le devolvemos el mismo logger
};


const buildGateway = (options = {}) => {
    const fastify = Fastify({ loggerInstance: fastifyLogger});
    

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
            upstream: options.activosUrl || process.env.MS_ACTIVOS_URL,
            prefix: '/api/v1/activos',
            rewritePrefix: '/activos',
            replyOptions: { onError: handleProxyError }
        });

        fastify.register(proxy, {
            upstream: options.incidenciasUrl || process.env.MS_INCIDENCIAS_URL,
            prefix: '/api/v1/incidencias',
            rewritePrefix: '/incidencias',
            replyOptions: { onError: handleProxyError }
        });

        fastify.register(proxy, {
            upstream: options.authUrl || process.env.MS_AUTH_URL,
            prefix: '/api/v1/auth',
            rewritePrefix: '/auth', // ESTÁNDAR! Los otros deben seguir este
            replyOptions: { onError: handleProxyError }
        });
        return fastify;
    };

const start = async () => {
    const fastify = buildGateway();
    const port = Number(process.env.PORT);

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
