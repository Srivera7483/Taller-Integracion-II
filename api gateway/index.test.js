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

const startNotificationsTarget = () => new Promise((resolve) => {
    const server = http.createServer((request, response) => {
        const chunks = [];
        request.on('data', (chunk) => chunks.push(chunk));
        request.on('end', () => {
            response.writeHead(201, { 'content-type': 'application/json' });
            response.end(JSON.stringify({
                path: request.url,
                payload: JSON.parse(Buffer.concat(chunks).toString()),
            }));
        });
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

    const activosResponse = await app.inject({ method: 'GET', url: '/api/v1/activos' });
    const incidenciasResponse = await app.inject({ method: 'GET', url: '/api/v1/incidencias' });

    assert.equal(activosResponse.statusCode, 200);
    assert.deepEqual(activosResponse.json(), { service: 'activos', path: '/api/v1/activos' });
    assert.equal(incidenciasResponse.statusCode, 200);
    assert.deepEqual(incidenciasResponse.json(), { service: 'incidencias', path: '/api/v1/incidencias' });
});

test('redirige POST de notificaciones al endpoint interno /notificar', async (t) => {
    const notificaciones = await startNotificationsTarget();
    const app = buildGateway({
        notificacionesUrl: notificaciones.url,
        logger: false,
    });
    t.after(async () => {
        await app.close();
        notificaciones.server.close();
    });

    const payload = { destinatario: 'usuario-1', mensaje: 'Prueba' };
    const response = await app.inject({
        method: 'POST',
        url: '/api/v1/notificaciones',
        payload,
    });

    assert.equal(response.statusCode, 201);
    assert.deepEqual(response.json(), { path: '/notificar', payload });
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