import { Test, TestingModule } from '@nestjs/testing';
import { MantenimientosCron } from './mantenimientos.cron';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from './prisma.service';
import { of } from 'rxjs';

describe('MantenimientosCron', () => {
  let cron: MantenimientosCron;
  let prismaService: PrismaService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MantenimientosCron,
        {
          provide: PrismaService,
          useValue: {
            mantenimiento: {
              findMany: jest.fn().mockResolvedValue([
                { id_mantenimiento: 1, id_activo: 10, fecha_programada: new Date() },
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
      ],
    }).compile();

    cron = module.get<MantenimientosCron>(MantenimientosCron);
    prismaService = module.get<PrismaService>(PrismaService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('debería procesar los mantenimientos pendientes y crear incidencias', async () => {
    const spyFind = jest.spyOn(prismaService.mantenimiento, 'findMany');
    const spyPost = jest.spyOn(httpService, 'post');
    const spyDelete = jest.spyOn(prismaService.mantenimiento, 'delete');

    await cron.procesarMantenimientosPendientes();

    expect(spyFind).toHaveBeenCalled();
    expect(spyPost).toHaveBeenCalled();
    expect(spyDelete).toHaveBeenCalledWith({ where: { id_mantenimiento: 1 } });
  });
});