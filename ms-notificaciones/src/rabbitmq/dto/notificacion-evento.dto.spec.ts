import 'reflect-metadata';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { NotificacionEventoDto, TipoNotificacion, PrioridadNotificacion } from './notificacion-evento.dto';

describe('NotificacionEventoDto (contrato de evento de notificación)', () => {
  const payloadValido = {
    tipo: TipoNotificacion.EMAIL,
    prioridad: PrioridadNotificacion.ALTA,
    asunto: 'Prueba de notificación',
    cuerpo: 'Este es el cuerpo del mensaje',
    destinatario: {
      usuarioId: 'usr-123',
      canal: 'email',
      direccion: 'usuario@ejemplo.com',
    },
    idCorrelacion: 'corr-001',
    metadata: { origen: 'api-gateway' },
  };

  it('debe pasar validación con payload válido', async () => {
    const dto = plainToInstance(NotificacionEventoDto, payloadValido);
    const errors: ValidationError[] = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('debe fallar si falta el campo tipo', async () => {
    const { tipo, ...rest } = payloadValido;
    const dto = plainToInstance(NotificacionEventoDto, rest);
    const errors: ValidationError[] = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'tipo')).toBe(true);
  });

  it('debe fallar si falta el campo prioridad', async () => {
    const { prioridad, ...rest } = payloadValido;
    const dto = plainToInstance(NotificacionEventoDto, rest);
    const errors: ValidationError[] = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'prioridad')).toBe(true);
  });

  it('debe fallar si falta el campo asunto', async () => {
    const { asunto, ...rest } = payloadValido;
    const dto = plainToInstance(NotificacionEventoDto, rest);
    const errors: ValidationError[] = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'asunto')).toBe(true);
  });

  it('debe fallar si falta el campo cuerpo', async () => {
    const { cuerpo, ...rest } = payloadValido;
    const dto = plainToInstance(NotificacionEventoDto, rest);
    const errors: ValidationError[] = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'cuerpo')).toBe(true);
  });

  it('debe fallar si falta el objeto destinatario', async () => {
    const { destinatario, ...rest } = payloadValido;
    const dto = plainToInstance(NotificacionEventoDto, rest);
    const errors: ValidationError[] = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'destinatario')).toBe(true);
  });

  it('debe aceptar tipos de notificación válidos', async () => {
    for (const tipo of Object.values(TipoNotificacion)) {
      const dto = plainToInstance(NotificacionEventoDto, {
        ...payloadValido,
        tipo,
      });
      const errors: ValidationError[] = await validate(dto);
      expect(errors.length).toBe(0);
    }
  });

  it('debe aceptar niveles de prioridad válidos', async () => {
    for (const prioridad of Object.values(PrioridadNotificacion)) {
      const dto = plainToInstance(NotificacionEventoDto, {
        ...payloadValido,
        prioridad,
      });
      const errors: ValidationError[] = await validate(dto);
      expect(errors.length).toBe(0);
    }
  });

  it('debe permitir campos opcionales ausentes (idCorrelacion, metadata)', async () => {
    const { idCorrelacion, metadata, ...rest } = payloadValido;
    const dto = plainToInstance(NotificacionEventoDto, rest);
    const errors: ValidationError[] = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('debe serializarse y deserializarse correctamente con class-transformer', async () => {
    const dtoInstance = plainToInstance(NotificacionEventoDto, payloadValido);
    const serialized = JSON.stringify(dtoInstance);
    const deserialized = plainToInstance(NotificacionEventoDto, JSON.parse(serialized));
    expect(deserialized.tipo).toBe(TipoNotificacion.EMAIL);
    expect(deserialized.prioridad).toBe(PrioridadNotificacion.ALTA);
    expect(deserialized.destinatario.usuarioId).toBe('usr-123');
  });
});
