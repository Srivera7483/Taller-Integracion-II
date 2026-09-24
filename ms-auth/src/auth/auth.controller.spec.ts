import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  beforeEach(() => {
    // Simulamos el AuthService sin levantar lógica real
    authService = {
      login: vi.fn(),
    } as unknown as AuthService;

    authController = new AuthController(authService);
  });

  describe('getSupervisorReport', () => {
    it('retorna el mensaje de éxito y los datos del usuario extraídos del request', () => {
      const mockRequest = {
        user: { id_usuario: '123-uuid', role: 'SUPERVISOR' },
      } as any;

      const result = authController.getSupervisorReport(mockRequest);

      expect(result).toEqual({
        message: 'Acceso concedido a datos de supervisor',
        user: { id_usuario: '123-uuid', role: 'SUPERVISOR' },
      });
    });
  });
});