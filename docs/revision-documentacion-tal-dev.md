# Auditoria de documentacion TAL en la rama dev

Fecha de revision: 2026-09-24  
Rama revisada: `dev` local (`64144c6`)  
Referencia: `origin/dev` apunta a otro commit (`467f5bd`); este informe usa la rama local solicitada.

## Resumen

En `dev` existen seis documentos TAL: `TAL-22`, `TAL-23`, `TAL-34`, `TAL-35`, `TAL-40` y `TAL-41`.

`TAL-52` no tiene documento, modelo, migracion ni script de validacion en `dev`. Esos archivos aparecen en la rama actual `TAL-52`, no en el snapshot auditado.

La presencia de un documento no implica que todo el alcance descrito este implementado. El estado siguiente separa documentacion, evidencia de codigo y validacion.

## Matriz de revision

| TAL | Documento en dev | Evidencia en codigo de dev | Estado | Observaciones |
| --- | --- | --- | --- | --- |
| TAL-22 | Si | `ms-auth` tiene `package.json`, `main.ts`, `AppModule`, Auth y Prisma | Parcial | La inicializacion existe, pero la documentacion afirma que se eliminaron `app.controller.ts` y `app.service.ts`; ambos siguen presentes y exponen el endpoint de ejemplo. |
| TAL-23 | Si | `ms-auth/prisma/schema.prisma` y migracion de `User`/`Role` | Parcial | La relacion 1:N y los UUID de `User` estan implementados, pero `Role.id` es `Int` autoincremental, no UUID como afirma la decision documentada. |
| TAL-34 | Si | `AllExceptionsFilter` registrado en `ms-auth/src/main.ts` | Parcial | El filtro global existe en `ms-auth`, pero no esta registrado en `ms-incidencias` ni `ms-activos`; por tanto no cumple la afirmacion general para todos los microservicios. |
| TAL-35 | Si | El filtro construye `statusCode`, `timestamp`, `path` y `message` | Parcial | `message` puede ser `string` para excepciones simples. El documento exige siempre `string[]`. No se encontro una prueba que verifique ese contrato. |
| TAL-40 | Si | Enum `EstadoIncidencia`, columna `Incidencias.estado` y migracion | Implementado en datos | El modelo y la restriccion estan presentes. La creacion de incidencias no tiene endpoint propio; la validacion contra una base real queda pendiente de ejecutar en el entorno auditado. |
| TAL-41 | Si | `HistorialIncidencia`, `PATCH /incidencias/:id/estado`, transaccion y pruebas unitarias | Parcial | El update e historial atomico estan implementados. El controlador lee `request.user`, pero no aplica un guard de autenticacion local; las pruebas e2e solo cubren `/`. |
| TAL-52 | No | No existe `Evidencia`, migracion ni `validate-evidencia.cjs` en `dev` | Ausente | La implementacion corresponde a la rama `TAL-52` y no forma parte de la rama `dev` auditada. |

## Hallazgo bloqueante en dev

El codigo de `dev` contiene declaraciones duplicadas en:

- `ms-incidencias/src/prisma/prisma.service.ts`: dos clases `PrismaService`.
- `ms-incidencias/src/prisma/prisma.module.ts`: imports duplicados y dos clases `PrismaModule`.

Esto impide considerar estable la implementacion de incidencias en `dev` y contradice el cierre de la documentacion de `TAL-41`. La rama `TAL-52` elimina esas duplicaciones como parte de sus cambios.

## Documentacion que falta

No hay documento TAL propio en `docs` para:

- `TAL-28`, aunque se menciona en la justificacion tecnologica y en `TAL-23`.
- `TAL-50`, mencionado como dependencia del frontend en `TAL-35`.
- `TAL-88`, mencionado en el reporte de estado de semana 1.
- `TAL-52`, que tampoco esta implementado en `dev`.

Estas menciones no se consideran prueba suficiente de implementacion. Cada tarjeta deberia tener una nota tecnica o una referencia verificable al codigo, pruebas y estado de validacion.

## Conclusion

La documentacion de `dev` cubre seis tarjetas, pero solo `TAL-40` puede considerarse implementada de forma completa en el modelo de datos. `TAL-22`, `TAL-23`, `TAL-34`, `TAL-35` y `TAL-41` requieren corregir el alcance documentado, completar la implementacion o agregar pruebas. `TAL-52` debe documentarse e integrarse en `dev` si forma parte del alcance de la rama.
