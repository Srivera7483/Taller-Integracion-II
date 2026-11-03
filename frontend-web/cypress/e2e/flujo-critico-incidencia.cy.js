/**
 * TAL-146: Integración Final — Testing End-to-End (Cypress) del Flujo Crítico
 *
 * Objetivo:
 * Proveer garantías de que el sistema funcionará el día de la presentación final
 * (Prevención de regresiones).
 *
 * Flujo E2E Crítico y Automatizado:
 *   i.   Iniciar sesión.
 *   ii.  Ir a "Registrar Incidencia".
 *   iii. Llenar el formulario.
 *   iv.  Recibir el Toast de éxito.
 *
 * Criterio de Aceptación:
 *   a. El test de Cypress pasa correctamente en el entorno de desarrollo
 *      simulando clics reales de usuario.
 */

describe('TAL-146: Flujo Crítico E2E — Autenticación y Registro de Incidencia', () => {
  beforeEach(() => {
    cy.limpiarSesion();

    // Interceptores alineados con los datos reales de seed.cjs (TAL-142) para el entorno de desarrollo
    cy.intercept('POST', '**/api/v1/autenticacion/inicio-sesion', {
      statusCode: 200,
      body: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3ItY3Nhbmh1ZXphLTAxIiwicm9sIjoiQURNSU5JU1RSQURPUiJ9.e2e-signature',
        refreshToken: 'refresh-token-e2e-uct-2026',
        usuario: {
          id: 'usr-csanhueza-01',
          rut_o_id: '15234567-8',
          nombre: 'Carlos',
          apellido: 'Sanhueza',
          email: 'csanhueza@uct.cl',
          rol: 'ADMINISTRADOR',
        },
      },
    }).as('loginRequest');

    cy.intercept('GET', '**/api/v1/incidencias*', {
      statusCode: 200,
      body: {
        data: [
          {
            id_incidencia: 'INC-1042',
            titulo: 'Falla de enlace en Switch Cisco Catalyst Sala de Servidores',
            id_activo: 'UCT-SW-01',
            estado: { nombre_estado: 'Pendiente' },
            prioridad: 'Alta',
            fecha_creacion: new Date().toISOString(),
          },
        ],
      },
    }).as('getIncidencias');

    cy.intercept('GET', '**/api/v1/mantenimientos*', {
      statusCode: 200,
      body: { data: [] },
    }).as('getMantenimientos');

    cy.intercept('GET', '**/api/v1/notificaciones*', {
      statusCode: 200,
      body: { data: [] },
    }).as('getNotificaciones');

    cy.intercept('GET', '**/api/v1/activos/validar-qr*', {
      statusCode: 200,
      body: {
        valido: true,
        activo: {
          id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          codigo: 'UCT-SW-01',
          nombre: 'Switch Cisco Catalyst 9200',
        },
      },
    }).as('validarQrActivo');

    cy.intercept('POST', '**/api/v1/incidencias', (req) => {
      req.reply({
        statusCode: 201,
        body: {
          id_incidencia: 'INC-2026',
          id: 'INC-2026',
          titulo: req.body.titulo,
          id_activo: req.body.id_activo,
          descripcion: req.body.descripcion,
          estado: 'Pendiente',
          fecha_creacion: new Date().toISOString(),
        },
      });
    }).as('crearIncidenciaRequest');
  });

  it('Completa el flujo crítico: Iniciar sesión -> Ir a Registrar Incidencia -> Llenar el formulario -> Recibir el Toast de éxito', () => {
    // =========================================================================
    // PASO i: Iniciar sesión
    // =========================================================================
    cy.visit('/login');

    // Verificar que la vista de Login cargó correctamente
    cy.get('#view-title').should('contain.text', 'Iniciar sesión en tu cuenta');
    cy.get('#submit-btn').should('be.disabled');

    // Simular clics reales de usuario y escritura de credenciales (seed.cjs: csanhueza@uct.cl / password123)
    cy.get('#email').click().type('csanhueza@uct.cl');
    cy.get('#password').click().type('password123');

    // Verificar que el botón de envío se habilita y hacer clic real
    cy.get('#submit-btn').should('not.be.disabled').click();

    // Esperar respuesta del endpoint de autenticación y verificar redirección al Dashboard
    cy.wait('@loginRequest').its('response.statusCode').should('eq', 200);
    cy.url().should('include', '/dashboard');

    // Verificar que se muestra el Toast de inicio de sesión exitoso y el contenido del Dashboard
    cy.get('[data-cy="toast-notification"]')
      .should('be.visible')
      .and('contain.text', 'Inicio de sesión exitoso');
    cy.contains('h2', 'Panel de Control Operativo').should('be.visible');

    // =========================================================================
    // PASO ii: Ir a "Registrar Incidencia"
    // =========================================================================
    // Clic real en el menú lateral para ir al módulo de Incidencias
    cy.get('aside nav').contains('a', 'Incidencias').click();
    cy.url().should('include', '/incidencias');

    // Clic real en el botón de acción principal para ir al formulario de registro
    cy.get('#btn-registrar-incidencia').should('be.visible').click();
    cy.url().should('include', '/incidencias/nueva');
    cy.contains('h1', 'Reportar Nueva Incidencia').should('be.visible');

    // =========================================================================
    // PASO iii: Llenar el formulario
    // =========================================================================
    const tituloIncidencia = 'Caída crítica de Switch Cisco Catalyst en Sala de Servidores';
    const codigoActivo = 'UCT-SW-01';
    const ubicacionActivo = 'Sala de Servidores - Campus San Francisco';
    const descripcionIncidencia =
      'Se detecta pérdida total de conectividad en el troncal principal del Switch Cisco Catalyst 9200 y alerta en fuente redundante.';

    cy.get('#incidencia-titulo').click().type(tituloIncidencia);
    cy.get('#incidencia-id-activo').click().type(codigoActivo);
    cy.get('#incidencia-ubicacion').click().type(ubicacionActivo);
    cy.get('#incidencia-categoria').select('redes');
    cy.get('#incidencia-descripcion').click().type(descripcionIncidencia);

    // Clic real en el botón "Enviar Incidencia"
    cy.get('#btn-enviar-incidencia').should('be.visible').and('not.be.disabled').click();

    // Verificar que la petición POST se ejecutó con los datos ingresados por el usuario
    cy.wait('@crearIncidenciaRequest').then((interception) => {
      expect(interception.response.statusCode).to.eq(201);
      expect(interception.request.body.titulo).to.eq(tituloIncidencia);
      expect(interception.request.body.descripcion).to.include(descripcionIncidencia);
    });

    // =========================================================================
    // PASO iv: Recibir el Toast de éxito
    // =========================================================================
    cy.get('[data-cy="toast-notification"]')
      .should('be.visible')
      .and('have.attr', 'data-toast-type', 'success')
      .and('contain.text', '¡Incidencia INC-2026 registrada con éxito!');

    // Verificar redirección a la lista de incidencias y presencia del nuevo registro en la tabla
    cy.url().should('include', '/incidencias');
    cy.get('table').contains(tituloIncidencia).should('be.visible');
  });
});
