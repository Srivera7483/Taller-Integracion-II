import { ForbiddenException } from '@nestjs/common';
import { JwtUser } from '../auth/auth.types';
import { FiltrarOrdenesDto } from './dto/filtrar-ordenes.dto';
import { AsignarOrdenDto } from './dto/asignar-orden.dto';
import { OrdenesTrabajoController } from './ordenes-trabajo.controller';
import { OrdenesTrabajoService } from './ordenes-trabajo.service';

describe('OrdenesTrabajoController (TAL-55: Inyección de Identidad)', () => {
  let controller: OrdenesTrabajoController;
  let service: OrdenesTrabajoService;

  beforeEach(() => {
    service = {
      asignarOrden: jest.fn(),
      listarPorTecnico: jest.fn(),
      obtenerPorId: jest.fn(),
      listarTodas: jest.fn(),
    } as unknown as OrdenesTrabajoService;

    controller = new OrdenesTrabajoController(service);
  });

  describe('listarMisOrdenes', () => {
    it('inyecta automáticamente el userId del token JWT para consultar las órdenes del técnico', async () => {
      const mockUser: JwtUser = {
        userId: 'tecnico-uuid-123',
        role: 'TECNICO',
      };
      const filtros: FiltrarOrdenesDto = { page: 1, limit: 10 };
      const mockResultado = {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        data: [],
      };

      (service.listarPorTecnico as jest.Mock).mockResolvedValue(mockResultado);

      const resultado = await controller.listarMisOrdenes(mockUser, filtros);

      expect(service.listarPorTecnico).toHaveBeenCalledWith(
        'tecnico-uuid-123',
        filtros,
      );
      expect(resultado).toBe(mockResultado);
    });
  });

  describe('listarPorTecnico (Protección IDOR)', () => {
    it('permite a un técnico consultar sus propias órdenes de trabajo', async () => {
      const mockUser: JwtUser = {
        userId: 'tecnico-uuid-123',
        role: 'TECNICO',
      };
      const filtros: FiltrarOrdenesDto = {};

      (service.listarPorTecnico as jest.Mock).mockResolvedValue({ data: [] });

      await controller.listarPorTecnico('tecnico-uuid-123', mockUser, filtros);

      expect(service.listarPorTecnico).toHaveBeenCalledWith(
        'tecnico-uuid-123',
        filtros,
      );
    });

    it('rechaza con ForbiddenException (403) si un técnico intenta ver las órdenes de otro técnico', async () => {
      const mockUser: JwtUser = {
        userId: 'tecnico-atacante-1',
        role: 'TECNICO',
      };
      const filtros: FiltrarOrdenesDto = {};

      await expect(
        controller.listarPorTecnico('tecnico-victima-2', mockUser, filtros),
      ).rejects.toThrow(ForbiddenException);

      expect(service.listarPorTecnico).not.toHaveBeenCalled();
    });

    it('permite a un SUPERVISOR consultar las órdenes de cualquier técnico', async () => {
      const mockUser: JwtUser = {
        userId: 'supervisor-1',
        role: 'SUPERVISOR',
      };
      const filtros: FiltrarOrdenesDto = {};

      (service.listarPorTecnico as jest.Mock).mockResolvedValue({ data: [] });

      await controller.listarPorTecnico('tecnico-uuid-123', mockUser, filtros);

      expect(service.listarPorTecnico).toHaveBeenCalledWith(
        'tecnico-uuid-123',
        filtros,
      );
    });

    it('permite a un ADMINISTRADOR consultar las órdenes de cualquier técnico', async () => {
      const mockUser: JwtUser = {
        userId: 'admin-1',
        role: 'ADMINISTRADOR',
      };
      const filtros: FiltrarOrdenesDto = {};

      (service.listarPorTecnico as jest.Mock).mockResolvedValue({ data: [] });

      await controller.listarPorTecnico('tecnico-uuid-123', mockUser, filtros);

      expect(service.listarPorTecnico).toHaveBeenCalledWith(
        'tecnico-uuid-123',
        filtros,
      );
    });
  });

  describe('asignarOrden', () => {
    it('inyecta el userId del supervisor autenticado al crear la orden', async () => {
      const mockUser: JwtUser = {
        userId: 'supervisor-uuid-99',
        role: 'SUPERVISOR',
      };
      const dto: AsignarOrdenDto = {
        id_incidencia: 'inc-1',
        id_tecnico: 'tec-1',
      };

      (service.asignarOrden as jest.Mock).mockResolvedValue({ id_orden: 'ord-1' });

      await controller.asignarOrden(dto, mockUser);

      expect(service.asignarOrden).toHaveBeenCalledWith(dto, 'supervisor-uuid-99');
    });
  });
});
