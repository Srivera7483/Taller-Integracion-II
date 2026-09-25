import { NotFoundException } from '@nestjs/common';
import { IncidenciasService } from './incidencias.service';

describe('IncidenciasService.evidencia', () => {
  it('verifica la incidencia y crea la metadata', async () => {
    const evidencia = {
      id_evidencia: 'evidencia-1',
      incidencia_id: '11111111-1111-1111-1111-111111111111',
      descripcion: 'Fotografía del daño',
      fecha: new Date(),
    };
    const prisma = {
      incidencias: {
        findUnique: jest.fn().mockResolvedValue({
          id_incidencia: evidencia.incidencia_id,
        }),
      },
      evidencia: { create: jest.fn().mockResolvedValue(evidencia) },
    };
    const service = new IncidenciasService(prisma as never);

    await expect(
      service.crearEvidencia({
        incidencia_id: evidencia.incidencia_id,
        descripcion: evidencia.descripcion,
      }),
    ).resolves.toEqual(evidencia);
    expect(prisma.evidencia.create).toHaveBeenCalledWith({
      data: {
        incidencia_id: evidencia.incidencia_id,
        descripcion: evidencia.descripcion,
      },
    });
  });

  it('rechaza una incidencia inexistente antes de insertar', async () => {
    const prisma = {
      incidencias: { findUnique: jest.fn().mockResolvedValue(null) },
      evidencia: { create: jest.fn() },
    };
    const service = new IncidenciasService(prisma as never);

    await expect(
      service.crearEvidencia({
        incidencia_id: '11111111-1111-1111-1111-111111111111',
        descripcion: 'Metadata',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.evidencia.create).not.toHaveBeenCalled();
  });
});