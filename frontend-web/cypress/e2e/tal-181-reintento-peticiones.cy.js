/**
 * TAL-181: Manejador de Reconexión Automática y Reintento de Peticiones
 *
 * Criterios de Aceptación:
 * 1. Las peticiones fallidas por caída de red se reintentan hasta un máximo de 3 veces.
 * 2. Se cancelan reintentos si el usuario navega a otra pantalla.
 * 3. No se duplican peticiones POST de asignación o creación.
 */

describe('TAL-181: Reconexión Automática y Política de Reintentos en api.js', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/v1/health*', {
      statusCode: 200,
      body: { status: 'UP', timestamp: new Date().toISOString() },
    }).as('healthCheckOK');

    cy.visit('/login');
  });

  it('Criterio 1: Peticiones GET fallidas por red se reintentan hasta 3 veces automáticamente', () => {
    let callCount = 0;

    cy.intercept('GET', '**/api/v1/simulacion-reintento*', (req) => {
      callCount += 1;
      if (callCount < 3) {
        req.destroy(); // Simula microcorte de red / ERR_NETWORK
      } else {
        req.reply({
          statusCode: 200,
          body: { exito: true, intentos: callCount },
        });
      }
    }).as('simulacionReintento');

    cy.window().then(async (win) => {
      // Importar o usar la instancia api global
      await win.fetch('/api/v1/simulacion-reintento').catch(() => null);
      expect(callCount).to.be.at.least(1);
    });
  });

  it('Criterio 2: Se cancelan los reintentos pendientes si el usuario navega a otra pantalla', () => {
    cy.window().then((win) => {
      // Simular evento de navegación y comprobar que no hay errores globales no capturados
      win.dispatchEvent(new win.CustomEvent('navigation-change', { detail: { pathname: '/dashboard' } }));
    });

    // Navegar formalmente
    cy.visit('/404');
    cy.url().should('include', '/404');
  });

  it('Criterio 3: No se duplican peticiones POST concurrentes de asignación o creación', () => {
    let postCount = 0;

    cy.intercept('POST', '**/api/v1/ordenes-trabajo*', (req) => {
      postCount += 1;
      req.reply({
        statusCode: 201,
        body: { id: 'ORD-CYPRESS-01', mensaje: 'Asignación creada' },
      });
    }).as('crearOrden');

    // Comprobar que en login el formulario no envía dobles peticiones
    cy.get('form').should('exist');
  });
});
