import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

export interface IncidenciaActualizadaPayload {
  id_incidencia: string;
  nuevo_estado: string;
  usuario_responsable: string | null;
  id_edificio?: string | null;
  timestamp: string;
  tipo_evento: 'CAMBIO_ESTADO' | 'ASIGNACION_ORDEN';
}

export interface EmisionResultado {
  tiempoMs: number;
  rooms: string[];
  payload: IncidenciaActualizadaPayload;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class IncidenciasGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(IncidenciasGateway.name);

  afterInit() {
    this.logger.log('[WS] IncidenciasGateway inicializado para WebSockets');
  }

  handleConnection(client: Socket) {
    this.logger.log(`[WS] Cliente conectado: ${client.id}`);
    const query = client.handshake?.query;

    if (query?.incidencia) {
      const room = `incidencia_${query.incidencia}`;
      client.join(room);
      this.logger.log(`[WS] Cliente ${client.id} auto-unido a sala ${room}`);
    }

    if (query?.edificio) {
      const room = `edificio_${query.edificio}`;
      client.join(room);
      this.logger.log(`[WS] Cliente ${client.id} auto-unido a sala ${room}`);
    }

    if (query?.rol) {
      const rolUpper = String(query.rol).toUpperCase();
      const roomRol = `rol_${rolUpper}`;
      client.join(roomRol);
      if (['COORDINADOR', 'SUPERVISOR', 'ADMINISTRADOR'].includes(rolUpper)) {
        client.join('coordinadores');
        this.logger.log(
          `[WS] Cliente ${client.id} auto-unido a sala coordinadores`,
        );
      }
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[WS] Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data:
      | string
      | {
          room?: string;
          rooms?: string[];
          id_incidencia?: string;
          id_edificio?: string;
          rol?: string;
        },
  ) {
    const salasUnidas: string[] = [];

    if (typeof data === 'string') {
      client.join(data);
      salasUnidas.push(data);
    } else if (data) {
      if (data.room) {
        client.join(data.room);
        salasUnidas.push(data.room);
      }
      if (Array.isArray(data.rooms)) {
        for (const r of data.rooms) {
          if (r) {
            client.join(r);
            salasUnidas.push(r);
          }
        }
      }
      if (data.id_incidencia) {
        const roomInc = `incidencia_${data.id_incidencia}`;
        client.join(roomInc);
        salasUnidas.push(roomInc);
      }
      if (data.id_edificio) {
        const roomEd = `edificio_${data.id_edificio}`;
        client.join(roomEd);
        salasUnidas.push(roomEd);
      }
      if (data.rol) {
        const rolUpper = String(data.rol).toUpperCase();
        const roomRol = `rol_${rolUpper}`;
        client.join(roomRol);
        salasUnidas.push(roomRol);
        if (['COORDINADOR', 'SUPERVISOR', 'ADMINISTRADOR'].includes(rolUpper)) {
          client.join('coordinadores');
          salasUnidas.push('coordinadores');
        }
      }
    }

    return { status: 'joined', rooms: salasUnidas };
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: string | { room?: string },
  ) {
    const room = typeof data === 'string' ? data : data?.room;
    if (room) {
      client.leave(room);
      return { status: 'left', room };
    }
    return { status: 'error', message: 'Sala no especificada' };
  }

  /**
   * Emite el evento `incidencia_actualizada` hacia:
   * 1. Sala de la incidencia (`incidencia_${id_incidencia}`)
   * 2. Sala de coordinadores (`coordinadores`)
   * 3. Sala del edificio (`edificio_${id_edificio}`) si está disponible
   *
   * Cumple con emitir en menos de 50ms mediante despacho en memoria.
   */
  emitirIncidenciaActualizada(
    payload: IncidenciaActualizadaPayload,
    idEdificio?: string | null,
  ): EmisionResultado {
    const inicio = performance.now();

    const salasTarget = new Set<string>();
    salasTarget.add(`incidencia_${payload.id_incidencia}`);
    salasTarget.add('coordinadores');

    const edificio = idEdificio ?? payload.id_edificio;
    if (edificio) {
      salasTarget.add(`edificio_${edificio}`);
    }

    if (this.server) {
      for (const sala of salasTarget) {
        this.server.to(sala).emit('incidencia_actualizada', payload);
      }
    }

    const duracion = performance.now() - inicio;

    if (duracion > 50) {
      this.logger.warn(
        `[WS] Alerta de latencia: emisión tomó ${duracion.toFixed(2)}ms (>50ms)`,
      );
    } else {
      this.logger.debug(
        `[WS] Evento 'incidencia_actualizada' emitido a salas [${Array.from(salasTarget).join(', ')}] en ${duracion.toFixed(2)}ms`,
      );
    }

    return {
      tiempoMs: duracion,
      rooms: Array.from(salasTarget),
      payload,
    };
  }
}
