const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const SENSITIVE_QUERY_KEY_REGEX =
    /^(token|access_token|refresh_token|password|contrasena|pass|pwd|secret|key|api_key|apikey|auth|authorization|cookie|credential|code)$/i;

const UUID_OR_ID_SEGMENT_REGEX =
    /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d+|UCT-[A-Z0-9-]+)$/i;

const PERMISOS_AUDITORIA_PBAC = new Set([
    'auditoria:ver',
    'usuarios:gestionar',
    'estadisticas:ver',
]);

/**
 * Sanitiza la ruta registrada eliminando cualquier credencial o token accidental en query params
 * y acotando la longitud para evitar consumo abusivo de memoria.
 */
const sanitizeAuditRoute = (rawUrl) => {
    const safeRaw = String(rawUrl || '/').slice(0, 1024);
    const qIndex = safeRaw.indexOf('?');
    if (qIndex === -1) {
        return safeRaw.slice(0, 512);
    }

    const pathname = safeRaw.slice(0, qIndex);
    const rawQuery = safeRaw.slice(qIndex + 1);

    try {
        const params = new URLSearchParams(rawQuery);
        const sanitizedPairs = [];
        for (const [k, v] of params.entries()) {
            if (SENSITIVE_QUERY_KEY_REGEX.test(k.trim())) {
                sanitizedPairs.push(`${encodeURIComponent(k)}=[REDACTED]`);
            } else {
                sanitizedPairs.push(`${encodeURIComponent(k)}=${encodeURIComponent(v.slice(0, 120))}`);
            }
        }
        const rebuilt = sanitizedPairs.length > 0 ? `${pathname}?${sanitizedPairs.join('&')}` : pathname;
        return rebuilt.slice(0, 512);
    } catch {
        return pathname.slice(0, 512);
    }
};

/**
 * Clasifica microservicio destino, entidad, ID de entidad y tipo de acción canónica
 * (compatible con AuditoriaEventoDto de ms-notificaciones / auditoria.queue).
 */
const classifyTransactionTarget = (method, sanitizedUrl) => {
    const upperMethod = String(method || 'POST').toUpperCase();
    const pathname = String(sanitizedUrl || '/').split('?')[0];
    const normalizedPath = pathname.replace(/^\/api\/(?!v1(\/|$))/, '/api/v1/');

    let servicioDestino = 'api-gateway';
    if (
        normalizedPath.startsWith('/api/v1/auth') ||
        normalizedPath.startsWith('/api/v1/autenticacion') ||
        normalizedPath.startsWith('/api/v1/usuarios')
    ) {
        servicioDestino = 'ms-auth';
    } else if (
        normalizedPath.startsWith('/api/v1/activos') ||
        normalizedPath.startsWith('/api/v1/mantenimientos') ||
        normalizedPath.startsWith('/api/v1/edificios') ||
        normalizedPath.startsWith('/api/v1/ubicaciones') ||
        normalizedPath.startsWith('/api/v1/categorias')
    ) {
        servicioDestino = 'ms-activos';
    } else if (
        normalizedPath.startsWith('/api/v1/incidencias') ||
        normalizedPath.startsWith('/api/v1/ordenes-trabajo') ||
        normalizedPath.startsWith('/api/v1/estados-incidencia') ||
        normalizedPath.startsWith('/api/v1/tipos-evidencia') ||
        normalizedPath.startsWith('/api/v1/sincronizacion') ||
        normalizedPath.startsWith('/api/v1/estadisticas')
    ) {
        servicioDestino = 'ms-incidencias';
    } else if (
        normalizedPath.startsWith('/api/v1/notificaciones') ||
        normalizedPath.startsWith('/api/v1/eventos')
    ) {
        servicioDestino = 'ms-notificaciones';
    }

    const segments = normalizedPath
        .replace(/^\/api\/v1\/?/, '')
        .split('/')
        .filter(Boolean);

    const entidad = segments[0] || 'gateway';
    let idEntidad = 'N/A';
    for (let i = 1; i < segments.length; i += 1) {
        if (UUID_OR_ID_SEGMENT_REGEX.test(segments[i])) {
            idEntidad = segments[i];
            break;
        }
    }

    let accion = 'EVENTO_SISTEMA';
    const lowerPath = normalizedPath.toLowerCase();
    if (lowerPath.endsWith('/login') || lowerPath.endsWith('/inicio-sesion')) {
        accion = 'LOGIN';
    } else if (lowerPath.endsWith('/logout') || lowerPath.endsWith('/cerrar-sesion')) {
        accion = 'LOGOUT';
    } else if (lowerPath.includes('kill-switch')) {
        accion = 'EVENTO_SISTEMA';
    } else if (
        lowerPath.endsWith('/estado') ||
        lowerPath.endsWith('/resolver') ||
        lowerPath.endsWith('/clasificacion') ||
        lowerPath.endsWith('/prioridad')
    ) {
        accion = 'CAMBIO_ESTADO';
    } else if (upperMethod === 'POST') {
        accion = 'CREACION';
    } else if (upperMethod === 'PUT' || upperMethod === 'PATCH') {
        accion = 'ACTUALIZACION';
    } else if (upperMethod === 'DELETE') {
        accion = 'ELIMINACION';
    }

    return {
        servicioDestino,
        entidad,
        idEntidad,
        accion,
        normalizedRoute: sanitizeAuditRoute(
            normalizedPath + (sanitizedUrl.includes('?') ? sanitizedUrl.slice(sanitizedUrl.indexOf('?')) : '')
        ),
    };
};

/**
 * Extrae el token JWT desde Authorization: Bearer o cookies HttpOnly sin registrar su valor.
 */
const extractRequestJwt = (request) => {
    const authHeader = request?.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        const bearer = authHeader.slice(7).trim();
        if (bearer) return bearer;
    }

    const cookieHeader = request?.headers?.cookie;
    if (typeof cookieHeader === 'string' && cookieHeader.trim()) {
        for (const fragment of cookieHeader.split(';')) {
            const [rawName, ...rest] = fragment.trim().split('=');
            if (rawName === 'access_token' || rawName === 'token') {
                try {
                    const val = decodeURIComponent(rest.join('=').trim());
                    if (val) return val;
                } catch {
                    // Cookie malformada
                }
            }
        }
    }

    return null;
};

/**
 * AuditLogger (TAL-178) — Preparado para Kubero / Kubernetes:
 * - Cero persistencia en archivos locales (compatible con contenedores read-only rootfs y efímeros).
 * - Buffer circular estrictamente acotado en memoria (FIFO) sin crecimiento ilimitado.
 * - Salida estructurada JSON hacia stdout (Pino/Fastify) para agregación nativa en Kubero.
 * - Publicación asíncrona fire-and-forget hacia RabbitMQ (auditoria.queue vía MS_NOTIFICACIONES_URL)
 *   tolerante a desconexiones temporales (< 2 ms de sobrecarga en el ciclo HTTP).
 * - Consulta administrativa paginada/filtrable protegida por permisos PBAC del JWT.
 */
class AuditLogger {
    constructor(options = {}) {
        const rawMax = Number(options.maxAuditEntries ?? process.env.AUDIT_BUFFER_MAX_ENTRIES ?? 500);
        this.maxEntries = Number.isFinite(rawMax) ? Math.min(5000, Math.max(10, Math.floor(rawMax))) : 500;

        // Buffer circular preasignado O(1) para evitar realocaciones y garantizar techo fijo de memoria
        this.buffer = new Array(this.maxEntries);
        this.head = 0;
        this.size = 0;

        this.jwtSecret =
            options.jwtSecret ||
            process.env.JWT_SECRET ||
            (process.env.NODE_ENV === 'production' ? '' : 'super_secret_key_change_me');

        this.adminApiKey = options.adminApiKey || process.env.ADMIN_API_KEY || '';
        this.serviceUrls = {
            'ms-auth': options.authUrl || process.env.MS_AUTH_URL || '',
            'ms-incidencias': options.incidenciasUrl || process.env.MS_INCIDENCIAS_URL || '',
            'ms-activos': options.activosUrl || process.env.MS_ACTIVOS_URL || '',
            'ms-notificaciones': options.notificacionesUrl || process.env.MS_NOTIFICACIONES_URL || '',
        };

        const rawHealthTimeout = Number(options.healthCheckTimeoutMs ?? 2000);
        this.healthCheckTimeoutMs =
            Number.isFinite(rawHealthTimeout) && rawHealthTimeout > 0 ? rawHealthTimeout : 2000;

        const rawDispatchTimeout = Number(options.auditDispatchTimeoutMs ?? 1500);
        this.auditDispatchTimeoutMs =
            Number.isFinite(rawDispatchTimeout) && rawDispatchTimeout > 0 ? rawDispatchTimeout : 1500;

        this.customDispatcher =
            typeof options.dispatchAuditEvent === 'function' ? options.dispatchAuditEvent : null;
        this.enableQueueDispatch = options.enableAuditQueueDispatch !== false;
        this.logger = options.fastifyLogger || null;
    }

    isMutatingMethod(method) {
        return MUTATING_METHODS.has(String(method || '').toUpperCase());
    }

    /**
     * Extrae identidad verificada del actor para trazabilidad sin almacenar tokens ni secretos.
     */
    extractActor(request) {
        const token = extractRequestJwt(request);
        if (token && this.jwtSecret) {
            try {
                const payload = jwt.verify(token, this.jwtSecret, { algorithms: ['HS256'] });
                if (!payload.tokenUse || payload.tokenUse === 'access') {
                    return {
                        id: String(payload.sub || payload.userId || 'autenticado'),
                        email: payload.email ? String(payload.email) : null,
                        rol: String(payload.rol || payload.role || 'AUTENTICADO').toUpperCase(),
                        autenticado: true,
                    };
                }
            } catch (err) {
                if (err && err.name === 'TokenExpiredError') {
                    try {
                        const expired = jwt.decode(token);
                        if (expired && (expired.sub || expired.userId)) {
                            return {
                                id: String(expired.sub || expired.userId),
                                email: expired.email ? String(expired.email) : null,
                                rol: String(expired.rol || expired.role || 'EXPIRADO').toUpperCase(),
                                autenticado: false,
                            };
                        }
                    } catch {
                        // Ignorar fallo de decode
                    }
                }
            }
        }

        const emergencyKey =
            request?.headers?.['x-admin-key'] ||
            request?.headers?.['x-kill-switch-key'] ||
            request?.headers?.['x-api-key'];
        if (this.adminApiKey && emergencyKey && emergencyKey === this.adminApiKey) {
            return {
                id: 'sistema-admin-key',
                email: null,
                rol: 'ADMINISTRADOR',
                autenticado: true,
            };
        }

        return {
            id: 'anonimo',
            email: null,
            rol: 'ANONIMO',
            autenticado: false,
        };
    }

    /**
     * Inserción O(1) en buffer circular acotado.
     */
    appendEntry(entry) {
        this.buffer[this.head] = entry;
        this.head = (this.head + 1) % this.maxEntries;
        if (this.size < this.maxEntries) {
            this.size += 1;
        }
    }

    /**
     * Devuelve todas las entradas ordenadas de más reciente a más antigua.
     */
    getAllNewestFirst() {
        const result = new Array(this.size);
        for (let i = 0; i < this.size; i += 1) {
            const idx = (this.head - 1 - i + this.maxEntries) % this.maxEntries;
            result[i] = this.buffer[idx];
        }
        return result;
    }

    /**
     * Publica de forma asíncrona no bloqueante hacia auditoria.queue (RabbitMQ vía ms-notificaciones).
     * Tolera caídas o timeouts sin afectar jamás al API Gateway.
     */
    dispatchToQueueNonBlocking(entry) {
        if (!this.enableQueueDispatch) return;

        const eventoDto = {
            accion: entry.accion,
            entidad: entry.entidad,
            idEntidad: entry.id_entidad,
            usuarioId: entry.usuario.id,
            ipOrigen: entry.ip_origen,
            detalles: {
                id_auditoria: entry.id_auditoria,
                timestamp: entry.timestamp,
                metodo: entry.metodo,
                ruta: entry.ruta,
                servicio_destino: entry.servicio_destino,
                status_code: entry.status_code,
                latencia_ms: entry.latencia_ms,
                email: entry.usuario.email,
                rol: entry.usuario.rol,
                autenticado: entry.usuario.autenticado,
            },
        };

        queueMicrotask(() => {
            if (this.customDispatcher) {
                Promise.resolve()
                    .then(() => this.customDispatcher(eventoDto, entry))
                    .catch((err) => {
                        this.logger?.warn?.(
                            { err: err?.message || String(err), id_auditoria: entry.id_auditoria },
                            '[AUDIT] Despacho a cola auditoria.queue omitido temporalmente'
                        );
                    });
                return;
            }

            const baseNotifUrl = String(this.serviceUrls['ms-notificaciones'] || '').replace(/\/+$/, '');
            if (!baseNotifUrl || typeof fetch !== 'function') {
                return;
            }

            fetch(`${baseNotifUrl}/eventos/auditoria`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(eventoDto),
                signal: AbortSignal.timeout(this.auditDispatchTimeoutMs),
            })
                .then((res) => {
                    if (!res.ok) {
                        this.logger?.warn?.(
                            { statusCode: res.status, id_auditoria: entry.id_auditoria },
                            '[AUDIT] ms-notificaciones respondió estado no exitoso al encolar en auditoria.queue'
                        );
                    }
                })
                .catch((err) => {
                    this.logger?.warn?.(
                        { err: err?.message || String(err), id_auditoria: entry.id_auditoria },
                        '[AUDIT] RabbitMQ / ms-notificaciones no disponible temporalmente; registro conservado en stdout y buffer'
                    );
                });
        });
    }

    /**
     * Registra una transacción mutante finalizada en < 2 ms sin operaciones bloqueantes.
     */
    recordTransaction(request, reply, startHrTimeNs) {
        const method = String(request.method || '').toUpperCase();
        if (!this.isMutatingMethod(method)) {
            return null;
        }

        const elapsedNs =
            typeof startHrTimeNs === 'bigint' ? process.hrtime.bigint() - startHrTimeNs : 0n;
        const latenciaMs = Math.round((Number(elapsedNs) / 1e6) * 100) / 100;

        const rawUrl = request.originalUrl || request.raw?.url || request.url || '/';
        const sanitized = sanitizeAuditRoute(rawUrl);
        const { servicioDestino, entidad, idEntidad, accion, normalizedRoute } =
            classifyTransactionTarget(method, sanitized);
        const actor = this.extractActor(request);

        const entry = {
            id_auditoria: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            metodo: method,
            ruta: normalizedRoute,
            servicio_destino: servicioDestino,
            accion,
            entidad,
            id_entidad: idEntidad,
            status_code: Number(reply.statusCode) || 200,
            latencia_ms: latenciaMs,
            ip_origen: String(request.ip || request.socket?.remoteAddress || 'desconocida'),
            usuario: actor,
        };

        this.appendEntry(entry);

        // Emitir por stdout estructurado (Pino/Fastify) para recolección nativa de logs en Kubero
        if (this.logger && typeof this.logger.info === 'function') {
            this.logger.info({ audit: entry }, '[AUDIT] Transacción mutante registrada');
        }

        // Publicar de forma no bloqueante hacia RabbitMQ (auditoria.queue)
        this.dispatchToQueueNonBlocking(entry);

        return entry;
    }

    /**
     * Valida autorización administrativa basada en permisos del JWT (PBAC — TAL-97 / TAL-222).
     */
    authorizeAuditAccess(request) {
        const token = extractRequestJwt(request);
        if (!token) {
            return {
                authorized: false,
                statusCode: 401,
                error: 'Unauthorized',
                codigo: 'NO_AUTENTICADO',
                mensaje: 'Se requiere un token JWT válido para consultar la auditoría.',
            };
        }

        if (!this.jwtSecret) {
            return {
                authorized: false,
                statusCode: 401,
                error: 'Unauthorized',
                codigo: 'NO_AUTENTICADO',
                mensaje: 'Configuración de verificación JWT no disponible.',
            };
        }

        let payload;
        try {
            payload = jwt.verify(token, this.jwtSecret, { algorithms: ['HS256'] });
        } catch {
            return {
                authorized: false,
                statusCode: 401,
                error: 'Unauthorized',
                codigo: 'TOKEN_INVALIDO',
                mensaje: 'El token JWT es inválido o ha expirado.',
            };
        }

        if (payload?.tokenUse && payload.tokenUse !== 'access') {
            return {
                authorized: false,
                statusCode: 401,
                error: 'Unauthorized',
                codigo: 'TOKEN_INVALIDO',
                mensaje: 'Se requiere un access token válido.',
            };
        }

        const permissions = Array.isArray(payload?.permissions) ? payload.permissions : [];
        const hasPbacPermission = permissions.some((perm) => PERMISOS_AUDITORIA_PBAC.has(perm));

        if (!hasPbacPermission) {
            return {
                authorized: false,
                statusCode: 403,
                error: 'Forbidden',
                codigo: 'SIN_PERMISO',
                mensaje:
                    'Acceso denegado: su token no posee los permisos administrativos requeridos para auditoría.',
            };
        }

        return {
            authorized: true,
            user: {
                sub: payload.sub || payload.userId,
                email: payload.email || null,
                rol: String(payload.rol || payload.role || '').toUpperCase(),
                permissions,
            },
        };
    }

    /**
     * Filtra y pagina los registros de auditoría almacenados en el buffer acotado.
     */
    queryLogs(query = {}) {
        const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1);
        const rawLimit = Number.parseInt(String(query.limit ?? '20'), 10);
        const limit = Math.min(100, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 20));

        const metodoFilter = query.metodo
            ? new Set(
                  String(query.metodo)
                      .split(',')
                      .map((m) => m.trim().toUpperCase())
                      .filter(Boolean)
              )
            : null;

        const servicioFilter = query.servicio || query.servicio_destino
            ? String(query.servicio || query.servicio_destino)
                  .trim()
                  .toLowerCase()
            : null;

        const usuarioFilter = query.usuario ? String(query.usuario).trim().toLowerCase() : null;
        const rolFilter = query.rol ? String(query.rol).trim().toUpperCase() : null;
        const accionFilter = query.accion ? String(query.accion).trim().toUpperCase() : null;
        const statusRaw = String(query.statusCode || query.status_code || query.estado_http || '')
            .trim()
            .toLowerCase();
        const searchFilter = query.search || query.q ? String(query.search || query.q).trim().toLowerCase() : null;
        const desdeMs = query.desde || query.startDate ? Date.parse(String(query.desde || query.startDate)) : NaN;
        const hastaMs = query.hasta || query.endDate ? Date.parse(String(query.hasta || query.endDate)) : NaN;

        const all = this.getAllNewestFirst();
        const filtered = all.filter((item) => {
            if (metodoFilter && !metodoFilter.has(item.metodo)) {
                return false;
            }
            if (servicioFilter && item.servicio_destino.toLowerCase() !== servicioFilter) {
                return false;
            }
            if (rolFilter && String(item.usuario?.rol || '').toUpperCase() !== rolFilter) {
                return false;
            }
            if (accionFilter && item.accion !== accionFilter) {
                return false;
            }
            if (usuarioFilter) {
                const uid = String(item.usuario?.id || '').toLowerCase();
                const uemail = String(item.usuario?.email || '').toLowerCase();
                const urol = String(item.usuario?.rol || '').toLowerCase();
                if (!uid.includes(usuarioFilter) && !uemail.includes(usuarioFilter) && !urol.includes(usuarioFilter)) {
                    return false;
                }
            }
            if (statusRaw) {
                if (statusRaw === 'error' || statusRaw === 'errores') {
                    if (item.status_code < 400) return false;
                } else if (statusRaw === 'exito' || statusRaw === 'ok') {
                    if (item.status_code >= 400) return false;
                } else if (/^[1-5]xx$/.test(statusRaw)) {
                    const prefix = Number(statusRaw[0]);
                    if (Math.floor(item.status_code / 100) !== prefix) return false;
                } else {
                    const exact = Number.parseInt(statusRaw, 10);
                    if (Number.isFinite(exact) && item.status_code !== exact) return false;
                }
            }
            if (!Number.isNaN(desdeMs) || !Number.isNaN(hastaMs)) {
                const ts = Date.parse(item.timestamp);
                if (!Number.isNaN(desdeMs) && ts < desdeMs) return false;
                if (!Number.isNaN(hastaMs) && ts > hastaMs) return false;
            }
            if (searchFilter) {
                const haystack = [
                    item.ruta,
                    item.metodo,
                    item.servicio_destino,
                    item.accion,
                    item.entidad,
                    item.id_entidad,
                    item.usuario?.id,
                    item.usuario?.email,
                    item.usuario?.rol,
                    item.ip_origen,
                    String(item.status_code),
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                if (!haystack.includes(searchFilter)) return false;
            }
            return true;
        });

        const total = filtered.length;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const safePage = Math.min(page, totalPages);
        const offset = (safePage - 1) * limit;
        const data = filtered.slice(offset, offset + limit);

        return {
            data,
            paginacion: {
                total,
                page: safePage,
                limit,
                total_paginas: totalPages,
                capacidad_buffer: this.maxEntries,
                registros_en_buffer: this.size,
                almacenamiento_efimero: true,
            },
        };
    }

    /**
     * Verifica de forma concurrente y acotada la disponibilidad HTTP de los 4 microservicios
     * usando exclusivamente las variables de entorno configuradas (sin localhost ni puertos fijos).
     */
    async checkMicroservicesHealth() {
        const targets = [
            { nombre: 'ms-auth', url: this.serviceUrls['ms-auth'] },
            { nombre: 'ms-incidencias', url: this.serviceUrls['ms-incidencias'] },
            { nombre: 'ms-activos', url: this.serviceUrls['ms-activos'] },
            { nombre: 'ms-notificaciones', url: this.serviceUrls['ms-notificaciones'] },
        ];

        const checks = await Promise.all(
            targets.map(async ({ nombre, url }) => {
                const cleanBase = String(url || '').trim().replace(/\/+$/, '');
                if (!cleanBase || typeof fetch !== 'function') {
                    return {
                        nombre,
                        estado: 'DOWN',
                        operativo: false,
                        codigo_http: null,
                        latencia_ms: null,
                        detalle: 'URL de servicio no configurada',
                    };
                }

                const startNs = process.hrtime.bigint();
                try {
                    const response = await fetch(`${cleanBase}/`, {
                        method: 'GET',
                        signal: AbortSignal.timeout(this.healthCheckTimeoutMs),
                    });
                    const latenciaMs =
                        Math.round((Number(process.hrtime.bigint() - startNs) / 1e6) * 100) / 100;
                    const operativo = response.status < 500;
                    return {
                        nombre,
                        estado: operativo ? 'UP' : 'DEGRADED',
                        operativo,
                        codigo_http: response.status,
                        latencia_ms: latenciaMs,
                    };
                } catch {
                    const latenciaMs =
                        Math.round((Number(process.hrtime.bigint() - startNs) / 1e6) * 100) / 100;
                    return {
                        nombre,
                        estado: 'DOWN',
                        operativo: false,
                        codigo_http: null,
                        latencia_ms: latenciaMs,
                        detalle: 'Servicio temporalmente inaccesible',
                    };
                }
            })
        );

        const upCount = checks.filter((c) => c.operativo).length;
        let estadoGeneral = 'UP';
        if (upCount === 0) {
            estadoGeneral = 'DOWN';
        } else if (upCount < checks.length) {
            estadoGeneral = 'DEGRADED';
        }

        return {
            estado_general: estadoGeneral,
            timestamp: new Date().toISOString(),
            gateway: {
                nombre: 'api-gateway',
                estado: 'UP',
                operativo: true,
                uptime_segundos: Math.round(process.uptime()),
            },
            microservicios: checks,
        };
    }
}

module.exports = {
    AuditLogger,
    sanitizeAuditRoute,
    classifyTransactionTarget,
    PERMISOS_AUDITORIA_PBAC,
};
