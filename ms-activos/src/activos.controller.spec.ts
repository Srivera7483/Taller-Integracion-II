import { ActivosController } from './activos.controller';
import { ActivosService } from './activos.service';
import { PrismaService } from './prisma.service';

describe('ActivosController - TAL-6', () => {
  let controller: ActivosController;
  let service: ActivosService;
  // Creamos el mock de Prisma
  let prismaMock = {} as unknown as PrismaService;

  beforeEach(() => {
    // Le pasamos el mock al servicio para que no arroje error de argumentos
    service = new ActivosService(prismaMock);
    controller = new ActivosController(service);
  });

  it('retorna el resumen estadístico de activos', async () => {
    const respuesta = await controller.obtenerEstadisticas();

    // Eliminamos las referencias a .statusCode y .body
    expect(respuesta.valido).toBe(true);
    expect(respuesta.datos.totalActivos).toBeGreaterThan(0);
    expect(respuesta.datos.porEstado).toBeDefined();
    expect(respuesta.datos.porCategoria).toBeDefined();
    expect(respuesta.datos.porcentajes).toBeDefined();
  });

  it('permite filtrar estadísticas por ubicación desde el controlador', async () => {
    const respuesta = await controller.obtenerEstadisticas({ ubicacion: 'Edificio B' });

    expect(respuesta.datos.totalActivos).toBe(2);
  });

  it('lista todos los activos', async () => {
    const respuesta = await controller.listarActivos();

    expect(respuesta.valido).toBe(true);
    expect(respuesta.total).toBe(6);
    expect(respuesta.datos.length).toBe(6);
  });
});