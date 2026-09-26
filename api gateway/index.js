require('dotenv').config();

const Fastify = require('fastify');
const proxy = require('@fastify/http-proxy');

const buildGateway = (options = {}) => {
    const fastify = Fastify({ logger: options.logger ?? true });

    fastify.get('/', async () => ({ status: 'OK' }));

    const handleProxyError = (reply, error) => {
        fastify.log.error(error, 'Fallo al conectar con el microservicio de destino');
        reply.code(502).send({
            error: 'Bad Gateway',
            message: 'El microservicio de destino se encuentra apagado o inaccesible en este momento.',
        });
    };

    fastify.register(proxy, {
        upstream: options.activosUrl || process.env.MS_ACTIVOS_URL || 'http://localhost:3001',
        prefix: '/api/activos',
        replyOptions: { onError: handleProxyError }
    });

    fastify.register(proxy, {
        upstream: options.incidenciasUrl || process.env.MS_INCIDENCIAS_URL || 'http://localhost:3002',
        prefix: '/api/incidencias',
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
