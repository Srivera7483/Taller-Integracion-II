# TAL-43: Controlador REST para asignación de órdenes

## 1. Diagnóstico previo

- Las entidades `Incidencias`, `HistorialIncidencia` y `OrdenTrabajo` se encuentran modeladas en `ms-incidencias/prisma/schema.prisma` tras la finalización de TAL-40, TAL-41 y TAL-42.
- Se detectaron y corrigieron errores de duplicidad en `src/prisma/prisma.module.ts` y `src/prisma/prisma.service.ts` originados en merges previos de la rama `dev`.
- Se generó el cliente de Prisma (`npx prisma generate`) para exponer los tipos TypeScript de `OrdenTrabajo` y `EstadoOrdenTrabajo`.
- Faltaba la capa de controladores y servicios REST encargada de procesar las solicitudes de asignación de técnicos a las incidencias reportadas.
- La asignación requería una operación atómica: crear la orden de trabajo, transicionar el estado de la incidencia a `Asignada` y generar el registro de auditoría correspondiente en una única transacción de base de datos.

---

## 2. Resumen técnico

- `ms-incidencias/src/ordenes-trabajo/dto/asignar-orden.dto.ts`: DTO que valida los parámetros de entrada (`incidencia_id`, `tecnico_id`, `instrucciones`).
- `ms-incidencias/src/ordenes-trabajo/ordenes-trabajo.service.ts`: Servicio con la lógica transaccional que crea la orden, actualiza la incidencia y registra el historial.
- `ms-incidencias/src/ordenes-trabajo/ordenes-trabajo.controller.ts`: Expone los endpoints REST para la asignación y consulta de órdenes de trabajo.
- `ms-incidencias/src/ordenes-trabajo/ordenes-trabajo.module.ts`: Módulo NestJS que registra el controlador y servicio.
- `ms-incidencias/src/app.module.ts`: Limpia la estructura e integra `OrdenesTrabajoModule` en el árbol raíz.
- `ms-incidencias/src/prisma/prisma.module.ts` y `prisma.service.ts`: Corrección y limpieza de código duplicado para garantizar 0 errores de compilación.
- `ms-incidencias/src/ordenes-trabajo/ordenes-trabajo.service.spec.ts`: Suite de pruebas unitarias cubriendo asignación exitosa, validaciones de entrada, rechazo de incidencias inexistentes o resueltas.
- `docs/TAL-43-controlador-rest-para-asignacion-de-ordenes.md`: Documentación técnica de diseño, justificación y pruebas.

---

## 3. Endpoints Expuestos

| Método | Ruta | Código HTTP | Descripción |
|---|---|---|---|
| `POST` | `/ordenes-trabajo/asignar` | `201 Created` | Asigna una orden de trabajo a un técnico, cambia el estado de la incidencia a `Asignada` y registra auditoría. |
| `GET` | `/ordenes-trabajo` | `200 OK` | Lista todas las órdenes de trabajo con la información de su incidencia asociada. |
| `GET` | `/ordenes-trabajo/tecnico/:tecnicoId` | `200 OK` | Lista las órdenes de trabajo asignadas a un técnico específico (optimizado por índice). |
| `GET` | `/ordenes-trabajo/:id` | `200 OK` | Obtiene el detalle de una orden de trabajo por su identificador único. |

---

## 4. Flujo de Ejecución y Lógica Transaccional

```
[ Cliente / Supervisor ]
          │ POST /ordenes-trabajo/asignar { incidencia_id, tecnico_id, instrucciones }
          ▼
[ OrdenesTrabajoController ] ➔ Extrae 'supervisorId' de request.user
          │
          ▼
[ OrdenesTrabajoService.asignarOrden ]
          │
    ┌─────┴──────────────────────────────────────────────────────┐
    │ Transacción Atómica (prisma.$transaction)                  │
    │ 1. Verifica existencia de la Incidencia                    │
    │    - Si no existe ➔ NotFoundException                      │
    │    - Si estado == Resuelta ➔ BadRequestException           │
    │ 2. Inserta OrdenTrabajo (estado: Pendiente)               │
    │ 3. Actualiza Incidencias.estado ➔ Asignada                 │
    │ 4. Inserta HistorialIncidencia (Auditoría de transición)   │
    └─────┬──────────────────────────────────────────────────────┘
          │ (Commit atómico de todas las operaciones)
          ▼
[ 201 Created - Retorna OrdenTrabajo generada ]
```

---

## 5. Decisiones Arquitectónicas

### 5.1. Atomicidad Transaccional (`$transaction`)
Toda la lógica de asignación se encapsula en una transacción de Prisma. Si la creación de la orden, la actualización de la incidencia o la inserción de la auditoría fallan, la base de datos ejecuta un *rollback* automático, garantizando que jamás existan estados inconsistentes.

### 5.2. Desacoplamiento de Identidad con `ms-auth`
El servicio valida la presencia de `supervisorId` y `tecnico_id` como identificadores UUID. La autenticación y el rol de técnico se verifican mediante el token JWT y el Gateway perimetral, manteniendo la autonomía de las bases de datos de cada microservicio.

---

## 6. Guía de Pruebas y Validación

### Ejecución de pruebas unitarias:
```powershell
yarn run test -- src/ordenes-trabajo/ordenes-trabajo.service.spec.ts
```

### Ejemplo de Petición HTTP (Asignación):
```http
POST http://localhost:3002/ordenes-trabajo/asignar
Authorization: Bearer <TOKEN_SUPERVISOR>
Content-Type: application/json

{
  "incidencia_id": "uuid-incidencia-1234",
  "tecnico_id": "uuid-tecnico-5678",
  "instrucciones": "Revisar proyector en Auditorio Principal."
}
```

### Respuesta Exitosa (`201 Created`):
```json
{
  "id_orden": "orden-uuid-9999",
  "incidencia_id": "uuid-incidencia-1234",
  "tecnico_id": "uuid-tecnico-5678",
  "estado": "Pendiente",
  "instrucciones": "Revisar proyector en Auditorio Principal.",
  "fecha_asignacion": "2026-09-25T19:10:00.000Z",
  "fecha_inicio": null,
  "fecha_termino": null
}
```

---

## 7. Resultado

- **TAL-43:** Implementado completamente (Controlador, Servicio, DTO, Módulo y Pruebas).
- **Lógica Transaccional:** Integra `OrdenTrabajo`, `Incidencias` y `HistorialIncidencia`.
- **Correcciones:** Resueltos 14 errores de compilación por código duplicado en archivos de Prisma.
- **Calidad de Código:** Compilación en verde y pruebas unitarias aprobadas.
