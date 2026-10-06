const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const { buildGateway } = require('./index');

const unavailableServices = {
    activosUrl: 'http://127.0.0.1:1',
    incidenciasUrl: 'http://127.0.0.1:1',
    logger: false,
};

const startTarget = (body) => new Promise((resolve) => {
    const server = http.createServer((request, response) => {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ ...body, path: request.url }));
    });
    server.listen(0, '127.0.0.1', () => {
        const { port } = server.address();
        resolve({ server, url: `http://127.0.0.1:${port}` });
    });
});

test('GET / responde 200 OK', async (t) => {
    const app = buildGateway(unavailableServices);
    t.after(() => app.close());

    const response = await app.inject({ method: 'GET', url: '/' });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { status: 'OK' });
});

test('GET /health responde 200 OK con uptime', async (t) => {
    const app = buildGateway(unavailableServices);
    t.after(() => app.close());

    const response = await app.inject({ method: 'GET', url: '/health' });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().status, 'OK');
    assert.equal(typeof response.json().uptime, 'number');
});

test('redirige activos e incidencias a sus microservicios', async (t) => {
    const activos = await startTarget({ service: 'activos' });
    const incidencias = await startTarget({ service: 'incidencias' });
    const app = buildGateway({
        activosUrl: activos.url,
        incidenciasUrl: incidencias.url,
        logger: false,
    });
    t.after(async () => {
        await app.close();
        activos.server.close();
        incidencias.server.close();
    });

    const activosResponse = await app.inject({ method: 'GET', url: '/api/v1/activos' });
    const incidenciasResponse = await app.inject({ method: 'GET', url: '/api/v1/incidencias' });

    assert.equal(activosResponse.statusCode, 200);
    assert.deepEqual(activosResponse.json(), { service: 'activos', path: '/api/v1/activos' });
    assert.equal(incidenciasResponse.statusCode, 200);
    assert.deepEqual(incidenciasResponse.json(), { service: 'incidencias', path: '/api/v1/incidencias' });
});

test('los proxies devuelven 502 y el Gateway sigue disponible', async (t) => {
    const app = buildGateway(unavailableServices);
    t.after(() => app.close());

    const activos = await app.inject({ method: 'GET', url: '/api/v1/activos' });
    const incidencias = await app.inject({ method: 'GET', url: '/api/v1/incidencias' });
    const health = await app.inject({ method: 'GET', url: '/' });

    assert.equal(activos.statusCode, 502);
    assert.equal(incidencias.statusCode, 502);
    assert.equal(health.statusCode, 200);
});

test('Rate Limiting: bloquea con 429 Too Many Requests al exceder el maximo configurado', async (t) => {
    const app = buildGateway({
        ...unavailableServices,
        rateLimitMax: 3,
        rateLimitWindow: '1 minute',
    });
    t.after(() => app.close());

    // Primeras 3 solicitudes dentro del límite
    for (let i = 0; i < 3; i++) {
        const res = await app.inject({ method: 'GET', url: '/api/v1/activos' });
        assert.ok(res.statusCode === 502 || res.statusCode === 200);
        assert.ok(res.headers['x-ratelimit-limit']);
    }

    // Cuarta solicitud debe ser rechazada por Rate Limit
    const bloqueada = await app.inject({ method: 'GET', url: '/api/v1/activos' });

    assert.equal(bloqueada.statusCode, 429);
    assert.equal(bloqueada.json().error, 'Too Many Requests');
    assert.ok(bloqueada.json().message.includes('excedido el límite'));
});

test('Rate Limiting: no bloquea rutas excluidas en allowList (/ y /health)', async (t) => {
    const app = buildGateway({
        ...unavailableServices,
        rateLimitMax: 2,
        rateLimitWindow: '1 minute',
    });
    t.after(() => app.close());

    // Hacemos 5 solicitudes a / y /health que deberían ser permitidas sin límite
    for (let i = 0; i < 5; i++) {
        const resHealth = await app.inject({ method: 'GET', url: '/health' });
        assert.equal(resHealth.statusCode, 200);

        const resRoot = await app.inject({ method: 'GET', url: '/' });
        assert.equal(resRoot.statusCode, 200);
    }
});