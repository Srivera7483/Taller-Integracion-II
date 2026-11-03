import { HttpService } from '@nestjs/axios';
import { UnsupportedMediaTypeException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IncidenciasService } from './incidencias.service';
import { of, throwError } from 'rxjs';

describe('IncidenciasService notifications', () => {
  const incidenciaCreada = {
    id_incidencia: 'incidencia-1',
    id_activo: 'activo-1',
    id_reportante: 'reportante-1',
    titulo: 'Falla de proyector',
    descripcion: 'No enciende',
    fecha_creacion: new Date('2026-10-05T12:00:00Z'),
    historial_estados: [
      { estado: { id_estado: 1, nombre_estado: 'Reportada' } },
    ],
  };
  const transaction = {
    estadoIncidencia: { findFirst: jest.fn(), findUnique: jest.fn() },
    incidencias: { create: jest.fn(), findUnique: jest.fn() },
    historialEstados: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(
      (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    ),
  } as unknown as PrismaService;
  const postMock = jest.fn();
  const httpService = { post: postMock } as unknown as HttpService;
  const service = new IncidenciasService(prisma, httpService);

  beforeEach(() => {
    jest.clearAllMocks();
    transaction.estadoIncidencia.findFirst.mockResolvedValue({
      id_estado: 1,
      nombre_estado: 'Reportada',
    });
    transaction.incidencias.create.mockResolvedValue(incidenciaCreada);
    transaction.incidencias.findUnique.mockResolvedValue(incidenciaCreada);
    transaction.historialEstados.create.mockResolvedValue({});
    postMock.mockReturnValue(of({ data: { status: 'encolada' } }));
  });

  it('notifica después de crear la incidencia y devuelve la respuesta original', async () => {
    const resultado = await service.crear(
      {
        id_activo: 'activo-1',
        titulo: 'Falla de proyector',
        descripcion: 'No enciende',
      },
      'reportante-1',
      'reportante@example.com',
    );

    expect(resultado).toMatchObject({
      id_incidencia: 'incidencia-1',
      titulo: 'Falla de proyector',
    });
    expect(postMock).toHaveBeenCalledWith(
      'http://ms-notificaciones:3004/notificar',
      {
        email: 'reportante@example.com',
        asunto: 'Nueva Incidencia Reportada: Falla de proyector',
        cuerpoMensaje:
          'La incidencia "Falla de proyector" fue reportada correctamente.',
      },
    );
    expect(
      (prisma.$transaction as jest.Mock).mock.invocationCallOrder[0],
    ).toBeLessThan(
      postMock.mock.invocationCallOrder[0],
    );
  });

  it('no propaga fallos de notificación ni altera la respuesta de creación', async () => {
    postMock.mockReturnValue(
      throwError(() => new Error('servicio no disponible')),
    );

    await expect(
      service.crear(
        {
          id_activo: 'activo-1',
          titulo: 'Falla de proyector',
          descripcion: 'No enciende',
        },
        'reportante-1',
        'reportante@example.com',
      ),
    ).resolves.toMatchObject({
      id_incidencia: 'incidencia-1',
      titulo: 'Falla de proyector',
    });
  });

  it('notifica al cambiar el estado a Resuelta después de la transacción', async () => {
    const incidenciaAsignada = {
      ...incidenciaCreada,
      historial_estados: [
        { estado: { id_estado: 2, nombre_estado: 'Asignada' } },
      ],
    };
    const incidenciaResuelta = {
      ...incidenciaCreada,
      historial_estados: [
        { estado: { id_estado: 3, nombre_estado: 'Resuelta' } },
      ],
    };
    transaction.incidencias.findUnique
      .mockResolvedValueOnce(incidenciaAsignada)
      .mockResolvedValueOnce(incidenciaResuelta);
    transaction.estadoIncidencia.findUnique.mockResolvedValue({
      id_estado: 3,
      nombre_estado: 'Resuelta',
    });

    const resultado = await service.actualizarEstado(
      'incidencia-1',
      3,
      'tecnico-1',
      'Técnico',
      'tecnico@example.com',
    );

    expect(resultado.estado?.nombre_estado).toBe('Resuelta');
    expect(postMock).toHaveBeenCalledWith(
      'http://ms-notificaciones:3004/notificar',
      {
        email: 'tecnico@example.com',
        asunto: 'Incidencia Resuelta: Falla de proyector',
        cuerpoMensaje: 'La incidencia "Falla de proyector" fue resuelta.',
      },
    );
  });

  describe('TAL-115: Prioridad Dinámica en IncidenciasService', () => {
    it('incluye campos de prioridad relativa y escalamiento al consultar o crear incidencia', async () => {
      const resultado = await service.crear(
        {
          id_activo: 'activo-1',
          titulo: 'Falla de proyector',
          descripcion: 'No enciende',
        },
        'reportante-1',
        'reportante@example.com',
      );

      expect(resultado).toHaveProperty('prioridad');
      expect(resultado).toHaveProperty('prioridad_original');
      expect(resultado).toHaveProperty('prioridad_relativa');
      expect(resultado).toHaveProperty('escalada');
      expect(resultado).toHaveProperty('tiempo_inactividad_horas');
    });

    it('retorna el calculo individual de prioridad dinamica con obtenerPrioridadDinamica', async () => {
      const mockPrisma = prisma as any;
      mockPrisma.incidencias = {
        findUnique: jest.fn().mockResolvedValue({
          ...incidenciaCreada,
          fecha_creacion: new Date(Date.now() - 72 * 3600 * 1000), // 72 horas (> 48h)
        }),
      };

      const resultado = await service.obtenerPrioridadDinamica('incidencia-1');

      expect(resultado.valido).toBe(true);
      expect(resultado.escalada).toBe(true);
      expect(resultado.tiempo_inactividad_horas).toBeGreaterThanOrEqual(72);
      expect(resultado.prioridad_relativa).toBe('Alta'); // Base Media -> Alta
      expect(resultado.motivo_escalamiento).toContain('Inactividad superior a 48h');
    });
  });

  describe('TAL-117: Exportación de Incidencias a Excel y CSV', () => {
    it('exporta el listado completo a Excel (.xlsx) por defecto', async () => {
      const mockPrisma = prisma as any;
      mockPrisma.incidencias = {
        findMany: jest.fn().mockResolvedValue([incidenciaCreada]),
      };

      const resultado = await service.exportarIncidencias();

      expect(resultado).toBeDefined();
      expect(resultado.contentType).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(resultado.filename).toContain('.xlsx');
      expect(resultado.totalFilas).toBe(1);
      expect(resultado.buffer).toBeInstanceOf(Buffer);
      expect(resultado.buffer.length).toBeGreaterThan(0);
    });

    it('exporta a CSV cuando se especifica el formato csv', async () => {
      const mockPrisma = prisma as any;
      mockPrisma.incidencias = {
        findMany: jest.fn().mockResolvedValue([incidenciaCreada]),
      };

      const resultado = await service.exportarIncidencias({ formato: 'csv' });

      expect(resultado).toBeDefined();
      expect(resultado.contentType).toBe('text/csv; charset=utf-8');
      expect(resultado.filename).toContain('.csv');
      expect(resultado.totalFilas).toBe(1);
      expect(resultado.buffer).toBeInstanceOf(Buffer);
      expect(resultado.buffer.toString('utf-8')).toContain('Falla de proyector');
    });

    it('aplica filtros de activo y estado al exportar', async () => {
      const mockPrisma = prisma as any;
      const findManyMock = jest.fn().mockResolvedValue([incidenciaCreada]);
      mockPrisma.incidencias = { findMany: findManyMock };

      await service.exportarIncidencias({
        id_activo: 'activo-1',
        id_estado: 1,
      });

      expect(findManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id_activo: 'activo-1' }),
        }),
      );
    });
  });

  describe('TAL-127: Validación de extensiones en crearEvidencia', () => {
    it('rechaza evidencias con extensión .exe lanzando UnsupportedMediaTypeException', async () => {
      await expect(
        service.crearEvidencia('incidencia-1', {
          id_tipo_evidencia: 1,
          url_evidencia: 'https://evil.com/malware.exe',
        }),
      ).rejects.toThrow(UnsupportedMediaTypeException);
    });

    it('rechaza evidencias con extensión .pdf lanzando UnsupportedMediaTypeException', async () => {
      await expect(
        service.crearEvidencia('incidencia-1', {
          id_tipo_evidencia: 1,
          url_evidencia: 'https://servidor.com/documento.pdf',
        }),
      ).rejects.toThrow(UnsupportedMediaTypeException);
    });

    it('acepta evidencias con extensiones válidas como .jpg, .png o .webp', async () => {
      const mockPrisma = prisma as any;
      mockPrisma.incidencias = {
        findUnique: jest.fn().mockResolvedValue(incidenciaCreada),
      };
      mockPrisma.tipoEvidencia = {
        findUnique: jest.fn().mockResolvedValue({ id_tipo_evidencia: 1, nombre_tipo: 'Foto' }),
      };
      mockPrisma.evidencia = {
        create: jest.fn().mockResolvedValue({
          id_evidencia: 'ev-1',
          id_incidencia: 'incidencia-1',
          url_cloudinary: 'https://cloudinary.com/foto.jpg',
          fecha_creacion: new Date(),
          tipo_evidencia: { id_tipo_evidencia: 1, nombre_tipo: 'Foto' },
        }),
      };

      const resultado = await service.crearEvidencia('incidencia-1', {
        id_tipo_evidencia: 1,
        url_evidencia: 'https://cloudinary.com/foto.jpg',
      });

      expect(resultado.url_evidencia).toBe('https://cloudinary.com/foto.jpg');
    });
  });

  describe('TAL-139: Optimización y paginación forzada de Queries grandes', () => {
    it('retorna metadatos de paginación (totalItems, totalPages, currentPage, limit, data) con defaults', async () => {
      const mockPrisma = prisma as any;
      mockPrisma.$queryRaw = jest
        .fn()
        .mockResolvedValueOnce([{ count: 1n }])
        .mockResolvedValueOnce([{ id_incidencia: 'incidencia-1' }]);
      mockPrisma.incidencias = {
        findMany: jest.fn().mockResolvedValue([incidenciaCreada]),
      };

      const resultado = await service.listar({});

      expect(resultado).toBeDefined();
      expect(resultado.totalItems).toBe(1);
      expect(resultado.totalPages).toBe(1);
      expect(resultado.currentPage).toBe(1);
      expect(resultado.limit).toBe(20);
      expect(resultado.data).toHaveLength(1);
      expect(resultado.data[0].id_incidencia).toBe('incidencia-1');
      expect(mockPrisma.incidencias.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 }),
      );
    });

    it('fuerza un tope máximo de 50 registros aunque se solicite un límite mayor', async () => {
      const mockPrisma = prisma as any;
      mockPrisma.$queryRaw = jest
        .fn()
        .mockResolvedValueOnce([{ count: 100n }])
        .mockResolvedValueOnce([{ id_incidencia: 'incidencia-1' }]);
      mockPrisma.incidencias = {
        findMany: jest.fn().mockResolvedValue([incidenciaCreada]),
      };

      const resultado = await service.listar({ limit: 100 as any, page: 2 });

      expect(resultado.limit).toBe(50);
      expect(resultado.currentPage).toBe(2);
      expect(resultado.totalItems).toBe(100);
      expect(resultado.totalPages).toBe(2);
      expect(mockPrisma.incidencias.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });

    it('maneja respuestas vacías retornando metadatos coherentes sin consultar findMany', async () => {
      const mockPrisma = prisma as any;
      mockPrisma.$queryRaw = jest.fn().mockResolvedValueOnce([{ count: 0 }]);
      mockPrisma.incidencias = { findMany: jest.fn() };

      const resultado = await service.listar({ limit: 20, page: 1 });

      expect(resultado.totalItems).toBe(0);
      expect(resultado.totalPages).toBe(0);
      expect(resultado.currentPage).toBe(1);
      expect(resultado.data).toEqual([]);
      expect(mockPrisma.incidencias.findMany).not.toHaveBeenCalled();
    });
  });

  describe('TAL-140: Sanitización de Entradas en MS Incidencias (XSS)', () => {
    it('sanitiza intentos de inyección XSS en titulo y descripcion al crear una incidencia', async () => {
      await service.crear(
        {
          id_activo: 'activo-1',
          titulo: '<script>alert("hack")</script>Proyector averiado',
          descripcion: 'Falla <script>alert(1)</script>',
        },
        'reportante-1',
        'reportante@example.com',
      );

      expect(transaction.incidencias.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          titulo: 'alert("hack")Proyector averiado',
          descripcion: 'Falla alert(1)',
        }),
      });
    });

    it('elimina etiquetas img con onerror e iframes antes de guardar en base de datos', async () => {
      await service.crear(
        {
          id_activo: 'activo-1',
          titulo: 'Pantalla azul <img src=x onerror=alert(document.cookie)>',
          descripcion: 'Ver detalle <iframe src="http://evil.com">malware</iframe> fin',
        },
        'reportante-1',
        'reportante@example.com',
      );

      expect(transaction.incidencias.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          titulo: 'Pantalla azul',
          descripcion: 'Ver detalle fin',
        }),
      });
    });
  });
});
