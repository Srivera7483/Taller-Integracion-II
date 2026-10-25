const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const { buildGateway } = require('./index');
const RateLimitStore = require('./rate-limit-store');

const unavailableServices = {
    activosUrl: 'http://127.0.0.1:1',
    incidenciasUrl: 'http://127.0.0.1:1',
    authUrl: 'http://127.0.0.1:1',
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

test('el contador restablece el límite al expirar la ventana', (t) => {
    const store = new RateLimitStore();
    t.after(() => clearInterval(store.cleanupTimer));
    const originalNow = Date.now;
    let now = 1_000;
    Date.now = () => now;

    try {
        const results = Array.from({ length: 6 }, () => {
            let result;
            store.incr('192.0.2.20', (error, value) => {
                assert.ifError(error);
                result = value;
            }, 15 * 60 * 1000, 5);
            return result;
        });
        assert.deepEqual(results.map(({ current }) => current), [1, 2, 3, 4, 5, 6]);

        now += 15 * 60 * 1000;
        let expiredWindowResult;
        store.incr('192.0.2.20', (error, result) => {
            assert.ifError(error);
            expiredWindowResult = result;
        }, 15 * 60 * 1000, 5);
        assert.equal(expiredWindowResult.current, 1);
    } finally {
        Date.now = originalNow;
    }
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

test('limita a cinco los intentos de login por IP sin restringir otras rutas', async (t) => {
    const auth = await startTarget({ service: 'auth' });
    const app = buildGateway({
        ...unavailableServices,
        authUrl: auth.url,
    });
    t.after(async () => {
        await app.close();
        auth.server.close();
    });

    const loginAttempts = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
        loginAttempts.push(await app.inject({
            method: 'POST',
            url: '/api/v1/auth/login',
            payload: { email: 'admin@test.com', password: 'wrong-password' },
        }));
    }

    const sixthAttempt = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'admin@test.com', password: 'wrong-password' },
    });
    const otherAuthRoute = await app.inject({ method: 'GET', url: '/api/v1/auth/me' });
    const health = await app.inject({ method: 'GET', url: '/' });

    assert.deepEqual(loginAttempts.map((response) => response.statusCode), [200, 200, 200, 200, 200]);
    assert.equal(sixthAttempt.statusCode, 429);
    assert.equal(otherAuthRoute.statusCode, 200);
    assert.equal(health.statusCode, 200);
});

test('mantiene contadores independientes por IP y no limita otros métodos', async (t) => {
    const auth = await startTarget({ service: 'auth' });
    const app = buildGateway({
        ...unavailableServices,
        authUrl: auth.url,
    });
    t.after(async () => {
        await app.close();
        auth.server.close();
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
        await app.inject({
            method: 'POST',
            url: '/api/v1/auth/login',
            remoteAddress: '192.0.2.10',
            payload: { email: 'admin@test.com', password: 'wrong-password' },
        });
    }

    const blockedClient = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        remoteAddress: '192.0.2.10',
        payload: { email: 'admin@test.com', password: 'wrong-password' },
    });
    const differentClient = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        remoteAddress: '192.0.2.11',
        payload: { email: 'admin@test.com', password: 'wrong-password' },
    });
    const differentMethod = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/login',
        remoteAddress: '192.0.2.10',
    });

    assert.equal(blockedClient.statusCode, 429);
    assert.equal(differentClient.statusCode, 200);
    assert.equal(differentMethod.statusCode, 200);
});

test('solo aplica a la ruta exacta de login e incluye query string en el mismo límite', async (t) => {
    const auth = await startTarget({ service: 'auth' });
    const app = buildGateway({
        ...unavailableServices,
        authUrl: auth.url,
    });
    t.after(async () => {
        await app.close();
        auth.server.close();
    });

    const loginAttempts = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
        loginAttempts.push(await app.inject({
            method: 'POST',
            url: `/api/v1/auth/login?source=${attempt}`,
            payload: { email: 'admin@test.com', password: 'wrong-password' },
        }));
    }

    const sixthAttempt = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login?source=sixth',
        payload: { email: 'admin@test.com', password: 'wrong-password' },
    });
    const nestedRoute = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login/extra',
        payload: { email: 'admin@test.com', password: 'wrong-password' },
    });

    assert.deepEqual(loginAttempts.map((response) => response.statusCode), [200, 200, 200, 200, 200]);
    assert.equal(sixthAttempt.statusCode, 429);
    assert.equal(sixthAttempt.json().statusCode, 429);
    assert.equal(sixthAttempt.headers['retry-after'] !== undefined, true);
    assert.equal(nestedRoute.statusCode, 200);
});

test('no permite evadir el límite falsificando X-Forwarded-For', async (t) => {
    const auth = await startTarget({ service: 'auth' });
    const app = buildGateway({
        ...unavailableServices,
        authUrl: auth.url,
    });
    t.after(async () => {
        await app.close();
        auth.server.close();
    });

    for (let attempt = 1; attempt <= 5; attempt += 1) {
        await app.inject({
            method: 'POST',
            url: '/api/v1/auth/login',
            headers: { 'x-forwarded-for': `198.51.100.${attempt}` },
            payload: { email: 'admin@test.com', password: 'wrong-password' },
        });
    }

    const sixthAttempt = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { 'x-forwarded-for': '198.51.100.6' },
        payload: { email: 'admin@test.com', password: 'wrong-password' },
    });

    assert.equal(sixthAttempt.statusCode, 429);
});

test('las solicitudes a otras rutas de Auth no consumen la cuota de login', async (t) => {
    const auth = await startTarget({ service: 'auth' });
    const app = buildGateway({
        ...unavailableServices,
        authUrl: auth.url,
    });
    t.after(async () => {
        await app.close();
        auth.server.close();
    });

    for (let attempt = 0; attempt < 6; attempt += 1) {
        const refresh = await app.inject({
            method: 'POST',
            url: '/api/v1/auth/refresh',
            payload: {},
        });
        assert.equal(refresh.statusCode, 200);
    }

    const loginAttempts = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
        loginAttempts.push(await app.inject({
            method: 'POST',
            url: '/api/v1/auth/login',
            payload: { email: 'admin@test.com', password: 'wrong-password' },
        }));
    }

    assert.deepEqual(loginAttempts.map((response) => response.statusCode), [
        200, 200, 200, 200, 200, 429,
    ]);
});

test('respeta el límite ante una ráfaga concurrente desde la misma IP', async (t) => {
    const auth = await startTarget({ service: 'auth' });
    const app = buildGateway({
        ...unavailableServices,
        authUrl: auth.url,
    });
    t.after(async () => {
        await app.close();
        auth.server.close();
    });

    const responses = await Promise.all(
        Array.from({ length: 20 }, () => app.inject({
            method: 'POST',
            url: '/api/v1/auth/login?source=concurrent-test',
            payload: { email: 'admin@test.com', password: 'wrong-password' },
        })),
    );

    assert.deepEqual(
        responses.map((response) => response.statusCode).sort((a, b) => a - b),
        [...Array(5).fill(200), ...Array(15).fill(429)].sort((a, b) => a - b),
    );
    assert.ok(responses.filter((response) => response.statusCode === 429)
        .every((response) => response.headers['retry-after'] !== undefined));
});

test('usa la IP reenviada cuando el proxy está explícitamente confiado', async (t) => {
    const auth = await startTarget({ service: 'auth' });
    const app = buildGateway({
        ...unavailableServices,
        authUrl: auth.url,
        trustProxy: '127.0.0.1',
    });
    t.after(async () => {
        await app.close();
        auth.server.close();
    });

    const makeLoginRequest = (clientIp) => app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: { 'x-forwarded-for': clientIp },
        payload: { email: 'admin@test.com', password: 'wrong-password' },
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
        assert.equal((await makeLoginRequest('198.51.100.10')).statusCode, 200);
    }

    assert.equal((await makeLoginRequest('198.51.100.10')).statusCode, 429);
    assert.equal((await makeLoginRequest('198.51.100.11')).statusCode, 200);
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