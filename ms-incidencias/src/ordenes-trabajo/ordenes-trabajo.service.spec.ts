<<<<<<< HEAD
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdenesTrabajoService } from './ordenes-trabajo.service';

describe('OrdenesTrabajoService', () => {
  const findUniqueIncidencia = jest.fn();
  const createOrden = jest.fn();
  const findUniqueOrden = jest.fn();
  const findManyOrdenes = jest.fn();
  const countOrdenes = jest.fn();

  const transaction = jest.fn((callback) =>
    callback({
      incidencias: { findUnique: findUniqueIncidencia },
      ordenTrabajo: { create: createOrden },
    }),
  );

  const prisma = {
    $transaction: transaction,
    ordenTrabajo: {
      findUnique: findUniqueOrden,
      findMany: findManyOrdenes,
      count: countOrdenes,
    },
  } as never;

  const service = new OrdenesTrabajoService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listarPorTecnico', () => {
    it('retorna la lista paginada de órdenes filtradas por técnico con sus incidencias y evidencias', async () => {
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

      countOrdenes.mockResolvedValue(1);
      findManyOrdenes.mockResolvedValue(mockOrdenes);

      const resultado = await service.listarPorTecnico('tecnico-uuid-1', {
        page: 1,
        limit: 10,
        orden: 'desc',
      });

      expect(countOrdenes).toHaveBeenCalledWith({
        where: { id_tecnico: 'tecnico-uuid-1' },
      });

      expect(findManyOrdenes).toHaveBeenCalledWith({
        where: { id_tecnico: 'tecnico-uuid-1' },
        include: {
          incidencia: {
            include: {
              evidencias: true,
            },
          },
        },
        orderBy: { fecha_creacion: 'desc' },
        skip: 0,
        take: 10,
      });

      expect(resultado).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        data: mockOrdenes,
      });
    });

    it('aplica filtros por rango de fechas cuando se proporcionan', async () => {
      countOrdenes.mockResolvedValue(0);
      findManyOrdenes.mockResolvedValue([]);

      await service.listarPorTecnico('tecnico-uuid-1', {
        fechaDesde: '2026-09-01',
        fechaHasta: '2026-09-30',
      });

      expect(findManyOrdenes).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id_tecnico: 'tecnico-uuid-1',
            fecha_creacion: {
              gte: new Date('2026-09-01'),
              lte: new Date('2026-09-30'),
            },
          },
        }),
      );
    });

    it('rechaza la consulta si el id_tecnico es vacío', async () => {
      await expect(service.listarPorTecnico('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('asignarOrden', () => {
    it('crea una orden de trabajo dentro de una transacción', async () => {
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

    it('rechaza asignación si la incidencia no existe', async () => {
      findUniqueIncidencia.mockResolvedValue(null);

      await expect(
        service.asignarOrden(
          { id_incidencia: 'inc-no-existe', id_tecnico: 'tecnico-1' },
          'usuario-admin',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
=======
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdenesTrabajoService } from './ordenes-trabajo.service';

describe('OrdenesTrabajoService', () => {
  const createService = () => {
    const findIncidencia = jest.fn();
    const createOrden = jest.fn();
    const findOrden = jest.fn();
    const updateOrden = jest.fn();
    const prisma = {
      incidencias: { findUnique: findIncidencia },
      ordenTrabajo: {
        create: createOrden,
        findUnique: findOrden,
        findMany: jest.fn(),
        update: updateOrden,
      },
    } as unknown as PrismaService;
    return {
      service: new OrdenesTrabajoService(prisma),
      findIncidencia,
      createOrden,
      findOrden,
      updateOrden,
    };
  };

  it('crea una orden con los nombres de campo del contrato', async () => {
    const { service, findIncidencia, createOrden } = createService();
    findIncidencia.mockResolvedValue({
      id_incidencia: 'incidencia-1',
    });
    createOrden.mockResolvedValue({
      id_orden: 'orden-1',
      id_incidencia: 'incidencia-1',
      id_tecnico: 'tecnico-1',
      diagnostico_tecnico: null,
      fecha_creacion: new Date(),
    } as never);

    await service.crear({
      id_incidencia: 'incidencia-1',
      id_tecnico: 'tecnico-1',
    });

    expect(createOrden).toHaveBeenCalledWith({
      data: { id_incidencia: 'incidencia-1', id_tecnico: 'tecnico-1' },
      select: {
        id_orden: true,
        id_incidencia: true,
        id_tecnico: true,
        diagnostico_tecnico: true,
        fecha_creacion: true,
      },
    });
  });

  it('rechaza asignar una orden a una incidencia inexistente', async () => {
    const { service, findIncidencia, createOrden } = createService();
    findIncidencia.mockResolvedValue(null);

    await expect(
      service.crear({ id_incidencia: 'missing', id_tecnico: 'tecnico-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(createOrden).not.toHaveBeenCalled();
  });

  it('solo permite diagnóstico al técnico asignado', async () => {
    const { service, findOrden, updateOrden } = createService();
    findOrden.mockResolvedValue({
      id_orden: 'orden-1',
      id_tecnico: 'tecnico-asignado',
    });

    await expect(
      service.actualizarDiagnostico(
        'orden-1',
        { diagnostico_tecnico: 'Revisión completada' },
        { id: 'otro-tecnico', role: 'TECNICO' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(updateOrden).not.toHaveBeenCalled();
  });
});
>>>>>>> origin/Dev-Sebastian
