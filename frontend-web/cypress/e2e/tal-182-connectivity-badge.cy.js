/**
 * TAL-182: Componente Visual de Indicador de Estado de Conexión (ConnectivityBadge)
 *
 * Criterios de Aceptación:
 * 1. Se oculta sutilmente tras 4 segundos de volver al estado online.
 * 2. Permanece fijo en la parte superior cuando se pierde la conexión con botón 'Comprobar ahora'.
 * 3. Totalmente responsivo en móvil y escritorio.
 * 4. Evita código duplicado, cumple requerimientos de SonarQube.
 */

describe('TAL-182: Componente Flotante ConnectivityBadge', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/v1/health*', {
      statusCode: 200,
      body: { status: 'UP', timestamp: new Date().toISOString() },
    }).as('healthCheckOK');

    cy.visit('/login');
  });

  it('Criterio 1: Despliega píldora "Conectado al Sistema" al restaurarse la red y se oculta tras 4 segundos', () => {
    // 1. Simular desconexión
    cy.window().then((win) => {
      win.dispatchEvent(new win.Event('offline'));
    });
    cy.get('aside[role="alert"]').should('be.visible').and('contain.text', 'Sin conexión');

    // 2. Simular reconexión
    cy.window().then((win) => {
      win.dispatchEvent(new win.Event('online'));
    });

    // 3. Píldora verde esmeralda "Conectado al Sistema"
    cy.get('aside[role="status"]')
      .should('be.visible')
      .and('contain.text', 'Conectado al Sistema');

    // 4. Tras 4 segundos de volver al estado online, se oculta sutilmente
    cy.wait(4100);
    cy.get('aside[role="status"]').should('not.exist');
  });

  it('Criterio 2: Permanece fijo en la parte superior con botón "Comprobar ahora" al perder conexión', () => {
    // 1. Simular desconexión
    cy.window().then((win) => {
      win.dispatchEvent(new win.Event('offline'));
    });

    // 2. Verifica píldora roja fija en el tope
    cy.get('[data-testid="connectivity-badge-wrapper"]')
      .should('have.class', 'fixed')
      .and('have.class', 'z-50');

    cy.get('aside[role="alert"]')
      .should('be.visible')
      .and('contain.text', 'Sin conexión');

    // 3. Botón "Comprobar ahora"
    cy.contains('button', 'Comprobar ahora')
      .should('be.visible')
      .and('not.be.disabled')
      .click();

    // 4. Al hacer clic debe invocar verificación
    cy.get('@healthCheckOK.all').should('exist');
  });

  it('Criterio 2b: Despliega "Conexión inestable" ante falla de Gateway con botón "Comprobar ahora"', () => {
    cy.window().then((win) => {
      win.dispatchEvent(new win.CustomEvent('gateway-error', { detail: { status: 502 } }));
      win.dispatchEvent(new win.CustomEvent('gateway-error', { detail: { status: 502 } }));
    });

    cy.get('aside[role="alert"]')
      .should('be.visible')
      .and('contain.text', 'Conexión inestable');

    cy.contains('button', 'Comprobar ahora').should('be.visible');
  });

  it('Criterio 3: Es responsivo y adapta su presentación en viewport móvil', () => {
    cy.viewport('iphone-x');

    cy.window().then((win) => {
      win.dispatchEvent(new win.Event('offline'));
    });

    cy.get('[data-testid="connectivity-badge-wrapper"]').should('be.visible');
    cy.get('aside[role="alert"]')
      .should('be.visible')
      .and('contain.text', 'Sin conexión');

    cy.contains('button', 'Comprobar ahora').should('be.visible');
  });
});

