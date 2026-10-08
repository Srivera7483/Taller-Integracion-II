import {
  Activo,
  EstadoActivo,
  CategoriaActivo,
  RespuestaValidacionQR,
  RespuestaRedireccionIncidencia,
  EstadisticasActivos,
  FiltroEstadisticasDto,
  RespuestaEstadisticas,
} from './interfaces/activo.interface';
import { ValidarQrDto } from './dto/validar-qr.dto';
import { ValidarFiltroEstadisticasDto } from './dto/filtrar-estadisticas.dto';

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
    {
      id: 'act-004',
      codigoQr: 'ACT-2026-0004',
      nombre: 'Switch Administrable Cisco Catalyst 24 Puertos',
      modelo: 'Catalyst 2960-X',
      numeroSerie: 'SN-CSCO-5512',
      categoria: CategoriaActivo.REDES,
      ubicacion: 'Edificio B - Rack Principal Piso 2',
      estado: EstadoActivo.OPERATIVO,
      fechaRegistro: '2025-08-20',
    },
    {
      id: 'act-005',
      codigoQr: 'ACT-2026-0005',
      nombre: 'UPS Online APC Smart-UPS 3000VA',
      modelo: 'SMT3000RM2U',
      numeroSerie: 'SN-APC-1190',
      categoria: CategoriaActivo.ELECTRICO,
      ubicacion: 'Edificio A - Data Center',
      estado: EstadoActivo.EN_REVISION,
      fechaRegistro: '2025-11-12',
    },
    {
      id: 'act-006',
      codigoQr: 'ACT-2026-0006',
      nombre: 'Pantalla Interactiva Táctil SmartBoard 75 Pulgadas',
      modelo: 'SBID-7075R',
      numeroSerie: 'SN-SMRT-3310',
      categoria: CategoriaActivo.AUDIOVISUAL,
      ubicacion: 'Edificio Central - Sala de Innovación',
      estado: EstadoActivo.OPERATIVO,
      fechaRegistro: '2026-02-14',
    },
  ];

  private construirEnlacesRedireccion(activo: Activo): { urlWeb: string; deepLinkMovil: string } {
    const params = new URLSearchParams({
      activoId: activo.id,
      codigoQr: activo.codigoQr,
      nombre: activo.nombre,
      ubicacion: activo.ubicacion,
      categoria: String(activo.categoria),
    });

    const queryString = params.toString();

    return {
      urlWeb: `/incidencias/crear?${queryString}`,
      deepLinkMovil: `app://incidencias/crear?${queryString}`,
    };
  }

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

    const enlaces = this.construirEnlacesRedireccion(activo);

    return {
      valido: true,
      mensaje: `Activo '${activo.nombre}' validado exitosamente.`,
      activo,
      permiteReportarIncidencia: true,
      urlRedireccion: enlaces.urlWeb,
      deepLinkMovil: enlaces.deepLinkMovil,
    };
  }

  async generarEnlaceIncidencia(codigoBruto: string): Promise<RespuestaRedireccionIncidencia> {
    const validacion = await this.validarCodigoQR(codigoBruto);

    if (!validacion.valido || !validacion.activo || !validacion.permiteReportarIncidencia) {
      return {
        valido: false,
        mensaje: validacion.mensaje,
      };
    }

    const activo = validacion.activo;
    const enlaces = this.construirEnlacesRedireccion(activo);

    return {
      valido: true,
      mensaje: `Enlace de redirección generado para '${activo.nombre}'.`,
      urlRedireccion: enlaces.urlWeb,
      deepLinkMovil: enlaces.deepLinkMovil,
      datosPrecargados: {
        activoId: activo.id,
        codigoQr: activo.codigoQr,
        nombre: activo.nombre,
        ubicacion: activo.ubicacion,
        categoria: String(activo.categoria),
      },
    };
  }

  async obtenerPorId(id: string): Promise<Activo | null> {
    return this.activosEnMemoria.find((item) => item.id === id) || null;
  }

  async listarTodos(): Promise<Activo[]> {
    return [...this.activosEnMemoria];
  }

  async obtenerEstadisticas(filtros?: FiltroEstadisticasDto): Promise<RespuestaEstadisticas> {
    const filtrosSanitizados = ValidarFiltroEstadisticasDto.sanitizar(filtros);

    let activosFiltrados = this.activosEnMemoria;

    if (filtrosSanitizados.ubicacion) {
      const termUbicacion = filtrosSanitizados.ubicacion.toLowerCase();
      activosFiltrados = activosFiltrados.filter((item) =>
        item.ubicacion.toLowerCase().includes(termUbicacion),
      );
    }

    if (filtrosSanitizados.categoria) {
      activosFiltrados = activosFiltrados.filter(
        (item) => String(item.categoria).toUpperCase() === filtrosSanitizados.categoria,
      );
    }

    const totalActivos = activosFiltrados.length;

    let operativos = 0;
    let enMantenimiento = 0;
    let enRevision = 0;
    let dadosDeBaja = 0;

    const porCategoria: Record<string, number> = {};
    const porUbicacion: Record<string, number> = {};

    for (const activo of activosFiltrados) {
      // Conteo por estado
      switch (activo.estado) {
        case EstadoActivo.OPERATIVO:
          operativos++;
          break;
        case EstadoActivo.EN_MANTENIMIENTO:
          enMantenimiento++;
          break;
        case EstadoActivo.EN_REVISION:
          enRevision++;
          break;
        case EstadoActivo.DADO_DE_BAJA:
          dadosDeBaja++;
          break;
      }

      // Conteo por categoría
      const catKey = String(activo.categoria);
      porCategoria[catKey] = (porCategoria[catKey] || 0) + 1;

      // Conteo por ubicación
      const ubiKey = activo.ubicacion;
      porUbicacion[ubiKey] = (porUbicacion[ubiKey] || 0) + 1;
    }

    const redondear = (valor: number): number => Math.round(valor * 100) / 100;

    const tasaOperatividad = totalActivos > 0 ? redondear((operativos / totalActivos) * 100) : 0;
    const tasaMantenimiento = totalActivos > 0 ? redondear((enMantenimiento / totalActivos) * 100) : 0;
    const tasaRevision = totalActivos > 0 ? redondear((enRevision / totalActivos) * 100) : 0;
    const tasaBaja = totalActivos > 0 ? redondear((dadosDeBaja / totalActivos) * 100) : 0;

    const estadisticas: EstadisticasActivos = {
      totalActivos,
      porEstado: {
        operativos,
        enMantenimiento,
        enRevision,
        dadosDeBaja,
      },
      porCategoria,
      porUbicacion,
      porcentajes: {
        tasaOperatividad,
        tasaMantenimiento,
        tasaRevision,
        tasaBaja,
      },
      resumen: {
        disponibles: operativos,
        noDisponibles: enMantenimiento + enRevision + dadosDeBaja,
      },
    };

    return {
      valido: true,
      mensaje: 'Estadísticas de activos calculadas exitosamente.',
      datos: estadisticas,
    };
  }
}
