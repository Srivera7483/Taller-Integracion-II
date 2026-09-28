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
        response.end(JSON.stringify(body));
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

    const activosResponse = await app.inject({ method: 'GET', url: '/api/activos' });
    const incidenciasResponse = await app.inject({ method: 'GET', url: '/api/incidencias' });

    assert.equal(activosResponse.statusCode, 200);
    assert.deepEqual(activosResponse.json(), { service: 'activos' });
    assert.equal(incidenciasResponse.statusCode, 200);
    assert.deepEqual(incidenciasResponse.json(), { service: 'incidencias' });
});

test('los proxies devuelven 502 y el Gateway sigue disponible', async (t) => {
    const app = buildGateway(unavailableServices);
    t.after(() => app.close());

    const activos = await app.inject({ method: 'GET', url: '/api/activos' });
    const incidencias = await app.inject({ method: 'GET', url: '/api/incidencias' });
    const health = await app.inject({ method: 'GET', url: '/' });

    assert.equal(activos.statusCode, 502);
    assert.equal(incidencias.statusCode, 502);
    assert.equal(health.statusCode, 200);
});