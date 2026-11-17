const { test } = require('node:test');
const assert = require('node:assert/strict');
const { io: createClient } = require('socket.io-client');
const { buildGateway } = require('./index');

const waitForConnect = (client, timeoutMs = 4000) =>
    new Promise((resolve, reject) => {
        if (client.connected) return resolve();
        const timer = setTimeout(() => reject(new Error('Timeout esperando conexión Socket.io')), timeoutMs);
        client.once('connect', () => {
            clearTimeout(timer);
            resolve();
        });
        client.once('connect_error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });

const waitForEvent = (client, eventName, timeoutMs = 4000) =>
    new Promise((resolve, reject) => {
        const timer = setTimeout(
            () => reject(new Error(`Timeout esperando evento "${eventName}"`)),
            timeoutMs
        );
        client.once(eventName, (data) => {
            clearTimeout(timer);
            resolve(data);
        });
    });

test('TAL-209 CA-2: Evento emitido en Réplica 1 (3011) es recibido por cliente conectado a Réplica 2 (3012) vía Redis', async (t) => {
    const replica1 = buildGateway({ logger: false, enableUpstreamSocket: false });
    const replica2 = buildGateway({ logger: false, enableUpstreamSocket: false });

    let client1;
    let client2;

    t.after(async () => {
        if (client1) client1.disconnect();
        if (client2) client2.disconnect();
        await replica1.close();
        await replica2.close();
    });

    const adapter1 = await replica1.initRedisAdapter();
    const adapter2 = await replica2.initRedisAdapter();

    assert.equal(
        adapter1.mode,
        'redis',
        'Réplica 1 debe estar acoplada a Redis (asegúrate de tener `docker compose up -d redis`)'
    );
    assert.equal(adapter2.mode, 'redis', 'Réplica 2 debe estar acoplada a Redis');

    await replica1.listen({ port: 3011, host: '127.0.0.1' });
    await replica2.listen({ port: 3012, host: '127.0.0.1' });

    client1 = createClient('http://127.0.0.1:3011', {
        transports: ['websocket'],
        query: { userId: 'tecnico-replica-1' },
    });

    client2 = createClient('http://127.0.0.1:3012', {
        transports: ['websocket'],
        query: { userId: 'admin-replica-2' },
    });

    await Promise.all([waitForConnect(client1), waitForConnect(client2)]);

    // Preparar escucha en el cliente conectado a la Réplica 2 ANTES de emitir desde la Réplica 1
    const eventoRecibidoPromise = waitForEvent(client2, 'nueva_incidencia');

    const payloadEsperado = {
        id_incidencia: 'inc-tal209-cross-replica',
        titulo: 'Falla eléctrica en Laboratorio 3',
        origen: 'replica-1',
    };

    // Emitir únicamente desde la instancia 1
    replica1.io.emitIncidencias('nueva_incidencia', payloadEsperado);

    const payloadRecibido = await eventoRecibidoPromise;
    assert.deepEqual(payloadRecibido, payloadEsperado);
});

test('TAL-209 CA-3: Resistencia a caída/ausencia de Redis con fallback local operativo sin crashear', async (t) => {
    const gatewayFallback = buildGateway({
        logger: false,
        enableUpstreamSocket: false,
        redis: {
            redisUrl: 'redis://127.0.0.1:6399', // Puerto intencionalmente inalcanzable
            connectTimeoutMs: 500,
        },
    });

    let localClient;

    t.after(async () => {
        if (localClient) localClient.disconnect();
        await gatewayFallback.close();
    });

    const adapterState = await gatewayFallback.initRedisAdapter();
    assert.equal(adapterState.mode, 'local-fallback');
    assert.equal(adapterState.isRedisConnected, false);

    await gatewayFallback.listen({ port: 3013, host: '127.0.0.1' });

    localClient = createClient('http://127.0.0.1:3013', {
        transports: ['websocket'],
        query: { userId: 'usuario-local-fallback' },
    });

    await waitForConnect(localClient);

    const eventoLocalPromise = waitForEvent(localClient, 'incidencia_actualizada');

    const payloadLocal = {
        id_incidencia: 'inc-local-001',
        estado: 'En Proceso',
    };

    gatewayFallback.io.emitIncidencias('incidencia_actualizada', payloadLocal);

    const recibido = await eventoLocalPromise;
    assert.deepEqual(recibido, payloadLocal);
});