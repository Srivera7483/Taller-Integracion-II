# TAL-205: Sustitución de Spinners Genéricos por Animaciones de Esqueleto (Skeleton Loaders)

## Contexto y Objetivo
Sustituir los indicadores de carga genéricos por pantallas de esqueleto (`SkeletonTable.jsx` y `SkeletonCard.jsx`) con brillo pulsante en Tailwind CSS y microinteracciones sutiles, preservando el `Cumulative Layout Shift (CLS = 0)` certificado en `TAL-203` y la matriz de permisos `PBAC` de `TAL-222`.

## Criterios de Aceptación Cubiertos
1. **Reemplazo de spinners en vistas principales:** Integrado en `Dashboard.jsx`, `Incidencias.jsx`, `Inventario.jsx`, `Mantenimientos.jsx`, `Usuarios.jsx`, `DetalleIncidencia.jsx` y `DetalleOrden.jsx`.
2. **Transición suave sin saltos de maquetación:** Animación `.animate-fade-in` y respeto a `prefers-reduced-motion`.
3. **Microinteracciones enriquecidas:** Clases `.btn-hover-primary`, `.btn-hover-emerald` y `.btn-hover-subtle` en controles de acción principales.
