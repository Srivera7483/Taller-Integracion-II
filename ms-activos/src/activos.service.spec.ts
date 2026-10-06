import { ActivosService } from './activos.service';
import { EstadoActivo, CategoriaActivo } from './interfaces/activo.interface';

describe('ActivosService - TAL-6: Endpoints de agregación estadística de activos', () => {
  let service: ActivosService;

  beforeEach(() => {
    service = new ActivosService();
  });

  describe('obtenerEstadisticas', () => {
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
});
