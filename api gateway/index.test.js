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
    const mantenimientosResponse = await app.inject({ method: 'GET', url: '/api/v1/mantenimientos' });
    const incidenciasResponse = await app.inject({ method: 'GET', url: '/api/v1/incidencias' });

    assert.equal(activosResponse.statusCode, 200);
    assert.deepEqual(activosResponse.json(), { service: 'activos', path: '/api/v1/activos' });
    assert.equal(mantenimientosResponse.statusCode, 200);
    assert.deepEqual(mantenimientosResponse.json(), { service: 'activos', path: '/api/v1/mantenimientos' });
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

// TAL-4: Pruebas del Middleware / Guardián de Kill Switch
const createMockJwt = (role) => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ userId: 'u-admin-1', rol: role, email: 'admin@uct.cl' })).toString('base64url');
    return `${header}.${payload}.mockSignature`;
};

test('TAL-4: GET /api/v1/kill-switch expone el estado actual para frontend (TAL-188)', async (t) => {
    const app = buildGateway({
        ...unavailableServices,
        killSwitchEnabled: false,
    });
    t.after(() => app.close());

    const res = await app.inject({ method: 'GET', url: '/api/v1/kill-switch' });
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.activo, false);
    assert.ok(body.motivo);
    assert.equal(res.headers['x-kill-switch'], undefined);
});

test('TAL-4: Kill Switch activo deniega operaciones de escritura con HTTP 503, cabecera X-Kill-Switch y motivo', async (t) => {
    const customReason = 'Mantenimiento crítico de emergencia en base de datos PostgreSQL.';
    const app = buildGateway({
        ...unavailableServices,
        killSwitchEnabled: true,
        killSwitchReason: customReason,
    });
    t.after(() => app.close());

    // 1. POST debe ser denegado con 503
    const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/incidencias',
        payload: { titulo: 'Falla', descripcion: 'Prueba' },
    });
    assert.equal(postRes.statusCode, 503);
    assert.equal(postRes.headers['x-kill-switch'], 'true');
    const postBody = JSON.parse(postRes.body);
    assert.equal(postBody.error, 'Service Unavailable');
    assert.equal(postBody.killSwitch, true);
    assert.equal(postBody.motivo, customReason);

    // 2. PUT debe ser denegado con 503
    const putRes = await app.inject({
        method: 'PUT',
        url: '/api/v1/incidencias/123/estado',
        payload: { id_estado: 2 },
    });
    assert.equal(putRes.statusCode, 503);
    assert.equal(putRes.headers['x-kill-switch'], 'true');

    // 3. PATCH debe ser denegado con 503
    const patchRes = await app.inject({
        method: 'PATCH',
        url: '/api/v1/ordenes-trabajo/456',
        payload: { diagnostico: 'test' },
    });
    assert.equal(patchRes.statusCode, 503);
    assert.equal(patchRes.headers['x-kill-switch'], 'true');

    // 4. DELETE debe ser denegado con 503
    const deleteRes = await app.inject({
        method: 'DELETE',
        url: '/api/v1/incidencias/789',
    });
    assert.equal(deleteRes.statusCode, 503);
    assert.equal(deleteRes.headers['x-kill-switch'], 'true');
});

test('TAL-4: Kill Switch activo permite operaciones de lectura segura (GET)', async (t) => {
    const incidenciasTarget = await startTarget({ servicio: 'incidencias', status: 'OK' });
    const app = buildGateway({
        ...unavailableServices,
        incidenciasUrl: incidenciasTarget.url,
        killSwitchEnabled: true,
    });
    t.after(async () => {
        await app.close();
        incidenciasTarget.server.close();
    });

    // Petición GET pasa a través del proxy sin ser bloqueada por el Kill Switch
    const getRes = await app.inject({ method: 'GET', url: '/api/v1/incidencias' });
    assert.equal(getRes.statusCode, 200);
    const body = JSON.parse(getRes.body);
    assert.equal(body.servicio, 'incidencias');
});

test('TAL-4: Rutas de autenticación (login) no son bloqueadas para permitir acceso administrativo', async (t) => {
    const authTarget = await startTarget({ token: 'mock-jwt-token' });
    const app = buildGateway({
        ...unavailableServices,
        authUrl: authTarget.url,
        killSwitchEnabled: true,
    });
    t.after(async () => {
        await app.close();
        authTarget.server.close();
    });

    const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'admin@uct.cl', password: 'password123' },
    });
    // Pasa al upstream de Auth (no es bloqueado con 503)
    assert.equal(loginRes.statusCode, 200);
});

test('TAL-4: Endpoint de control administrativo requiere rol ADMINISTRADOR o clave de emergencia', async (t) => {
    const app = buildGateway({
        ...unavailableServices,
        killSwitchEnabled: false,
        adminApiKey: 'secret-key-123',
    });
    t.after(() => app.close());

    // 1. Intento sin credenciales -> 403 Forbidden
    const unauthRes = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/kill-switch',
        payload: { activo: true },
    });
    assert.equal(unauthRes.statusCode, 403);

    // 2. Intento con rol TECNICO (no admin) -> 403 Forbidden
    const tecnicoRes = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/kill-switch',
        headers: { authorization: `Bearer ${createMockJwt('TECNICO')}` },
        payload: { activo: true },
    });
    assert.equal(tecnicoRes.statusCode, 403);

    // 3. Con rol ADMINISTRADOR -> 200 OK
    const adminRes = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/kill-switch',
        headers: { authorization: `Bearer ${createMockJwt('ADMINISTRADOR')}` },
        payload: { activo: true, motivo: 'Suspensión manual por administrador' },
    });
    assert.equal(adminRes.statusCode, 200);
    const adminBody = JSON.parse(adminRes.body);
    assert.equal(adminBody.status.activo, true);
    assert.equal(adminBody.status.motivo, 'Suspensión manual por administrador');

    // 4. Con clave administrativa de emergencia en cabecera -> 200 OK
    const apiKeyRes = await app.inject({
        method: 'POST',
        url: '/api/v1/kill-switch',
        headers: { 'x-admin-key': 'secret-key-123' },
        payload: { activo: false },
    });
    assert.equal(apiKeyRes.statusCode, 200);
    const apiKeyBody = JSON.parse(apiKeyRes.body);
    assert.equal(apiKeyBody.status.activo, false);
});

test('TAL-4: Desactivar el Kill Switch reanuda inmediatamente las operaciones de escritura', async (t) => {
    const incidenciasTarget = await startTarget({ creada: true });
    const app = buildGateway({
        ...unavailableServices,
        incidenciasUrl: incidenciasTarget.url,
        killSwitchEnabled: true,
    });
    t.after(async () => {
        await app.close();
        incidenciasTarget.server.close();
    });

    // 1. Inicialmente activo -> POST bloqueado con 503
    const blockedRes = await app.inject({
        method: 'POST',
        url: '/api/v1/incidencias',
        payload: { titulo: 'Falla' },
    });
    assert.equal(blockedRes.statusCode, 503);

    // 2. Desactivar Kill Switch vía endpoint de control con JWT ADMINISTRADOR
    const deactRes = await app.inject({
        method: 'POST',
        url: '/api/v1/kill-switch',
        headers: { authorization: `Bearer ${createMockJwt('ADMINISTRADOR')}` },
        payload: { activo: false },
    });
    assert.equal(deactRes.statusCode, 200);

    // 3. Verificar estado expuesto para frontend -> activo: false
    const statusRes = await app.inject({ method: 'GET', url: '/api/v1/kill-switch' });
    const statusBody = JSON.parse(statusRes.body);
    assert.equal(statusBody.activo, false);

    // 4. Reanuda automáticamente: POST ahora pasa exitosamente al upstream
    const allowedRes = await app.inject({
        method: 'POST',
        url: '/api/v1/incidencias',
        payload: { titulo: 'Falla' },
    });
    assert.equal(allowedRes.statusCode, 200);
    assert.equal(JSON.parse(allowedRes.body).creada, true);
});