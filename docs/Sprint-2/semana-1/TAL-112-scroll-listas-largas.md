# TAL-112: Scroll Infinito en Listas Largas (Dashboard y Usuarios)

## 1. Contexto y Objetivos del Requerimiento

El objetivo de esta tarea consistió en optimizar la experiencia de usuario (UX) al explorar colecciones extensas de incidencias y usuarios, evitando la sobrecarga innecesaria del DOM y reduciendo los tiempos de respuesta iniciales.

### Criterios de Aceptación Cumplidos:
- **Carga inicial optimizada**: Se limita la petición inicial a los primeros 15 registros tanto en la tabla del Dashboard como en el Directorio de Usuarios.
- **Scroll Infinito con IntersectionObserver**: Al alcanzar el 80% del desplazamiento vertical del contenedor, se dispara de forma transparente la solicitud de la siguiente página (`page=2`, `page=3`, etc.).
- **Indicador de carga suave**: Se presenta un componente spinner con animación fluida en la base de la tabla mientras se reciben y anexan los nuevos registros.
- **Conexión real con PostgreSQL**: Todos los datos se obtienen directamente desde las bases de datos de los microservicios correspondientes, respetando los atributos definidos en los esquemas Prisma.
- **Sin comentarios en el código**: Todo el código generado y ajustado prescinde de comentarios.

---

## 2. Modelado de Datos y Respeto a los Esquemas Prisma

En concordancia con la arquitectura de microservicios, se mapearon con precisión las entidades existentes en sus respectivas bases de datos PostgreSQL:

### Microservicio de Autenticación (`ms-auth`)
Tabla `USUARIOS` (PostgreSQL `auth_db` en puerto `5435`):
- `id_usuario` (`String`, UUID generado en base)
- `rut_o_id` (`String`, identificador único)
- `nombre` (`String`)
- `apellido` (`String`)
- `email` (`String`, correo electrónico institucional)
- `id_rol` (`Int`, relación foránea con tabla `ROLES`)
- `fecha_creacion` (`DateTime`)
- `fecha_eliminacion` (`DateTime`, nullable para bajas lógicas)

### Microservicio de Incidencias (`ms-incidencias`)
Tabla `INCIDENCIAS` (PostgreSQL `incidencias_db` en puerto `5434`):
- `id_incidencia` (`UUID`)
- `id_activo` (`UUID`)
- `id_reportante` (`UUID`)
- `titulo` (`VarChar(255)`)
- `descripcion` (`Text`)
- `fecha_creacion` (`Timestamp`)
- Relación con `HISTORIAL_ESTADOS` y `ESTADOS_INCIDENCIA` para resolver el estado vigente de cada reporte.

---

## 3. Resumen de Archivos Creados y Modificados

| Componente / Archivo | Tipo | Propósito |
|---|---|---|
| `ms-incidencias/src/incidencias/dto/listar-incidencias-query.dto.ts` | Modificado | Incorporación de los parámetros `page`, `pagina`, `limit` y `limite` para soporte de paginación. |
| `ms-incidencias/src/incidencias/incidencias.service.ts` | Modificado | Implementación de `LIMIT` y `OFFSET` en la consulta SQL cruda para segmentar resultados en lotes de 15. |
| `ms-auth/src/auth/user.repository.ts` | Modificado | Incorporación del método `findMany(page, limit)` con paginación `skip`/`take` y conteo total. |
| `ms-auth/src/auth/auth.service.ts` | Modificado | Implementación de `listUsers(page, limit)` formateando los campos según el modelo Prisma. |
| `ms-auth/src/auth/auth.controller.ts` | Modificado | Exposición del endpoint protegido `GET /auth/usuarios` con soporte de `page` y `limit`. |
| `api gateway/index.js` | Modificado | Enrutamiento proxy hacia `ms-auth` para `/api/v1/usuarios` y `/api/v1/auth/usuarios` apuntando a `http://127.0.0.1:3001`. |
| `api gateway/.env` | Creado | Definición de variables de entorno locales de upstream apuntando a loopback IPv4. |
| `seed-rapido.cjs` | Creado | Script de inicialización rápida que siembra 40 usuarios en `auth_db` y 40 incidencias en `incidencias_db`. |
| `frontend-web/src/hooks/useInfiniteScroll.js` | Creado | Hook personalizado basado en `IntersectionObserver` que detecta el 80% del scroll y gestiona el ciclo de vida de páginas y estados de carga. |
| `frontend-web/src/services/usuariosService.js` | Creado | Servicio HTTP de frontend para invocar `/usuarios` con parámetros de paginación. |
| `frontend-web/src/views/Dashboard.jsx` | Modificado | Implementación de scroll infinito en la tabla de incidencias del panel principal con carga inicial de 15 registros. |
| `frontend-web/src/views/Usuarios.jsx` | Modificado | Sustitución de datos estáticos por datos reales de PostgreSQL consumidos con scroll infinito e `IntersectionObserver`. |

---

## 4. Especificación de Endpoints

### 4.1. Listado Paginado de Incidencias
- **Método y Ruta**: `GET /api/v1/incidencias`
- **Headers**: `Authorization: Bearer <token_jwt>`
- **Parámetros Query**:
  - `page`: Número de página (ej. `1`, `2`, `3`). Por defecto `1`.
  - `limit`: Cantidad por lote. Por defecto `15`.
- **Respuesta `200 OK`**: Arreglo de incidencias con sus estados actuales mapeados.

### 4.2. Listado Paginado de Usuarios
- **Método y Ruta**: `GET /api/v1/usuarios` (o `/api/v1/auth/usuarios`)
- **Headers**: `Authorization: Bearer <token_jwt>`
- **Parámetros Query**:
  - `page`: Número de página (ej. `1`, `2`). Por defecto `1`.
  - `limit`: Cantidad por lote. Por defecto `15`.
- **Respuesta `200 OK`**:
  ```json
  {
    "datos": [
      {
        "id_usuario": "uuid",
        "rut_o_id": "TEST-100",
        "nombre": "Carlos",
        "apellido": "Gonzalez",
        "correo": "usuario.prueba.1@empresa.com",
        "rol": "Técnico",
        "fecha_creacion": "2026-09-02T10:00:00.000Z",
        "estado": "activo"
      }
    ],
    "total": 43,
    "pagina": 1,
    "limite": 15,
    "totalPaginas": 3
  }
  ```

---

## 5. Mecanismo de Infinite Scroll con IntersectionObserver

El hook `useInfiniteScroll` encapsula la lógica reactiva:
1. **Contenedor scrolleable**: El elemento padre dispone de `overflow-y-auto max-h-[520px]` con cabecera fija (`sticky top-0`).
2. **Cálculo del 80%**: Se asigna una referencia `sentinelRef` a la fila correspondiente al 80% de la lista actualmente cargada (`Math.floor(items.length * 0.8) - 1`).
3. **Observación pasiva**: Una instancia de `IntersectionObserver` observa este centinela con `threshold: 0.1` relativo al contenedor. En el momento en que dicha fila entra en la zona visible, se ejecuta `loadNextPage()` de forma transparente.
4. **Spinner suave**: Mientras `loadingMore` es verdadero, se renderiza un spinner con animación SVG en la parte inferior de la tabla.
5. **Cierre de paginación**: Si la respuesta entrega menos elementos que el límite solicitado o se alcanza el total, el observer se desconecta y se exhibe el indicador de fin de catálogo.

---

## 6. Pruebas y Validación Realizadas

1. **Población de datos**: Se ejecutó `seed-rapido.cjs`, insertando con éxito 40 registros de prueba en `incidencias_db` y 40 usuarios en `auth_db`.
2. **Pruebas de API**: Se verificó la respuesta de `GET /api/v1/incidencias?page=1&limit=15` (15 registros) y `page=2&limit=15` (15 registros siguientes), al igual que en `/api/v1/usuarios`.
3. **Prueba End-to-End con Browser Subagent**:
   - Inicio de sesión en `http://localhost:5173/` con credenciales `admin@empresa.com`.
   - Navegación al Dashboard: visualización inicial de 15 incidencias.
   - Desplazamiento al 80%: solicitud automática y transparente de la página 2, pasando a 30 registros con visualización del spinner.
   - Desplazamiento adicional: carga final de la página 3 hasta alcanzar los 41 registros.
   - Navegación a `/usuarios`: carga inicial de 15 usuarios, activación del spinner al 80% del scroll y carga de las páginas consecutivas hasta alcanzar los 43 usuarios de la base de datos.
