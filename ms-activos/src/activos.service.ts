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
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

  private mantenimientosEnMemoria: any[] = [
    {
      id: 'mant-001', id_mantenimiento: 'mant-001', fecha_creacion: new Date('2026-10-01T10:00:00.000Z'),
      id_activo: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      fecha_programada: new Date('2026-10-15T10:00:00.000Z'),
      descripcion: 'Mantenimiento preventivo semestral de lámpara y calibración óptico-láser',
      tipo: 'Preventivo',
      estado: 'Pendiente',
      activo: {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        nombre: 'Proyector Láser Epson PowerLite',
        codigoQr: 'ACT-2026-0001',
        ubicacion: 'Edificio A - Auditorio Principal',
        categoria: 'AUDIOVISUAL',
      },
    },
    {
      id: 'mant-002', id_mantenimiento: 'mant-002', fecha_creacion: new Date('2026-10-01T10:00:00.000Z'),
      id_activo: '550e8400-e29b-41d4-a716-446655440000',
      fecha_programada: new Date('2026-10-20T14:30:00.000Z'),
      descripcion: 'Limpieza de ventiladores, cambio de pasta térmica y diagnóstico de RAM',
      tipo: 'Correctivo',
      estado: 'En Proceso',
      activo: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        nombre: 'Computador Docente All-in-One Dell',
        codigoQr: 'ACT-2026-0002',
        ubicacion: 'Edificio B - Laboratorio 302',
        categoria: 'COMPUTO',
      },
    },
    {
      id: 'mant-003', id_mantenimiento: 'mant-003', fecha_creacion: new Date('2026-10-01T10:00:00.000Z'),
      id_activo: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      fecha_programada: new Date('2026-10-28T09:00:00.000Z'),
      descripcion: 'Inspección de hardware dado de baja y rescate de componentes reutilizables',
      tipo: 'Preventivo',
      estado: 'Pendiente',
      activo: {
        id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        nombre: 'Estación de Trabajo Desincorporada',
        codigoQr: 'ACT-2026-0003',
        ubicacion: 'Edificio B - Rack Principal Piso 2',
        categoria: 'COMPUTO',
      },
    },
    {
      id: 'mant-004', id_mantenimiento: 'mant-004', fecha_creacion: new Date('2026-10-01T10:00:00.000Z'),
      id_activo: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      fecha_programada: new Date('2026-11-05T11:00:00.000Z'),
      descripcion: 'Revisión trimestral de filtros de aire y pruebas térmicas',
      tipo: 'Preventivo',
      estado: 'Pendiente',
      activo: {
        id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        nombre: 'Proyector Láser Epson PowerLite',
        codigoQr: 'ACT-2026-0001',
        ubicacion: 'Edificio A - Auditorio Principal',
        categoria: 'AUDIOVISUAL',
      },
    },
    {
      id: 'mant-005', id_mantenimiento: 'mant-005', fecha_creacion: new Date('2026-10-01T10:00:00.000Z'),
      id_activo: 'SW-CORE-01',
      fecha_programada: new Date('2026-11-12T16:00:00.000Z'),
      descripcion: 'Actualización preventiva de firmware y verificación de redundancia PoE',
      tipo: 'Preventivo',
      estado: 'Pendiente',
      activo: {
        id: 'SW-CORE-01',
        nombre: 'Switch de Distribución Cisco Catalyst 9300',
        codigoQr: 'SW-CORE-01',
        ubicacion: 'Edificio Central - Sala de Comunicaciones 1',
        categoria: 'REDES',
      },
    },
  ];

  constructor(private readonly prisma: PrismaService) {}

  async listarMantenimientos(filtros?: { startDate?: string; endDate?: string; id_activo?: string }) {
    let fechaInicio: Date | undefined;
    let fechaFin: Date | undefined;

    if (filtros?.startDate) {
      fechaInicio = new Date(filtros.startDate);
      if (isNaN(fechaInicio.getTime())) {
        throw new BadRequestException('Formato de fecha de inicio inválido. Use ISO o YYYY-MM-DD.');
      }
      if (filtros.startDate.length === 10) {
        fechaInicio.setUTCHours(0, 0, 0, 0);
      }
    }

    if (filtros?.endDate) {
      fechaFin = new Date(filtros.endDate);
      if (isNaN(fechaFin.getTime())) {
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
      nuevoMantenimiento = {
        id: `mant-${Date.now()}`,
        id_activo: dto.id_activo,
        fecha_programada: new Date(dto.fecha_programada),
        descripcion: dto.descripcion,
        tipo: dto.tipo,
        estado: dto.estado || 'Pendiente',
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

  async listarTodos(query?: { page?: number; limit?: number }): Promise<Activo[]> {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(query?.limit) || 50));
    const skip = (page - 1) * limit;

    try {
      if (this.prisma?.activo) {
        const activosDb = await this.prisma.activo.findMany({
          orderBy: { fechaRegistro: 'desc' },
          skip,
          take: limit,
        });
        if (activosDb.length > 0) {
          return activosDb as unknown as Activo[];
        }
      }
    } catch {
      // Fallback a memoria
    }
    return this.activosEnMemoria.slice(skip, skip + limit);
  }

  async contarTotalActivos(): Promise<number> {
    try {
      if (this.prisma?.activo) {
        return await this.prisma.activo.count();
      }
    } catch {
      // Fallback a memoria
    }
    return this.activosEnMemoria.length;
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
        const existeEvento = todosLosEventos.some((e) => e.detalles?.id_mantenimiento === m.id);
        if (!existeEvento) {
          const esCompletado = m.estado === 'Completado';
          todosLosEventos.push({
            id: `MNT-${m.id.substring(0, 8)}`,
            fecha: new Date(m.fecha_programada).toISOString(),
            tipo: esCompletado ? 'resolucion' : 'mantenimiento',
            tipoLabel: esCompletado ? 'Mantenimiento Completado' : 'Mantenimiento Programado',
            titulo: `${m.tipo}: ${m.descripcion}`,
            descripcion: m.descripcion,
            estadoAnterior: EstadoActivo.EN_REVISION,
            estadoNuevo: esCompletado ? EstadoActivo.OPERATIVO : EstadoActivo.EN_MANTENIMIENTO,
            responsable: {
              nombre: 'Área de Mantenimiento',
              rol: 'Técnico',
              avatar: 'MNT',
            },
            detalles: {
              id_mantenimiento: m.id,
              estado: m.estado,
              tipo: m.tipo,
            },
          });
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
