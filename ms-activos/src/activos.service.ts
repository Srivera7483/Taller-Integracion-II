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
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CrearMantenimientoDto } from './dto/crear-mantenimiento.dto';



@Injectable()
export class ActivosService {

  private activosEnMemoria: Activo[] = [
    {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      codigoQr: 'ACT-2026-0001',
      nombre: 'Proyector Láser Epson PowerLite',
      modelo: 'PowerLite L210W',
      numeroSerie: 'EPS-998877',
      categoria: CategoriaActivo.AUDIOVISUAL,
      ubicacion: 'Auditorio Principal',
      estado: EstadoActivo.OPERATIVO,
      fechaRegistro: new Date('2026-03-01'),
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      codigoQr: 'ACT-2026-0002',
      nombre: 'Computador Dell OptiPlex',
      modelo: 'OptiPlex 7000',
      numeroSerie: 'DELL-112233',
      categoria: CategoriaActivo.COMPUTO,
      ubicacion: 'Laboratorio de Computación 1',
      estado: EstadoActivo.EN_REVISION,
      fechaRegistro: new Date('2026-03-10'),
    },
    {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      codigoQr: 'ACT-2026-0003',
      nombre: 'Switch Cisco Catalyst',
      modelo: 'Catalyst 9200',
      numeroSerie: 'CSC-554433',
      categoria: CategoriaActivo.REDES,
      ubicacion: 'Sala de Servidores',
      estado: EstadoActivo.OPERATIVO,
      fechaRegistro: new Date('2026-03-15'),
    },
  ];

  constructor(private readonly prisma: PrismaService) {}

  async crearMantenimiento(dto: CrearMantenimientoDto) {
    const fechaProgramada = new Date(dto.fecha_programada);
    const ahora = new Date();
    
    if (fechaProgramada < ahora) {
      throw new BadRequestException('No se puede agendar un mantenimiento con fecha en el pasado.');
    }

    const activoExiste = await this.prisma.activo.findUnique({
      where: { id: dto.id_activo },
    });

    if (!activoExiste) {
      throw new NotFoundException(`No existe un activo con el ID ${dto.id_activo} en la base de datos.`);
    }

    const nuevoMantenimiento = await this.prisma.mantenimiento.create({
      data: {
        id_activo: dto.id_activo,
        fecha_programada: new Date(dto.fecha_programada),
        descripcion: dto.descripcion,
        tipo: dto.tipo,
        estado: dto.estado || 'Pendiente',
      },
    });

    return {
      valido: true,
      mensaje: 'Mantenimiento agendado exitosamente en base de datos',
      datos: nuevoMantenimiento,
    };
  }

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

    let activo: Activo | null = null;

    try {
      if (this.prisma?.activo) {
        const dbActivo = await this.prisma.activo.findFirst({
          where: {
            OR: [
              { codigoQr: { equals: codigoBuscado, mode: 'insensitive' } },
              { id: codigoBuscado.toLowerCase() },
            ],
          },
        });
        if (dbActivo) {
          activo = dbActivo as unknown as Activo;
        }
      }
    } catch {
      // Fallback a memoria si la base de datos no está disponible
    }

    if (!activo) {
      activo = this.activosEnMemoria.find(
        (item) => item.codigoQr.toUpperCase() === codigoBuscado || item.id === codigoBuscado.toLowerCase(),
      ) || null;
    }

    if (!activo) {
      return {
        valido: false,
        mensaje: `No se encontró ningún activo registrado con el código '${codigoBuscado}'.`,
        permiteReportarIncidencia: false,
      };
    }

    if (String(activo.estado) === EstadoActivo.DADO_DE_BAJA) {
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
    try {
      if (this.prisma?.activo) {
        const dbActivo = await this.prisma.activo.findUnique({ where: { id } });
        if (dbActivo) return dbActivo as unknown as Activo;
      }
    } catch {
      // Fallback a memoria
    }
    return this.activosEnMemoria.find((item) => item.id === id) || null;
  }

  async listarTodos(): Promise<Activo[]> {
    try {
      if (this.prisma?.activo) {
        const activosDb = await this.prisma.activo.findMany({
          orderBy: { fechaRegistro: 'desc' },
        });
        if (activosDb.length > 0) {
          return activosDb as unknown as Activo[];
        }
      }
    } catch {
      // Fallback a memoria
    }
    return [...this.activosEnMemoria];
  }

  async obtenerEstadisticas(filtros?: FiltroEstadisticasDto): Promise<RespuestaEstadisticas> {
    const filtrosSanitizados = ValidarFiltroEstadisticasDto.sanitizar(filtros);

    let activosTotales: Activo[] = [];

    try {
      if (this.prisma?.activo) {
        const dbActivos = await this.prisma.activo.findMany();
        if (dbActivos.length > 0) {
          activosTotales = dbActivos as unknown as Activo[];
        }
      }
    } catch {
      // Fallback a memoria
    }

    if (activosTotales.length === 0) {
      activosTotales = this.activosEnMemoria;
    }

    let activosFiltrados = activosTotales;

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
      const estadoNorm = String(activo.estado).toUpperCase();
      switch (estadoNorm) {
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
        default:
          operativos++;
          break;
      }

      const catKey = String(activo.categoria);
      porCategoria[catKey] = (porCategoria[catKey] || 0) + 1;

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
