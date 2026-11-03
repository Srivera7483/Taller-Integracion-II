import { of, throwError } from 'rxjs';
import { RabbitmqProducerService } from './rabbitmq-producer.service';
import { ClientProxy } from '@nestjs/microservices';

describe('RabbitmqProducerService', () => {
  let service: RabbitmqProducerService;
  let mockClient: jest.Mocked<ClientProxy>;

  beforeEach(() => {
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
    } as unknown as jest.Mocked<ClientProxy>;

    service = new RabbitmqProducerService(mockClient);
  });

  it('debe conectar al broker en onModuleInit', async () => {
    await service.onModuleInit();
    expect(mockClient.connect).toHaveBeenCalled();
  });

  it('no propaga error si falla la conexión en onModuleInit', async () => {
    mockClient.connect.mockRejectedValueOnce(new Error('Connection refused'));
    await expect(service.onModuleInit()).resolves.not.toThrow();
  });

  it('debe cerrar la conexión en onModuleDestroy', async () => {
    await service.onModuleDestroy();
    expect(mockClient.close).toHaveBeenCalled();
  });

  it('publica exitosamente un evento de incidencia crítica', async () => {
    mockClient.emit.mockReturnValue(of(undefined));

    const resultado = await service.publicarIncidenciaCritica({
      id_incidencia: 'inc-123',
      id_activo: 'act-456',
      id_reportante: 'usr-789',
      titulo: 'Servidor principal sin respuesta',
      descripcion: 'Caída total de red',
      prioridad: 'Crítica',
      fecha_creacion: new Date('2026-11-02T12:00:00Z'),
      estado: 'Reportada',
    });

    expect(resultado).toBe(true);
    expect(mockClient.emit).toHaveBeenCalledWith(
      'incidencia_critica',
      expect.objectContaining({
        evento: 'INCIDENCIA_CRITICA_REGISTRADA',
        id_incidencia: 'inc-123',
        id_activo: 'act-456',
        titulo: 'Servidor principal sin respuesta',
        prioridad: 'Crítica',
      }),
    );
  });

  it('captura el error y retorna false si RabbitMQ falla o rechaza el envío', async () => {
    mockClient.emit.mockReturnValue(
      throwError(() => new Error('RabbitMQ channel closed')),
    );

    const resultado = await service.publicarIncidenciaCritica({
      id_incidencia: 'inc-123',
      id_activo: 'act-456',
      id_reportante: 'usr-789',
      titulo: 'Incidencia Crítica',
      descripcion: 'Error crítico',
      prioridad: 'Crítica',
      fecha_creacion: new Date(),
    });

    expect(resultado).toBe(false);
  });
});

