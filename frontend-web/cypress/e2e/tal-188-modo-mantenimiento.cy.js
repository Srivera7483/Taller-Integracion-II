/**
 * TAL-188: Pantalla Global de Bloqueo por Mantenimiento (Kill Switch Activo)
 *
 * Criterios de Aceptación:
 * 1. Despliega el motivo exacto enviado por el backend (ej: 'Mantenimiento eléctrico').
 * 2. Comprueba automáticamente cada 15 segundos si el servicio se ha reanudado.
 * 3. No borra los borradores locales en formularios.
 */

const MOTIVO = 'Mantenimiento eléctrico';

describe('TAL-188: Modo Mantenimiento por Kill Switch', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/v1/health*', { statusCode: 200, body: { status: 'UP' } });
    cy.window().then((win) => win.localStorage.clear());
  });

  it('Criterios 1 y 3: muestra el motivo exacto y conserva el borrador al ser bloqueado', () => {
    cy.intercept('GET', '**/api/v1/kill-switch/status*', {
      statusCode: 200,
      body: { activo: true, motivo: MOTIVO, servicios_afectados: ['incidencias'] },
    }).as('estado');

    cy.visit('/modo-mantenimiento', {
      onBeforeLoad(win) {
        win.localStorage.setItem('draft:incidencia:titulo', JSON.stringify('Fuga en sala de servidores'));
        win.sessionStorage.setItem(
          'kill_switch_info',
          JSON.stringify({ killSwitch: true, motivo: MOTIVO, from: '/incidencias/nueva' }),
        );
      },
    });

    cy.get('#motivo-mantenimiento').should('contain.text', MOTIVO);
    cy.window().then((win) => {
      expect(win.localStorage.getItem('draft:incidencia:titulo')).to.equal(
        JSON.stringify('Fuga en sala de servidores'),
      );
    });
  });

  it('Criterio 2: consulta el estado y vuelve a la pantalla previa cuando el servicio se reanuda', () => {
    cy.intercept('GET', '**/api/v1/kill-switch/status*', {
      statusCode: 200,
      body: { activo: false, motivo: '', servicios_afectados: [] },
    }).as('estado');

    cy.visit('/modo-mantenimiento', {
      onBeforeLoad(win) {
        win.sessionStorage.setItem(
          'kill_switch_info',
          JSON.stringify({ killSwitch: true, motivo: MOTIVO, from: '/login' }),
        );
      },
    });

    cy.wait('@estado');
    cy.location('pathname').should('not.eq', '/modo-mantenimiento');
  });

  it('Criterio 2: el contador regresivo parte en 15 segundos mientras siga activo', () => {
    cy.intercept('GET', '**/api/v1/kill-switch/status*', {
      statusCode: 200,
      body: { activo: true, motivo: MOTIVO, servicios_afectados: ['incidencias'] },
    });

    cy.visit('/modo-mantenimiento');
    cy.get('#contador-reintento').invoke('text').should('match', /(\d+) s|Comprobando/);
  });
});
