/**
 * Kill Switch Manager para API Gateway (TAL-4)
 *
 * Permite suspender de forma inmediata operaciones de escritura (POST, PUT, PATCH, DELETE)
 * ante emergencias o mantenimientos críticos, manteniendo las operaciones de lectura seguras (GET, HEAD, OPTIONS).
 */

class KillSwitchManager {
    constructor(options = {}) {
        const envEnabled =
            process.env.KILL_SWITCH_INCIDENCIAS_ENABLED === 'true' ||
            process.env.KILL_SWITCH_INCIDENCIAS_ENABLED === '1' ||
            process.env.KILL_SWITCH_ENABLED === 'true' ||
            process.env.KILL_SWITCH_ENABLED === '1';

        this.enabled = typeof options.enabled === 'boolean'
            ? options.enabled
            : (typeof options.killSwitchEnabled === 'boolean' ? options.killSwitchEnabled : envEnabled);

        this.reason =
            options.reason ||
            options.killSwitchReason ||
            process.env.KILL_SWITCH_MOTIVO ||
            process.env.KILL_SWITCH_REASON ||
            'Mantenimiento preventivo de emergencia en el módulo de incidencias. Solo consultas de lectura permitidas.';

        this.affectedServices = options.affectedServices ||
            options.killSwitchAffectedServices ||
            ['incidencias'];

        this.activatedAt = this.enabled ? new Date().toISOString() : null;
        this.adminApiKey = options.adminApiKey || process.env.ADMIN_API_KEY || 'admin-killswitch-secret';
    }

    getStatus() {
        return {
            activo: this.enabled,
            motivo: this.reason,
            servicios_afectados: this.affectedServices,
            fecha_activacion: this.activatedAt,
        };
    }

    setKillSwitch({ activo, motivo, servicios_afectados }) {
        if (typeof activo === 'boolean') {
            this.enabled = activo;
            this.activatedAt = activo ? (this.activatedAt || new Date().toISOString()) : null;
        }

        if (typeof motivo === 'string' && motivo.trim().length > 0) {
            this.reason = motivo.trim();
        }

        if (Array.isArray(servicios_afectados) && servicios_afectados.length > 0) {
            this.affectedServices = servicios_afectados;
        }

        return this.getStatus();
    }

    /**
     * Determina si una petición mutante debe ser denegada por el Kill Switch.
     */
    isBlocked(method, rawUrl) {
        if (!this.enabled) {
            return false;
        }

        const upperMethod = (method || '').toUpperCase();
        const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

        // Solo bloquea operaciones de escritura; permite lectura segura (GET, HEAD, OPTIONS)
        if (!mutatingMethods.includes(upperMethod)) {
            return false;
        }

        const pathname = (rawUrl || '').split('?')[0];

        // Rutas exentas de bloqueo
        const isExempt =
            pathname === '/' ||
            pathname === '/health' ||
            pathname === '/api/v1/health' ||
            pathname.startsWith('/api/v1/auth') ||
            pathname.startsWith('/api/v1/autenticacion') ||
            pathname.startsWith('/api/v1/kill-switch') ||
            pathname.startsWith('/api/v1/admin/kill-switch');

        if (isExempt) {
            return false;
        }

        // Si afecta globalmente o a todos los servicios
        if (this.affectedServices.includes('*') || this.affectedServices.includes('global')) {
            return true;
        }

        // Rutas del microservicio de incidencias y órdenes de trabajo
        const isIncidenciasRoute =
            pathname.startsWith('/api/v1/incidencias') ||
            pathname.startsWith('/api/v1/ordenes-trabajo') ||
            pathname.startsWith('/api/v1/estados-incidencia') ||
            pathname.startsWith('/api/v1/tipos-evidencia');

        if (this.affectedServices.includes('incidencias') && isIncidenciasRoute) {
            return true;
        }

        // Rutas de activos y mantenimientos si estuvieran configuradas
        const isActivosRoute =
            pathname.startsWith('/api/v1/activos') ||
            pathname.startsWith('/api/v1/mantenimientos');

        if (this.affectedServices.includes('activos') && isActivosRoute) {
            return true;
        }

        return false;
    }

    /**
     * Valida permisos de ADMINISTRADOR para cambiar el estado del Kill Switch
     * mediante JWT token (rol ADMINISTRADOR) o clave administrativa de emergencia.
     */
    verifyAdminAuth(request) {
        // 1. Clave administrativa directa vía cabecera
        const apiKeyHeader =
            request.headers['x-admin-key'] ||
            request.headers['x-kill-switch-key'] ||
            request.headers['x-api-key'];

        if (apiKeyHeader && apiKeyHeader === this.adminApiKey) {
            return { authorized: true, user: { role: 'ADMINISTRADOR', authMethod: 'api-key' } };
        }

        // 2. Token JWT en Authorization: Bearer <token>
        const authHeader = request.headers.authorization;
        if (authHeader && typeof authHeader === 'string') {
            const parts = authHeader.split(' ');
            if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
                const token = parts[1];
                try {
                    const payloadBase64 = token.split('.')[1];
                    if (payloadBase64) {
                        const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
                        const role = (decoded.rol || decoded.role || '').toUpperCase();
                        if (role === 'ADMINISTRADOR') {
                            return { authorized: true, user: decoded };
                        }
                    }
                } catch {
                    // Token malformado
                }
            }
        }

        return {
            authorized: false,
            error: 'Se requiere rol ADMINISTRADOR o credencial administrativa válida para modificar el Kill Switch.',
        };
    }
}

module.exports = KillSwitchManager;

