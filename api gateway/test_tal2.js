const { io } = require('socket.io-client');
const { buildGateway } = require('./index.js');

console.log('=== TAL-2: Prueba de Funcionamiento WebSocket ===\n');

const { fastify, io: gatewayIo } = buildGateway({ logger: false });

fastify.listen({ port: 0, host: '127.0.0.1' }).then(() => {
    const { port } = fastify.server.address();
    console.log(`1. API Gateway y Socket.io escuchando en http://127.0.0.1:${port}\n`);

    const client = io(`http://127.0.0.1:${port}`, {
        query: { userId: 'test-user-123', rol: 'COORDINADOR' },
        transports: ['websocket', 'polling'],
        extraHeaders: { origin: 'http://localhost:5173' },
    });

    client.on('connect', () => {
        console.log('2. Cliente conectado exitosamente. Socket ID:', client.id);

        client.on('nueva-incidencia', (data) => {
            console.log('3. Evento recibido en sala incidencias:', data);

            client.disconnect();
            client.removeAllListeners();

            setTimeout(async () => {
                const listeners = client.listeners('nueva-incidencia').length;
                console.log('4. Listeners restantes tras desconexión limpia:', listeners);
                await fastify.close();
                console.log('\n=== TAL-2: Todas las pruebas completadas exitosamente ===');
                process.exit(0);
            }, 150);
        });

        gatewayIo.emitIncidencias('nueva-incidencia', {
            id: 'inc-001',
            titulo: 'Incidencia de prueba',
            descripcion: 'Prueba TAL-2 sincronización en tiempo real',
        });
    });

    client.on('connect_error', async (err) => {
        console.error('Error de conexión:', err.message);
        await fastify.close();
        process.exit(1);
    });
});
