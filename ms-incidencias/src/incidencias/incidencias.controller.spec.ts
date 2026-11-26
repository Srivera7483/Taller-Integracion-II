import { IncidenciasController, EstadisticasController } from './incidencias.controller';
import { OrdenesTrabajoController } from '../ordenes-trabajo/ordenes-trabajo.controller';
import { IncidenciasService } from './incidencias.service';
import { KillSwitchGuard } from '../common/guards/kill-switch.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { PERMISSIONS_KEY } from '../auth/permissions.decorator';
import { ROLES_KEY } from '../auth/roles.decorator';
import { Reflector } from '@nestjs/core';
import {
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';

describe('IncidenciasController - TAL-4, TAL-117, TAL-127, TAL-140, TAL-194 & TAL-128', () => {
  let controller: IncidenciasController;
  let estadisticasController: EstadisticasController;
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
      crear: jest.fn(),
      clasificarPrioridad: jest.fn(),
      resolverIncidencia: jest.fn(),
      obtenerEstadisticasTiempoResolucion: jest.fn(),
    };

    controller = new IncidenciasController(service as IncidenciasService);
    estadisticasController = new EstadisticasController(service as IncidenciasService);
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

  describe('POST /incidencias (TAL-140)', () => {
    it('delega la creación de incidencia al servicio', async () => {
      const mockBody = {
        id_activo: 'activo-1',
        titulo: 'Falla de proyector',
        descripcion: 'No enciende',
      };
      const mockUser = { sub: 'user-1', email: 'user@test.com' } as any;
      const mockCreada = { id_incidencia: 'inc-1', ...mockBody };

      (service.crear as jest.Mock).mockResolvedValue(mockCreada);

      const resultado = await controller.crear(mockBody, mockUser);

      expect(service.crear).toHaveBeenCalledWith(mockBody, 'user-1', 'user@test.com');
      expect(resultado).toBe(mockCreada);
    });
  });

  describe('Integración con KillSwitchGuard (TAL-4)', () => {
    let guard: KillSwitchGuard;
    const originalEnv = process.env.KILL_SWITCH_INCIDENCIAS_ENABLED;

    beforeEach(() => {
      guard = new KillSwitchGuard();
      delete process.env.KILL_SWITCH_INCIDENCIAS_ENABLED;
      delete process.env.KILL_SWITCH_ENABLED;
    });

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.KILL_SWITCH_INCIDENCIAS_ENABLED = originalEnv;
      } else {
        delete process.env.KILL_SWITCH_INCIDENCIAS_ENABLED;
      }
    });

    const mockExecutionContext = (method: string) => {
      const setHeader = jest.fn();
      return {
        switchToHttp: () => ({
          getRequest: () => ({ method, url: '/api/v1/incidencias' }),
          getResponse: () => ({ setHeader }),
        }),
      } as unknown as ExecutionContext;
    };

    it('permite operaciones de lectura (GET) en incidencias con Kill Switch activo', () => {
      process.env.KILL_SWITCH_INCIDENCIAS_ENABLED = 'true';
      const context = mockExecutionContext('GET');

      expect(guard.canActivate(context)).toBe(true);
    });

    it('bloquea creación de incidencias (POST) con HTTP 503 y cabecera X-Kill-Switch cuando está activo', () => {
      process.env.KILL_SWITCH_INCIDENCIAS_ENABLED = 'true';
      const context = mockExecutionContext('POST');

      try {
        guard.canActivate(context);
        fail('Debería haber lanzado una excepción HTTP 503');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        expect((httpError.getResponse() as any).killSwitch).toBe(true);
      }
    });

    it('permite crear incidencias con el controlador cuando el Kill Switch está inactivo', async () => {
      process.env.KILL_SWITCH_INCIDENCIAS_ENABLED = 'false';
      const context = mockExecutionContext('POST');

      expect(guard.canActivate(context)).toBe(true);

      const mockBody = {
        id_activo: 'activo-1',
        titulo: 'Incidencia permitida',
        descripcion: 'Todo normal',
      };
      const mockUser = { sub: 'user-1', email: 'user@test.com' } as any;
      (service.crear as jest.Mock).mockResolvedValue({
        id_incidencia: 'inc-99',
        ...mockBody,
      });

      const resultado = await controller.crear(mockBody, mockUser);
      expect(resultado).toEqual(
        expect.objectContaining({ id_incidencia: 'inc-99' }),
      );
      expect(service.crear).toHaveBeenCalledWith(
        mockBody,
        'user-1',
        'user@test.com',
      );
    });
  });

  describe('PATCH /incidencias/:id/prioridad (TAL-194)', () => {
    it('delega la clasificación de prioridad al servicio', async () => {
      const mockResultado = {
        id_incidencia: 'inc-123',
        prioridad: 'alta',
      } as any;

      (service.clasificarPrioridad as jest.Mock).mockResolvedValue(mockResultado);

      const resultado = await controller.clasificarPrioridad('inc-123', {
        prioridad: 'Alta',
      });

      expect(service.clasificarPrioridad).toHaveBeenCalledWith('inc-123', 'Alta');
      expect(resultado).toBe(mockResultado);
    });
  });

  describe('PATCH /incidencias/:id/resolver (TAL-194)', () => {
    it('delega la resolución de la incidencia al servicio con rol y usuario', async () => {
      const mockResultado = {
        id_historial: 'hist-1',
        id_estado: 4,
      } as any;

      (service.resolverIncidencia as jest.Mock).mockResolvedValue(mockResultado);

      const mockUser = {
        sub: 'tec-1',
        rol: 'TECNICO',
        email: 'tecnico@test.com',
      } as any;

      const resultado = await controller.resolverIncidencia('inc-123', mockUser);

      expect(service.resolverIncidencia).toHaveBeenCalledWith(
        'inc-123',
        'tec-1',
        'TECNICO',
        'tecnico@test.com',
      );
      expect(resultado).toBe(mockResultado);
    });
  });

  describe('TAL-128: Endpoint de Métricas de Tiempo de Resolución (MTTR) y RBAC', () => {
    const mockMetricas = {
      promedioHorasTotal: 12.5,
      totalOrdenesCerradas: 4,
      desglosePorTecnico: [
        {
          id_tecnico: 'tec-1',
          nombre_tecnico: 'Carlos Santana',
          totalOrdenesCerradas: 4,
          promedioHoras: 12.5,
        },
      ],
      desglosePorActivo: [
        {
          id_activo: 'act-1',
          nombre_activo: 'Generador Principal',
          totalOrdenesCerradas: 4,
          promedioHoras: 12.5,
        },
      ],
      conteoPorEstado: { Resuelta: 4, Reportada: 2 },
      conteoPorPrioridad: { media: 4, alta: 2 },
    };

    it('IncidenciasController delega obtenerEstadisticasTiempoResolucion al servicio con el authHeader', async () => {
      (service.obtenerEstadisticasTiempoResolucion as jest.Mock).mockResolvedValue(mockMetricas);

      const resultado = await controller.obtenerEstadisticasTiempoResolucion('Bearer token123');

      expect(service.obtenerEstadisticasTiempoResolucion).toHaveBeenCalledWith('Bearer token123');
      expect(resultado).toEqual(mockMetricas);
    });

    it('EstadisticasController delega obtenerEstadisticasTiempoResolucion al servicio con el authHeader', async () => {
      (service.obtenerEstadisticasTiempoResolucion as jest.Mock).mockResolvedValue(mockMetricas);

      const resultado = await estadisticasController.obtenerEstadisticasTiempoResolucion('Bearer token123');

      expect(service.obtenerEstadisticasTiempoResolucion).toHaveBeenCalledWith('Bearer token123');
      expect(resultado).toEqual(mockMetricas);
    });

    describe('Seguridad PBAC (TAL-222): PermissionsGuard sin decoradores @Roles', () => {
      let reflector: Reflector;
      let permissionsGuard: PermissionsGuard;

      const createMockContext = (user?: any): ExecutionContext => {
        return {
          getHandler: jest.fn(),
          getClass: jest.fn(),
          switchToHttp: () => ({
            getRequest: () => ({ user }),
          }),
        } as unknown as ExecutionContext;
      };

      beforeEach(() => {
        reflector = new Reflector();
        permissionsGuard = new PermissionsGuard(reflector);
      });

      it('permite acceso 200 a usuario con permiso estadisticas:ver', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(['estadisticas:ver']);

        const context = createMockContext({
          userId: 'admin-1',
          rol: 'ADMINISTRADOR',
          permissions: ['estadisticas:ver', 'reportes:exportar'],
        });

        expect(permissionsGuard.canActivate(context)).toBe(true);
      });

      it('rechaza con 403 Forbidden si el usuario no posee el permiso requerido', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['estadisticas:ver']);

        const context = createMockContext({
          userId: 'user-1',
          rol: 'SUPERVISOR',
          permissions: ['ordenes:asignar', 'incidencias:clasificar_prioridad'],
        });

        expect(() => permissionsGuard.canActivate(context)).toThrow(ForbiddenException);
      });

      it('rechaza con 403 si el usuario es nulo o no está autenticado', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['estadisticas:ver']);
        const context = createMockContext(undefined);

        expect(() => permissionsGuard.canActivate(context)).toThrow(ForbiddenException);
      });

      it('los controladores de incidencias, estadísticas y órdenes operan con @RequirePermissions y sin @Roles', () => {
        const expectedIncidencias: Record<string, string[]> = {
          listar: ['incidencias:ver'],
          obtenerEstadisticasTiempoResolucion: ['estadisticas:ver'],
          exportar: ['reportes:exportar'],
          crear: ['incidencias:crear'],
          actualizarEstado: ['incidencias:resolver'],
          clasificarPrioridad: ['incidencias:clasificar_prioridad'],
          resolverIncidencia: ['incidencias:resolver'],
          crearEvidencia: ['evidencias:subir'],
          uploadEvidencia: ['evidencias:subir'],
        };

        for (const [method, expectedPerms] of Object.entries(expectedIncidencias)) {
          const handler = (IncidenciasController.prototype as any)[method];
          expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual(expectedPerms);
          expect(Reflect.getMetadata(ROLES_KEY, handler)).toBeUndefined();
        }

        const statsHandler = EstadisticasController.prototype.obtenerEstadisticasTiempoResolucion;
        expect(Reflect.getMetadata(PERMISSIONS_KEY, statsHandler)).toEqual(['estadisticas:ver']);
        expect(Reflect.getMetadata(ROLES_KEY, statsHandler)).toBeUndefined();

        const expectedOrdenes: Record<string, string[]> = {
          asignarOrden: ['ordenes:asignar'],
          registrarDiagnostico: ['ordenes:diagnosticar'],
          listarMisOrdenes: ['ordenes:diagnosticar'],
          listarPorTecnico: ['ordenes:diagnosticar'],
          listarTodas: ['ordenes:asignar'],
          actualizarDiagnostico: ['ordenes:diagnosticar'],
        };

        for (const [method, expectedPerms] of Object.entries(expectedOrdenes)) {
          const handler = (OrdenesTrabajoController.prototype as any)[method];
          expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual(expectedPerms);
          expect(Reflect.getMetadata(ROLES_KEY, handler)).toBeUndefined();
        }
      });
    });
  });
});
