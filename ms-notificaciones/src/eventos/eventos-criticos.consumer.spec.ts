import { RmqContext } from '@nestjs/microservices';
import { EventosCriticosConsumer } from './eventos-criticos.consumer';
import { IncidenciaCriticaMensaje } from './interfaces/incidencia-critica.interface';

describe('EventosCriticosConsumer', () => {
  let consumer: EventosCriticosConsumer;
  let mockChannel: { ack: jest.Mock; nack: jest.Mock };
  let mockContext: RmqContext;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    consumer = new EventosCriticosConsumer();
    mockChannel = {
      ack: jest.fn(),
      nack: jest.fn(),
    };

    mockContext = {
      getChannelRef: jest.fn().mockReturnValue(mockChannel),
      getMessage: jest.fn().mockReturnValue({
        content: Buffer.from(
          JSON.stringify({
            id_incidencia: 'inc-999',
            titulo: 'Caída de servidor',
            prioridad: 'Crítica',
          }),
        ),
      }),
    } as unknown as RmqContext;

    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('procesa el mensaje de incidencia crítica, imprime en consola y realiza ACK manual', async () => {
    const payload: IncidenciaCriticaMensaje = {
      id_incidencia: 'inc-999',
      id_activo: 'act-001',
      id_reportante: 'usr-111',
      titulo: 'Caída de servidor principal',
      descripcion: 'El servidor no responde peticiones HTTP',
      prioridad: 'Crítica',
      fecha_creacion: '2026-11-02T15:00:00.000Z',
      estado: 'Reportada',
    };

    const resultado = await consumer.consumirIncidenciaCritica(payload, mockContext);

    expect(resultado).toEqual({
      status: 'consumido',
      id_incidencia: 'inc-999',
      ack: true,
    });

    // Criterio TAL-11: Cero pérdida de paquetes -> ACK manual ejecutado
    expect(mockChannel.ack).toHaveBeenCalledTimes(1);
    expect(mockChannel.ack).toHaveBeenCalledWith(mockContext.getMessage());
    expect(mockChannel.nack).not.toHaveBeenCalled();

    // Verificación de que el mensaje fue impreso en consola
    expect(logSpy).toHaveBeenCalled();
  });

  it('soporta mensajes donde data viene como string parseando el contenido del buffer', async () => {
    const rawPayload = JSON.stringify({
      id_incidencia: 'inc-raw-123',
      titulo: 'Falla crítica sin formato',
      prioridad: 'Crítica',
    });

    const contextWithRaw = {
      getChannelRef: jest.fn().mockReturnValue(mockChannel),
      getMessage: jest.fn().mockReturnValue({
        content: Buffer.from(rawPayload),
      }),
    } as unknown as RmqContext;

    const resultado = await consumer.consumirIncidenciaCritica(
      undefined as any,
      contextWithRaw,
    );

    expect(resultado).toEqual({
      status: 'consumido',
      id_incidencia: 'inc-raw-123',
      ack: true,
    });
    expect(mockChannel.ack).toHaveBeenCalledTimes(1);
  });

  it('ejecuta NACK con re-encolamiento (requeue) si ocurre un error procesando el mensaje', async () => {
    jest.spyOn(consumer, 'imprimirAlertaCritica').mockImplementationOnce(() => {
      throw new Error('Fallo simulado al procesar mensaje');
    });

    const payload: IncidenciaCriticaMensaje = {
      id_incidencia: 'inc-error',
      id_activo: 'act-001',
      id_reportante: 'usr-111',
      titulo: 'Error',
      descripcion: 'Error',
      prioridad: 'Crítica',
      fecha_creacion: new Date(),
    };

    await expect(
      consumer.consumirIncidenciaCritica(payload, mockContext),
    ).rejects.toThrow('Fallo simulado al procesar mensaje');

    expect(mockChannel.nack).toHaveBeenCalledWith(
      mockContext.getMessage(),
      false,
      true, // Requeue habilitado para evitar pérdida de datos
    );
    expect(mockChannel.ack).not.toHaveBeenCalled();
  });
});

