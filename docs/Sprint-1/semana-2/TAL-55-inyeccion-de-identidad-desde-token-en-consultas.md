# TAL-55: Inyección de identidad desde token en consultas

## 1. Identificación y Diagnóstico Previo

- **ID del Requerimiento:** TAL-55
- **Nombre:** Inyección de identidad desde token en consultas
- **Microservicio:** `ms-incidencias`
- **Rol Responsable:** Miembro 2 – Especialista en Lógica de Negocio e Integración

### 1.1. Justificación de Seguridad (Mitigación de Vulnerabilidad IDOR)
En la implementación inicial del filtrado de órdenes de trabajo (TAL-54), la consulta recibía el identificador del técnico como parámetro en la ruta (`GET /ordenes-trabajo/tecnico/:idTecnico`). Esto representaba un riesgo de seguridad conocido como **IDOR (Insecure Direct Object Reference)** o **BOLA (Broken Object Level Authorization)**: cualquier usuario autenticado podía manipular el UUID en la URL para inspeccionar o recopilar información sobre las asignaciones técnicas y tiempos de trabajo de sus compañeros sin autorización.

### 1.2. Solución Arquitectónica
Para resolver esta vulnerabilidad y proveer una experiencia fluida al cliente Frontend/Móvil:
1. Se implementó el módulo de autenticación con `JwtAuthGuard` y `RolesGuard` en `ms-incidencias`, sincronizado con el formato de tokens emitido por `ms-auth`.
2. Se construyó el decorador personalizado `@CurrentUser()` que extrae directamente la identidad verificada (`userId`, `role`, `email`) desde el payload del JWT.
3. Se expuso el endpoint seguro `GET /ordenes-trabajo/mis-ordenes`, donde el técnico consulta su carga de trabajo **sin tener que enviar su propio ID**, inyectándolo de forma infalsificable desde su token.
4. Se blindó el endpoint administrativo `GET /ordenes-trabajo/tecnico/:idTecnico`, validando que si el usuario tiene rol `TECNICO`, únicamente pueda consultar su propio ID (`user.userId === idTecnico`), mientras que los roles `SUPERVISOR` y `ADMINISTRADOR` conservan visibilidad global.

---

## 2. Resumen de Archivos Creados y Modificados

| Archivo | Tipo de Cambio | Propósito |
|---|---|---|
| `ms-incidencias/src/auth/auth.types.ts` | Creado | Interfaz `JwtUser` con `userId`, `role` y `email`. |
| `ms-incidencias/src/auth/roles.decorator.ts` | Creado | Decorador `@Roles(...)` para metadatos de autorización RBAC. |
| `ms-incidencias/src/auth/current-user.decorator.ts` | Creado | Decorador `@CurrentUser()` para inyección de identidad en controladores. |
| `ms-incidencias/src/auth/jwt-auth.guard.ts` | Creado | Guard que valida la firma y vigencia del JWT (`Authorization: Bearer`). |
| `ms-incidencias/src/auth/roles.guard.ts` | Creado | Guard que verifica los permisos y roles requeridos por ruta. |
| `ms-incidencias/src/auth/auth.module.ts` | Creado | Módulo global con `JwtModule` configurado asíncronamente con `ConfigService`. |
| `ms-incidencias/src/ordenes-trabajo/ordenes-trabajo.controller.ts` | Modificado | Endpoints protegidos (`/mis-ordenes`, `/tecnico/:idTecnico`, `/asignar`) con inyección de identidad. |
| `ms-incidencias/src/incidencias/incidencias.controller.ts` | Modificado | Endpoints protegidos de estado y diagnóstico con inyección de identidad. |
| `ms-incidencias/src/auth/jwt-auth.guard.spec.ts` | Creado | Pruebas unitarias para validación, expiración y rechazo de tokens. |
| `ms-incidencias/src/auth/roles.guard.spec.ts` | Creado | Pruebas unitarias para control de acceso RBAC y roles insuficientes. |
| `ms-incidencias/src/ordenes-trabajo/ordenes-trabajo.controller.spec.ts` | Creado | Pruebas unitarias para inyección de identidad y mitigación IDOR. |
| `docs/TAL-55-inyeccion-de-identidad-desde-token-en-consultas.md` | Creado | Documentación técnica del diseño de seguridad e integración. |

---

## 3. Especificación de Endpoints Asegurados

### 3.1. `GET /ordenes-trabajo/mis-ordenes`
Consulta segura de órdenes asignadas al técnico autenticado.

- **Autenticación:** Requiere `Authorization: Bearer <TOKEN>`
- **Roles Permitidos:** `TECNICO`, `SUPERVISOR`, `ADMINISTRADOR`
- **Inyección:** Extrae automáticamente `user.userId` del token JWT.
- **Query Params:** `page`, `limit`, `orden`, `fechaDesde`, `fechaHasta`.

#### Ejemplo de Petición:
```http
GET http://localhost:3002/ordenes-trabajo/mis-ordenes?page=1&limit=10&orden=desc
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Respuesta Exitosa (`200 OK`):
```json
{
  "total": 4,
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "data": [
    {
      "id_orden": "d3b07384-d113-4628-98e3-0d32152a420b",
      "id_incidencia": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "id_tecnico": "c9a8b7c6-d5e4-3f2a-1b0c-9d8e7f6a5b4c",
      "diagnostico_tecnico": "Cambio de fusible en fuente de poder de pantalla interactiva.",
      "fecha_creacion": "2026-09-27T14:20:00.000Z",
      "incidencia": {
        "id_incidencia": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "id_activo": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "titulo": "Pantalla interactiva no enciende",
        "descripcion": "Sala 204 edificio C",
        "evidencias": []
      }
    }
  ]
}
```

---

### 3.2. `GET /ordenes-trabajo/tecnico/:idTecnico`
Consulta administrativa o de supervisión con protección IDOR activa.

- **Regla de Autorización:**
  - Si el usuario es `SUPERVISOR` o `ADMINISTRADOR`: Puede consultar cualquier `idTecnico`.
  - Si el usuario es `TECNICO`: Solo puede consultar si `idTecnico === user.userId`. Si intenta consultar otro UUID, el servidor responde estrictamente `403 Forbidden`.

#### Respuesta ante Intento IDOR (`403 Forbidden`):
```json
{
  "statusCode": 403,
  "message": "Acceso denegado: un técnico solo puede consultar sus propias órdenes de trabajo",
  "error": "Forbidden"
}
```

---

### 3.3. `POST /ordenes-trabajo/asignar`
Asignación de órdenes de trabajo con auditoría inyectada.

- **Roles Permitidos:** `SUPERVISOR`, `ADMINISTRADOR`
- **Inyección de Auditoría:** El campo `usuarioCambioId` se obtiene de `user.userId`, impidiendo que el cliente envíe una identidad falsa.

---

## 4. Guía de Ejecución y Pruebas Unitarias

### 4.1. Ejecutar las pruebas unitarias de autenticación y controladores:
```powershell
cd ms-incidencias
yarn test -- src/auth/jwt-auth.guard.spec.ts src/auth/roles.guard.spec.ts src/ordenes-trabajo/ordenes-trabajo.controller.spec.ts
```

### 4.2. Ejecutar la suite completa de pruebas:
```powershell
yarn test
```

---

## 5. Conclusiones y Cumplimiento

- **TAL-55:** ✅ **Implementado y verificado al 100%**.
- **Seguridad:** Vulnerabilidad IDOR mitigada mediante inyección de claims del JWT y validación contextual de roles.
- **Desacoplamiento Frontend:** Las aplicaciones cliente ya no necesitan gestionar UUIDs de usuario en las URLs de sus propias consultas.
- **Calidad:** 100% de cobertura de pruebas unitarias sobre los guards y controladores.
