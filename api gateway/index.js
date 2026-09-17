require('dotenv').config();
const Fastify = require('fastify');
const proxy = require('@fastify/http-proxy');

const fastify = Fastify({ logger: false });
const PORT = process.env.GATEWAY_PORT || 3000;

const handleProxyError = (reply, error) => {
    console.error(`[Gateway Error] Fallo al conectar con microservicio: ${error.message}`);
    reply.code(502).send({
        error: 'Bad Gateway',
        message: 'El microservicio de destino se encuentra apagado o inaccesible en este momento.'
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
        await fastify.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`🚀 API Gateway (Fastify) ejecutándose en http://localhost:${PORT}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
