import { ActivosController } from './activos.controller';
import { ActivosService } from './activos.service';

describe('ActivosController - TAL-6', () => {
  let controller: ActivosController;
  let service: ActivosService;

  beforeEach(() => {
    service = new ActivosService();
    controller = new ActivosController(service);
  });

  it('retorna status 200 con el resumen estadístico de activos', async () => {
    const respuesta = await controller.obtenerEstadisticas();

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.body.valido).toBe(true);
    expect(respuesta.body.datos.totalActivos).toBeGreaterThan(0);
    expect(respuesta.body.datos.porEstado).toBeDefined();
    expect(respuesta.body.datos.porCategoria).toBeDefined();
    expect(respuesta.body.datos.porcentajes).toBeDefined();
  });

  it('permite filtrar estadísticas por ubicación desde el controlador', async () => {
    const respuesta = await controller.obtenerEstadisticas({ ubicacion: 'Edificio B' });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.body.datos.totalActivos).toBe(2);
  });

  it('lista todos los activos con status 200', async () => {
    const respuesta = await controller.listarActivos();

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.body.valido).toBe(true);
    expect(respuesta.body.total).toBe(6);
    expect(respuesta.body.datos.length).toBe(6);
  });
});
