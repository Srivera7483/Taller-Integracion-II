import { ExportarIncidenciasService } from './exportar-incidencias.service';
import ExcelJS from 'exceljs';

describe('ExportarIncidenciasService - TAL-117: Exportación de Historial a Excel/CSV', () => {
  let service: ExportarIncidenciasService;

  beforeEach(() => {
    service = new ExportarIncidenciasService();
  });

  describe('Criterio de Aceptación 2: Cruce de Datos y Columnas Legibles', () => {
    it('construye las filas del reporte con las columnas requeridas y cruce de datos', () => {
      const fechaCreacion = new Date('2026-10-10T14:30:00Z');
      const incidencias = [
        {
          id_incidencia: 'inc-001',
          titulo: 'Proyector sin señal HDMI',
          descripcion: 'El equipo no enciende luz de proyección',
          id_activo: 'act-001',
          id_reportante: 'usr-001',
          fecha_creacion: fechaCreacion,
          historial_estados: [
            { estado: { id_estado: 1, nombre_estado: 'Reportada' } },
          ],
          ordenes_trabajo: [
            {
              id_orden: 'ord-001',
              id_tecnico: 'tec-001',
            },
          ],
        },
      ];

      const mapaActivos = new Map([
        ['act-001', { nombre: 'Proyector Epson L520U', codigoQr: 'ACT-2026-0001' }],
      ]);
      const mapaUsuarios = new Map([
        ['usr-001', { nombre: 'Ana', apellido: 'Pérez', email: 'ana@uct.cl' }],
        ['tec-001', { nombre: 'Carlos', apellido: 'Gómez', email: 'carlos@uct.cl' }],
      ]);

      const filas = service.construirFilas(incidencias, {
        activosPorId: mapaActivos,
        usuariosPorId: mapaUsuarios,
      });

      expect(filas.length).toBe(1);
      const fila = filas[0];

      // Verificación de columnas obligatorias del criterio de aceptación
      expect(fila.id_incidencia).toBe('inc-001');
      expect(fila.titulo).toBe('Proyector sin señal HDMI');
      expect(fila.estado).toBe('Reportada');
      expect(fila.activo).toBe('Proyector Epson L520U (ACT-2026-0001)');
      expect(fila.reportante).toBe('Ana Pérez');
      expect(fila.tecnico_asignado).toBe('Carlos Gómez');
      expect(fila.fecha_creacion).toContain('2026-10-10');
      expect(fila.descripcion).toBe('El equipo no enciende luz de proyección');
    });

    it('utiliza fallbacks si los microservicios de Activos o Usuarios no están disponibles', () => {
      const incidencias = [
        {
          id_incidencia: 'inc-002',
          titulo: 'Falla de red',
          id_activo: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Semilla conocida
          id_reportante: 'usr-desconocido-1234',
          fecha_creacion: new Date('2026-10-12T10:00:00Z'),
          historial_estados: [{ estado: { nombre_estado: 'Pendiente' } }],
          ordenes_trabajo: [],
        },
      ];

      const filas = service.construirFilas(incidencias, {});

      expect(filas[0].activo).toBe('Proyector Láser Epson PowerLite (ACT-2026-0001)');
      expect(filas[0].reportante).toBe('usr-desconocido-1234');
      expect(filas[0].tecnico_asignado).toBe('Sin asignar');
    });

    it('incluye prioridad calculada y flag de escalada para incidencias antiguas (> 48h)', () => {
      const fechaAntigua = new Date(Date.now() - 72 * 3600 * 1000); // 72 horas
      const incidencias = [
        {
          id_incidencia: 'inc-003',
          titulo: 'Servidor lento',
          id_activo: 'act-002',
          id_reportante: 'usr-002',
          fecha_creacion: fechaAntigua,
          prioridad: 'Baja',
          historial_estados: [{ estado: { nombre_estado: 'Reportada' } }],
        },
      ];

      const filas = service.construirFilas(incidencias);
      expect(filas[0].escalada).toBe('Sí');
      expect(filas[0].prioridad).toBe('Media'); // Baja escalada a Media
    });
  });

  describe('Criterio de Aceptación 1: Retorno de Content-Type adecuado y Generación de Buffer', () => {
    const filasEjemplo = [
      {
        id_incidencia: '550e8400-e29b-41d4-a716-446655440000',
        titulo: 'Falla de monitor auditorio',
        estado: 'Reportada',
        activo: 'Monitor Dell 27 (ACT-2026-0002)',
        reportante: 'Rodrigo Morales',
        tecnico_asignado: 'Carlos Gómez',
        prioridad: 'Alta',
        escalada: 'Sí',
        fecha_creacion: '2026-10-14 09:30:00',
        descripcion: 'Pantalla parpadea con líneas horizontales',
      },
    ];

    it('genera archivo Excel (.xlsx) con Content-Type y cabeceras correctas', async () => {
      const resultado = await service.generarArchivo(filasEjemplo, 'xlsx');

      expect(resultado.contentType).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(resultado.filename).toMatch(/^reporte_incidencias_\d{4}-\d{2}-\d{2}\.xlsx$/);
      expect(resultado.totalFilas).toBe(1);
      expect(resultado.buffer).toBeInstanceOf(Buffer);
      expect(resultado.buffer.length).toBeGreaterThan(1000);

      // Verificar que el buffer es un archivo Excel válido legible por ExcelJS
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(resultado.buffer as any);
      const ws = wb.getWorksheet('Incidencias');
      expect(ws).toBeDefined();

      const headers = ws?.getRow(1).values as string[];
      expect(headers).toContain('ID');
      expect(headers).toContain('Título');
      expect(headers).toContain('Estado');
      expect(headers).toContain('Activo');
      expect(headers).toContain('Reportante');
      expect(headers).toContain('Fecha de Creación');

      const filaDatos = ws?.getRow(2).values as any[];
      expect(filaDatos).toContain('Falla de monitor auditorio');
      expect(filaDatos).toContain('Rodrigo Morales');
    });

    it('genera archivo CSV (.csv) con Content-Type text/csv y BOM UTF-8', async () => {
      const resultado = await service.generarArchivo(filasEjemplo, 'csv');

      expect(resultado.contentType).toBe('text/csv; charset=utf-8');
      expect(resultado.filename).toMatch(/^reporte_incidencias_\d{4}-\d{2}-\d{2}\.csv$/);
      expect(resultado.totalFilas).toBe(1);
      expect(resultado.buffer).toBeInstanceOf(Buffer);

      // Verificar presencia de BOM UTF-8 (\uFEFF)
      expect(resultado.buffer[0]).toBe(0xef);
      expect(resultado.buffer[1]).toBe(0xbb);
      expect(resultado.buffer[2]).toBe(0xbf);

      const contenidoTexto = resultado.buffer.toString('utf-8');
      expect(contenidoTexto).toContain('ID,Título,Estado,Activo,Reportante');
      expect(contenidoTexto).toContain('Falla de monitor auditorio');
      expect(contenidoTexto).toContain('Rodrigo Morales');
    });

    it('maneja exportaciones sin datos conservando las cabeceras', async () => {
      const resultado = await service.generarArchivo([], 'xlsx');
      expect(resultado.totalFilas).toBe(0);
      expect(resultado.buffer.length).toBeGreaterThan(500);

      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(resultado.buffer as any);
      const ws = wb.getWorksheet('Incidencias');
      expect(ws?.rowCount).toBe(1); // Solo la cabecera
    });
  });
});
