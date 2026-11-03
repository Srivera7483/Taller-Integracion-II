# TAL-115: Endpoint de Cálculo de Prioridad Dinámica por Antigüedad

## 1. Diagnóstico y Contexto del Requerimiento

En la plataforma de gestión de incidencias y mantenimiento de activos institucionales, uno de los principales problemas operativos identificados es que **las incidencias antiguas sin asignar o sin atender quedan enterradas en el backlog de los técnicos**. Cuando ingresan nuevas solicitudes de mantenimiento o soporte, la lista se ordena comúnmente por orden de llegada o prioridad estática, dejando rezagadas incidencias de prioridad baja o media que llevan días o semanas sin atención técnica.

### Objetivos y Criterios de Aceptación (TAL-115)
1. **Detección Automática de Inactividad**:
   - Evaluar incidencias en estados inactivos o pendientes de atención (ej: `Reportada`, `Pendiente`, o sin órdenes de trabajo activas asignadas).
   - Ignorar incidencias en estados terminales o completados (`Resuelta`, `Cerrada`, `Rechazada`).
2. **Flag de Escalamiento (`escalada: true`)**:
   - Toda incidencia con más de **48 horas (2 días)** en estado de inactividad debe ser marcada inequívocamente con el indicador booleano `escalada: true`.
3. **Escalamiento Progresivo de Nivel de Prioridad**:
   - **Nivel 1 (Inactividad $\ge$ 48 horas / 2 días)**: La prioridad visual aumenta automáticamente en 1 nivel:
     - `Baja` $\to$ `Media`
     - `Media` $\to$ `Alta`
     - `Alta` $\to$ `Crítica`
   - **Nivel 2 (Inactividad Crítica $\ge$ 96 horas / 4 días)**: Escalamiento severo de 2 niveles:
     - `Baja` $\to$ `Alta`
     - `Media` $\to$ `Crítica`
     - `Alta` $\to$ `Crítica`
     - `Crítica` $\to$ `Crítica`
4. **Cálculo de Fechas Flexible**:
   - Soporte para tiempo transcurrido absoluto (tiempo real de reloj continuo) y opción de descuento de fines de semana (tiempo hábil laboral excluyendo sábados y domingos).
5. **Inyección en el Listado General y Endpoints Especializados**:
   - Retornar estos valores calculados al vuelo (`prioridad_relativa`, `prioridad_original`, `escalada`, `tiempo_inactividad_horas`, `antiguedad_dias`, `motivo_escalamiento`) tanto en el endpoint general `GET /api/v1/incidencias` como en endpoints dedicados de auditoría de backlog.

---

## 2. Resumen de Archivos Modificados y Creados

| Archivo | Tipo de Cambio | Propósito |
|---|---|---|
| `ms-incidencias/src/incidencias/interfaces/prioridad-dinamica.interface.ts` | **Creado** | Interfaces TypeScript para `CalculoPrioridadResultado`, `ResumenReportePrioridades`, `ItemReportePrioridad` y `ReportePrioridadesDinamicas`. |
| `ms-incidencias/src/incidencias/dto/prioridad-dinamica-query.dto.ts` | **Creado** | DTO para validación y tipado de query params (`solo_escaladas`, `excluir_fines_de_semana`, `limite`, `pagina`). |
| `ms-incidencias/src/incidencias/prioridad-dinamica.service.ts` | **Creado** | Servicio centralizado con lógica de cálculo temporal, normalización de prioridades, algoritmo de fines de semana, escalamiento multinivel y consolidación de reportes estadísticos. |
| `ms-incidencias/src/incidencias/incidencias.module.ts` | **Modificado** | Registro y exportación de `PrioridadDinamicaService` en el contenedor de dependencias de NestJS. |
| `ms-incidencias/src/incidencias/incidencias.service.ts` | **Modificado** | Inyección de `PrioridadDinamicaService`, enriquecimiento al vuelo de `toApiIncidencia` para listados y detalle, e implementación de `obtenerReportePrioridades` y `obtenerPrioridadDinamica`. |
| `ms-incidencias/src/incidencias/incidencias.controller.ts` | **Modificado** | Exposición de rutas `@Get('prioridades-dinamicas')` y `@Get(':id_incidencia/prioridad-dinamica')` con protección JWT y roles autorizados. |
| `ms-incidencias/src/incidencias/prioridad-dinamica.service.spec.ts` | **Creado** | Suite unitaria completa que verifica umbral de 48h, escalamiento de 1 y 2 niveles, exclusión de estados terminales, cálculo con fines de semana y reportes agregados. |
| `ms-incidencias/src/incidencias/incidencias.service.spec.ts` | **Modificado** | Pruebas de integración del servicio confirmando retorno de atributos calculados y reporte puntual. |
| `docs/Sprint-2/semana-2/TAL-115-endpoint-de-calculo-de-prioridad-dinamica-por-antiguedad.md` | **Creado** | Documentación técnica del requerimiento TAL-115. |

---

## 3. Lógica Algorítmica y Reglas de Negocio

### 3.1. Detección de Estado Inactivo
El servicio evalúa el estado más reciente registrado en el historial de la incidencia:
- **Estados Inactivos**: `Reportada`, `Pendiente`, `Creada`, `Abierta`, `En Espera`, `Sin Asignar`.
- **Estados Terminales** (no escalan): `Resuelta`, `Cerrada`, `Rechazada`, `Completada`, `Cancelada`.

### 3.2. Cálculo de Horas de Inactividad
Dada una fecha de creación $T_{creacion}$ y una fecha de referencia actual $T_{actual}$:
$$\Delta t_{absoluto} = \left\lfloor \frac{T_{actual} - T_{creacion}}{3600 \times 1000} \right\rfloor$$

Cuando `excluir_fines_de_semana` está activado (`true`):
- El algoritmo itera bloque a bloque verificando el día de la semana (`getDay() === 0` domingo o `getDay() === 6` sábado).
- Las horas transcurridas en fin de semana son restadas del acumulador total, evitando que una incidencia reportada un viernes por la tarde escale artificialmente durante sábado y domingo sin jornada laboral.

### 3.3. Escalera de Prioridad Dinámica
La escala de prioridades contempla 4 niveles normalizados:
$$\text{Baja} \ (1) \longrightarrow \text{Media} \ (2) \longrightarrow \text{Alta} \ (3) \longrightarrow \text{Crítica} \ (4)$$

- **Si $\text{horasInactividad} < 48$ o estado terminal**:
  - `escalada`: `false`
  - `prioridad_relativa`: `prioridad_original`
  - `motivo_escalamiento`: `null`
- **Si $48 \le \text{horasInactividad} < 96$**:
  - `escalada`: `true`
  - `prioridad_relativa`: $\min(4, \text{nivelBase} + 1)$
  - `motivo_escalamiento`: `"Inactividad superior a 48h ({horas}h acumuladas en backlog). Prioridad escalada automáticamente."`
- **Si $\text{horasInactividad} \ge 96$**:
  - `escalada`: `true`
  - `prioridad_relativa`: $\min(4, \text{nivelBase} + 2)$
  - `motivo_escalamiento`: `"Inactividad crítica acumulada de {horas}h ({dias} días) sin resolución. Prioridad escalada en 2 niveles."`

---

## 4. Especificación de Endpoints

### 4.1. `GET /api/v1/incidencias` (Listado Enriquecido con Prioridad Relativa)
Todas las incidencias devueltas por el listado general incorporan de manera inmediata la prioridad dinámica calculada.

**Parámetros de respuesta adicionales por elemento:**
```json
{
  "id_incidencia": "550e8400-e29b-41d4-a716-446655440000",
  "titulo": "Falla en proyector Sala A-102",
  "descripcion": "El equipo no emite señal HDMI",
  "prioridad": "Alta",
  "prioridad_original": "Media",
  "prioridad_relativa": "Alta",
  "escalada": true,
  "tiempo_inactividad_horas": 54,
  "antiguedad_dias": 2,
  "motivo_escalamiento": "Inactividad superior a 48h (54h acumuladas en backlog). Prioridad escalada automáticamente.",
  "estado": {
    "id_estado": 1,
    "nombre_estado": "Reportada"
  },
  "fecha_creacion": "2026-10-12T09:00:00.000Z"
}
```

> **Compatibilidad Frontend**: Al sobrescribir `prioridad: calculo.prioridad_relativa` manteniendo `prioridad_original`, las interfaces de usuario (como `frontend-web/src/views/Incidencias.jsx`) que ya renderizan badges de prioridad (`critica`, `alta`, `media`, `baja`) reflejan el escalamiento visual sin necesidad de alterar componentes legacy.

---

### 4.2. `GET /api/v1/incidencias/prioridades-dinamicas` (Reporte Consolidado de Backlog)
Endpoint analítico diseñado para coordinadores y supervisores técnicos que permite inspeccionar la salud del backlog y la tasa de incidencias desatendidas.

#### Query Parameters:
| Parámetro | Tipo | Obligatorio | Default | Descripción |
|---|---|---|---|---|
| `solo_escaladas` | `boolean` | No | `false` | Filtra el listado para retornar únicamente incidencias con flag `escalada: true`. |
| `excluir_fines_de_semana` | `boolean` | No | `false` | Descuenta días sábado y domingo del tiempo de inactividad acumulado. |
| `limite` | `number` | No | `50` | Límite de elementos a retornar en la lista detallada. |
| `pagina` | `number` | No | `1` | Paginación del reporte. |

#### Respuesta de Ejemplo (`200 OK`):
```json
{
  "valido": true,
  "resumen": {
    "total_evaluadas": 45,
    "total_escaladas": 12,
    "tasa_escalamiento": 26.67,
    "por_prioridad_relativa": {
      "Baja": 5,
      "Media": 18,
      "Alta": 15,
      "Crítica": 7
    }
  },
  "criterios": {
    "umbral_horas_escalamiento": 48,
    "umbral_horas_critico": 96,
    "excluir_fines_de_semana": false,
    "solo_escaladas": false
  },
  "incidencias": [
    {
      "id_incidencia": "8f9b2c34-7a1e-4589-91cd-ef1234567890",
      "titulo": "Aire acondicionado auditorio detenido",
      "id_activo": "ACT-HVAC-01",
      "estado": "Reportada",
      "fecha_creacion": "2026-10-08T10:00:00.000Z",
      "prioridad_original": "Baja",
      "prioridad_relativa": "Alta",
      "escalada": true,
      "tiempo_inactividad_horas": 149,
      "antiguedad_dias": 6,
      "motivo_escalamiento": "Inactividad crítica acumulada de 149h (6 días) sin resolución. Prioridad escalada en 2 niveles."
    }
  ]
}
```

---

### 4.3. `GET /api/v1/incidencias/:id_incidencia/prioridad-dinamica` (Auditoría Puntual)
Permite inspeccionar en detalle el cálculo de una incidencia particular mediante su UUID.

#### Parámetros:
- `id_incidencia` (UUID en Path): Identificador único de la incidencia.
- `excluir_fines_de_semana` (Boolean en Query): Opcional.

#### Respuesta de Ejemplo (`200 OK`):
```json
{
  "valido": true,
  "id_incidencia": "550e8400-e29b-41d4-a716-446655440000",
  "titulo": "Falla en proyector Sala A-102",
  "id_activo": "ACT-2026-0001",
  "fecha_creacion": "2026-10-12T09:00:00.000Z",
  "prioridad_original": "Media",
  "prioridad_relativa": "Alta",
  "escalada": true,
  "tiempo_inactividad_horas": 54,
  "antiguedad_dias": 2,
  "estado_actual": "Reportada",
  "motivo_escalamiento": "Inactividad superior a 48h (54h acumuladas en backlog). Prioridad escalada automáticamente."
}
```

---

## 5. Resultados de Pruebas y Compilación

### 5.1. Cobertura de Pruebas Unitarias
Se ejecutaron todas las suites de prueba en `ms-incidencias` mediante `npm test`:

```text
PASS src/incidencias/prioridad-dinamica.service.spec.ts
PASS src/ordenes-trabajo/ordenes-trabajo.service.spec.ts
PASS src/auth/roles.guard.spec.ts
PASS src/auth/jwt-auth.guard.spec.ts
PASS src/common/filters/openapi-exception.filter.spec.ts
PASS src/incidencias/incidencias.service.spec.ts
PASS src/app.controller.spec.ts
PASS src/ordenes-trabajo/ordenes-trabajo.controller.spec.ts

Test Suites: 8 passed, 8 total
Tests:       41 passed, 41 total
Snapshots:   0 total
Time:        6.089 s
Ran all test suites.
```

### 5.2. Verificación de Compilación TypeScript
Se ejecutó `npm run build` en `ms-incidencias`:
```text
> nest build
Done in 2.3s. (0 errors, 0 warnings)
```
Se garantizó compatibilidad estricta de tipos entre los payloads de Prisma (`IncidenciasGetPayload`) y las interfaces de cálculo de prioridades dinámicas.
