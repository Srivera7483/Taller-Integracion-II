# TAL-122: Alertas Visuales (Mantenimientos Próximos)

## 1. Diagnóstico y Contexto del Requerimiento

En el flujo operacional de la plataforma de gestión de infraestructura, los técnicos y administradores necesitan identificar de forma inmediata las tareas críticas que requieren intervención urgente al iniciar sesión en el Dashboard. 

Previamente, la agenda de mantenimientos solo se podía consultar ingresando manualmente a la sección de mantenimientos (`/mantenimientos`), lo que generaba un riesgo de omisión de equipos con mantenimientos preventivos vencidos o agendados para la jornada actual.

El objetivo del ticket **TAL-122** es proveer un mecanismo visual llamativo pero no intrusivo mediante el componente `<CriticalAlertBanner />`, que se posicione en la parte superior del layout del sistema para advertir al técnico sobre la existencia de mantenimientos críticos vencidos o requeridos para el día de hoy, permitiéndole navegar rápidamente al listado detallado o descartar la alerta en su sesión.

---

## 2. Resumen de Archivos Modificados y Creados

| Archivo | Tipo de Cambio | Propósito |
|---|---|---|
| `frontend-web/src/components/CriticalAlertBanner.jsx` | Creado | Componente aislado e independiente que consulta la agenda de mantenimientos, filtra los registros críticos y renderiza el banner de alerta vibrante. |
| `frontend-web/src/components/Layout.jsx` | Modificado | Inyección no destructiva de `<CriticalAlertBanner />` inmediatamente debajo de la barra superior (`<header>`) y antes del contenedor principal (`<main>`). |
| `docs/semana-3/TAL-122-alertas-visuales-mantenimientos-proximos.md` | Creado | Documentación técnica de arquitectura, lógica de datos, diseño y pruebas del ticket TAL-122. |

---

## 3. Especificación Técnica de la Solución

### 3.1. Arquitectura y Componente Aislado (`CriticalAlertBanner.jsx`)

Para evitar acoplar lógica innecesaria en las vistas existentes, el componente se diseñó como una unidad completamente autocontenida que encapsula:
- Consumo asíncrono de datos del microservicio mediante `fetchMantenimientos()`.
- Algoritmo de discriminación de fechas y estados.
- Estado reactivo local de visibilidad (`isVisible`).
- Enrutamiento seguro hacia la vista de agenda (`useNavigate`).

```
+--------------------------------------------------------------+
| Layout (Layout.jsx / DashboardLayout)                        |
|                                                              |
|  [ Header / Topbar ]                                         |
|  +--------------------------------------------------------+  |
|  | <CriticalAlertBanner />                                |  |
|  |  - Icono urgencia + "¡Atención! Tienes {n} ..."        |  |
|  |  - [Ver listado] -> /mantenimientos                    |  |
|  |  - [X] -> isVisible = false                            |  |
|  +--------------------------------------------------------+  |
|  [ <main> <Outlet /> </main> ]                               |
+--------------------------------------------------------------+
```

### 3.2. Lógica de Filtrado de Mantenimientos Críticos

El componente clasifica un mantenimiento como crítico bajo las siguientes reglas:
1. **Descarte de estados completados:** Se ignoran registros con estados como `Completado`, `Finalizado`, `Resuelto` o `Cancelado`.
2. **Mantenimientos Vencidos:** 
   - La fecha programada (`fecha_programada`) es estrictamente menor al inicio del día actual local (`00:00:00.000`).
   - O el campo de estado incluye explícitamente `vencid`.
3. **Mantenimientos para HOY:** 
   - La fecha programada se encuentra dentro del rango horario del día en curso (`00:00:00.000` a `23:59:59.999`).
   - O el campo de estado contiene el término `hoy`.

### 3.3. Manejo Silencioso de Errores y Retorno Temprano (Fail-Safe)

Para salvaguardar la estabilidad de la Single Page Application (SPA):
- Todo el bloque de consulta y cálculo está contenido en un bloque `try/catch`. Si el endpoint falla por error 5xx, caída de red, o timeout, el error es capturado silenciosamente y el contador se fija en `0`.
- Si `cantidadCriticos === 0` o si `isVisible === false`, el componente retorna inmediatamente `null`, impidiendo que se modifique o degrade la interfaz del usuario.

### 3.4. Diseño UI y Experiencia de Usuario (Tailwind CSS)

- **Gama cromática de urgencia:** Se implementó un gradiente dinámico moderno con `bg-gradient-to-r from-red-600 via-rose-600 to-amber-600` acompañado de borde inferior sutil (`border-red-700/30`) y micro-animación de pulso en el ícono de advertencia (`FiAlertTriangle` con `animate-pulse`).
- **Mensaje estricto:** `"¡Atención! Tienes {cantidad} mantenimientos vencidos o requeridos hoy"`, resaltando visualmente la cifra.
- **Acción Rápida:** Botón interactivo `"Ver listado"` con ícono `FiArrowRight` que navega hacia `/mantenimientos`.
- **Cierre No Intrusivo:** Botón con ícono `FiX` que actualiza `isVisible` a `false` de forma instantánea sin requerir recargar la página ni perder el estado actual del dashboard.

---

## 4. Integración en el Layout

La inyección se realizó en `frontend-web/src/components/Layout.jsx` respetando la integridad del diseño existente:

```jsx
// 1. Importación limpia
import CriticalAlertBanner from './CriticalAlertBanner';

// ...
{/* Main Content */}
<div className="flex-1 flex flex-col overflow-hidden w-full">
  {/* Topbar */}
  <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
    {/* Contenido existente del header */}
  </header>

  {/* TAL-122: Alertas Visuales (Mantenimientos Próximos) */}
  <CriticalAlertBanner />

  {/* Dynamic Outlet */}
  <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
    <Outlet />
  </main>
</div>
```

---

## 5. Criterios de Aceptación Verificados

| Criterio de Aceptación | Estado | Evidencia / Comportamiento |
|---|---|---|
| **a. Diseño estético impactante y no intrusivo** | ✅ Cumplido | Implementado con gradiente rojo/naranja moderno, tipografía legible, botón de acción rápida y botón 'X' para descarte inmediato. |
| **b. Si no hay mantenimientos críticos, retorna null** | ✅ Cumplido | Verificación condicional: `if (!isVisible \|\| cantidadCriticos === 0) return null;`. |
| **c. Formato de texto exacto** | ✅ Cumplido | Renderiza exactamente `"¡Atención! Tienes {cantidad} mantenimientos vencidos o requeridos hoy"`. |
| **d. Manejo de fallos silencioso** | ✅ Cumplido | El bloque `try/catch` absorbe cualquier error de red sin emitir errores no controlados a la UI. |
| **e. Integración no destructiva** | ✅ Cumplido | Se insertó únicamente debajo de `<header>` en `Layout.jsx`, sin modificar estilos ni estructura existente. |

---

## 6. Guía de Pruebas y Validación

### 6.1. Validación con Mantenimientos Críticos
1. Al iniciar la aplicación con datos de prueba o la API activa, si existen registros con fecha anterior a hoy o del día de hoy en estado pendiente/en proceso, el banner aparece fijado en la parte superior del contenido.
2. Hacer clic en **"Ver listado"**: la aplicación redirige fluidamente a `/mantenimientos`.

### 6.2. Validación de Cierre Interactivo
1. Al visualizar el banner, hacer clic sobre el botón `'X'`.
2. El banner desaparece inmediatamente mediante transición suave sin recargar la página.

### 6.3. Validación de Ausencia de Datos / Fallo de Backend
1. Simular la respuesta de 0 mantenimientos críticos o detener el servicio de backend.
2. Recargar el Dashboard.
3. El componente evalúa la condición de fallo o total en 0 y retorna `null`, manteniendo el Layout idéntico a su presentación habitual.

### 6.4. Verificación de Compilación y Calidad de Código
- Se ejecutó `npm run build` con Vite v8.3.0, finalizando en código de salida exitoso (`0`) sin errores de sintaxis o resolución de módulos.
- Se ejecutó `npm run lint` (Oxlint), confirmando 0 errores en el componente.
