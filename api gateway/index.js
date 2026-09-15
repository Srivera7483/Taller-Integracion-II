require('dotenv').config();

const fastify = require('fastify')({ logger: true });
const port = Number(process.env.PORT) || 3000;

fastify.get('/', async () => ({ status: 'OK' }));

const start = async () => {
  try {
    await fastify.listen({ port, host: '0.0.0.0' });
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

start();