// Prueba de validación de DTOs y lógica de negocio TAL-192

import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { BatchSyncDto } from './src/sincronizacion/dto/batch-sync.dto';
import { SyncActionDto } from './src/sincronizacion/dto/sync-action.dto';
import {
  PERMISO_POR_TIPO_ACCION,
  TIPOS_ACCION_VALIDOS,
} from './src/sincronizacion/sincronizacion.types';

// 1. Probar validación de SyncActionDto
async function testDtoValidation() {
  const dto = plainToClass(SyncActionDto, {
    id_accion_local: 'test-001',
    tipo: 'crear_incidencia',
    payload: { id_activo: 'uuid-test', titulo: 'Test', descripcion: 'Descripción', prioridad: 'alta' },
    timestamp_local: '2026-11-20T08:00:00.000Z',
  });

  const errors = await validate(dto);
  if (errors.length === 0) {
    console.log('SyncActionDto válido');
  } else {
    console.log('SyncActionDto errores:', errors.length);
  }
}

// 2. Probar validación de BatchSyncDto
async function testBatchDtoValidation() {
  const dto = plainToClass(BatchSyncDto, {
    acciones: [
      { id_accion_local: 'test-001', tipo: 'crear_incidencia', payload: {}, timestamp_local: '2026-11-20T08:00:00.000Z' },
    ],
  });

  const errors = await validate(dto);
  if (errors.length === 0) {
    console.log('BatchSyncDto válido (1 acción)');
  } else {
    console.log('BatchSyncDto errores:', errors.length);
  }
}

// 3. Probar mapeo tipo→permiso
function testPermissionMapping() {
  console.log('Permisos por tipo de acción:');
  for (const [tipo, permiso] of Object.entries(PERMISO_POR_TIPO_ACCION)) {
    console.log(`${tipo} → ${permiso}`);
  }

  const tiposNoMapeados = TIPOS_ACCION_VALIDOS.filter(t => !(t in PERMISO_POR_TIPO_ACCION));
  if (tiposNoMapeados.length === 0) {
    console.log('Todos los tipos tienen permiso mapeado');
  } else {
    console.log('Tipos sin mapear:', tiposNoMapeados);
  }
}

// 5. Probar tipos de acción inválidos
function testInvalidTypes() {
  const tiposInvalidos = ['tipo_inexistente', 'otro_tipo'];
  for (const tipo of tiposInvalidos) {
    if (TIPOS_ACCION_VALIDOS.includes(tipo)) {
      console.log(`${tipo} debería ser inválido`);
    } else {
      console.log(`${tipo} correctamente rechazado`);
    }
  }
}

async function main() {
  console.log('TAL-192 Pruebas de validación\n');
  await testDtoValidation();
  await testBatchDtoValidation();
  testPermissionMapping();
  testInvalidTypes();
  console.log('\nFin de pruebas');
}

main();

