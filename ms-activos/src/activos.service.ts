import {
  Activo,
  EstadoActivo,
  CategoriaActivo,
  RespuestaValidacionQR,
} from './interfaces/activo.interface';
import { ValidarQrDto } from './dto/validar-qr.dto';

export class ActivosService {
  private activosEnMemoria: Activo[] = [
    {
      id: 'act-001',
      codigoQr: 'ACT-2026-0001',
      nombre: 'Proyector Láser Epson PowerLite',
      modelo: 'PowerLite L520U',
      numeroSerie: 'SN-EPS-9921',
      categoria: CategoriaActivo.AUDIOVISUAL,
      ubicacion: 'Edificio A - Auditorio Principal',
      estado: EstadoActivo.OPERATIVO,
      fechaRegistro: '2026-03-01',
    },
    {
      id: 'act-002',
      codigoQr: 'ACT-2026-0002',
      nombre: 'Computador Docente All-in-One Dell',
      modelo: 'OptiPlex 7490',
      numeroSerie: 'SN-DELL-4412',
      categoria: CategoriaActivo.COMPUTO,
      ubicacion: 'Edificio B - Laboratorio 302',
      estado: EstadoActivo.EN_MANTENIMIENTO,
      fechaRegistro: '2026-03-10',
    },
    {
      id: 'act-003',
      codigoQr: 'ACT-2026-0003',
      nombre: 'Impresora Multifuncional HP LaserJet',
      modelo: 'LaserJet Pro M428fdw',
      numeroSerie: 'SN-HP-8831',
      categoria: CategoriaActivo.COMPUTO,
      ubicacion: 'Edificio Central - Sala de Profesores',
      estado: EstadoActivo.DADO_DE_BAJA,
      fechaRegistro: '2024-01-15',
    },
  ];

  async validarCodigoQR(codigoBruto: string): Promise<RespuestaValidacionQR> {
    const resultadoValidacion = ValidarQrDto.validar(codigoBruto);
    if (!resultadoValidacion.valido || !resultadoValidacion.codigoLimpio) {
      return {
        valido: false,
        mensaje: resultadoValidacion.error || 'Formato de código QR inválido.',
        permiteReportarIncidencia: false,
      };
    }

    const codigoBuscado = resultadoValidacion.codigoLimpio.toUpperCase();

    const activo = this.activosEnMemoria.find(
      (item) => item.codigoQr.toUpperCase() === codigoBuscado || item.id === codigoBuscado.toLowerCase(),
    );

    if (!activo) {
      return {
        valido: false,
        mensaje: `No se encontró ningún activo registrado con el código '${codigoBuscado}'.`,
        permiteReportarIncidencia: false,
      };
    }

    if (activo.estado === EstadoActivo.DADO_DE_BAJA) {
      return {
        valido: false,
        mensaje: `El activo '${activo.nombre}' (${activo.codigoQr}) está DADO DE BAJA y ya no se encuentra en servicio activo.`,
        activo,
        permiteReportarIncidencia: false,
      };
    }

    return {
      valido: true,
      mensaje: `Activo '${activo.nombre}' validado exitosamente.`,
      activo,
      permiteReportarIncidencia: true,
    };
  }

  async obtenerPorId(id: string): Promise<Activo | null> {
    return this.activosEnMemoria.find((item) => item.id === id) || null;
  }
}
