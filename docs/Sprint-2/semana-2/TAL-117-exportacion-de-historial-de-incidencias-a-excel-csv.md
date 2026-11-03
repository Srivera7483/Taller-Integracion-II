# TAL-117: Exportación de Historial de Incidencias a Excel/CSV

## 1. Diagnóstico y Contexto del Requerimiento

En los procesos de auditoría y gestión de calidad de la Universidad Católica de Temuco (UCT), los administradores, jefes de operaciones y supervisores de infraestructura requieren extraer reportes consolidados del historial de incidencias ocurridas en las distintas sedes y campus. 

Previamente, la plataforma solo exponía endpoints de paginación para consumo en interfaces de usuario (`GET /incidencias`), lo que dificultaba exportar reportes integrales para análisis en hojas de cálculo, auditorías externas o presentaciones de métricas directivas.

### Objetivos y Criterios de Aceptación (TAL-117)
1. **Endpoint Dedicado**: Desarrollar en `ms-incidencias` el endpoint `GET /incidencias/exportar` (disponible como `GET /api/v1/incidencias/exportar`).
2. **Formato Dual y Content-Type Dinámico**:
   - Retornar `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` al solicitar formato Excel (`.xlsx`).
   - Retornar `text/csv; charset=utf-8` con cabecera BOM UTF-8 (`\uFEFF`) al solicitar formato CSV (`.csv`).
3. **Legibilidad y Columnas Requeridas**:
   - El archivo descargado debe ser legible y contener de manera obligatoria las columnas:
     - `ID` (Identificador de la incidencia)
     - `Título` (Descripción breve del requerimiento)
     - `Estado` (Estado actual consolidado)
     - `Activo` (Nombre y código del activo vinculado)
     - `Reportante` (Nombre y apellido o email del usuario reportante)
     - `Fecha de Creación` (Fecha y hora legible)
   - Columnas complementarias de alto valor gerencial:
     - `Técnico Asignado` (Nombre del especialista responsable según la orden de trabajo activa, o "Sin asignar")
     - `Prioridad` (Prioridad relativa dinámica calculada)
     - `Escalada` (Indicador "Sí" / "No" ante inactividad > 48h)
     - `Descripción` (Detalle de la falla)
4. **Cruce de Datos Inter-Servicios Resiliente**:
   - Consulta y cruce con `ms-activos` (`MS_ACTIVOS_URL`) y `ms-auth` (`MS_AUTH_URL`).
   - Mecanismo de fallback local con semillas conocidas y UUIDs en caso de indisponibilidad temporal o entorno aislado de pruebas.
5. **Generación al Vuelo (En Memoria)**:
   - Uso de la librería `exceljs` para construir el libro de trabajo y transmitir el buffer binario mediante `StreamableFile` sin generar archivos residuales en disco.

---

## 2. Resumen de Archivos Modificados y Creados

| Archivo | Tipo de Cambio | Propósito |
|---|---|---|
| `ms-incidencias/package.json` | **Modificado** | Incorporación de dependencia `exceljs` (^4.4.0). |
| `ms-incidencias/src/incidencias/interfaces/exportar-incidencias.interface.ts` | **Creado** | Definición de interfaces TypeScript para `OpcionesExportarIncidencias`, `FilaExportacionIncidencia` y `ResultadoExportacion`. |
| `ms-incidencias/src/incidencias/dto/exportar-incidencias-query.dto.ts` | **Creado** | DTO con validaciones mediante `class-validator` para parámetros de exportación (`formato`, `id_activo`, `id_estado`, `fecha_inicio`, `fecha_fin`). |
| `ms-incidencias/src/incidencias/exportar-incidencias.service.ts` | **Creado** | Servicio centralizado encargado de la construcción de filas, formateo de fechas, estilización institucional en Excel, inyección de BOM UTF-8 en CSV y serialización a Buffer. |
| `ms-incidencias/src/incidencias/incidencias.service.ts` | **Modificado** | Integración del método `exportarIncidencias` con filtros Prisma, resolución de datos cruzados (`resolverActivos`, `resolverUsuarios`) y fallback resiliente. |
| `ms-incidencias/src/incidencias/incidencias.controller.ts` | **Modificado** | Exposición de la ruta `@Get('exportar')` antes de las rutas dinámicas por UUID, configurando encabezados de descarga `Content-Type` y `Content-Disposition`. |
| `ms-incidencias/src/incidencias/incidencias.module.ts` | **Modificado** | Registro y exportación de `ExportarIncidenciasService` en el módulo. |
| `ms-incidencias/src/incidencias/exportar-incidencias.service.spec.ts` | **Creado** | Pruebas unitarias completas para generación de archivos Excel/CSV, columnas requeridas, BOM UTF-8 y fallbacks. |
| `ms-incidencias/src/incidencias/incidencias.service.spec.ts` | **Modificado** | Pruebas de integración del servicio confirmando filtros y generación de reportes. |
| `ms-incidencias/src/incidencias/incidencias.controller.spec.ts` | **Creado** | Pruebas unitarias del controlador validando invocación de servicio y asignación de encabezados HTTP. |
| `docs/Sprint-2/semana-2/TAL-117-exportacion-de-historial-de-incidencias-a-excel-csv.md` | **Creado** | Documentación técnica exhaustiva del requerimiento TAL-117. |

---

## 3. Especificación del Endpoint

### `GET /api/v1/incidencias/exportar` (o `GET /incidencias/exportar`)

Genera y descarga un reporte gerencial consolidado de incidencias en formato Excel o CSV.

#### Parámetros de Consulta (Query Parameters)
| Parámetro | Tipo | Obligatorio | Default | Descripción |
|---|---|---|---|---|
| `formato` | `string` | No | `'xlsx'` | Formato del archivo a generar: `'xlsx'`, `'excel'` o `'csv'`. |
| `id_activo` | `UUID` | No | `null` | Filtra las incidencias por un activo específico. |
| `id_estado` | `number` | No | `null` | Filtra por el estado actual de la incidencia (1: Reportada, 2: Asignada, 3: Resuelta, etc.). |
| `fecha_inicio` | `ISO string` | No | `null` | Filtro de fecha mínima de creación (ej: `2026-01-01`). |
| `fecha_fin` | `ISO string` | No | `null` | Filtro de fecha máxima de creación (ej: `2026-12-31`). |

#### Encabezados de Respuesta (`200 OK`)
- **Excel (`formato=xlsx`)**:
  - `Content-Type`: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `Content-Disposition`: `attachment; filename="reporte_incidencias_YYYY-MM-DD.xlsx"`
- **CSV (`formato=csv`)**:
  - `Content-Type`: `text/csv; charset=utf-8`
  - `Content-Disposition`: `attachment; filename="reporte_incidencias_YYYY-MM-DD.csv"`

---

## 4. Estructura y Columnas del Reporte

El reporte contiene 10 columnas optimizadas para auditoría institucional:

| # | Encabezado | Clave | Ejemplo de Contenido | Ancho Excel |
|---|---|---|---|---|
| 1 | **ID** | `id_incidencia` | `550e8400-e29b-41d4-a716-446655440000` | 38 |
| 2 | **Título** | `titulo` | `Falla de proyector en auditorio` | 35 |
| 3 | **Estado** | `estado` | `Reportada` | 16 |
| 4 | **Activo** | `activo` | `Proyector Láser Epson PowerLite (ACT-2026-0001)` | 36 |
| 5 | **Reportante** | `reportante` | `Carlos González (carlos@empresa.com)` | 30 |
| 6 | **Técnico Asignado** | `tecnico_asignado` | `Rodrigo Morales` o `Sin asignar` | 28 |
| 7 | **Prioridad** | `prioridad` | `Alta` | 14 |
| 8 | **Escalada** | `escalada` | `Sí` / `No` | 12 |
| 9 | **Fecha de Creación** | `fecha_creacion` | `2026-10-12 09:30:00` | 22 |
| 10 | **Descripción** | `descripcion` | `El equipo no enciende luz de proyección` | 45 |

### Estilos y Legibilidad Aplicados en Excel (`.xlsx`)
1. **Cabecera Institucional**:
   - Fondo azul corporativo UCT (`#003366`), tipografía `Segoe UI` 11pt blanca y en negrita.
   - Altura de fila de 28px con alineación centrada y bordes definidos.
   - Primera fila congelada (`frozen ySplit: 1`) para mantener los encabezados visibles durante el scroll vertical.
2. **Cuerpo de Datos**:
   - Alternancia de colores (*zebra striping*) entre filas blancas (`#FFFFFF`) y gris claro (`#F8FAFC`).
   - Alineación centrada para identificadores, estados, prioridades, flags y fechas; alineación izquierda para textos descriptivos.
   - Formato de fecha legible uniforme `YYYY-MM-DD HH:mm:ss`.

### Compatibilidad Internacional en CSV (`.csv`)
Para garantizar que herramientas de oficina como Microsoft Excel en Windows abran el archivo CSV directamente con acentos (`Título`, `Técnico`, `Crítica`) sin requerir asistentes de importación de texto, se antepone el marcador de orden de bytes **UTF-8 BOM (`\uFEFF`)** al inicio del buffer.

---

## 5. Resultados de Pruebas y Compilación

### 5.1. Cobertura de Pruebas Unitarias
Se ejecutó la suite completa de pruebas de `ms-incidencias` mediante `npm test`:

```text
PASS src/auth/roles.guard.spec.ts
PASS src/incidencias/prioridad-dinamica.service.spec.ts
PASS src/ordenes-trabajo/ordenes-trabajo.service.spec.ts
PASS src/auth/jwt-auth.guard.spec.ts
PASS src/common/filters/openapi-exception.filter.spec.ts
PASS src/app.controller.spec.ts
PASS src/ordenes-trabajo/ordenes-trabajo.controller.spec.ts
PASS src/incidencias/exportar-incidencias.service.spec.ts
PASS src/incidencias/incidencias.service.spec.ts
PASS src/incidencias/incidencias.controller.spec.ts

Test Suites: 10 passed, 10 total
Tests:       52 passed, 52 total
Snapshots:   0 total
Time:        3.98 s
Ran all test suites.
```

### 5.2. Compilación del Proyecto
Se ejecutó `npm run build` en `ms-incidencias`:

```text
> ms-incidencias@0.0.1 build
> nest build
Done (0 errors, 0 warnings).
```
Se verificó la total compatibilidad con NestJS, Express, Prisma y tipados de NodeNext.
