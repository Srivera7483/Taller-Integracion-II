import { Test, TestingModule } from '@nestjs/testing';
import {
  IncidenciasGateway,
  IncidenciaActualizadaPayload,
} from './incidencias.gateway';

describe('IncidenciasGateway', () => {
  let gateway: IncidenciasGateway;
  let mockServer: {
    to: jest.Mock;
    emit: jest.Mock;
  };

  beforeEach(async () => {
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [IncidenciasGateway],
    }).compile();

    gateway = module.get<IncidenciasGateway>(IncidenciasGateway);
    gateway.server = mockServer as any;
  });

  it('debe estar definido e inicializarse correctamente', () => {
    expect(gateway).toBeDefined();
    expect(() => gateway.afterInit()).not.toThrow();
  });

  describe('Salas y Aislamiento (Criterio 2)', () => {
    it('auto-une al cliente a las salas correspondientes según query en la conexión', () => {
      const mockClient = {
        id: 'client-socket-1',
        handshake: {
          query: {
            incidencia: 'inc-123',
            edificio: 'Edificio-A',
            rol: 'COORDINADOR',
          },
        },
        join: jest.fn(),
      } as any;

      gateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith('incidencia_inc-123');
      expect(mockClient.join).toHaveBeenCalledWith('edificio_Edificio-A');
      expect(mockClient.join).toHaveBeenCalledWith('rol_COORDINADOR');
      expect(mockClient.join).toHaveBeenCalledWith('coordinadores');
    });

    it('permite unirse explícitamente a salas con join_room', () => {
      const mockClient = {
        join: jest.fn(),
      } as any;

      const respuestaStr = gateway.handleJoinRoom(mockClient, 'coordinadores');
      expect(mockClient.join).toHaveBeenCalledWith('coordinadores');
      expect(respuestaStr.rooms).toContain('coordinadores');

      const respuestaObj = gateway.handleJoinRoom(mockClient, {
        id_incidencia: 'uuid-inc-99',
        id_edificio: 'Edificio-B',
        rol: 'ADMINISTRADOR',
      });

      expect(mockClient.join).toHaveBeenCalledWith('incidencia_uuid-inc-99');
      expect(mockClient.join).toHaveBeenCalledWith('edificio_Edificio-B');
      expect(mockClient.join).toHaveBeenCalledWith('rol_ADMINISTRADOR');
      expect(mockClient.join).toHaveBeenCalledWith('coordinadores');
      expect(respuestaObj.status).toBe('joined');
    });

    it('permite abandonar salas con leave_room', () => {
      const mockClient = {
        leave: jest.fn(),
      } as any;

      const resp = gateway.handleLeaveRoom(mockClient, 'edificio_Edificio-A');
      expect(mockClient.leave).toHaveBeenCalledWith('edificio_Edificio-A');
      expect(resp).toEqual({ status: 'left', room: 'edificio_Edificio-A' });
    });
  });

  describe('Emisión de Eventos y Latencia (Criterios 1 y 2)', () => {
    it('emite el evento incidencia_actualizada con el payload correcto hacia las salas requeridas', () => {
      const payload: IncidenciaActualizadaPayload = {
        id_incidencia: 'd45f4798-2831-419b-a010-86d634db38b3',
        nuevo_estado: 'EN_PROCESO',
        usuario_responsable: 'user-supervisor-01',
        id_edificio: 'Edificio-Central',
        timestamp: new Date().toISOString(),
        tipo_evento: 'CAMBIO_ESTADO',
      };

      const resultado = gateway.emitirIncidenciaActualizada(
        payload,
        'Edificio-Central',
      );

      // Verificación de salas aisladas
      expect(mockServer.to).toHaveBeenCalledWith(
        'incidencia_d45f4798-2831-419b-a010-86d634db38b3',
      );
      expect(mockServer.to).toHaveBeenCalledWith('coordinadores');
      expect(mockServer.to).toHaveBeenCalledWith('edificio_Edificio-Central');

      // Verificación de emisión de evento
      expect(mockServer.emit).toHaveBeenCalledWith(
        'incidencia_actualizada',
        payload,
      );

      // Verificación de criterio de latencia < 50ms
      expect(resultado.tiempoMs).toBeLessThan(50);
      expect(resultado.rooms).toEqual(
        expect.arrayContaining([
          'incidencia_d45f4798-2831-419b-a010-86d634db38b3',
          'coordinadores',
          'edificio_Edificio-Central',
        ]),
      );
    });

    it('cumple con latencia < 50ms en ráfaga de 50 eventos consecutivos', () => {
      const payload: IncidenciaActualizadaPayload = {
        id_incidencia: 'inc-bench-test',
        nuevo_estado: 'RESUELTA',
        usuario_responsable: 'tecnico-1',
        id_edificio: 'Edificio-Norte',
        timestamp: new Date().toISOString(),
        tipo_evento: 'CAMBIO_ESTADO',
      };

      for (let i = 0; i < 50; i++) {
        const resultado = gateway.emitirIncidenciaActualizada(
          payload,
          'Edificio-Norte',
        );
        expect(resultado.tiempoMs).toBeLessThan(50);
      }
    });
  });
});
