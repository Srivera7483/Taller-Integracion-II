# TAL-41: Registro automatico de historial de cambios

## 1. Diagnostico previo

- El modelo `Incidencias` existe en `ms-incidencias/prisma/schema.prisma`.
- TAL-40 esta presente: `EstadoIncidencia` contiene `Reportada`, `Asignada` y `Resuelta`, y `Incidencias.estado` usa ese enum.
- `prisma validate`: aprobado.
- `prisma generate`: aprobado.
- Compilacion: aprobada.
- Pruebas unitarias previas: aprobadas.
- Prueba e2e previa del endpoint existente: aprobada.
- El microservicio no tenia previamente un endpoint de actualizacion de incidencias ni un `PrismaService`.
- `ms-auth` mantiene el modelo `User` en otra base de datos. Por eso no se crea una FK SQL hacia usuarios: seria una relacion entre bases que PostgreSQL no puede garantizar.

Diagnostico: sistema estable para continuar. El prerrequisito TAL-40 existe y el modelo base `Incidencias` esta disponible.

## 2. Resumen tecnico

- `ms-incidencias/prisma/schema.prisma`: agrega `HistorialIncidencia`, la relacion con `Incidencias` y los campos auditables.
- `ms-incidencias/prisma/migrations/20260922180000_add_historial_incidencia/migration.sql`: crea la tabla, el indice y la FK hacia `Incidencias`.
- `ms-incidencias/src/prisma/prisma.service.ts`: expone el cliente Prisma y administra su ciclo de vida Nest.
- `ms-incidencias/src/prisma/prisma.module.ts`: registra `PrismaService` como proveedor global.
- `ms-incidencias/src/incidencias/dto/actualizar-estado.dto.ts`: tipa el estado recibido por el endpoint.
- `ms-incidencias/src/incidencias/incidencias.service.ts`: ejecuta update e historial en una unica transaccion.
- `ms-incidencias/src/incidencias/incidencias.controller.ts`: expone `PATCH /incidencias/:id/estado` y obtiene el usuario del contexto autenticado.
- `ms-incidencias/src/incidencias/incidencias.module.ts`: registra controlador y servicio.
- `ms-incidencias/src/app.module.ts`: importa Prisma e incidencias.
- `ms-incidencias/src/incidencias/incidencias.service.spec.ts`: prueba registro, validacion, estado repetido y fallo transaccional.

## 3. Modelo de datos

`HistorialIncidencia` contiene exactamente los datos requeridos:

- `incidencia_id`: FK a `Incidencias.id_incidencia`.
- `estado_anterior`: enum `EstadoIncidencia`.
- `estado_nuevo`: enum `EstadoIncidencia`.
- `usuario_id`: identificador del usuario autenticado en `ms-auth`.
- `fecha`: timestamp generado por PostgreSQL.

Se agrega tambien `id_historial` como identificador tecnico de la fila e indice por `incidencia_id` para consultar el historial eficientemente.

## 4. Flujo de ejecucion

1. El cliente envia `PATCH /incidencias/:id/estado`.
2. El mecanismo de autenticacion del gateway o microservicio deja `request.user` con `userId` o `sub`.
3. El controlador rechaza la peticion si no hay usuario autenticado.
4. `IncidenciasService.actualizarEstado` valida que el nuevo estado pertenezca al enum.
5. Se abre una transaccion Prisma.
6. Se consulta la incidencia y se conserva `estado_anterior`.
7. Se actualiza `Incidencias.estado`.
8. Se inserta `HistorialIncidencia` con estados, usuario y fecha.
9. Si todas las operaciones terminan correctamente, la transaccion hace commit.
10. Si el update o el insert falla, Prisma hace rollback y no queda un cambio parcial.

Si el estado nuevo coincide con el anterior, no se genera un evento redundante.

## 5. Decision arquitectonica

Se eligio la logica transaccional en el servicio de dominio. El update y el insert de auditoria viven en una sola transaccion y el servicio recibe explicitamente el usuario autenticado. Esto encaja con el estado actual del proyecto, que no tenia aun un cliente Prisma centralizado ni endpoints de incidencias.

### Alternativa 1: middleware o extension de Prisma

Ventajas:

- Puede centralizar auditoria para multiples llamadas al ORM.
- Reduce el riesgo de que un servicio olvide crear el historial.

Desventajas:

- Necesita transportar el usuario mediante contexto asincrono o una instancia de Prisma por request.
- Puede ocultar efectos secundarios importantes.
- Las operaciones bulk y los updates parciales requieren reglas adicionales para conocer el estado anterior.
- Aumenta el acoplamiento entre infraestructura y contexto HTTP.

### Alternativa 2: trigger nativo de PostgreSQL

Ventajas:

- Audita escrituras provenientes de cualquier proceso.
- Garantiza la atomicidad en la base de datos.
- No depende de que todos los controladores llamen un servicio concreto.

Desventajas:

- La base no conoce automaticamente el usuario HTTP; se requiere configurar una variable de sesion por transaccion.
- La logica queda fuera de TypeScript y es mas dificil de probar con unit tests.
- Los triggers complican migraciones, depuracion y portabilidad.

### Alternativa 3: interceptor HTTP

Ventajas:

- Obtiene facilmente el usuario de la peticion.
- Es visible en el flujo Nest.

Desventajas:

- No cubre escrituras fuera de HTTP, jobs o scripts.
- Un interceptor no conoce de forma fiable el estado anterior sin duplicar logica de persistencia.
- Puede dejar auditorias inconsistentes si la operacion de negocio falla despues.

La implementacion elegida prioriza mantenibilidad y consistencia en este repositorio. Si en el futuro aparecen multiples caminos de escritura, conviene evolucionar a una extension Prisma o trigger complementario.

## 6. Relacion con usuarios

No se agrega un modelo `Usuario` local ni una FK a `ms-auth`. Los microservicios tienen bases separadas y el modelo `User` vive en `ms-auth`. `usuario_id` conserva la referencia logica al UUID del usuario autenticado. La validacion de existencia del usuario debe realizarse mediante el mecanismo de autenticacion o una consulta al servicio de identidad, no mediante una FK cross-database.

## 7. Pruebas y validacion

Desde `ms-incidencias`:

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5434/incidencias_db?schema=public"
npx.cmd prisma validate
npx.cmd prisma generate
npm.cmd run build
npm.cmd run lint
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand
```

Aplicar migraciones cuando PostgreSQL este disponible:

```powershell
npx.cmd prisma migrate deploy
```

Ejemplo HTTP, suponiendo que el guard de autenticacion haya poblado `request.user`:

```powershell
curl.exe -X PATCH http://localhost:3002/incidencias/ID/estado `
  -H "Authorization: Bearer TOKEN" `
  -H "Content-Type: application/json" `
  -d '{"estado":"Asignada"}'
```

La prueba debe verificar que:

```sql
SELECT incidencia_id, estado_anterior, estado_nuevo, usuario_id, fecha
FROM "HistorialIncidencia"
WHERE incidencia_id = 'ID'
ORDER BY fecha DESC;
```

Un update invalido como `Cancelada` se rechaza antes de abrir la transaccion. Si falla el update o el insert de historial, la transaccion se revierte y el estado original permanece.

## 8. Resultado

- TAL-41: implementada en esquema y servicio.
- Modelo `HistorialIncidencia`: presente.
- FK hacia `Incidencias`: implementada.
- `usuario_id`, estados y fecha: implementados.
- Automatizacion: implementada mediante servicio transaccional.
- Migracion: creada.
- Pruebas unitarias: incluidas.
- Aplicacion contra PostgreSQL: requiere que este disponible `localhost:5434`.
