import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrdenesTrabajoService } from './ordenes-trabajo.service';

describe('OrdenesTrabajoService', () => {
  const findUniqueIncidencia = jest.fn();
  const createOrden = jest.fn();
  const findUniqueOrden = jest.fn();
  const findManyOrdenes = jest.fn();
  const countOrdenes = jest.fn();
  const updateOrden = jest.fn();
  const findManyEstadoIncidencia = jest.fn().mockResolvedValue([
    { id_estado: 2, nombre_estado: 'Asignada' }
  ]);
  const createHistorial = jest.fn();

  const transaction = jest.fn((callback) =>
    callback({
      incidencias: { findUnique: findUniqueIncidencia },
      ordenTrabajo: { create: createOrden },
      estadoIncidencia: { findMany: findManyEstadoIncidencia },
      historialEstados: { create: createHistorial },
    }),
  );

  const prisma = {
    $transaction: transaction,
    incidencias: { findUnique: findUniqueIncidencia },
    ordenTrabajo: {
      create: createOrden,
      findUnique: findUniqueOrden,
      findMany: findManyOrdenes,
      count: countOrdenes,
      update: updateOrden,
    },
    estadoIncidencia: { findMany: findManyEstadoIncidencia },
  } as never;

  const service = new OrdenesTrabajoService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock global de fetch para que la validación de técnicos con ms-auth no falle en los tests
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        datos: [
          {
            id_usuario: 'tecnico-1',
            activo: true,
            rol: { nombre_rol: 'TECNICO' },
          },
        ],
      }),
    } as Response);
  });

describe('listarPorTecnico', () => {
    it('retorna la lista paginada de ordenes filtradas por tecnico con sus incidencias y evidencias', async () => {
      const mockOrdenes = [
        {
          id_orden: 'orden-1',
          id_incidencia: 'inc-1',
          id_tecnico: 'tecnico-uuid-1',
          diagnostico_tecnico: 'Falla en cable HDMI',
          fecha_creacion: new Date('2026-09-26T10:00:00Z'),
          incidencia: {
            id_incidencia: 'inc-1',
            titulo: 'Proyector no enciende',
            descripcion: 'El equipo en sala 402 no da video',
            evidencias: [
              { id_evidencia: 'evi-1', url_cloudinary: 'https://res.cloudinary.com/demo.jpg' },
            ],
          },
        },
      ];

      findManyOrdenes.mockResolvedValue(mockOrdenes);

      const resultado = await service.listarPorTecnico('tecnico-uuid-1', {
        page: 1,
        limit: 10,
        orden: 'desc',
      });

      expect(findManyOrdenes).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id_tecnico: 'tecnico-uuid-1' }),
        }),
      );

      expect(resultado).toEqual(
        expect.objectContaining({
          data: mockOrdenes,
        }),
      );
    });

    it('aplica filtros por rango de fechas cuando se proporcionan', async () => {
      findManyOrdenes.mockResolvedValue([]);

      await service.listarPorTecnico('tecnico-uuid-1', {
        fechaDesde: '2026-09-01',
        fechaHasta: '2026-09-30',
      });

      expect(findManyOrdenes).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id_tecnico: 'tecnico-uuid-1',
            fecha_creacion: expect.any(Object),
          }),
        }),
      );
    });

    it('rechaza la consulta si el id_tecnico es vacio', async () => {
      await expect(service.listarPorTecnico('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('asignarOrden', () => {
    it('crea una orden de trabajo dentro de una transaccion', async () => {
      findUniqueIncidencia.mockResolvedValue({ id_incidencia: 'inc-1' });
      createOrden.mockResolvedValue({
        id_orden: 'orden-1',
        id_incidencia: 'inc-1',
        id_tecnico: 'tecnico-1',
      });

      const resultado = await service.asignarOrden(
        { id_incidencia: 'inc-1', id_tecnico: 'tecnico-1' },
        'usuario-admin',
      );

      expect(resultado).toEqual(
        expect.objectContaining({
          id_orden: 'orden-1',
          id_incidencia: 'inc-1',
          id_tecnico: 'tecnico-1',
        }),
      );
    });

    it('rechaza asignacion si la incidencia no existe', async () => {
      findUniqueIncidencia.mockResolvedValue(null);

      await expect(
        service.asignarOrden(
          { id_incidencia: 'inc-no-existe', id_tecnico: 'tecnico-1' },
          'usuario-admin',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('actualizarDiagnostico', () => {
    it('solo permite diagnostico al tecnico asignado', async () => {
      findUniqueOrden.mockResolvedValue({
        id_orden: 'orden-1',
        id_tecnico: 'tecnico-asignado',
      });

      await expect(
        service.actualizarDiagnostico(
          'orden-1',
          'Revision completada',
          'otro-tecnico',
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(updateOrden).not.toHaveBeenCalled();
    });

    it('actualiza el diagnostico cuando el tecnico coincide', async () => {
      findUniqueOrden.mockResolvedValue({
        id_orden: 'orden-1',
        id_tecnico: 'tecnico-1',
      });
      updateOrden.mockResolvedValue({
        id_orden: 'orden-1',
        diagnostico_tecnico: 'Revision completada',
      });

      const res = await service.actualizarDiagnostico(
        'orden-1',
        'Revision completada',
        'tecnico-1',
      );

      expect(updateOrden).toHaveBeenCalledWith({
        where: { id_orden: 'orden-1' },
        data: { diagnostico_tecnico: 'Revision completada' },
      });
      expect(res).toBeDefined();
    });
  });
});