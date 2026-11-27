import { Test, TestingModule } from '@nestjs/testing';
import { MantenimientosCron } from './mantenimientos.cron';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { of } from 'rxjs';

describe('MantenimientosCron', () => {
  let cron: MantenimientosCron;
  let prismaService: PrismaService;
  let httpService: HttpService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MantenimientosCron,
        {
          provide: PrismaService,
          useValue: {
            mantenimiento: {
              findMany: jest.fn().mockResolvedValue([
                {
                  id_mantenimiento: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
                  id_activo: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                  fecha_programada: new Date(),
                },
              ]),
              delete: jest.fn().mockResolvedValue(true),
            },
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn().mockReturnValue(of({ data: { success: true }, status: 201 })),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-internal-service-jwt'),
          },
        },
      ],
    }).compile();

    cron = module.get<MantenimientosCron>(MantenimientosCron);
    prismaService = module.get<PrismaService>(PrismaService);
    httpService = module.get<HttpService>(HttpService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('debería procesar los mantenimientos pendientes enviando JWT de servicio y DTO válido hacia ms-incidencias', async () => {
    const spyFind = jest.spyOn(prismaService.mantenimiento, 'findMany');
    const spyPost = jest.spyOn(httpService, 'post');
    const spySign = jest.spyOn(jwtService, 'sign');
    const spyDelete = jest.spyOn(prismaService.mantenimiento, 'delete');

    await cron.procesarMantenimientosPendientes();

    expect(spyFind).toHaveBeenCalled();
    expect(spySign).toHaveBeenCalledWith(
      expect.objectContaining({
        permissions: expect.arrayContaining(['incidencias:crear']),
      }),
      expect.any(Object),
    );
    expect(spyPost).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/incidencias$/),
      expect.objectContaining({
        id_activo: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        titulo: 'Mantenimiento Preventivo Programado',
        prioridad: 'alta',
      }),
      expect.objectContaining({
        headers: { Authorization: 'Bearer mock-internal-service-jwt' },
      }),
    );
    expect(spyDelete).toHaveBeenCalledWith({
      where: { id_mantenimiento: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d' },
    });
  });
});