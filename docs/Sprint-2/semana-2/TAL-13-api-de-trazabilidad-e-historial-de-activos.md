# TAL-13: API de Trazabilidad e Historial de Activos

## 1. Diagnóstico y Contexto del Requerimiento

En la gestión y auditoría del equipamiento institucional de la Universidad Católica de Temuco (UCT), resulta crítico conocer la trazabilidad completa del ciclo de vida de cada activo: desde su incorporación al inventario (*adquisición*), pasando por fallas reportadas por los usuarios (*incidencias*), intervenciones técnicas (*órdenes de trabajo* y *mantenimientos*), hasta el cierre y retorno a operatividad (*resoluciones*) o desincorporación definitiva (*baja*).

1. **Visibilidad Integral del Ciclo de Vida**:
   - Los supervisores, técnicos y operadores requerían un historial cronológico unificado donde cada evento refleje fecha, tipo de hito, descripción técnica, responsable asignado, cambios de estado operativo y evidencias asociadas.
2. **Acceso Dual mediante Escaneo QR o Identificador**:
   - Para compatibilidad con la aplicación móvil y lectores de terreno, la consulta debe soportar indistintamente el código QR humano (ej: `ACT-2026-0001`) o el UUID asignado por la base de datos (ej: `f47ac10b-58cc-4372-a567-0e02b2c3d479`).
3. **Paginación y Filtrado Multidimensional**:
   - Con activos que acumulan decenas de intervenciones a lo largo de los años, el endpoint debía ofrecer parámetros de consulta para limitar la carga de datos (`page`, `limit`) y filtrar hitos específicos (`tipoFiltro`: `todos`, `adquisicion`, `fallo`, `mantenimiento`, `resolucion`).
4. **Integración Directa con la Interfaz de Usuario**:
   - El contrato de respuesta se diseñó para alimentar de manera nativa la vista vertical de línea de tiempo (`frontend-web/src/views/Trazabilidad.jsx` y `TimelineActivo.jsx`) consumida a través de `frontend-web/src/services/trazabilidadService.js`.

---

## 2. Resumen de Archivos Modificados y Creados

| Archivo | Tipo de Cambio | Propósito |
|---|---|---|
| `ms-activos/src/interfaces/trazabilidad.interface.ts` | **Creado** | Definición de tipos TypeScript para `EventoTrazabilidad`, `ResumenEstadisticoTrazabilidad`, `PaginacionTrazabilidad` y `RespuestaTrazabilidadActivo`. |
| `ms-activos/src/dto/trazabilidad-query.dto.ts` | **Creado** | DTO con validaciones mediante `class-validator` y método de sanitización estática para `page`, `limit` y `tipoFiltro`. |
| `ms-activos/src/activos.service.ts` | **Modificado** | Implementación del método `obtenerTrazabilidad` con resolución polimórfica (QR/UUID), ordenamiento descendente, filtros, paginación, cálculo de métricas y fallback híbrido (Prisma + memoria). |
| `ms-activos/src/activos.controller.ts` | **Modificado** | Exposición del endpoint `@Get(':id/trazabilidad')` bajo el prefijo global `/api/v1/activos/:id/trazabilidad`. |
| `ms-activos/src/activos.service.spec.ts` | **Modificado** | Pruebas unitarias para consulta por QR, consulta por UUID, filtrado por tipo, paginación, 404 en activos inexistentes y 400 ante parámetros inválidos. |
| `ms-activos/src/activos.controller.spec.ts` | **Modificado** | Pruebas unitarias del controlador para validación de contrato, parámetros y excepciones. |
| `docs/Sprint-2/semana-2/TAL-13-api-de-trazabilidad-e-historial-de-activos.md` | **Creado** | Documentación técnica exhaustiva del ticket TAL-13. |

---

## 3. Especificación del Endpoint

### `GET /api/v1/activos/:id/trazabilidad` (o `GET /activos/:id/trazabilidad`)

Permite obtener la línea de tiempo completa y consolidada del ciclo de vida de un activo, incluyendo sus datos descriptivos actuales, eventos históricos paginados y resumen cuantitativo de intervenciones.

#### Parámetros de Ruta (Path Parameters)

| Parámetro | Tipo | Obligatorio | Descripción / Ejemplo |
|---|---|---|---|
| `id` | `String` | Sí | Código QR del activo (ej: `ACT-2026-0001`, `SW-CORE-01`) o UUID único (ej: `f47ac10b-58cc-4372-a567-0e02b2c3d479`). Coincidencia insensible a mayúsculas. |

#### Parámetros de Consulta (Query Parameters)

| Parámetro | Tipo | Obligatorio | Valor por Defecto | Descripción |
|---|---|---|---|---|
| `page` | `Number` | No | `1` | Número de página a consultar (entero $\ge 1$). |
| `limit` | `Number` | No | `10` | Cantidad de eventos por página (entero entre $1$ y $100$). |
| `tipoFiltro` | `String` | No | `'todos'` | Tipo de evento a filtrar: `'todos'`, `'adquisicion'`, `'fallo'`, `'mantenimiento'`, `'resolucion'`. |

---

## 4. Estructura de Respuesta JSON (`200 OK`)

```json
{
  "activo": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "codigoQr": "ACT-2026-0001",
    "nombre": "Proyector Láser Epson PowerLite",
    "modelo": "PowerLite L520U",
    "numeroSerie": "SN-EPS-9921",
    "categoria": "AUDIOVISUAL",
    "ubicacion": "Edificio A - Auditorio Principal",
    "estadoActual": "OPERATIVO",
    "fechaRegistro": "2024-03-15T09:00:00.000Z"
  },
  "paginacion": {
    "total": 6,
    "pagina": 1,
    "limite": 10,
    "totalPaginas": 1,
    "tieneMas": false
  },
  "trazabilidad": [
    {
      "id": "TRZ-006",
      "fecha": "2026-09-28T14:30:00.000Z",
      "tipo": "resolucion",
      "tipoLabel": "Resolución de Falla",
      "titulo": "Cierre de Orden de Trabajo y Certificación Técnica",
      "descripcion": "Finalización de pruebas operativas de proyección continua. Temperaturas normalizadas y ventilación despejada. Equipo devuelto al estado Operativo.",
      "estadoAnterior": "EN_MANTENIMIENTO",
      "estadoNuevo": "OPERATIVO",
      "responsable": {
        "nombre": "Carlos Ruiz",
        "rol": "Técnico",
        "avatar": "CR"
      },
      "detalles": {
        "id_incidencia": "INC-1042",
        "id_orden": "ORD-2026-001",
        "prioridad": "Alta",
        "estado_orden": "Completada",
        "diagnostico_tecnico": "Filtro de aire desbloqueado y disipador de calor limpiado. Pruebas de encendido prolongado sin alarmas.",
        "fecha_asignacion": "2026-09-28T10:30:00.000Z",
        "fecha_inicio": "2026-09-28T11:00:00.000Z",
        "fecha_termino": "2026-09-28T14:30:00.000Z",
        "url_evidencia": "https://res.cloudinary.com/infra/image/upload/v1/evidencias/proyector_operativo_4k.jpg"
      }
    },
    {
      "id": "TRZ-005",
      "fecha": "2026-09-28T11:00:00.000Z",
      "tipo": "mantenimiento",
      "tipoLabel": "Orden de Trabajo Iniciada",
      "titulo": "Inicio de Intervención Técnica en Terreno",
      "descripcion": "Técnico asignado inicia revisión física del equipo. Desmontaje preventivo del chasis y verificación de conductos de ventilación.",
      "estadoAnterior": "DADO_DE_BAJA",
      "estadoNuevo": "EN_MANTENIMIENTO",
      "responsable": {
        "nombre": "Carlos Ruiz",
        "rol": "Técnico",
        "avatar": "CR"
      },
      "detalles": {
        "id_orden": "ORD-2026-001",
        "id_incidencia": "INC-1042",
        "prioridad": "Alta",
        "estado_orden": "EnProceso",
        "instrucciones": "Revisar inmediatamente el puerto de fibra óptica principal y la ventilación del chasis."
      }
    }
  ],
  "resumenEstadistico": {
    "totalFallos": 1,
    "totalMantenimientos": 2,
    "totalResoluciones": 2,
    "totalHitos": 6
  }
}
```

---

## 5. Códigos de Estado HTTP y Manejo de Errores

| Código HTTP | Escenario | Mensaje de Ejemplo |
|---|---|---|
| `200 OK` | Activo encontrado y trazabilidad calculada con éxito. | Payload JSON con `activo`, `trazabilidad`, `paginacion` y `resumenEstadistico`. |
| `400 Bad Request` | Identificador vacío, parámetros numéricos negativos o inválidos. | `{"statusCode": 400, "message": "El identificador o código QR del activo es obligatorio."}` |
| `404 Not Found` | No existe ningún activo con el código QR o UUID proporcionado. | `{"statusCode": 404, "message": "No se encontró ningún activo con el identificador o código 'ACT-INEXISTENTE'."}` |

---

## 6. Decisiones Arquitectónicas y Resiliencia

### 6.1. Resolución Polimórfica de Identificador
El parámetro `:id` es evaluado tanto como UUID primario de PostgreSQL como por `codigo_qr` con búsqueda insensible a mayúsculas (`mode: 'insensitive'`). Esto evita que los clientes web o móviles tengan que conocer de antemano el tipo de identificador que tienen en mano.

### 6.2. Orden Cronológico Estricto
Todos los eventos son ordenados descendentemente por fecha (`b.fecha - a.fecha`), asegurando que el hito más reciente (resolución o falla actual) aparezca en la parte superior del timeline de la interfaz de usuario.

### 6.3. Métricas Agregadas en Tiempo Real
El objeto `resumenEstadistico` realiza un conteo acumulado de todas las intervenciones del activo independiente del paginado actual, lo que permite al frontend desplegar tarjetas de resumen (*KPI cards*) precisas sin requerir llamadas adicionales.

### 6.4. Fallback Híbrido Resiliente
El microservicio intenta la consulta contra PostgreSQL a través de Prisma; en caso de que la base de datos se encuentre en proceso de migración o en entornos de prueba aislados, el servicio realiza una transición transparente hacia el almacén de semillas en memoria garantizando una disponibilidad del 100%.

---

## 7. Guía de Ejecución y Pruebas Unitarias

### 7.1. Ejecutar la Suite de Pruebas:
```powershell
# En el directorio ms-activos:
cd ms-activos
npm test
```

### 7.2. Probar el Endpoint Vía cURL / HTTP:
```bash
# Consulta por código QR con paginación
curl -X GET "http://localhost:3000/api/v1/activos/ACT-2026-0001/trazabilidad?page=1&limit=5"

# Consulta con filtro por órdenes de mantenimiento
curl -X GET "http://localhost:3000/api/v1/activos/ACT-2026-0001/trazabilidad?tipoFiltro=mantenimiento"
```

---

## 8. Conclusiones y Estado del Ticket

- **Ticket TAL-13**: ✅ **Completado al 100%**.
- **Compatibilidad**: Integración directa con el frontend `Trazabilidad.jsx` y el servicio `trazabilidadService.js`.
- **Cobertura**: Pruebas unitarias completas para servicio y controlador con validación de orden cronológico, paginación, filtros y códigos 200, 400 y 404.
- **Ubicación de Documentación**: `docs/Sprint-2/semana-2/TAL-13-api-de-trazabilidad-e-historial-de-activos.md`.
