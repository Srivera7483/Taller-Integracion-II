require('dotenv').config();

const Fastify = require('fastify');
const proxy = require('@fastify/http-proxy');

const fastify = Fastify({ logger: true });
const port = Number(process.env.GATEWAY_PORT ?? process.env.PORT ?? 3000);

fastify.get('/', async () => ({ status: 'OK' }));

const handleProxyError = (reply, error) => {
    fastify.log.error(error, 'Fallo al conectar con el microservicio de destino');
    reply.code(502).send({
        error: 'Bad Gateway',
        message: 'El microservicio de destino se encuentra apagado o inaccesible en este momento.',
    });
};

fastify.register(proxy, {
    upstream: process.env.MS_ACTIVOS_URL || 'http://localhost:3001',
    prefix: '/api/activos',
    replyOptions: { onError: handleProxyError }
});

fastify.register(proxy, {
    upstream: process.env.MS_INCIDENCIAS_URL || 'http://localhost:3002',
    prefix: '/api/incidencias',
    replyOptions: { onError: handleProxyError }
});

const start = async () => {
    try {
        await fastify.listen({ port, host: '0.0.0.0' });
        fastify.log.info(`API Gateway ejecutándose en http://localhost:${port}`);
    } catch (error) {
        fastify.log.error(error);
        process.exit(1);
    }
};

start();
