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
import {
  EventoTrazabilidad,
  RespuestaTrazabilidadActivo,
} from './interfaces/trazabilidad.interface';
import { ValidarQrDto } from './dto/validar-qr.dto';
import { ValidarFiltroEstadisticasDto } from './dto/filtrar-estadisticas.dto';
import { TrazabilidadQueryDto } from './dto/trazabilidad-query.dto';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { firstValueFrom } from 'rxjs';
import { randomUUID } from 'node:crypto';
import { PrismaService } from './prisma.service';
import { CrearMantenimientoDto } from './dto/crear-mantenimiento.dto';

const SEMILLAS_ACTIVOS_BASE: Activo[] = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    codigoQr: 'ACT-2026-0001',
    nombre: 'Proyector Láser Epson PowerLite',
    categoria: CategoriaActivo.AUDIOVISUAL,
    modelo: 'PowerLite L520U',
    numeroSerie: 'SN-EPS-9921',
    ubicacion: 'Edificio A - Auditorio Principal',
    estado: EstadoActivo.OPERATIVO,
    fechaRegistro: '2024-03-15T09:00:00.000Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    codigoQr: 'ACT-2026-0002',
    nombre: 'Computador Docente All-in-One Dell',
    categoria: CategoriaActivo.COMPUTO,
    modelo: 'OptiPlex 7490',
    numeroSerie: 'SN-DELL-4412',
    ubicacion: 'Edificio B - Laboratorio 302',
    estado: EstadoActivo.EN_MANTENIMIENTO,
    fechaRegistro: '2026-03-10T10:00:00.000Z',
  },
  {
    id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    codigoQr: 'ACT-2026-0003',
    nombre: 'Estación de Trabajo Desincorporada',
    categoria: CategoriaActivo.COMPUTO,
    modelo: 'Precision 3640',
    numeroSerie: 'SN-DELL-OLD-01',
    ubicacion: 'Edificio B - Rack Principal Piso 2',
    estado: EstadoActivo.DADO_DE_BAJA,
    fechaRegistro: '2023-01-10T08:00:00.000Z',
  },
  {
    id: 'SW-CORE-01',
    codigoQr: 'SW-CORE-01',
    nombre: 'Switch de Distribución Cisco Catalyst 9300',
    categoria: CategoriaActivo.REDES,
    modelo: 'Catalyst 9300 48P PoE+',
    numeroSerie: 'SN-CSCO-9300-998',
    ubicacion: 'Edificio A - Data Center',
    estado: EstadoActivo.EN_REVISION,
    fechaRegistro: '2024-08-10T12:00:00.000Z',
  },
  {
    id: 'UPS-APC-01',
    codigoQr: 'UPS-APC-01',
    nombre: 'UPS APC Smart-UPS RT 5000VA',
    categoria: CategoriaActivo.ELECTRICO,
    modelo: 'SURTD5000XLI',
    numeroSerie: 'SN-APC-5000-88',
    ubicacion: 'Edificio Central - Sala de Profesores',
    estado: EstadoActivo.OPERATIVO,
    fechaRegistro: '2025-05-18T10:30:00.000Z',
  },
  {
    id: 'PANT-TOUCH-01',
    codigoQr: 'PANT-TOUCH-01',
    nombre: 'Pantalla Interactiva Touch Samsung Flip 2',
    categoria: CategoriaActivo.AUDIOVISUAL,
    modelo: 'WM65R',
    numeroSerie: 'SN-SAM-FLIP-65',
    ubicacion: 'Edificio Central - Sala de Innovación',
    estado: EstadoActivo.OPERATIVO,
    fechaRegistro: '2025-07-22T14:15:00.000Z',
  },
];

const HISTORIAL_TRAZABILIDAD_INICIAL: Record<string, EventoTrazabilidad[]> = {
  'ACT-2026-0001': [
    {
      id: 'TRZ-006',
      fecha: '2026-09-28T14:30:00.000Z',
      tipo: 'resolucion',
      tipoLabel: 'Resolución de Falla',
      titulo: 'Cierre de Orden de Trabajo y Certificación Técnica',
      descripcion: 'Finalización de pruebas operativas de proyección continua. Temperaturas normalizadas y ventilación despejada. Equipo devuelto al estado Operativo.',
      estadoAnterior: 'EN_MANTENIMIENTO',
      estadoNuevo: 'OPERATIVO',
      responsable: {
        nombre: 'Carlos Ruiz',
        rol: 'Técnico',
        avatar: 'CR',
      },
      detalles: {
        id_incidencia: 'INC-1042',
        id_orden: 'ORD-2026-001',
        prioridad: 'Alta',
        estado_orden: 'Completada',
        diagnostico_tecnico: 'Filtro de aire desbloqueado y disipador de calor limpiado. Pruebas de encendido prolongado sin alarmas.',
        fecha_asignacion: '2026-09-28T10:30:00.000Z',
        fecha_inicio: '2026-09-28T11:00:00.000Z',
        fecha_termino: '2026-09-28T14:30:00.000Z',
        url_evidencia: 'https://res.cloudinary.com/infra/image/upload/v1/evidencias/proyector_operativo_4k.jpg',
      },
    },
    {
      id: 'TRZ-005',
      fecha: '2026-09-28T11:00:00.000Z',
      tipo: 'mantenimiento',
      tipoLabel: 'Orden de Trabajo Iniciada',
      titulo: 'Inicio de Intervención Técnica en Terreno',
      descripcion: 'Técnico asignado inicia revisión física del equipo. Desmontaje preventivo del chasis y verificación de conductos de ventilación.',
      estadoAnterior: 'DADO_DE_BAJA',
      estadoNuevo: 'EN_MANTENIMIENTO',
      responsable: {
        nombre: 'Carlos Ruiz',
        rol: 'Técnico',
        avatar: 'CR',
      },
      detalles: {
        id_orden: 'ORD-2026-001',
        id_incidencia: 'INC-1042',
        prioridad: 'Alta',
        estado_orden: 'EnProceso',
        instrucciones: 'Revisar inmediatamente el puerto de fibra óptica principal y la ventilación del chasis.',
        diagnostico_tecnico: 'Obstrucción del flujo de aire por acumulación de partículas en la rejilla de admisión.',
        fecha_asignacion: '2026-09-28T10:30:00.000Z',
        fecha_inicio: '2026-09-28T11:00:00.000Z',
        fecha_termino: null,
      },
    },
    {
      id: 'TRZ-004',
      fecha: '2026-09-27T18:20:00.000Z',
      tipo: 'fallo',
      tipoLabel: 'Avería / Incidencia Reportada',
      titulo: 'Incidencia Registrada: Falla en Proyección y Sobrecalentamiento',
      descripcion: 'El proyector se apagó intempestivamente durante una sesión en el Auditorio Principal, mostrando alerta de sobrecalentamiento en panel frontal.',
      estadoAnterior: 'OPERATIVO',
      estadoNuevo: 'EN_REVISION',
      responsable: {
        nombre: 'Roberto Gómez',
        rol: 'Docente / Reportante',
        avatar: 'RG',
      },
      detalles: {
        id_incidencia: 'INC-1042',
        prioridad: 'Alta',
        estado_incidencia: 'Reportada',
        fecha_creacion: '2026-09-27T18:20:00.000Z',
        url_evidencia: 'https://res.cloudinary.com/infra/image/upload/v1/evidencias/proyector_panel_led.jpg',
      },
    },
    {
      id: 'TRZ-003',
      fecha: '2026-06-12T11:00:00.000Z',
      tipo: 'resolucion',
      tipoLabel: 'Resolución de Falla',
      titulo: 'Mantenimiento Preventivo Semestral Completado',
      descripcion: 'Conclusión de orden de trabajo rutinaria. Limpieza óptica y verificación de parámetros de red HDBaseT.',
      estadoAnterior: 'EN_MANTENIMIENTO',
      estadoNuevo: 'OPERATIVO',
      responsable: {
        nombre: 'Valentina Morales',
        rol: 'Técnico',
        avatar: 'VM',
      },
      detalles: {
        id_orden: 'ORD-2026-022',
        prioridad: 'Baja',
        estado_orden: 'Completada',
        diagnostico_tecnico: 'Mantenimiento preventivo semestral realizado conforme a pauta técnica.',
        fecha_asignacion: '2026-06-11T14:00:00.000Z',
        fecha_inicio: '2026-06-12T09:00:00.000Z',
        fecha_termino: '2026-06-12T11:00:00.000Z',
      },
    },
    {
      id: 'TRZ-002',
      fecha: '2026-06-11T14:00:00.000Z',
      tipo: 'mantenimiento',
      tipoLabel: 'Orden de Trabajo Asignada',
      titulo: 'Asignación de Mantenimiento Preventivo Semestral',
      descripcion: 'Emisión de orden de trabajo preventiva para revisión de filtros y calibración óptica periódica.',
      estadoAnterior: 'OPERATIVO',
      estadoNuevo: 'EN_MANTENIMIENTO',
      responsable: {
        nombre: 'Supervisor de Infraestructura',
        rol: 'Supervisor',
        avatar: 'SUP',
      },
      detalles: {
        id_orden: 'ORD-2026-022',
        prioridad: 'Baja',
        estado_orden: 'Pendiente',
        instrucciones: 'Realizar calibración óptica, limpieza de filtro y verificación de firmware.',
        fecha_asignacion: '2026-06-11T14:00:00.000Z',
        fecha_inicio: null,
        fecha_termino: null,
      },
    },
    {
      id: 'TRZ-001',
      fecha: '2024-03-15T09:00:00.000Z',
      tipo: 'adquisicion',
      tipoLabel: 'Alta de Activo',
      titulo: 'Registro e Incorporación al Inventario',
      descripcion: 'Registro inicial del activo en el sistema con código QR ACT-2026-0001 e instalación física en Edificio A - Auditorio Principal.',
      estadoAnterior: null,
      estadoNuevo: 'OPERATIVO',
      responsable: {
        nombre: 'Mesa de Inventario TI',
        rol: 'Operador',
        avatar: 'TI',
      },
      detalles: {
        id_activo: 'ACT-2026-0001',
        codigo_qr: 'ACT-2026-0001',
        categoria: 'AUDIOVISUAL',
        ubicacion: 'Edificio A - Auditorio Principal',
        fecha_registro: '2024-03-15T09:00:00.000Z',
      },
    },
  ],
  'ACT-2026-0002': [
    {
      id: 'TRZ-402',
      fecha: '2026-09-27T16:45:00.000Z',
      tipo: 'mantenimiento',
      tipoLabel: 'Orden de Trabajo en Proceso',
      titulo: 'Diagnóstico en Taller Técnico',
      descripcion: 'Revisión en taller técnico por problemas en arranque del sistema operativo.',
      estadoAnterior: 'EN_REVISION',
      estadoNuevo: 'EN_MANTENIMIENTO',
      responsable: {
        nombre: 'Ana Gómez',
        rol: 'Técnico',
        avatar: 'AG',
      },
      detalles: {
        id_orden: 'ORD-2026-002',
        id_incidencia: 'INC-1041',
        prioridad: 'Media',
        estado_orden: 'EnProceso',
        instrucciones: 'Actualizar paquetes y verificar estado del almacenamiento.',
        diagnostico_tecnico: 'Sectores del disco en proceso de diagnóstico y reinstalación de imagen.',
        fecha_asignacion: '2026-09-27T08:15:00.000Z',
        fecha_inicio: '2026-09-27T16:45:00.000Z',
        fecha_termino: null,
      },
    },
    {
      id: 'TRZ-401',
      fecha: '2026-09-27T08:15:00.000Z',
      tipo: 'fallo',
      tipoLabel: 'Avería / Incidencia Reportada',
      titulo: 'Incidencia Registrada: Falla en Inicio de Sesión',
      descripcion: 'Equipo docente no inicia correctamente el sistema operativo en Laboratorio 302.',
      estadoAnterior: 'OPERATIVO',
      estadoNuevo: 'EN_REVISION',
      responsable: {
        nombre: 'Ana Gómez',
        rol: 'Operador',
        avatar: 'AG',
      },
      detalles: {
        id_incidencia: 'INC-1041',
        prioridad: 'Media',
        estado_incidencia: 'Reportada',
        fecha_creacion: '2026-09-27T08:15:00.000Z',
      },
    },
    {
      id: 'TRZ-400',
      fecha: '2026-03-10T10:00:00.000Z',
      tipo: 'adquisicion',
      tipoLabel: 'Alta de Activo',
      titulo: 'Registro e Incorporación al Inventario',
      descripcion: 'Equipo registrado y destinado a docencia en Edificio B - Laboratorio 302.',
      estadoAnterior: null,
      estadoNuevo: 'OPERATIVO',
      responsable: {
        nombre: 'Administrador TI',
        rol: 'Administrador',
        avatar: 'ADM',
      },
      detalles: {
        id_activo: 'ACT-2026-0002',
        codigo_qr: 'ACT-2026-0002',
        categoria: 'COMPUTO',
        ubicacion: 'Edificio B - Laboratorio 302',
        fecha_registro: '2026-03-10T10:00:00.000Z',
      },
    },
  ],
  'ACT-2026-0003': [
    {
      id: 'TRZ-502',
      fecha: '2026-08-15T10:00:00.000Z',
      tipo: 'resolucion',
      tipoLabel: 'Baja Definitiva de Activo',
      titulo: 'Desincorporación Técnica de Inventario',
      descripcion: 'Equipo declarado obsoleto por fin de ciclo útil. Desincorporado y dado de baja formalmente.',
      estadoAnterior: 'EN_REVISION',
      estadoNuevo: 'DADO_DE_BAJA',
      responsable: {
        nombre: 'Comité de Inventario',
        rol: 'Supervisor',
        avatar: 'CI',
      },
    },
    {
      id: 'TRZ-501',
      fecha: '2026-08-01T09:00:00.000Z',
      tipo: 'fallo',
      tipoLabel: 'Falla Crítica de Tarjeta Madre',
      titulo: 'Daño irreversible en placa principal',
      descripcion: 'Sobrevoltaje causó daño total en componentes de alimentación de la placa.',
      estadoAnterior: 'OPERATIVO',
      estadoNuevo: 'EN_REVISION',
      responsable: {
        nombre: 'Técnico de Soporte',
        rol: 'Técnico',
        avatar: 'TS',
      },
    },
    {
      id: 'TRZ-500',
      fecha: '2023-01-10T08:00:00.000Z',
      tipo: 'adquisicion',
      tipoLabel: 'Alta de Activo',
      titulo: 'Registro e Incorporación al Inventario',
      descripcion: 'Ingreso al inventario de estación de trabajo para el área técnica.',
      estadoAnterior: null,
      estadoNuevo: 'OPERATIVO',
      responsable: {
        nombre: 'Administrador TI',
        rol: 'Administrador',
        avatar: 'ADM',
      },
    },
  ],
  'SW-CORE-01': [
    {
      id: 'TRZ-303',
      fecha: '2026-09-27T11:45:00.000Z',
      tipo: 'resolucion',
      tipoLabel: 'Resolución de Falla',
      titulo: 'Cierre de Orden: Módulo Óptico SFP Reemplazado',
      descripcion: 'Sustitución de transceptor de fibra óptica en puerto de enlace ascendente. Tráfico de red reestablecido sin pérdidas de paquetes.',
      estadoAnterior: 'EN_MANTENIMIENTO',
      estadoNuevo: 'OPERATIVO',
      responsable: {
        nombre: 'Carlos Ruiz',
        rol: 'Técnico',
        avatar: 'CR',
      },
      detalles: {
        id_incidencia: 'INC-1038',
        id_orden: 'ORD-2026-003',
        prioridad: 'Alta',
        estado_orden: 'Completada',
        diagnostico_tecnico: 'Transceptor SFP defectuoso sustituido. Enlace troncal operando al 100%.',
        fecha_asignacion: '2026-09-27T08:30:00.000Z',
        fecha_inicio: '2026-09-27T09:00:00.000Z',
        fecha_termino: '2026-09-27T11:45:00.000Z',
      },
    },
    {
      id: 'TRZ-302',
      fecha: '2026-09-27T08:10:00.000Z',
      tipo: 'fallo',
      tipoLabel: 'Avería / Incidencia Reportada',
      titulo: 'Incidencia Registrada: Caída Intermitente de Enlace de Fibra',
      descripcion: 'Pérdida de conectividad intermitente hacia switches de distribución del Edificio Central.',
      estadoAnterior: 'OPERATIVO',
      estadoNuevo: 'EN_REVISION',
      responsable: {
        nombre: 'Diego Herrera',
        rol: 'Operador',
        avatar: 'DH',
      },
      detalles: {
        id_incidencia: 'INC-1038',
        prioridad: 'Alta',
        estado_incidencia: 'Reportada',
        fecha_creacion: '2026-09-27T08:10:00.000Z',
      },
    },
    {
      id: 'TRZ-301',
      fecha: '2024-08-10T12:00:00.000Z',
      tipo: 'adquisicion',
      tipoLabel: 'Alta de Activo',
      titulo: 'Registro e Incorporación al Inventario',
      descripcion: 'Puesta en marcha de switch de distribución principal para enlaces troncales del campus.',
      estadoAnterior: null,
      estadoNuevo: 'OPERATIVO',
      responsable: {
        nombre: 'Diego Herrera',
        rol: 'Operador',
        avatar: 'DH',
      },
      detalles: {
        id_activo: 'SW-CORE-01',
        codigo_qr: 'SW-CORE-01',
        categoria: 'REDES',
        ubicacion: 'Edificio Central - Sala de Comunicaciones 1',
        fecha_registro: '2024-08-10T12:00:00.000Z',
      },
    },
  ],
};

@Injectable()
export class ActivosService {

  private activosEnMemoria: Activo[] = [...SEMILLAS_ACTIVOS_BASE];
  private eventosTrazabilidad: Record<string, EventoTrazabilidad[]> = { ...HISTORIAL_TRAZABILIDAD_INICIAL };

  private crearSemillaMantenimiento(
    id: string,
    idActivo: string,
    fechaProgramadaIso: string,
    nombre: string,
    codigoQr: string,
    ubicacion: string,
    categoria: string,
  ) {
    return {
      id,
      id_mantenimiento: id,
      id_activo: idActivo,
      fecha_programada: new Date(fechaProgramadaIso),
      fecha_creacion: new Date('2026-10-01T10:00:00.000Z'),
      activo: { id: idActivo, nombre, codigoQr, ubicacion, categoria },
    };
  }

  private mantenimientosEnMemoria: any[] = [
    this.crearSemillaMantenimiento('mant-001', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-10-15T10:00:00.000Z', 'Proyector Láser Epson PowerLite', 'ACT-2026-0001', 'Edificio A - Auditorio Principal', 'AUDIOVISUAL'),
    this.crearSemillaMantenimiento('mant-002', '550e8400-e29b-41d4-a716-446655440000', '2026-10-20T14:30:00.000Z', 'Computador Docente All-in-One Dell', 'ACT-2026-0002', 'Edificio B - Laboratorio 302', 'COMPUTO'),
    this.crearSemillaMantenimiento('mant-003', '3fa85f64-5717-4562-b3fc-2c963f66afa6', '2026-10-28T09:00:00.000Z', 'Estación de Trabajo Desincorporada', 'ACT-2026-0003', 'Edificio B - Rack Principal Piso 2', 'COMPUTO'),
    this.crearSemillaMantenimiento('mant-004', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', '2026-11-05T11:00:00.000Z', 'Proyector Láser Epson PowerLite', 'ACT-2026-0001', 'Edificio A - Auditorio Principal', 'AUDIOVISUAL'),
    this.crearSemillaMantenimiento('mant-005', 'SW-CORE-01', '2026-11-12T16:00:00.000Z', 'Switch de Distribución Cisco Catalyst 9300', 'SW-CORE-01', 'Edificio Central - Sala de Comunicaciones 1', 'REDES'),
  ];

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly httpService?: HttpService,
    @Optional() private readonly jwtService?: JwtService,
  ) {}

  private obtenerEndpointIncidencias(): string {
    const rawBase = (process.env.MS_INCIDENCIAS_URL || 'http://localhost:3002')
      .trim()
      .replace(/\/+$/, '');
    if (rawBase.endsWith('/incidencias')) {
      return rawBase;
    }
    if (rawBase.endsWith('/api/v1')) {
      return `${rawBase}/incidencias`;
    }
    return `${rawBase}/api/v1/incidencias`;
  }

  private async obtenerIncidenciasRealesDeActivo(idActivo: string): Promise<any[]> {
    if (
      !this.httpService ||
      !this.jwtService ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idActivo)
    ) {
      return [];
    }

    try {
      const token = this.jwtService.sign(
        {
          sub: '00000000-0000-4000-8000-000000000001',
          email: 'trazabilidad-activos@uct.cl',
          rol: 'SUPERVISOR',
          permissions: ['incidencias:ver'],
        },
        { expiresIn: '2m' },
      );
      const url = `${this.obtenerEndpointIncidencias()}?id_activo=${encodeURIComponent(idActivo)}&limite=50`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 3500,
        }),
      );
      const data = response?.data?.datos || response?.data?.data || response?.data;
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async listarMantenimientos(filtros?: { startDate?: string; endDate?: string; id_activo?: string }) {
    let fechaInicio: Date | undefined;
    let fechaFin: Date | undefined;

    if (filtros?.startDate) {
      fechaInicio = new Date(filtros.startDate);
      if (Number.isNaN(fechaInicio.getTime())) {
        throw new BadRequestException('Formato de fecha de inicio inválido. Use ISO o YYYY-MM-DD.');
      }
      if (filtros.startDate.length === 10) {
        fechaInicio.setUTCHours(0, 0, 0, 0);
      }
    }

    if (filtros?.endDate) {
      fechaFin = new Date(filtros.endDate);
      if (Number.isNaN(fechaFin.getTime())) {
        throw new BadRequestException('Formato de fecha de fin inválido. Use ISO o YYYY-MM-DD.');
      }
      if (filtros.endDate.length === 10) {
        fechaFin.setUTCHours(23, 59, 59, 999);
      }
    }

    if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
      throw new BadRequestException('La fecha de inicio no puede ser posterior a la fecha de fin.');
    }

    try {
      if (this.prisma?.mantenimiento) {
        const where: any = {};
        if (filtros?.id_activo) {
          where.id_activo = filtros.id_activo;
        }
        if (fechaInicio || fechaFin) {
          where.fecha_programada = {};
          if (fechaInicio) where.fecha_programada.gte = fechaInicio;
          if (fechaFin) where.fecha_programada.lte = fechaFin;
        }

        const dbMantenimientos = await this.prisma.mantenimiento.findMany({
          where,
          include: {
            activo: {
              select: {
                id: true,
                nombre: true,
                codigoQr: true,
                ubicacion: true,
                categoria: true,
                estado: true,
              },
            },
          },
          orderBy: { fecha_programada: 'asc' },
          take: 50,
        });

        if (dbMantenimientos && dbMantenimientos.length > 0) {
          return {
            valido: true,
            mensaje: 'Mantenimientos obtenidos exitosamente desde base de datos',
            total: dbMantenimientos.length,
            filtrosAplicados: {
              startDate: filtros?.startDate || null,
              endDate: filtros?.endDate || null,
              id_activo: filtros?.id_activo || null,
            },
            datos: dbMantenimientos,
          };
        }
      }
    } catch {
      // Fallback transparente a memoria
    }

    let mantenimientos = [...this.mantenimientosEnMemoria];

    if (filtros?.id_activo) {
      mantenimientos = mantenimientos.filter((m) => m.id_activo === filtros.id_activo);
    }

    if (fechaInicio) {
      mantenimientos = mantenimientos.filter((m) => new Date(m.fecha_programada) >= fechaInicio!);
    }

    if (fechaFin) {
      mantenimientos = mantenimientos.filter((m) => new Date(m.fecha_programada) <= fechaFin!);
    }

    mantenimientos.sort((a, b) => new Date(a.fecha_programada).getTime() - new Date(b.fecha_programada).getTime());

    return {
      valido: true,
      mensaje: 'Mantenimientos obtenidos exitosamente',
      total: mantenimientos.length,
      filtrosAplicados: {
        startDate: filtros?.startDate || null,
        endDate: filtros?.endDate || null,
        id_activo: filtros?.id_activo || null,
      },
      datos: mantenimientos,
    };
  }

  async crearMantenimiento(dto: CrearMantenimientoDto) {
    const fechaProgramada = new Date(dto.fecha_programada);
    const ahora = new Date();

    if (fechaProgramada < ahora) {
      throw new BadRequestException('No se puede agendar un mantenimiento con fecha en el pasado.');
    }

    let activoExiste: any = null;
    try {
      if (this.prisma?.activo) {
        activoExiste = await this.prisma.activo.findUnique({
          where: { id: dto.id_activo },
        });
      }
    } catch {
      // Fallback
    }

    if (!activoExiste) {
      activoExiste = this.activosEnMemoria.find(
        (a) => a.id === dto.id_activo || a.codigoQr === dto.id_activo,
      );
    }

    if (!activoExiste) {
      throw new NotFoundException(`No existe un activo con el ID ${dto.id_activo} en el sistema.`);
    }

    let nuevoMantenimiento: any = null;
    try {
      if (this.prisma?.mantenimiento) {
        nuevoMantenimiento = await this.prisma.mantenimiento.create({
          data: {
            id_activo: dto.id_activo,
            fecha_programada: new Date(dto.fecha_programada),



          },
        });
      }
    } catch {
      // Fallback
    }

    if (!nuevoMantenimiento) {
      const idGenerado = `mant-${Date.now()}`;
      nuevoMantenimiento = {
        id: idGenerado,
        id_mantenimiento: idGenerado,
        id_activo: dto.id_activo,
        fecha_programada: new Date(dto.fecha_programada),
        fecha_creacion: new Date(),
        activo: {
          id: activoExiste.id,
          nombre: activoExiste.nombre,
          codigoQr: activoExiste.codigoQr,
          ubicacion: activoExiste.ubicacion,
          categoria: activoExiste.categoria,
          estado: activoExiste.estado,
        },
      };
      this.mantenimientosEnMemoria.push(nuevoMantenimiento);
    }

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
              { numeroSerie: { equals: codigoBuscado, mode: 'insensitive' } },
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
        (item) => item.codigoQr.toUpperCase() === codigoBuscado || item.id === codigoBuscado.toLowerCase() || item.numeroSerie?.toUpperCase() === codigoBuscado,
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

  async listarTodos(query?: { page?: number; limit?: number; busqueda?: string }): Promise<Activo[]> {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(query?.limit) || 50));
    const skip = (page - 1) * limit;
    const termino = query?.busqueda?.trim();

    try {
      if (this.prisma?.activo) {
        const where = termino
          ? {
              OR: [
                { nombre: { contains: termino, mode: 'insensitive' as const } },
                { codigoQr: { contains: termino, mode: 'insensitive' as const } },
                { numeroSerie: { contains: termino, mode: 'insensitive' as const } },
                { ubicacion: { contains: termino, mode: 'insensitive' as const } },
                { modelo: { contains: termino, mode: 'insensitive' as const } },
              ],
            }
          : undefined;
        const activosDb = await this.prisma.activo.findMany({
          where,
          orderBy: { fechaRegistro: 'desc' },
          skip,
          take: limit,
        });
        if (activosDb.length > 0 || termino) {
          return activosDb as unknown as Activo[];
        }
      }
    } catch {
      // Fallback a memoria
    }

    let lista = this.activosEnMemoria;
    if (termino) {
      const txt = termino.toLowerCase();
      lista = lista.filter(
        (a) =>
          a.nombre.toLowerCase().includes(txt) ||
          a.codigoQr.toLowerCase().includes(txt) ||
          (a.numeroSerie || '').toLowerCase().includes(txt) ||
          a.ubicacion.toLowerCase().includes(txt),
      );
    }
    return lista.slice(skip, skip + limit);
  }

  async contarTotalActivos(busqueda?: string): Promise<number> {
    const termino = busqueda?.trim();
    try {
      if (this.prisma?.activo) {
        const where = termino
          ? {
              OR: [
                { nombre: { contains: termino, mode: 'insensitive' as const } },
                { codigoQr: { contains: termino, mode: 'insensitive' as const } },
                { numeroSerie: { contains: termino, mode: 'insensitive' as const } },
                { ubicacion: { contains: termino, mode: 'insensitive' as const } },
                { modelo: { contains: termino, mode: 'insensitive' as const } },
              ],
            }
          : undefined;
        return await this.prisma.activo.count({ where });
      }
    } catch {
      // Fallback a memoria
    }
    if (!termino) return this.activosEnMemoria.length;
    const txt = termino.toLowerCase();
    return this.activosEnMemoria.filter(
      (a) =>
        a.nombre.toLowerCase().includes(txt) ||
        a.codigoQr.toLowerCase().includes(txt) ||
        (a.numeroSerie || '').toLowerCase().includes(txt) ||
        a.ubicacion.toLowerCase().includes(txt),
    ).length;
  }

  async crearActivo(payload: any): Promise<Activo> {
    const nombre = String(payload?.nombre || '').trim();
    const codigoQr = String(payload?.codigoQr || payload?.codigo_qr || '').trim().toUpperCase();
    const ubicacion = String(payload?.ubicacion || '').trim();
    const categoriaRaw = String(payload?.categoria || CategoriaActivo.OTRO).trim().toUpperCase();
    const estadoRaw = String(payload?.estado || EstadoActivo.OPERATIVO).trim().toUpperCase();
    const modelo = payload?.modelo ? String(payload.modelo).trim() : null;
    const numeroSerie = (payload?.numeroSerie ?? payload?.numero_serie)
      ? String(payload.numeroSerie ?? payload.numero_serie).trim()
      : null;

    if (!nombre || !codigoQr || !ubicacion) {
      throw new BadRequestException(
        'Los campos nombre, codigoQr y ubicacion son obligatorios para registrar un activo.',
      );
    }

    const categoriasValidas = Object.values(CategoriaActivo) as string[];
    const estadosValidos = Object.values(EstadoActivo) as string[];
    if (!categoriasValidas.includes(categoriaRaw)) {
      throw new BadRequestException(`Categoría inválida. Valores permitidos: ${categoriasValidas.join(', ')}`);
    }
    if (!estadosValidos.includes(estadoRaw)) {
      throw new BadRequestException(`Estado inválido. Valores permitidos: ${estadosValidos.join(', ')}`);
    }

    try {
      if (this.prisma?.activo?.findFirst && this.prisma?.activo?.create) {
        const existente = await this.prisma.activo.findFirst({
          where: { codigoQr: { equals: codigoQr, mode: 'insensitive' } },
        });
        if (existente) {
          throw new ConflictException(`Ya existe un activo registrado con el código QR '${codigoQr}'.`);
        }

        const creado = await this.prisma.activo.create({
          data: {
            id: randomUUID(),
            codigoQr,
            nombre,
            categoria: categoriaRaw as any,
            modelo,
            numeroSerie,
            ubicacion,
            estado: estadoRaw as any,
          },
        });
        return creado as unknown as Activo;
      }
    } catch (err) {
      if (err instanceof ConflictException || err instanceof BadRequestException) {
        throw err;
      }
    }

    const duplicadoMem = this.activosEnMemoria.find(
      (a) => a.codigoQr.toUpperCase() === codigoQr,
    );
    if (duplicadoMem) {
      throw new ConflictException(`Ya existe un activo registrado con el código QR '${codigoQr}'.`);
    }

    const nuevoMem: Activo = {
      id: randomUUID(),
      codigoQr,
      nombre,
      categoria: categoriaRaw as CategoriaActivo,
      modelo: modelo ?? undefined,
      numeroSerie: numeroSerie ?? undefined,
      ubicacion,
      estado: estadoRaw as EstadoActivo,
      fechaRegistro: new Date().toISOString(),
    };
    this.activosEnMemoria.unshift(nuevoMem);
    return nuevoMem;
  }

  async actualizarActivo(id: string, payload: any): Promise<Activo> {
    const actual = await this.obtenerPorId(id);
    if (!actual) {
      throw new NotFoundException(`No se encontró ningún activo con ID '${id}'.`);
    }

    const dataUpdate: Record<string, any> = {};
    if (payload?.nombre !== undefined) {
      const n = String(payload.nombre).trim();
      if (!n) throw new BadRequestException('El nombre del activo no puede quedar vacío.');
      dataUpdate.nombre = n;
    }
    if (payload?.codigoQr !== undefined || payload?.codigo_qr !== undefined) {
      const qr = String(payload.codigoQr ?? payload.codigo_qr).trim().toUpperCase();
      if (!qr) throw new BadRequestException('El código QR no puede quedar vacío.');
      dataUpdate.codigoQr = qr;
    }
    if (payload?.ubicacion !== undefined) {
      const u = String(payload.ubicacion).trim();
      if (!u) throw new BadRequestException('La ubicación no puede quedar vacía.');
      dataUpdate.ubicacion = u;
    }
    if (payload?.modelo !== undefined) {
      dataUpdate.modelo = payload.modelo ? String(payload.modelo).trim() : null;
    }
    if (payload?.numeroSerie !== undefined || payload?.numero_serie !== undefined) {
      const ns = payload.numeroSerie ?? payload.numero_serie;
      dataUpdate.numeroSerie = ns ? String(ns).trim() : null;
    }
    if (payload?.categoria !== undefined) {
      const cat = String(payload.categoria).trim().toUpperCase();
      if (!(Object.values(CategoriaActivo) as string[]).includes(cat)) {
        throw new BadRequestException('Categoría de activo no válida.');
      }
      dataUpdate.categoria = cat;
    }
    if (payload?.estado !== undefined) {
      const est = String(payload.estado).trim().toUpperCase();
      if (!(Object.values(EstadoActivo) as string[]).includes(est)) {
        throw new BadRequestException('Estado de activo no válido.');
      }
      dataUpdate.estado = est;
    }

    try {
      if (this.prisma?.activo?.update) {
        if (dataUpdate.codigoQr && dataUpdate.codigoQr !== actual.codigoQr) {
          const colision = await this.prisma.activo.findFirst({
            where: {
              codigoQr: { equals: dataUpdate.codigoQr, mode: 'insensitive' },
              NOT: { id: actual.id },
            },
          });
          if (colision) {
            throw new ConflictException(
              `El código QR '${dataUpdate.codigoQr}' ya está asignado a otro equipo.`,
            );
          }
        }
        const actualizado = await this.prisma.activo.update({
          where: { id: actual.id },
          data: dataUpdate,
        });
        return actualizado as unknown as Activo;
      }
    } catch (err) {
      if (err instanceof ConflictException || err instanceof BadRequestException) {
        throw err;
      }
    }

    const idx = this.activosEnMemoria.findIndex((a) => a.id === actual.id);
    const fusionado: Activo = {
      ...actual,
      ...dataUpdate,
    };
    if (idx >= 0) {
      this.activosEnMemoria[idx] = fusionado;
    }
    return fusionado;
  }

  async darDeBajaActivo(id: string): Promise<Activo> {
    return this.actualizarActivo(id, { estado: EstadoActivo.DADO_DE_BAJA });
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

  /**
   * TAL-13: Obtener trazabilidad e historial del ciclo de vida del activo
   * Permite consultar tanto por UUID como por código QR, con filtros y paginación.
   */
  async obtenerTrazabilidad(
    idOQr: string,
    query?: TrazabilidadQueryDto,
  ): Promise<RespuestaTrazabilidadActivo> {
    if (!idOQr || typeof idOQr !== 'string' || !idOQr.trim()) {
      throw new BadRequestException('El identificador o código QR del activo es obligatorio.');
    }

    const idNormalizado = idOQr.trim();
    const { page, limit, tipoFiltro } = TrazabilidadQueryDto.sanitizar(query);

    let activoEncontrado: Activo | null = null;
    let mantenimientosPrisma: any[] = [];

    // 1. Intento de búsqueda en base de datos PostgreSQL mediante Prisma
    try {
      if (this.prisma?.activo?.findFirst) {
        const activoPrisma = await this.prisma.activo.findFirst({
          where: {
            OR: [
              { id: idNormalizado },
              { codigoQr: { equals: idNormalizado, mode: 'insensitive' } },
            ],
          },
          include: {
            mantenimientos: true,
          },
        });

        if (activoPrisma) {
          activoEncontrado = {
            id: activoPrisma.id,
            codigoQr: activoPrisma.codigoQr,
            nombre: activoPrisma.nombre,
            categoria: activoPrisma.categoria as unknown as CategoriaActivo,
            modelo: activoPrisma.modelo ?? undefined,
            numeroSerie: activoPrisma.numeroSerie ?? undefined,
            ubicacion: activoPrisma.ubicacion,
            estado: activoPrisma.estado as unknown as EstadoActivo,
            fechaRegistro: activoPrisma.fechaRegistro,
          };
          mantenimientosPrisma = activoPrisma.mantenimientos || [];
        }
      }
    } catch {
      // Prisma no conectado o fallo de red; fallback al almacén en memoria
    }

    // 2. Fallback al conjunto de activos en memoria
    if (!activoEncontrado) {
      const normalizadoUpper = idNormalizado.toUpperCase();
      activoEncontrado =
        this.activosEnMemoria.find(
          (item) =>
            item.codigoQr.toUpperCase() === normalizadoUpper ||
            item.id.toUpperCase() === normalizadoUpper,
        ) || null;
    }

    // 3. Si no existe en ningún origen de datos, se arroja 404 Not Found
    if (!activoEncontrado) {
      throw new NotFoundException(
        `No se encontró ningún activo con el identificador o código '${idNormalizado}'.`,
      );
    }

    // 4. Obtener o sintetizar eventos de trazabilidad del activo
    const claveRegistro =
      Object.keys(this.eventosTrazabilidad).find(
        (k) =>
          k.toUpperCase() === activoEncontrado!.codigoQr.toUpperCase() ||
          k.toUpperCase() === activoEncontrado!.id.toUpperCase(),
      ) || activoEncontrado.codigoQr;

    let todosLosEventos: EventoTrazabilidad[] = this.eventosTrazabilidad[claveRegistro]
      ? [...this.eventosTrazabilidad[claveRegistro]]
      : [];

    // Si existen mantenimientos en Prisma, se mapean a eventos si no estaban registrados
    if (mantenimientosPrisma.length > 0) {
      for (const m of mantenimientosPrisma) {
        const idMant = String(m.id_mantenimiento || m.id || '');
        const existeEvento = todosLosEventos.some((e) => e.detalles?.id_mantenimiento === idMant);
        if (!existeEvento && idMant) {
          todosLosEventos.push({
            id: `MNT-${idMant.substring(0, 8)}`,
            fecha: new Date(m.fecha_programada).toISOString(),
            tipo: 'mantenimiento',
            tipoLabel: 'Mantenimiento Preventivo Programado',
            titulo: 'Mantenimiento Preventivo Programado',
            descripcion: `Mantenimiento preventivo programado en cronograma (Ref: ${idMant.substring(0, 8)}).`,
            estadoAnterior: EstadoActivo.EN_REVISION,
            estadoNuevo: EstadoActivo.EN_MANTENIMIENTO,
            responsable: {
              nombre: 'Área de Mantenimiento',
              rol: 'Técnico',
              avatar: 'MNT',
            },
            detalles: {
              id_mantenimiento: idMant,
              fecha_programada: new Date(m.fecha_programada).toISOString(),
              fecha_creacion: m.fecha_creacion ? new Date(m.fecha_creacion).toISOString() : undefined,
            },
          });
        }
      }
    }

    // Integrar incidencias y órdenes de trabajo reales desde ms-incidencias (F-03)
    const incidenciasReales = await this.obtenerIncidenciasRealesDeActivo(activoEncontrado.id);
    for (const inc of incidenciasReales) {
      const idInc = String(inc.id_incidencia || inc.id || '');
      if (!idInc) continue;

      const estadoInc =
        (typeof inc.estado === 'object' ? inc.estado?.nombre_estado : inc.estado) || 'Reportada';
      const estadoNorm = String(estadoInc).toLowerCase();
      const ordenAsociada = inc.orden_trabajo || inc.ordenes_trabajo?.[0] || null;
      const nombreRep = inc.nombre_reportante || 'Usuario Reportante';
      const inicialesRep = nombreRep
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p: string) => p[0].toUpperCase())
        .join('') || 'REP';

      if (!todosLosEventos.some((e) => e.id === `INC-${idInc.substring(0, 8)}`)) {
        todosLosEventos.push({
          id: `INC-${idInc.substring(0, 8)}`,
          fecha: inc.fecha_creacion
            ? new Date(inc.fecha_creacion).toISOString()
            : new Date().toISOString(),
          tipo: 'fallo',
          tipoLabel: 'Avería / Incidencia Reportada',
          titulo: `Incidencia Registrada: ${inc.titulo || 'Reporte de falla'}`,
          descripcion: inc.descripcion || 'Falla reportada sobre el activo.',
          estadoAnterior: EstadoActivo.OPERATIVO,
          estadoNuevo: EstadoActivo.EN_REVISION,
          responsable: {
            nombre: nombreRep,
            rol: 'Reportante',
            avatar: inicialesRep,
          },
          detalles: {
            id_incidencia: idInc,
            prioridad: inc.prioridad || 'media',
            estado_incidencia: estadoInc,
            fecha_creacion: inc.fecha_creacion,
          },
        });
      }

      if (ordenAsociada) {
        const idOrden = String(ordenAsociada.id_orden || idInc);
        const nombreTec = ordenAsociada.nombre_tecnico || inc.nombre_tecnico || 'Técnico Asignado';
        const inicialesTec = nombreTec
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((p: string) => p[0].toUpperCase())
          .join('') || 'TEC';

        if (['resuelta', 'completada', 'cerrada', 'rechazada', 'rechazado'].includes(estadoNorm)) {
          const esRechazada = estadoNorm.startsWith('rechaz');
          const idEventoRes = `RES-${idOrden.substring(0, 8)}`;
          if (!todosLosEventos.some((e) => e.id === idEventoRes)) {
            todosLosEventos.push({
              id: idEventoRes,
              fecha: ordenAsociada.fecha_cierre
                ? new Date(ordenAsociada.fecha_cierre).toISOString()
                : new Date(ordenAsociada.fecha_creacion || inc.fecha_creacion).toISOString(),
              tipo: 'resolucion',
              tipoLabel: esRechazada ? 'Incidencia Desestimada' : 'Resolución de Falla',
              titulo: esRechazada
                ? `Incidencia Rechazada: ${inc.titulo}`
                : `Resolución Técnica: ${inc.titulo}`,
              descripcion:
                ordenAsociada.diagnostico_tecnico ||
                (esRechazada
                  ? 'Incidencia desestimada tras revisión técnica.'
                  : 'Intervención completada y activo operativo.'),
              estadoAnterior: EstadoActivo.EN_MANTENIMIENTO,
              estadoNuevo: EstadoActivo.OPERATIVO,
              responsable: {
                nombre: nombreTec,
                rol: 'Técnico',
                avatar: inicialesTec,
              },
              detalles: {
                id_incidencia: idInc,
                id_orden: idOrden,
                prioridad: inc.prioridad || 'media',
                estado_orden: estadoInc,
                diagnostico_tecnico: ordenAsociada.diagnostico_tecnico || undefined,
                fecha_asignacion: ordenAsociada.fecha_creacion,
                fecha_termino: ordenAsociada.fecha_cierre || null,
              },
            });
          }
        } else {
          const idEventoOrd = `ORD-${idOrden.substring(0, 8)}`;
          if (!todosLosEventos.some((e) => e.id === idEventoOrd)) {
            todosLosEventos.push({
              id: idEventoOrd,
              fecha: ordenAsociada.fecha_creacion
                ? new Date(ordenAsociada.fecha_creacion).toISOString()
                : new Date().toISOString(),
              tipo: 'mantenimiento',
              tipoLabel: 'Orden de Trabajo Asignada',
              titulo: `Orden de Trabajo en Atención: ${inc.titulo}`,
              descripcion:
                ordenAsociada.diagnostico_tecnico ||
                `Orden asignada a ${nombreTec} para diagnóstico e intervención.`,
              estadoAnterior: EstadoActivo.EN_REVISION,
              estadoNuevo: EstadoActivo.EN_MANTENIMIENTO,
              responsable: {
                nombre: nombreTec,
                rol: 'Técnico',
                avatar: inicialesTec,
              },
              detalles: {
                id_incidencia: idInc,
                id_orden: idOrden,
                prioridad: inc.prioridad || 'media',
                estado_orden: estadoInc,
                fecha_asignacion: ordenAsociada.fecha_creacion,
              },
            });
          }
        }
      }
    }

    // Si el activo no tiene eventos, aseguramos al menos el evento de adquisición / alta
    if (todosLosEventos.length === 0) {
      const fechaAlta = activoEncontrado.fechaRegistro
        ? new Date(activoEncontrado.fechaRegistro).toISOString()
        : new Date().toISOString();

      todosLosEventos.push({
        id: `TRZ-ALTA-${activoEncontrado.codigoQr}`,
        fecha: fechaAlta,
        tipo: 'adquisicion',
        tipoLabel: 'Alta de Activo',
        titulo: 'Registro e Incorporación al Inventario',
        descripcion: `Registro inicial de ${activoEncontrado.nombre} en ${activoEncontrado.ubicacion}.`,
        estadoAnterior: null,
        estadoNuevo: String(activoEncontrado.estado),
        responsable: {
          nombre: 'Administración de Inventario',
          rol: 'Operador',
          avatar: 'INV',
        },
        detalles: {
          id_activo: activoEncontrado.id,
          codigo_qr: activoEncontrado.codigoQr,
          categoria: String(activoEncontrado.categoria),
          ubicacion: activoEncontrado.ubicacion,
        },
      });
    }

    // 5. Ordenamiento cronológico estricto (más reciente primero)
    todosLosEventos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    // 6. Resumen estadístico sobre el total de hitos del activo
    const totalFallos = todosLosEventos.filter((e) => e.tipo === 'fallo').length;
    const totalMantenimientos = todosLosEventos.filter((e) => e.tipo === 'mantenimiento').length;
    const totalResoluciones = todosLosEventos.filter((e) => e.tipo === 'resolucion').length;
    const totalHitos = todosLosEventos.length;

    // 7. Filtro por tipo si se especifica
    let eventosFiltrados = todosLosEventos;
    if (tipoFiltro && tipoFiltro !== 'todos') {
      eventosFiltrados = todosLosEventos.filter((e) => e.tipo === tipoFiltro);
    }

    // 8. Paginación
    const total = eventosFiltrados.length;
    const inicio = (page - 1) * limit;
    const fin = inicio + limit;
    const eventosPaginados = eventosFiltrados.slice(inicio, fin);
    const totalPaginas = Math.ceil(total / limit) || 1;
    const tieneMas = fin < total;

    const fechaRegistroStr =
      activoEncontrado.fechaRegistro instanceof Date
        ? activoEncontrado.fechaRegistro.toISOString()
        : activoEncontrado.fechaRegistro || new Date().toISOString();

    return {
      activo: {
        id: activoEncontrado.id,
        codigoQr: activoEncontrado.codigoQr,
        nombre: activoEncontrado.nombre,
        modelo: activoEncontrado.modelo,
        numeroSerie: activoEncontrado.numeroSerie,
        categoria: String(activoEncontrado.categoria),
        ubicacion: activoEncontrado.ubicacion,
        estadoActual: String(activoEncontrado.estado),
        fechaRegistro: fechaRegistroStr,
      },
      paginacion: {
        total,
        pagina: page,
        limite: limit,
        totalPaginas,
        tieneMas,
      },
      trazabilidad: eventosPaginados,
      resumenEstadistico: {
        totalFallos,
        totalMantenimientos,
        totalResoluciones,
        totalHitos,
      },
    };
  }
}
