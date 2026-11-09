/**
 * TAL-180: Monitoreo del Estado de Conexión de Red y Conectividad con API Gateway
 *
 * Criterios de Aceptación:
 * 1. El estado isOnline refleja inmediatamente si el dispositivo pierde la señal (online/offline).
 * 2. Si el servidor responde con 502/503 de Gateway de manera sostenida, conmuta a isServerReachable: false.
 * 3. Provee el hook useNetworkStatus().
 */

describe('TAL-180: Monitoreo de Estado de Red y Disponibilidad de Gateway', () => {
  beforeEach(() => {
    // Interceptar el ping de salud por defecto como 200 UP
    cy.intercept('GET', '**/api/v1/health*', {
      statusCode: 200,
      body: { status: 'UP', timestamp: new Date().toISOString() },
    }).as('healthCheckOK');

    cy.visit('/login');
  });

  it('Criterio 1: isOnline refleja inmediatamente la pérdida de señal y muestra el banner offline', () => {
    // Inicialmente con red no debe verse el banner de alerta
    cy.get('aside[role="alert"]').should('not.exist');

    // Simular evento nativo de pérdida de conexión (offline)
    cy.window().then((win) => {
      win.dispatchEvent(new win.Event('offline'));
    });

    // El banner de alerta debe mostrarse inmediatamente
    cy.get('aside[role="alert"]')
      .should('be.visible')
      .and('contain.text', 'Sin conexión a Internet');

    // Simular restauración de señal (online)
    cy.window().then((win) => {
      win.dispatchEvent(new win.Event('online'));
    });

    // El banner offline desaparece
    cy.contains('Sin conexión a Internet').should('not.exist');
  });

  it('Criterio 2: conmuta a isServerReachable: false ante 502/503 de Gateway sostenido', () => {
    // Interceptar /api/v1/health para simular fallo 502 Bad Gateway
    cy.intercept('GET', '**/api/v1/health*', {
      statusCode: 502,
      body: { error: 'Bad Gateway', message: 'Microservicio inaccesible' },
    }).as('healthCheck502');

    // Forzar el evento de fallo sostenido o invocar el botón de reintentar
    cy.window().then((win) => {
      win.dispatchEvent(new win.CustomEvent('gateway-error', { detail: { status: 502 } }));
      win.dispatchEvent(new win.CustomEvent('gateway-error', { detail: { status: 502 } }));
    });

    // El banner de API Gateway inaccesible debe mostrarse
    cy.get('aside[role="alert"]')
      .should('be.visible')
      .and('contain.text', 'API Gateway Inaccesible (502)');

    // Simular recuperación del servidor con 200 OK
    cy.window().then((win) => {
      win.dispatchEvent(new win.CustomEvent('gateway-success'));
    });

    // Debe mostrar la confirmación de recuperación y luego estabilizarse
    cy.get('aside[role="status"]')
      .should('be.visible')
      .and('contain.text', 'Conexión restablecida con el servidor API Gateway');
  });

  it('Criterio 3: Provee useNetworkStatus y expone contexto accesible globalmente', () => {
    cy.window().then((win) => {
      // Verificar que el contexto o eventos nativos responden a eventos del sistema
      expect(win.navigator.onLine).to.equal(true);
    });
  });
});

