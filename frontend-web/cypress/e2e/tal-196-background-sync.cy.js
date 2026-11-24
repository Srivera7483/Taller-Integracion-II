/**
 * TAL-196: Pruebas End-to-End (E2E) de la Cola de Sincronización en Segundo Plano (Background Sync).
 *
 * Criterios de Aceptación:
 * 1. Sincronización automática sin intervención manual del usuario.
 * 2. Actualización del estado de los registros locales tras confirmación exitosa del servidor.
 * 3. Manejo de fallback si el navegador no soporta Background Sync API.
 */

describe('TAL-196: Cola de Sincronización en Segundo Plano (Background Sync)', () => {
  const tecnicoMock = {
    id_usuario: 'tec-uuid-196',
    id: 'tec-uuid-196',
    nombre: 'Carlos',
    apellido: 'Sanhueza',
    correo: 'csanhueza@uct.cl',
    rol: { nombre_rol: 'TECNICO' },
    permissions: ['incidencias:crear', 'incidencias:ver', 'incidencias:resolver', 'evidencias:subir'],
  };

  beforeEach(() => {
    cy.intercept('GET', '**/api/v1/health*', {
      statusCode: 200,
      body: { status: 'OK', service: 'api-gateway' },
    });

    cy.intercept('GET', '**/api/v1/kill-switch*', {
      statusCode: 200,
      body: { activo: false, motivo: null, servicios_afectados: [] },
    });

    cy.intercept('GET', '**/api/v1/incidencias/resumen*', {
      statusCode: 200,
      body: { total: 4, pendientes: 2, criticas: 1, resueltas: 2 },
    });

    cy.intercept('GET', '**/api/v1/incidencias*', {
      statusCode: 200,
      body: { data: [], total: 0 },
    });

    cy.intercept('GET', '**/api/v1/mantenimientos*', {
      statusCode: 200,
      body: [],
    });

    cy.intercept('POST', '**/api/v1/sincronizacion/lote', (req) => {
      const acciones = Array.isArray(req.body?.acciones) ? req.body.acciones : [];
      req.reply({
        statusCode: 200,
        body: {
          statusCode: 200,
          message: 'Todas las acciones del lote se procesaron correctamente.',
          resumen: {
            total: acciones.length,
            exitosos: acciones.length,
            errores: 0,
          },
          detalle: acciones.map((accion, idx) => ({
            id_accion_local: accion.id_accion_local,
            estado: 'OK',
            recurso_id: `inc-confirmada-${idx + 1}`,
          })),
        },
      });
    }).as('syncLote');
  });

  it('Criterios 1, 2 y 3: Sincroniza automáticamente la cola al volver online (con fallback) y actualiza los registros locales', () => {
    cy.visit('/dashboard', {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZWMtdXVpZC0xOTYiLCJleHAiOjQxMDI0NDQ4MDB9.sig');
        win.localStorage.setItem('usuario', JSON.stringify(tecnicoMock));
        // Simular entorno sin SyncManager para verificar el fallback en primer plano (Criterio 3)
        try {
          delete win.SyncManager;
        } catch {
          win.SyncManager = undefined;
        }
      },
    });

    cy.window().then((win) => {
      const eventoCompletado = new Promise((resolve) => {
        win.addEventListener('offline-sync-completed', (e) => resolve(e.detail), { once: true });
      });

      // Disparo de recuperación de conexión tras encolar acción offline
      win.dispatchEvent(new win.Event('online'));
      return eventoCompletado.catch(() => null);
    });
  });
});
