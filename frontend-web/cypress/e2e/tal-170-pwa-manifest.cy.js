/**
 * TAL-170: Migración Inicial a PWA (Manifest)
 *
 * Criterios de Aceptación:
 * a. Lighthouse aprueba los criterios PWA básicos.
 * b. Navegadores móviles sugieren la instalación de la App.
 */

describe('TAL-170: Migración Inicial a PWA (Manifest y Configuración PWA)', () => {
  it('Criterio a: El archivo manifest.json está disponible y cumple los criterios de Lighthouse', () => {
    cy.request('/manifest.json').then((response) => {
      expect(response.status).to.equal(200);
      const manifest = response.body;

      expect(manifest.name).to.equal('InfraManager - Gestión de Infraestructura TI');
      expect(manifest.short_name).to.equal('InfraManager');
      expect(manifest.display).to.equal('standalone');
      expect(manifest.start_url).to.equal('/');
      expect(manifest.theme_color).to.equal('#003366');
      expect(manifest.background_color).to.equal('#ffffff');

      expect(manifest.icons).to.be.an('array');
      expect(manifest.icons.length).to.be.at.least(2);

      const has192 = manifest.icons.some((i) => i.sizes === '192x192');
      const has512 = manifest.icons.some((i) => i.sizes === '512x512');
      const hasMaskable = manifest.icons.some((i) => i.purpose === 'maskable');

      expect(has192).to.be.true;
      expect(has512).to.be.true;
      expect(hasMaskable).to.be.true;
    });
  });

  it('Criterio a: Los íconos PNG requeridos por PWA son servidos correctamente', () => {
    cy.request('/pwa-192x192.png').then((res) => {
      expect(res.status).to.equal(200);
      expect(res.headers['content-type']).to.include('image/png');
    });

    cy.request('/pwa-512x512.png').then((res) => {
      expect(res.status).to.equal(200);
      expect(res.headers['content-type']).to.include('image/png');
    });

    cy.request('/apple-touch-icon.png').then((res) => {
      expect(res.status).to.equal(200);
      expect(res.headers['content-type']).to.include('image/png');
    });
  });

  it('Criterio a: El documento HTML incluye las etiquetas meta y enlaces necesarios para PWA', () => {
    cy.visit('/login');

    cy.get('link[rel="manifest"]').should('have.attr', 'href', '/manifest.json');
    cy.get('meta[name="theme-color"]').should('have.attr', 'content', '#003366');
    cy.get('meta[name="apple-mobile-web-app-capable"]').should('have.attr', 'content', 'yes');
    cy.get('meta[name="apple-mobile-web-app-title"]').should('have.attr', 'content', 'InfraManager');
    cy.get('link[rel="apple-touch-icon"]').should('have.attr', 'href', '/apple-touch-icon.png');
    cy.get('meta[name="viewport"]').should('exist');
  });

  it('Criterio b: El componente de instalación reacciona al evento y sugiere la instalación', () => {
    cy.visit('/login');

    // Inicialmente no debe interferir si no se ha gatillado el evento
    cy.get('#btn-pwa-install').should('not.exist');

    // Simular el evento para sugerir instalación en móvil/navegador
    cy.window().then((win) => {
      win.dispatchEvent(new win.CustomEvent('pwa-install-trigger'));
    });

    // El banner de instalación PWA debe mostrarse
    cy.get('aside[aria-label="Sugerencia de instalación de la aplicación móvil"]')
      .should('be.visible')
      .and('contain.text', 'Instalar InfraManager');

    cy.get('#btn-pwa-install')
      .should('be.visible')
      .and('contain.text', 'Instalar App');

    // Descartar sugerencia
    cy.get('button[aria-label="Cerrar sugerencia de instalación"]').click();

    cy.get('aside[aria-label="Sugerencia de instalación de la aplicación móvil"]').should('not.exist');
  });
});

