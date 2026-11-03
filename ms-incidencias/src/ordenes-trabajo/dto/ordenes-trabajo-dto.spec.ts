import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AsignarOrdenDto } from './asignar-orden.dto';
import { CrearOrdenTrabajoDto } from './crear-orden-trabajo.dto';
import { FiltrarOrdenesDto } from './filtrar-ordenes.dto';
import { ListarOrdenesTrabajoQueryDto } from './listar-ordenes-trabajo-query.dto';

describe('TAL-165: Validación de DTOs en MS-Incidencias (Órdenes de Trabajo)', () => {
  describe('AsignarOrdenDto', () => {
    it('valida exitosamente con UUIDs válidos y diagnóstico opcional', async () => {
      const payload = {
        id_incidencia: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        id_tecnico: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        diagnostico_tecnico: 'Revisión técnica inicial en terreno',
      };

      const dto = plainToInstance(AsignarOrdenDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('falla si id_incidencia o id_tecnico no son UUIDs válidos', async () => {
      const payload = {
        id_incidencia: 'no-uuid-incidencia',
        id_tecnico: 'no-uuid-tecnico',
      };

      const dto = plainToInstance(AsignarOrdenDto, payload);
      const errors = await validate(dto);

      expect(errors.some((e) => e.property === 'id_incidencia')).toBe(true);
      expect(errors.some((e) => e.property === 'id_tecnico')).toBe(true);
    });

    it('falla si faltan campos obligatorios', async () => {
      const dto = plainToInstance(AsignarOrdenDto, {});
      const errors = await validate(dto);

      expect(errors.some((e) => e.property === 'id_incidencia')).toBe(true);
      expect(errors.some((e) => e.property === 'id_tecnico')).toBe(true);
    });

    it('falla si diagnostico_tecnico excede 1000 caracteres', async () => {
      const dto = plainToInstance(AsignarOrdenDto, {
        id_incidencia: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        id_tecnico: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        diagnostico_tecnico: 'x'.repeat(1001),
      });

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'diagnostico_tecnico')).toBe(true);
    });
  });

  describe('CrearOrdenTrabajoDto', () => {
    it('valida exitosamente un payload con UUIDs correctos', async () => {
      const payload = {
        id_incidencia: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        id_tecnico: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      };

      const dto = plainToInstance(CrearOrdenTrabajoDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('falla si id_incidencia o id_tecnico no son UUIDs válidos o están ausentes', async () => {
      const dto = plainToInstance(CrearOrdenTrabajoDto, {
        id_incidencia: 'invalido',
      });
      const errors = await validate(dto);

      expect(errors.some((e) => e.property === 'id_incidencia')).toBe(true);
      expect(errors.some((e) => e.property === 'id_tecnico')).toBe(true);
    });
  });

  describe('FiltrarOrdenesDto', () => {
    it('transforma strings de paginación y normaliza orden a minúsculas', async () => {
      const payload = {
        page: '2',
        limit: '15',
        orden: 'DESC',
        fechaDesde: '2026-10-01T00:00:00.000Z',
        fechaHasta: '2026-10-15T23:59:59.000Z',
      };

      const dto = plainToInstance(FiltrarOrdenesDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.page).toBe(2);
      expect(dto.limit).toBe(15);
      expect(dto.orden).toBe('desc');
    });

    it('falla si limit excede 50 registros por petición (TAL-139)', async () => {
      const dto = plainToInstance(FiltrarOrdenesDto, {
        limit: '51',
      });

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'limit')).toBe(true);
    });

    it('falla si orden no es asc ni desc', async () => {
      const dto = plainToInstance(FiltrarOrdenesDto, {
        orden: 'invalid_order',
      });

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'orden')).toBe(true);
    });

    it('falla si las fechas no tienen formato ISO válido', async () => {
      const dto = plainToInstance(FiltrarOrdenesDto, {
        fechaDesde: '2026/10/01',
      });

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'fechaDesde')).toBe(true);
    });
  });

  describe('ListarOrdenesTrabajoQueryDto', () => {
    it('valida exitosamente cuando los UUIDs opcionales son válidos', async () => {
      const dto = plainToInstance(ListarOrdenesTrabajoQueryDto, {
        id_incidencia: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('falla si id_incidencia no es un UUID válido', async () => {
      const dto = plainToInstance(ListarOrdenesTrabajoQueryDto, {
        id_incidencia: 'no-uuid',
      });

      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'id_incidencia')).toBe(true);
    });
  });
});

