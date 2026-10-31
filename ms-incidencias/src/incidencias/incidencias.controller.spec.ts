import { IncidenciasController } from './incidencias.controller';
import { IncidenciasService } from './incidencias.service';
import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';

describe('IncidenciasController - TAL-117 & TAL-127', () => {
  let controller: IncidenciasController;
  let service: jest.Mocked<Partial<IncidenciasService>>;

  beforeEach(() => {
    service = {
      exportarIncidencias: jest.fn(),
      listar: jest.fn(),
      obtener: jest.fn(),
      obtenerReportePrioridades: jest.fn(),
      obtenerPrioridadDinamica: jest.fn(),
      procesarYGuardarEvidencia: jest.fn(),
      crearEvidencia: jest.fn(),
    };

    controller = new IncidenciasController(service as IncidenciasService);
  });

  describe('GET /incidencias/exportar (TAL-117)', () => {
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

  describe('POST /incidencias/:id_incidencia/evidencias/upload (TAL-127)', () => {
    it('delega el procesamiento del archivo validado al servicio de incidencias', async () => {
      const mockFile = {
        originalname: 'foto_evidencia.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      };

      const mockResultadoEvidencia = {
        id_evidencia: 'ev-1',
        id_incidencia: 'inc-1',
        url_evidencia: '/uploads/foto.webp',
      };

      (service.procesarYGuardarEvidencia as jest.Mock).mockResolvedValue(mockResultadoEvidencia);

      const resultado = await controller.uploadEvidencia('inc-1', '2', mockFile);

      expect(service.procesarYGuardarEvidencia).toHaveBeenCalledWith('inc-1', 2, mockFile);
      expect(resultado).toBe(mockResultadoEvidencia);
    });
  });

  describe('POST /incidencias/:id_incidencia/evidencias', () => {
    it('delega la creación de evidencia mediante URL al servicio', async () => {
      const mockBody = {
        id_tipo_evidencia: 1,
        url_evidencia: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      };

      const mockResultado = {
        id_evidencia: 'ev-2',
        id_incidencia: 'inc-1',
        url_evidencia: mockBody.url_evidencia,
      };

      (service.crearEvidencia as jest.Mock).mockResolvedValue(mockResultado);

      const resultado = await controller.crearEvidencia('inc-1', mockBody);

      expect(service.crearEvidencia).toHaveBeenCalledWith('inc-1', mockBody);
      expect(resultado).toBe(mockResultado);
    });
  });
});
