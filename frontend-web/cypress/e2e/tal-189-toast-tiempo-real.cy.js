/**
 * TAL-189: Pruebas End-to-End (E2E) del Sistema de Notificaciones Toast Flotantes en Tiempo Real.
 *
 * Criterios de Aceptación:
 * 1. Las alertas emergentes aparecen en la esquina superior derecha con sonido discreto opcional.
 * 2. Al hacer click en la alerta, navega a la orden de trabajo correspondiente.
 * 3. Soporta cierre manual y auto-desvanecimiento tras 6 segundos.
 */

describe('TAL-189: Sistema de Notificaciones Toast Flotantes en Tiempo Real', () => {
  const tecnicoMock = {
    id_usuario: 'tec-uuid-189',
    id: 'tec-uuid-189',
    nombre: 'Carlos',
    apellido: 'Sanhueza',
    correo: 'csanhueza@uct.cl',
    rol: { nombre_rol: 'TECNICO' },
    permissions: ['incidencias:ver', 'ordenes:diagnosticar'],
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
      body: { total: 5, pendientes: 2, criticas: 1, resueltas: 2 },
    });

    cy.intercept('GET', '**/api/v1/incidencias*', {
      statusCode: 200,
      body: { data: [], total: 0 },
    });

    cy.intercept('GET', '**/api/v1/mantenimientos*', {
      statusCode: 200,
      body: [],
    });

    cy.intercept('GET', '**/api/v1/ordenes-trabajo/ORD-189*', {
      statusCode: 200,
      body: {
        id_orden: 'ORD-189',
        id_incidencia: 'INC-189',
        id_tecnico: 'tec-uuid-189',
        tecnico_nombre: 'Carlos Sanhueza',
        estado: 'Asignada',
        incidencia: {
          titulo: 'Caída crítica de Switch en Edificio Central',
          id_activo: 'UCT-SW-189',
        },
      },
    }).as('getOrdenDetalle');
  });

  const iniciarSesionTecnico = () => {
    cy.visit('/dashboard', {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', 'jwt-mock-tal-189');
        win.localStorage.setItem('usuario', JSON.stringify(tecnicoMock));
      },
    });
  };

  it('Criterios 1 y 2: Muestra alerta en esquina superior derecha con sonido opcional y navega a la orden al hacer click', () => {
    iniciarSesionTecnico();

    cy.window().then((win) => {
      win.dispatchEvent(
        new win.CustomEvent('ws-toast-alert', {
          detail: {
            evento: 'orden_asignada',
            payload: {
              id_orden: 'ORD-189',
              id_incidencia: 'INC-189',
              id_tecnico: 'tec-uuid-189',
              titulo: 'Caída crítica de Switch en Edificio Central',
              nuevo_estado: 'ASIGNADA',
              tipo_evento: 'ASIGNACION_ORDEN',
            },
          },
        }),
      );
    });

    cy.get('[data-cy="toast-notification"]')
      .should('be.visible')
      .and('have.class', 'top-4')
      .and('have.class', 'right-4')
      .and('contain.text', 'Caída crítica de Switch en Edificio Central');

    // Control de sonido discreto opcional
    cy.get('[data-cy="toast-sound-toggle"]').should('be.visible').click();

    // Botón 'Ver Orden' presente y navegación directa a la orden de trabajo
    cy.get('[data-cy="toast-ver-orden"]').should('be.visible').and('contain.text', 'Ver Orden');
    cy.get('[data-cy="toast-notification"]').click();

    cy.url().should('include', '/ordenes/ORD-189');
  });

  it('Criterio 3: Soporta cierre manual y auto-desvanecimiento tras 6 segundos', () => {
    cy.clock();
    iniciarSesionTecnico();

    // 1. Prueba de cierre manual
    cy.window().then((win) => {
      win.dispatchEvent(
        new win.CustomEvent('ws-toast-alert', {
          detail: {
            evento: 'nueva_incidencia',
            payload: {
              id_incidencia: 'INC-ALTA-01',
              titulo: 'Falla eléctrica de alta prioridad',
              prioridad: 'alta',
            },
          },
        }),
      );
    });

    cy.get('[data-cy="toast-notification"]').should('be.visible');
    cy.get('[data-cy="toast-close-btn"]').click();
    cy.get('[data-cy="toast-notification"]').should('not.exist');

    // 2. Prueba de auto-desvanecimiento tras 6 segundos (6000ms)
    cy.window().then((win) => {
      win.dispatchEvent(
        new win.CustomEvent('ws-toast-alert', {
          detail: {
            evento: 'nueva_incidencia',
            payload: {
              id_incidencia: 'INC-ALTA-02',
              titulo: 'Sobrecalentamiento de servidor rack',
              prioridad: 'critica',
            },
          },
        }),
      );
    });

    cy.get('[data-cy="toast-notification"]').should('be.visible');
    cy.tick(5900);
    cy.get('[data-cy="toast-notification"]').should('be.visible');
    cy.tick(200);
    cy.get('[data-cy="toast-notification"]').should('not.exist');
  });
});
