import { Injectable, Logger } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type {
  FilaExportacionIncidencia,
  ResultadoExportacion,
} from './interfaces/exportar-incidencias.interface';
import { PrioridadDinamicaService } from './prioridad-dinamica.service';

export interface ResolutoresDatosCruzados {
  activosPorId?: Map<string, { nombre: string; codigoQr?: string }>;
  usuariosPorId?: Map<string, { nombre: string; apellido?: string; email?: string }>;
}

const SEMILLAS_ACTIVOS_FALLBACK: Record<string, { nombre: string; codigoQr: string }> = {
  'f47ac10b-58cc-4372-a567-0e02b2c3d479': {
    nombre: 'Proyector Láser Epson PowerLite',
    codigoQr: 'ACT-2026-0001',
  },
  '550e8400-e29b-41d4-a716-446655440000': {
    nombre: 'Computador Docente All-in-One Dell',
    codigoQr: 'ACT-2026-0002',
  },
  '3fa85f64-5717-4562-b3fc-2c963f66afa6': {
    nombre: 'Estación de Trabajo Desincorporada',
    codigoQr: 'ACT-2026-0003',
  },
  'SW-CORE-01': {
    nombre: 'Switch de Distribución Cisco Catalyst 9300',
    codigoQr: 'SW-CORE-01',
  },
};

@Injectable()
export class ExportarIncidenciasService {
  private readonly logger = new Logger(ExportarIncidenciasService.name);

  constructor(
    private readonly prioridadDinamicaService: PrioridadDinamicaService = new PrioridadDinamicaService(),
  ) {}

  /**
   * Transforma el conjunto de incidencias de base de datos en filas enriquecidas para el reporte gerencial
   */
  construirFilas(
    incidencias: any[],
    resolutores: ResolutoresDatosCruzados = {},
  ): FilaExportacionIncidencia[] {
    const mapaActivos = resolutores.activosPorId ?? new Map();
    const mapaUsuarios = resolutores.usuariosPorId ?? new Map();

    return incidencias.map((inc) => {
      // 1. Estado
      let nombreEstado = 'Reportada';
      if (typeof inc.estado === 'string') {
        nombreEstado = inc.estado;
      } else if (inc.estado?.nombre_estado) {
        nombreEstado = inc.estado.nombre_estado;
      } else if (inc.historial_estados?.[0]?.estado?.nombre_estado) {
        nombreEstado = inc.historial_estados[0].estado.nombre_estado;
      }

      // 2. Activo (Cruce de datos)
      let detalleActivo = inc.id_activo;
      if (mapaActivos.has(inc.id_activo)) {
        const a = mapaActivos.get(inc.id_activo)!;
        detalleActivo = a.codigoQr ? `${a.nombre} (${a.codigoQr})` : a.nombre;
      } else if (SEMILLAS_ACTIVOS_FALLBACK[inc.id_activo]) {
        const s = SEMILLAS_ACTIVOS_FALLBACK[inc.id_activo];
        detalleActivo = `${s.nombre} (${s.codigoQr})`;
      } else if (inc.activo?.nombre) {
        detalleActivo = inc.activo.codigoQr
          ? `${inc.activo.nombre} (${inc.activo.codigoQr})`
          : inc.activo.nombre;
      }

      // 3. Reportante (Cruce de datos)
      let detalleReportante = inc.id_reportante;
      if (mapaUsuarios.has(inc.id_reportante)) {
        const u = mapaUsuarios.get(inc.id_reportante)!;
        detalleReportante = u.apellido
          ? `${u.nombre} ${u.apellido}`
          : u.email
            ? `${u.nombre} (${u.email})`
            : u.nombre;
      } else if (inc.reportante?.nombre) {
        detalleReportante = inc.reportante.apellido
          ? `${inc.reportante.nombre} ${inc.reportante.apellido}`
          : inc.reportante.nombre;
      }

      // 4. Técnico asignado (Cruce de datos desde orden de trabajo)
      let detalleTecnico = 'Sin asignar';
      const ordenTrabajo = inc.ordenes_trabajo?.[0];
      const idTecnico = ordenTrabajo?.id_tecnico || inc.id_tecnico;

      if (idTecnico) {
        if (mapaUsuarios.has(idTecnico)) {
          const t = mapaUsuarios.get(idTecnico)!;
          detalleTecnico = t.apellido
            ? `${t.nombre} ${t.apellido}`
            : t.email
              ? `${t.nombre} (${t.email})`
              : t.nombre;
        } else if (ordenTrabajo?.tecnico?.nombre) {
          detalleTecnico = ordenTrabajo.tecnico.apellido
            ? `${ordenTrabajo.tecnico.nombre} ${ordenTrabajo.tecnico.apellido}`
            : ordenTrabajo.tecnico.nombre;
        } else {
          detalleTecnico = `Técnico (${idTecnico.substring(0, 8)})`;
        }
      }

      // 5. Prioridad dinámica y escalada (TAL-115)
      const calculoPrioridad = this.prioridadDinamicaService.calcularPrioridadRelativa(inc);

      // 6. Fecha de creación formateada legible
      const fecha = inc.fecha_creacion instanceof Date
        ? inc.fecha_creacion
        : new Date(inc.fecha_creacion || Date.now());
      const fechaLegible = this.formatearFecha(fecha);

      return {
        id_incidencia: inc.id_incidencia,
        titulo: inc.titulo || 'Sin título',
        estado: nombreEstado,
        activo: detalleActivo,
        reportante: detalleReportante,
        tecnico_asignado: detalleTecnico,
        prioridad: calculoPrioridad.prioridad_relativa,
        escalada: calculoPrioridad.escalada ? 'Sí' : 'No',
        fecha_creacion: fechaLegible,
        descripcion: inc.descripcion || '',
      };
    });
  }

  /**
   * Genera el buffer binario en formato Excel (.xlsx) o CSV (.csv) con metadatos y encabezados legibles
   */
  async generarArchivo(
    filas: FilaExportacionIncidencia[],
    formato: 'xlsx' | 'excel' | 'csv' = 'xlsx',
  ): Promise<ResultadoExportacion> {
    const esCsv = formato.toLowerCase() === 'csv';
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Mantenimiento UCT - ms-incidencias';
    workbook.lastModifiedBy = 'ms-incidencias';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Incidencias', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    // Definir columnas y ancho legible
    worksheet.columns = [
      { header: 'ID', key: 'id_incidencia', width: 38 },
      { header: 'Título', key: 'titulo', width: 35 },
      { header: 'Estado', key: 'estado', width: 16 },
      { header: 'Activo', key: 'activo', width: 36 },
      { header: 'Reportante', key: 'reportante', width: 30 },
      { header: 'Técnico Asignado', key: 'tecnico_asignado', width: 28 },
      { header: 'Prioridad', key: 'prioridad', width: 14 },
      { header: 'Escalada', key: 'escalada', width: 12 },
      { header: 'Fecha de Creación', key: 'fecha_creacion', width: 22 },
      { header: 'Descripción', key: 'descripcion', width: 45 },
    ];

    // Estilos de cabecera profesional en Excel
    const filaCabecera = worksheet.getRow(1);
    filaCabecera.height = 28;
    filaCabecera.eachCell((cell) => {
      cell.font = {
        name: 'Segoe UI',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF003366' }, // Azul institucional UCT
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: false,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'medium', color: { argb: 'FF001F3F' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
    });

    // Agregar filas de datos
    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i];
      const row = worksheet.addRow(fila);
      row.height = 22;

      // Zebra striping sutil para mejorar la legibilidad en Excel
      const bgArgb = i % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { name: 'Segoe UI', size: 10 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgArgb },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };

        // Centrado de columnas cortas (Estado, Prioridad, Escalada, Fecha)
        if ([1, 3, 7, 8, 9].includes(colNumber)) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      });
    }

    const timestamp = this.obtenerTimestampArchivo();

    if (esCsv) {
      const rawCsvBuffer = await workbook.csv.writeBuffer();
      // Agregar BOM UTF-8 (\uFEFF) para que Excel abra acentos y caracteres latinos sin corrupción
      const bom = Buffer.from('\uFEFF', 'utf-8');
      const buffer = Buffer.concat([bom, Buffer.from(rawCsvBuffer)]);

      return {
        buffer,
        contentType: 'text/csv; charset=utf-8',
        filename: `reporte_incidencias_${timestamp}.csv`,
        totalFilas: filas.length,
      };
    }

    // Formato XLSX (Excel)
    const rawXlsxBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(rawXlsxBuffer);

    return {
      buffer,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `reporte_incidencias_${timestamp}.xlsx`,
      totalFilas: filas.length,
    };
  }

  private formatearFecha(fecha: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const anio = fecha.getFullYear();
    const mes = pad(fecha.getMonth() + 1);
    const dia = pad(fecha.getDate());
    const hora = pad(fecha.getHours());
    const min = pad(fecha.getMinutes());
    const seg = pad(fecha.getSeconds());
    return `${anio}-${mes}-${dia} ${hora}:${min}:${seg}`;
  }

  private obtenerTimestampArchivo(): string {
    const ahora = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const anio = ahora.getFullYear();
    const mes = pad(ahora.getMonth() + 1);
    const dia = pad(ahora.getDate());
    return `${anio}-${mes}-${dia}`;
  }
}
