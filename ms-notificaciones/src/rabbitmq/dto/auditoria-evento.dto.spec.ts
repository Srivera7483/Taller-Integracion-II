import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AuditoriaEventoDto, TipoAccionAuditoria } from './auditoria-evento.dto';

describe('AuditoriaEventoDto (contrato de evento de auditoría)', () => {
  const payloadValido = {
    accion: TipoAccionAuditoria.CREACION,
    entidad: 'Activo',
    idEntidad: 'act-456',
    usuarioId: 'usr-789',
    ipOrigen: '192.168.1.100',
    detalles: { campo: 'valor', anterior: null },
  };

  it('debe pasar validación con payload válido', async () => {
    const dto = plainToInstance(AuditoriaEventoDto, payloadValido);
    const errors: ValidationError[] = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('debe fallar si falta el campo accion', async () => {
    const { accion, ...rest } = payloadValido;
    const dto = plainToInstance(AuditoriaEventoDto, rest);
    const errors: ValidationError[] = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'accion')).toBe(true);
  });

  it('debe fallar si falta el campo entidad', async () => {
    const { entidad, ...rest } = payloadValido;
    const dto = plainToInstance(AuditoriaEventoDto, rest);
    const errors: ValidationError[] = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'entidad')).toBe(true);
  });

  it('debe fallar si falta el campo idEntidad', async () => {
    const { idEntidad, ...rest } = payloadValido;
    const dto = plainToInstance(AuditoriaEventoDto, rest);
    const errors: ValidationError[] = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'idEntidad')).toBe(true);
  });

  it('debe fallar si falta el campo usuarioId', async () => {
    const { usuarioId, ...rest } = payloadValido;
    const dto = plainToInstance(AuditoriaEventoDto, rest);
    const errors: ValidationError[] = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'usuarioId')).toBe(true);
  });

  it('debe aceptar todas las acciones de auditoría válidas', async () => {
    for (const accion of Object.values(TipoAccionAuditoria)) {
      const dto = plainToInstance(AuditoriaEventoDto, {
        ...payloadValido,
        accion,
      });
      const errors: ValidationError[] = await validate(dto);
      expect(errors.length).toBe(0);
    }
  });

  it('debe permitir campos opcionales ausentes (ipOrigen, detalles)', async () => {
    const { ipOrigen, detalles, ...rest } = payloadValido;
    const dto = plainToInstance(AuditoriaEventoDto, rest);
    const errors: ValidationError[] = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('debe serializarse y deserializarse correctamente con class-transformer', async () => {
    const dtoInstance = plainToInstance(AuditoriaEventoDto, payloadValido);
    const serialized = JSON.stringify(dtoInstance);
    const deserialized = plainToInstance(AuditoriaEventoDto, JSON.parse(serialized));
    expect(deserialized.accion).toBe(TipoAccionAuditoria.CREACION);
    expect(deserialized.entidad).toBe('Activo');
    expect(deserialized.idEntidad).toBe('act-456');
    expect(deserialized.usuarioId).toBe('usr-789');
  });
});
