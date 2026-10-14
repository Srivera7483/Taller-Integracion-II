import 'reflect-metadata';
import { ActivosService } from './activos.service';
import { PrismaService } from './prisma.service';
import { EstadoActivo, CategoriaActivo } from './interfaces/activo.interface';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ActivosService - TAL-6 y TAL-13', () => {
  let service: ActivosService;
  let prismaMock = {} as unknown as PrismaService;

  beforeEach(() => {
    service = new ActivosService(prismaMock);
  });

  describe('TAL-6: Endpoints de agregación estadística de activos', () => {
    it('calcula las estadísticas globales correctamente', async () => {
      const resultado = await service.obtenerEstadisticas();

      expect(resultado.valido).toBe(true);
      expect(resultado.datos.totalActivos).toBe(6);

      // Verificación por estado
      expect(resultado.datos.porEstado).toEqual({
        operativos: 3,
        enMantenimiento: 1,
        enRevision: 1,
        dadosDeBaja: 1,
      });

      // Verificación por categoría
      expect(resultado.datos.porCategoria[CategoriaActivo.AUDIOVISUAL]).toBe(2);
      expect(resultado.datos.porCategoria[CategoriaActivo.COMPUTO]).toBe(2);
      expect(resultado.datos.porCategoria[CategoriaActivo.REDES]).toBe(1);
      expect(resultado.datos.porCategoria[CategoriaActivo.ELECTRICO]).toBe(1);

      // Verificación de porcentajes y tasas
      expect(resultado.datos.porcentajes.tasaOperatividad).toBe(50); // 3 de 6 = 50%
      expect(resultado.datos.porcentajes.tasaMantenimiento).toBe(16.67); // 1 de 6 = 16.67%
      expect(resultado.datos.porcentajes.tasaRevision).toBe(16.67); // 1 de 6 = 16.67%
      expect(resultado.datos.porcentajes.tasaBaja).toBe(16.67); // 1 de 6 = 16.67%

      // Verificación de resumen
      expect(resultado.datos.resumen.disponibles).toBe(3);
      expect(resultado.datos.resumen.noDisponibles).toBe(3);
    });

    it('aplica filtros por ubicación correctamente', async () => {
      const resultado = await service.obtenerEstadisticas({ ubicacion: 'Edificio A' });

      expect(resultado.valido).toBe(true);
      expect(resultado.datos.totalActivos).toBe(2);
      expect(resultado.datos.porEstado.operativos).toBe(1);
      expect(resultado.datos.porEstado.enRevision).toBe(1);
      expect(resultado.datos.porcentajes.tasaOperatividad).toBe(50);
    });

    it('aplica filtros por categoría correctamente', async () => {
      const resultado = await service.obtenerEstadisticas({ categoria: 'COMPUTO' });

      expect(resultado.valido).toBe(true);
      expect(resultado.datos.totalActivos).toBe(2);
      expect(resultado.datos.porEstado.enMantenimiento).toBe(1);
      expect(resultado.datos.porEstado.dadosDeBaja).toBe(1);
      expect(resultado.datos.porcentajes.tasaOperatividad).toBe(0);
      expect(resultado.datos.resumen.disponibles).toBe(0);
      expect(resultado.datos.resumen.noDisponibles).toBe(2);
    });

    it('maneja filtros que no coinciden con ningún activo sin lanzar errores ni dividir por cero', async () => {
      const resultado = await service.obtenerEstadisticas({ ubicacion: 'Edificio Inexistente' });

      expect(resultado.valido).toBe(true);
      expect(resultado.datos.totalActivos).toBe(0);
      expect(resultado.datos.porcentajes.tasaOperatividad).toBe(0);
      expect(resultado.datos.porcentajes.tasaMantenimiento).toBe(0);
      expect(resultado.datos.resumen.disponibles).toBe(0);
      expect(resultado.datos.resumen.noDisponibles).toBe(0);
    });
  });

  describe('validarCodigoQR', () => {
    it('valida exitosamente un activo operativo existente', async () => {
      const resultado = await service.validarCodigoQR('ACT-2026-0001');

      expect(resultado.valido).toBe(true);
      expect(resultado.permiteReportarIncidencia).toBe(true);
      expect(resultado.activo?.nombre).toBe('Proyector Láser Epson PowerLite');
    });

    it('rechaza reporte para activos dados de baja', async () => {
      const resultado = await service.validarCodigoQR('ACT-2026-0003');

      expect(resultado.valido).toBe(false);
      expect(resultado.permiteReportarIncidencia).toBe(false);
      expect(resultado.mensaje).toContain('DADO DE BAJA');
    });
  });

  describe('TAL-13: API de trazabilidad e historial de activos', () => {
    it('obtiene el historial completo de trazabilidad mediante código QR', async () => {
      const resultado = await service.obtenerTrazabilidad('ACT-2026-0001');

      expect(resultado).toBeDefined();
      expect(resultado.activo.codigoQr).toBe('ACT-2026-0001');
      expect(resultado.activo.nombre).toBe('Proyector Láser Epson PowerLite');
      expect(resultado.trazabilidad.length).toBeGreaterThan(0);
      expect(resultado.resumenEstadistico.totalHitos).toBe(resultado.paginacion.total);

      // Verificación de orden cronológico descendente (más reciente primero)
      for (let i = 0; i < resultado.trazabilidad.length - 1; i++) {
        const fechaActual = new Date(resultado.trazabilidad[i].fecha).getTime();
        const fechaSiguiente = new Date(resultado.trazabilidad[i + 1].fecha).getTime();
        expect(fechaActual).toBeGreaterThanOrEqual(fechaSiguiente);
      }
    });

    it('obtiene el historial mediante UUID del activo', async () => {
      const resultado = await service.obtenerTrazabilidad('f47ac10b-58cc-4372-a567-0e02b2c3d479');

      expect(resultado.activo.id).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479');
      expect(resultado.activo.codigoQr).toBe('ACT-2026-0001');
      expect(resultado.trazabilidad.length).toBeGreaterThan(0);
    });

    it('filtra eventos por tipo de hito (mantenimiento)', async () => {
      const resultado = await service.obtenerTrazabilidad('ACT-2026-0001', {
        tipoFiltro: 'mantenimiento',
      });

      expect(resultado.trazabilidad.length).toBeGreaterThan(0);
      for (const evento of resultado.trazabilidad) {
        expect(evento.tipo).toBe('mantenimiento');
      }
      expect(resultado.resumenEstadistico.totalMantenimientos).toBe(resultado.paginacion.total);
    });

    it('aplica paginación correctamente (página 1, límite 2)', async () => {
      const resultado = await service.obtenerTrazabilidad('ACT-2026-0001', {
        page: 1,
        limit: 2,
      });

      expect(resultado.paginacion.pagina).toBe(1);
      expect(resultado.paginacion.limite).toBe(2);
      expect(resultado.trazabilidad.length).toBe(2);
      expect(resultado.paginacion.tieneMas).toBe(true);
      expect(resultado.paginacion.totalPaginas).toBe(Math.ceil(resultado.paginacion.total / 2));
    });

    it('lanza NotFoundException cuando el activo no existe', async () => {
      await expect(service.obtenerTrazabilidad('ACT-INEXISTENTE')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza BadRequestException cuando se envía un código vacío o inválido', async () => {
      await expect(service.obtenerTrazabilidad('')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('TAL-121: Filtros dinámicos de rango de fechas para mantenimientos', () => {
    it('retorna el listado completo original cuando no se proporcionan filtros de fecha', async () => {
      const resultado = await service.listarMantenimientos();

      expect(resultado.valido).toBe(true);
      expect(resultado.total).toBe(5);
      expect(resultado.datos.length).toBe(5);
      expect(resultado.filtrosAplicados.startDate).toBeNull();
      expect(resultado.filtrosAplicados.endDate).toBeNull();
    });

    it('filtra mantenimientos correctamente dentro de un rango YYYY-MM-DD', async () => {
      const resultado = await service.listarMantenimientos({
        startDate: '2026-10-01',
        endDate: '2026-10-25',
      });

      expect(resultado.valido).toBe(true);
      expect(resultado.total).toBe(2);
      expect(resultado.datos.map((m: any) => m.id)).toEqual(['mant-001', 'mant-002']);
    });

    it('filtra mantenimientos en formato ISO 8601', async () => {
      const resultado = await service.listarMantenimientos({
        startDate: '2026-10-20T00:00:00.000Z',
        endDate: '2026-10-31T23:59:59.999Z',
      });

      expect(resultado.valido).toBe(true);
      expect(resultado.total).toBe(2);
      expect(resultado.datos.map((m: any) => m.id)).toEqual(['mant-002', 'mant-003']);
    });

    it('retorna listado vacío cuando no hay mantenimientos en el rango seleccionado', async () => {
      const resultado = await service.listarMantenimientos({
        startDate: '2026-12-01',
        endDate: '2026-12-31',
      });

      expect(resultado.valido).toBe(true);
      expect(resultado.total).toBe(0);
      expect(resultado.datos).toEqual([]);
    });

    it('lanza BadRequestException si fecha inicio es posterior a fecha fin', async () => {
      await expect(
        service.listarMantenimientos({
          startDate: '2026-10-31',
          endDate: '2026-10-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException con fechas de formato inválido', async () => {
      await expect(
        service.listarMantenimientos({
          startDate: 'fecha-invalida',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('recupera el listado completo al limpiar las fechas (Criterio de Aceptación 1)', async () => {
      // 1. Filtrar con rango acotado
      const filtrado = await service.listarMantenimientos({
        startDate: '2026-10-10',
        endDate: '2026-10-18',
      });
      expect(filtrado.total).toBe(1);

      // 2. Limpiar fechas (enviando vacío o indefinido)
      const restablecido = await service.listarMantenimientos({});
      expect(restablecido.total).toBe(5);
    });
  });
});