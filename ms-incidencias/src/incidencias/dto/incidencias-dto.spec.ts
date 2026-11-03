import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CrearIncidenciaDto } from './crear-incidencia.dto';
import { ActualizarEstadoDto } from './actualizar-estado.dto';
import { ActualizarDiagnosticoDto } from './actualizar-diagnostico.dto';
import { CrearEvidenciaDto } from './crear-evidencia.dto';
import { ListarIncidenciasQueryDto } from './listar-incidencias-query.dto';
import { ExportarIncidenciasQueryDto } from './exportar-incidencias-query.dto';
import { PrioridadDinamicaQueryDto } from './prioridad-dinamica-query.dto';

describe('TAL-165: Validación de DTOs en MS-Incidencias (Incidencias)', () => {
  describe('CrearIncidenciaDto', () => {
    it('valida exitosamente un payload completo y correcto', async () => {
      const payload = {
        id_activo: 'c2834b9d-472e-4e44-8d99-52e85e282570',
        titulo: 'Falla en proyector sala 402',
        descripcion: 'El proyector no enciende la lámpara principal',
        prioridad: 'Alta',
      };

      const dto = plainToInstance(CrearIncidenciaDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('falla si id_activo no es un UUID válido', async () => {
      const payload = {
        id_activo: 'no-es-uuid',
        titulo: 'Falla',
        descripcion: 'Detalle',
      };

      const dto = plainToInstance(CrearIncidenciaDto, payload);
      const errors = await validate(dto);

      expect(errors.some((e) => e.property === 'id_activo')).toBe(true);
    });

    it('falla si titulo o descripcion están vacíos o contienen únicamente espacios en blanco', async () => {
      const payload = {
        id_activo: 'c2834b9d-472e-4e44-8d99-52e85e282570',
        titulo: '   ',
        descripcion: '      ',
      };

      const dto = plainToInstance(CrearIncidenciaDto, payload);
      const errors = await validate(dto);

      expect(errors.some((e) => e.property === 'titulo')).toBe(true);
      expect(errors.some((e) => e.property === 'descripcion')).toBe(true);
    });

    it('falla si titulo excede 255 caracteres', async () => {
      const payload = {
        id_activo: 'c2834b9d-472e-4e44-8d99-52e85e282570',
        titulo: 'A'.repeat(256),
        descripcion: 'Descripción válida',
      };

      const dto = plainToInstance(CrearIncidenciaDto, payload);
      const errors = await validate(dto);

      expect(errors.some((e) => e.property === 'titulo')).toBe(true);
    });

    it('valida prioridades permitidas y rechaza prioridades desconocidas', async () => {
      const validDto = plainToInstance(CrearIncidenciaDto, {
        id_activo: 'c2834b9d-472e-4e44-8d99-52e85e282570',
        titulo: 'Falla en servidor',
        descripcion: 'Caída de base de datos',
        prioridad: 'Crítica',
      });
      expect(await validate(validDto)).toHaveLength(0);

      const invalidDto = plainToInstance(CrearIncidenciaDto, {
        id_activo: 'c2834b9d-472e-4e44-8d99-52e85e282570',
        titulo: 'Falla',
        descripcion: 'Detalle',
        prioridad: 'SuperUrgente',
      });
      const errors = await validate(invalidDto);
      expect(errors.some((e) => e.property === 'prioridad')).toBe(true);
    });
  });

  describe('ActualizarEstadoDto', () => {
    it('valida exitosamente y transforma string numérico a number', async () => {
      const payload = {
        id_estado: '2',
        motivo_rechazo: 'No cumple con las condiciones técnicas',
      };

      const dto = plainToInstance(ActualizarEstadoDto, payload);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(typeof dto.id_estado).toBe('number');
      expect(dto.id_estado).toBe(2);
    });

    it('falla si id_estado no es positivo o no es entero', async () => {
      const dtoNegativo = plainToInstance(ActualizarEstadoDto, { id_estado: -1 });
      const errorsNeg = await validate(dtoNegativo);
      expect(errorsNeg.some((e) => e.property === 'id_estado')).toBe(true);

      const dtoCero = plainToInstance(ActualizarEstadoDto, { id_estado: 0 });
      const errorsCero = await validate(dtoCero);
      expect(errorsCero.some((e) => e.property === 'id_estado')).toBe(true);
    });

    it('falla si motivo_rechazo contiene solo espacios en blanco o excede 500 caracteres', async () => {
      const dtoEspacios = plainToInstance(ActualizarEstadoDto, {
        id_estado: 1,
        motivo_rechazo: '    ',
      });
      const errorsEspacios = await validate(dtoEspacios);
      expect(errorsEspacios.some((e) => e.property === 'motivo_rechazo')).toBe(true);

      const dtoLargo = plainToInstance(ActualizarEstadoDto, {
        id_estado: 1,
        motivo_rechazo: 'x'.repeat(501),
      });
      const errorsLargo = await validate(dtoLargo);
      expect(errorsLargo.some((e) => e.property === 'motivo_rechazo')).toBe(true);
    });
  });

  describe('ActualizarDiagnosticoDto', () => {
    it('valida correctamente un diagnóstico no vacío', async () => {
      const dto = plainToInstance(ActualizarDiagnosticoDto, {
        diagnostico_tecnico: 'Se reemplazó el capacitor defectuoso de la placa fuente.',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('falla si el diagnóstico está vacío, contiene solo espacios o excede 1000 caracteres', async () => {
      const dtoVacio = plainToInstance(ActualizarDiagnosticoDto, {
        diagnostico_tecnico: '   ',
      });
      const errorsVacio = await validate(dtoVacio);
      expect(errorsVacio.some((e) => e.property === 'diagnostico_tecnico')).toBe(true);

      const dtoLargo = plainToInstance(ActualizarDiagnosticoDto, {
        diagnostico_tecnico: 'X'.repeat(1001),
      });
      const errorsLargo = await validate(dtoLargo);
      expect(errorsLargo.some((e) => e.property === 'diagnostico_tecnico')).toBe(true);
    });
  });

  describe('CrearEvidenciaDto', () => {
    it('valida exitosamente evidencia con URL e id_tipo_evidencia válido', async () => {
      const dto = plainToInstance(CrearEvidenciaDto, {
        id_tipo_evidencia: '1',
        url_evidencia: 'https://res.cloudinary.com/uct/image/upload/v1/foto.jpg',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.id_tipo_evidencia).toBe(1);
    });

    it('falla si url_evidencia no tiene formato URL', async () => {
      const dto = plainToInstance(CrearEvidenciaDto, {
        id_tipo_evidencia: 1,
        url_evidencia: 'archivo-local-invalido.jpg',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'url_evidencia')).toBe(true);
    });
  });

  describe('ListarIncidenciasQueryDto', () => {
    it('asigna valores por defecto y transforma strings numéricos', async () => {
      const dto = plainToInstance(ListarIncidenciasQueryDto, {
        limite: '25',
        pagina: '3',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.limite).toBe(25);
      expect(dto.pagina).toBe(3);
    });

    it('falla si limite supera el tope forzado de 50 registros (TAL-139)', async () => {
      const dto = plainToInstance(ListarIncidenciasQueryDto, {
        limite: '51',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'limite')).toBe(true);
    });

    it('falla si limite o pagina son menores a 1', async () => {
      const dto = plainToInstance(ListarIncidenciasQueryDto, {
        limite: 0,
        pagina: -1,
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'limite')).toBe(true);
      expect(errors.some((e) => e.property === 'pagina')).toBe(true);
    });
  });

  describe('ExportarIncidenciasQueryDto', () => {
    it('normaliza y acepta formato csv o xlsx', async () => {
      const dto = plainToInstance(ExportarIncidenciasQueryDto, {
        formato: ' CSV ',
        fecha_inicio: '2026-10-01T00:00:00.000Z',
        fecha_fin: '2026-10-31T23:59:59.000Z',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.formato).toBe('csv');
    });

    it('falla si el formato no está dentro de los permitidos', async () => {
      const dto = plainToInstance(ExportarIncidenciasQueryDto, {
        formato: 'pdf',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'formato')).toBe(true);
    });

    it('falla si las fechas no tienen formato ISO válido', async () => {
      const dto = plainToInstance(ExportarIncidenciasQueryDto, {
        fecha_inicio: 'ayer',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'fecha_inicio')).toBe(true);
    });
  });

  describe('PrioridadDinamicaQueryDto', () => {
    it('transforma strings "true" o "false" a booleanos y respeta limite <= 50', async () => {
      const dto = plainToInstance(PrioridadDinamicaQueryDto, {
        solo_escaladas: 'true',
        excluir_fines_de_semana: 'true',
        limite: '30',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.solo_escaladas).toBe(true);
      expect(dto.excluir_fines_de_semana).toBe(true);
      expect(dto.limite).toBe(30);
    });
  });
});
