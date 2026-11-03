// ***********************************************
// Comandos personalizados de Cypress (TAL-146)
// ***********************************************

Cypress.Commands.add('limpiarSesion', () => {
  cy.clearCookies();
  cy.clearLocalStorage();
});

