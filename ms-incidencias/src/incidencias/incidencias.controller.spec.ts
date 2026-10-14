import { IncidenciasController } from './incidencias.controller';
import { IncidenciasService } from './incidencias.service';
import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';

describe('IncidenciasController - TAL-117: Endpoint de Exportación de Incidencias', () => {
  let controller: IncidenciasController;
  let service: jest.Mocked<Partial<IncidenciasService>>;

  beforeEach(() => {
    service = {
      exportarIncidencias: jest.fn(),
      listar: jest.fn(),
      obtener: jest.fn(),
      obtenerReportePrioridades: jest.fn(),
      obtenerPrioridadDinamica: jest.fn(),
    };

    controller = new IncidenciasController(service as IncidenciasService);
  });

  describe('GET /incidencias/exportar', () => {
    it('retorna StreamableFile y asigna los encabezados Content-Type y Content-Disposition para Excel', async () => {
      const mockBuffer = Buffer.from('mock-excel-binary-data');
      (service.exportarIncidencias as jest.Mock).mockResolvedValue({
        buffer: mockBuffer,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: 'reporte_incidencias_2026-10-14.xlsx',
        totalFilas: 5,
      });

      const setHeaderMock = jest.fn();
      const mockRes = {
        setHeader: setHeaderMock,
      } as unknown as Response;

      const resultado = await controller.exportar({ formato: 'xlsx' }, mockRes);

      expect(service.exportarIncidencias).toHaveBeenCalledWith({
        formato: 'xlsx',
      });
      expect(setHeaderMock).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(setHeaderMock).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="reporte_incidencias_2026-10-14.xlsx"',
      );
      expect(resultado).toBeInstanceOf(StreamableFile);
    });

    it('retorna StreamableFile y asigna Content-Type text/csv para CSV', async () => {
      const mockBuffer = Buffer.from('\uFEFFID,Título,Estado\n1,Prueba,Reportada');
      (service.exportarIncidencias as jest.Mock).mockResolvedValue({
        buffer: mockBuffer,
        contentType: 'text/csv; charset=utf-8',
        filename: 'reporte_incidencias_2026-10-14.csv',
        totalFilas: 1,
      });

      const setHeaderMock = jest.fn();
      const mockRes = {
        setHeader: setHeaderMock,
      } as unknown as Response;

      const resultado = await controller.exportar({ formato: 'csv' }, mockRes);

      expect(service.exportarIncidencias).toHaveBeenCalledWith({
        formato: 'csv',
      });
      expect(setHeaderMock).toHaveBeenCalledWith(
        'Content-Type',
        'text/csv; charset=utf-8',
      );
      expect(setHeaderMock).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="reporte_incidencias_2026-10-14.csv"',
      );
      expect(resultado).toBeInstanceOf(StreamableFile);
    });
  });
});
