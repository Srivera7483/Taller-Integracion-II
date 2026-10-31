import 'reflect-metadata';
import { ActivosController } from './activos.controller';
import { ActivosService } from './activos.service';
import { PrismaService } from './prisma.service';

describe('ActivosController - TAL-6 y TAL-13', () => {
  let controller: ActivosController;
  let service: ActivosService;
  let prismaMock = {} as unknown as PrismaService;

  beforeEach(() => {
    service = new ActivosService(prismaMock);
    controller = new ActivosController(service);
  });

  describe('TAL-6: Endpoints estadísticos', () => {
    it('retorna el resumen estadístico de activos', async () => {
      const respuesta = await controller.obtenerEstadisticas();

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

  describe('TAL-13: API de trazabilidad e historial de activos', () => {
    it('retorna la trazabilidad del activo consultado por código QR o ID', async () => {
      const respuesta = await controller.obtenerTrazabilidad('ACT-2026-0001');

      expect(respuesta).toBeDefined();
      expect(respuesta.activo.codigoQr).toBe('ACT-2026-0001');
      expect(respuesta.trazabilidad).toBeDefined();
      expect(respuesta.paginacion).toBeDefined();
      expect(respuesta.resumenEstadistico).toBeDefined();
      expect(respuesta.paginacion.pagina).toBe(1);
    });

    it('soporta query parameters de paginación y filtros en el controlador', async () => {
      const respuesta = await controller.obtenerTrazabilidad('ACT-2026-0001', {
        page: 1,
        limit: 1,
        tipoFiltro: 'fallo',
      });

      expect(respuesta.paginacion.pagina).toBe(1);
      expect(respuesta.paginacion.limite).toBe(1);
      expect(respuesta.trazabilidad.length).toBe(1);
      expect(respuesta.trazabilidad[0].tipo).toBe('fallo');
    });

    it('propaga NotFoundException si el activo no existe', async () => {
      await expect(controller.obtenerTrazabilidad('CODIGO-INEXISTENTE')).rejects.toThrow();
    });
  });
});