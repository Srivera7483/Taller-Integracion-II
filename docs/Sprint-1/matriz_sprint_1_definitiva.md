# 📋 Matriz de Cierre y Tareas Realizadas - Sprint 1 (66 Tareas en Jira)

## 📌 Información General del Sprint 1
* **Proyecto:** Gestión de Activos UCT (Taller de Integración II - Equipo 7: *Asesinos de Tokens*)
* **Nombre del Sprint en Jira:** `Sprint 1 - MVP` (ID: `1`, Estado: `Cerrado / Closed`)
* **Total Tareas Extraídas:** **66 tareas** (100% en estado `Finalizada`).
* **Objetivo del Sprint:** Construir la base arquitectónica y funcional del Producto Mínimo Viable (MVP):
  * **API Gateway & Seguridad:** Enrutamiento, CORS, Rate Limiting, firma y validación de tokens JWT.
  * **MS-Auth:** Inicialización, entidades relacionales de usuarios y roles, manejo estructurado de errores y saneamiento a Express.
  * **MS-Incidencias & Activos:** Máquina de estados, trazabilidad, registro de órdenes de trabajo, asignación a técnicos, endpoints de QR y evidencias.
  * **Frontend Web (React/Vite):** Enrutador principal, layout maestro, autenticación con Route Guards, alertas Toast, tabla reutilizable de usuarios, filtros de órdenes y paneles de asignación.
  * **Infraestructura:** Docker Compose para bases de datos PostgreSQL, volúmenes locales y RBAC.

---

## 👥 Equipo de Trabajo y Resumen de Carga
| Miembro | Rol Técnico Principal | Tareas Core | Tareas Estudio / Soporte | Total Tareas |
| :--- | :--- | :---: | :---: | :---: |
| **M1: Sebastián Rivera** | Arquitecto de Enrutamiento y Seguridad Backend | 8 | 2 | **10** |
| **M2: Simón Molina** | Especialista en Lógica de Negocio e Integración Backend | 7 | 0 | **7** |
| **M3: Diego Hernández** | Ingeniero de Infraestructura y Control de Acceso (DevOps) | 8 | 5 | **13** |
| **M4: Benjamín Soto** | Desarrollador Fullstack (Servicios Base y Visualización) | 8 | 7 | **15** |
| **M5: Axel González** | Arquitecto Frontend y Experiencia de Usuario (UX) | 8 | 2 | **10** |
| **M6: Eduardo Necul** | Desarrollador Frontend UI y Flujos de Ingreso | 8 | 3 | **11** |
| **TOTALES** | **Sistema Completo MVP** | **47** | **19** | **66 TAREAS** |

---

## 🗓️ Cuadro Resumen: Distribución de Tareas Funcionales Core por Semana del MVP

| Miembro / Rol | Semana 1 (Sem. 1)<br>*Bases & Gateway* | Semana 2 (Sem. 2)<br>*Auth & Rutas Base* | Semana 3 (Sem. 3)<br>*Historial & RBAC* | Semana 4 (Sem. 4)<br>*Órdenes & Prioridad* | Total Core |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **M1: Sebastián Rivera** *(Arq. Backend)* | **TAL-16**: Init Gateway<br>**TAL-17**: Rutas Proxy | **TAL-28**: Firma JWT<br>**TAL-29**: Middleware JWT | **TAL-40**: Enum Estados<br>**TAL-41**: Historial Cambios | **TAL-52**: Modelo Evidencia<br>**TAL-53**: Metadatos Evidencia | **8** |
| **M2: Simón Molina** *(Lógica Backend)* | **TAL-18**: Políticas CORS | **TAL-36**: Validador QR<br>**TAL-37**: Redirección QR | **TAL-42**: Modelo Orden<br>**TAL-43**: Controller Asignar | **TAL-54**: Query por Técnico<br>**TAL-55**: Inyección Token JWT | **7** |
| **M3: Diego Hernández** *(DevOps / Infra)* | **TAL-20**: BD Docker<br>**TAL-21**: Scripts Persistencia | **TAL-32**: Init MS Incidencias<br>**TAL-33**: Modelo Incidencia | **TAL-46**: Verificación RBAC<br>**TAL-47**: Endpoints Permisos | **TAL-58**: Diagnóstico Técnico<br>**TAL-60**: Cierre/Rechazo Máq. | **8** |
| **M4: Benjamín Soto** *(Fullstack)* | **TAL-22**: Init MS Auth<br>**TAL-23**: Modelo Usuarios/Roles | **TAL-34**: Interceptor Errores<br>**TAL-35**: Estructura JSON Error | **TAL-48**: Vista Tabla Genérica<br>**TAL-49**: Catálogo Usuarios | **TAL-56**: Tarjeta Orden Asignada<br>**TAL-57**: Filtros Visuales Estado | **8** |
| **M5: Axel González** *(Arq. Frontend)* | **TAL-24**: Setup Frontend<br>**TAL-26**: Enrutador Principal | **TAL-30**: Consumo Login<br>**TAL-31**: Route Guards | **TAL-50**: Componente Toast<br>**TAL-51**: Interceptor HTTP UX | **TAL-59**: Texto Enriquecido<br>**TAL-61**: Aprobación Reportante | **8** |
| **M6: Eduardo Necul** *(Frontend UI)* | **TAL-25**: Layout Maestro<br>**TAL-27**: Maquetación Login | **TAL-38**: Formulario Reporte<br>**TAL-39**: Validaciones Form | **TAL-44**: Panel Asignación<br>**TAL-45**: Integración Asignar | **TAL-62**: BD/API Prioridades<br>**TAL-63**: Indicador Prioridad | **8** |

---

## 🔍 Detalle Exhaustivo de Tareas Extraídas de Jira por Miembro

### 1. M1: Sebastián Rodrigo Rivera Nahuelhuen (10 Tareas)
*Rol: Arquitecto de Enrutamiento y Seguridad Backend*

| Clave | Título de la Tarea en Jira | Tipo | Estado | Est. | Spent | Etiquetas (Labels) |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **[TAL-16]** | Inicialización y variables de entorno del API Gateway | Core (S1) | Finalizada | 1h 30m | 1h 30m | `Semana-1`, `Urgencia_alta`, `infraestructura` |
| **[TAL-17]** | Configuración de rutas proxy básicas | Core (S1) | Finalizada | 2h | 2h | `Semana-1`, `Urgencia_alta`, `infraestructura` |
| **[TAL-28]** | Desarrollo de firma y encriptación de tokens JWT | Core (S2) | Finalizada | 2h | 2h | `Semana-1`, `Urgencia_alta`, `backend` |
| **[TAL-29]** | Middleware de validación de claims JWT | Core (S2) | Finalizada | 2h 30m | 2h 30m | `Semana-1`, `Urgencia_alta`, `backend` |
| **[TAL-40]** | Definición del enum de estados de incidencias | Core (S3) | Finalizada | 1h | 1h | `Semana-2`, `Urgencia_alta`, `backend` |
| **[TAL-41]** | Registro automático de historial de cambios | Core (S3) | Finalizada | 2h | 2h | `Semana-2`, `Urgencia_moderada`, `backend` |
| **[TAL-52]** | Modelado de la entidad Evidencia | Core (S4) | Finalizada | 1h | 1h | `Semana-2`, `Urgencia_moderada`, `backend` |
| **[TAL-53]** | Endpoint para registro de metadatos de evidencia | Core (S4) | Finalizada | 2h 30m | 2h 30m | `Semana-2`, `Urgencia_moderada`, `backend` |
| **[TAL-78]** | Reserva Estudio S1 | Estudio | Finalizada | 2h | 2h | `Semana-1` |
| **[TAL-79]** | Reserva Estudio S2 | Estudio | Finalizada | 3h 30m | 3h 30m | `Semana-2` |

---

### 2. M2: Simón Ismael Molina Moncada (7 Tareas)
*Rol: Especialista en Lógica de Negocio e Integración Backend*

| Clave | Título de la Tarea en Jira | Tipo | Estado | Est. | Spent | Etiquetas (Labels) |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **[TAL-18]** | Implementación de políticas CORS | Core (S1) | Finalizada | 2h 30m | 2h 30m | `Semana-1`, `Urgencia_alta`, `infraestructura` |
| **[TAL-36]** | Endpoint de validación de activo (Escáner QR) | Core (S2) | Finalizada | 3h 30m | 3h 30m | `Semana-1`, `Urgencia_alta`, `backend` |
| **[TAL-37]** | Enlace de redirección para creación de incidencias | Core (S2) | Finalizada | 3h | 3h | `Semana-1`, `Urgencia_moderada`, `backend` |
| **[TAL-42]** | Modelado de la tabla Orden de Trabajo | Core (S3) | Finalizada | 1h | 1h | `Semana-2`, `Urgencia_alta`, `backend` |
| **[TAL-43]** | Controlador REST para asignación de órdenes | Core (S3) | Finalizada | 3h | 3h | `Semana-2`, `Urgencia_alta`, `backend` |
| **[TAL-54]** | Query y filtrado de órdenes por ID de técnico | Core (S4) | Finalizada | 2h 30m | 2h 30m | `Semana-2`, `Urgencia_alta`, `backend` |
| **[TAL-55]** | Inyección de identidad desde token en consultas | Core (S4) | Finalizada | 2h 30m | 2h 30m | `Semana-2`, `Urgencia_alta`, `backend` |

---

### 3. M3: Diego Antonio Hernández Martínez (13 Tareas)
*Rol: Ingeniero de Infraestructura y Control de Acceso (DevOps / Backend)*

| Clave | Título de la Tarea en Jira | Tipo | Estado | Est. | Spent | Etiquetas (Labels) |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **[TAL-20]** | Configuración de servicios de BD en Docker | Core (S1) | Finalizada | 2h | 2h | `Semana-1`, `Urgencia_alta`, `infraestructura` |
| **[TAL-21]** | Scripts de inicialización y persistencia local | Core (S1) | Finalizada | 1h 30m | 30m | `Semana-1`, `Urgencia_moderada`, `infraestructura` |
| **[TAL-32]** | Inicialización del proyecto MS Incidencias | Core (S2) | Finalizada | 1h 30m | 1h 30m | `Semana-1`, `Urgencia_alta`, `backend` |
| **[TAL-33]** | Modelado de la tabla de Incidencias | Core (S2) | Finalizada | 1h | 1h | `Semana-1`, `Urgencia_alta`, `backend` |
| **[TAL-46]** | Lógica de verificación de roles específicos (RBAC) | Core (S3) | Finalizada | 2h 30m | 2h 30m | `Semana-1`, `Urgencia_alta`, `backend` |
| **[TAL-47]** | Endpoints de actualización de permisos | Core (S3) | Finalizada | 2h 30m | 2h 30m | `Semana-2`, `Urgencia_moderada`, `backend` |
| **[TAL-58]** | Endpoint de recepción de diagnóstico técnico | Core (S4) | Finalizada | 2h | 2h 30m | `Semana-2`, `Urgencia_moderada`, `backend` |
| **[TAL-60]** | Modificación de la máquina de estados (Cierre/Rechazo) | Core (S4) | Finalizada | 2h | 2h | `Semana-2`, `Urgencia_alta`, `backend` |
| **[TAL-82]** | Revisar mergings y debuguear | Soporte | Finalizada | 1h | 1h | `Semana-2` |
| **[TAL-84]** | Repaso de Docker | Estudio | Finalizada | 30m | 30m | `Semana-1`, `estudio` |
| **[TAL-85]** | Estudio de introducción a Node.js y NodeJS, y aplicación de Prisma ORM | Estudio | Finalizada | 2h | 2h | `Semana-1`, `estudio` |
| **[TAL-91]** | Desacoplar PrismaService de AuthService, conectando entre medio UserRepository | Soporte | Finalizada | 30m | 30m | `Semana-2` |
| **[TAL-119]** | Fixear MS-Auth: Concordancia con diagramas y contrato, y otros problemas | Soporte | Finalizada | 1h 30m | 2h | - |

---

### 4. M4: Benjamín Sebastián Soto Pardo (15 Tareas)
*Rol: Desarrollador Fullstack (Servicios Base y Visualización de Datos)*

| Clave | Título de la Tarea en Jira | Tipo | Estado | Est. | Spent | Etiquetas (Labels) |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **[TAL-22]** | Inicialización del proyecto MS Autenticación | Core (S1) | Finalizada | 2h 30m | 2h 30m | `Semana-1`, `Urgencia_alta`, `backend` |
| **[TAL-23]** | Modelado de Usuarios y Roles en código | Core (S1) | Finalizada | 1h | 1h | `Semana-1`, `Urgencia_alta`, `backend` |
| **[TAL-34]** | Interceptor de captura de errores no controlados | Core (S2) | Finalizada | 1h 30m | 1h 30m | `Semana-1`, `Urgencia_moderada`, `backend` |
| **[TAL-35]** | Estructura JSON estándar para errores REST | Core (S2) | Finalizada | 2h | 2h | `Semana-1`, `Urgencia_moderada`, `backend` |
| **[TAL-48]** | Vista de tabla genérica para Panel de Control | Core (S3) | Finalizada | 1h 30m | 1h 30m | `Frontend`, `Semana-2`, `Urgencia_baja` |
| **[TAL-49]** | Integración de datos para catálogo de usuarios | Core (S3) | Finalizada | 1h 30m | 1h 30m | `Frontend`, `Semana-2`, `Urgencia_moderada` |
| **[TAL-56]** | Maquetación de tarjeta/fila de orden asignada | Core (S4) | Finalizada | 2h | 2h | `Frontend`, `Semana-2`, `Urgencia_alta` |
| **[TAL-57]** | Integración de filtros visuales por estado | Core (S4) | Finalizada | 1h 30m | 1h 30m | `Frontend`, `Semana-2`, `Urgencia_moderada` |
| **[TAL-68]** | Estudio de viabilidad técnica y setup del stack de MS Autenticación | Estudio | Finalizada | 1h | 1h | `Semana-1`, `estudio` |
| **[TAL-69]** | Estudio previo para implementación de Interceptores de Errores (prep TAL-34) | Estudio | Finalizada | 1h | 1h | `Semana-1`, `estudio` |
| **[TAL-72]** | Reserva Estudio S2 | Estudio | Finalizada | 1h 30m | 1h 30m | `Semana-2` |
| **[TAL-88]** | Saneamiento de incompatibilidades y bugs de integración (Semana 1) | Saneamiento | Finalizada | 30m | 30m | `Frontend`, `Semana-1`, `backend`, `infraestructura` |
| **[TAL-92]** | Saneamiento de Arquitectura: Migración a Express | Saneamiento | Finalizada | 1h | 1h 30m | `Semana-2`, `backend`, `infraestructura` |
| **[TAL-93]** | Análisis Arquitectónico y Documentación Tecnológica (Semana 1) | Doc | Finalizada | 1h | 2h | `Documentacion`, `Semana-1` |
| **[TAL-94]** | Elaboración de Documentación Técnica Frontend y Backend (Semana 2) | Doc | Finalizada | 1h | 1h | `Documentacion`, `Semana-2` |

---

### 5. M5: Axel Ignacio González Sánchez (10 Tareas)
*Rol: Arquitecto Frontend y Experiencia de Usuario (UX)*

| Clave | Título de la Tarea en Jira | Tipo | Estado | Est. | Spent | Etiquetas (Labels) |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **[TAL-24]** | Estructura de carpetas y framework Frontend | Core (S1) | Finalizada | 1h | 50m | `Frontend`, `Semana-1`, `Urgencia_alta` |
| **[TAL-26]** | Configuración del enrutador principal web | Core (S1) | Finalizada | 1h 30m | 1h 30m | `Frontend`, `Semana-1`, `Urgencia_alta` |
| **[TAL-30]** | Consumo de endpoint de login desde Frontend | Core (S2) | Finalizada | 2h 30m | 1h 30m | `Frontend`, `Semana-1`, `Urgencia_alta` |
| **[TAL-31]** | Implementación de guardias de ruta (Route Guards) | Core (S2) | Finalizada | 2h 30m | 2h 30m | `Frontend`, `Semana-2`, `Urgencia_alta` |
| **[TAL-50]** | Componente visual Toast/Snackbar | Core (S3) | Finalizada | 2h 30m | 2h 30m | `Frontend`, `Semana-1`, `Urgencia_moderada` |
| **[TAL-51]** | Interceptor HTTP de retroalimentación UX | Core (S3) | Finalizada | 2h | 2h | `Frontend`, `Semana-2`, `Urgencia_alta` |
| **[TAL-59]** | Componente de texto enriquecido en frontend | Core (S4) | Finalizada | 2h | 2h | `Frontend`, `Semana-2`, `Urgencia_moderada` |
| **[TAL-61]** | Vista de aprobación/rechazo para el Reportante | Core (S4) | Finalizada | 2h | 2h | `Frontend`, `Semana-2`, `Urgencia_moderada` |
| **[TAL-74]** | Reserva Estudio S1 | Estudio | Finalizada | 2h 30m | 2h 30m | `Semana-1` |
| **[TAL-75]** | Reserva Estudio S2 | Estudio | Finalizada | 1h 30m | 1h 30m | `Semana-2` |

---

### 6. M6: Eduardo Amaru Necul Flores (11 Tareas)
*Rol: Desarrollador Frontend UI y Flujos de Ingreso (Fullstack de Cierre)*

| Clave | Título de la Tarea en Jira | Tipo | Estado | Est. | Spent | Etiquetas (Labels) |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **[TAL-25]** | Desarrollo del Layout Maestro estático | Core (S1) | Finalizada | 1h 30m | 1h 30m | `Frontend`, `Semana-1`, `Urgencia_alta` |
| **[TAL-27]** | Maquetación estática del inicio de sesión | Core (S1) | Finalizada | 1h | 1h | `Frontend`, `Semana-1`, `Urgencia_alta` |
| **[TAL-38]** | Maquetación del formulario de reporte | Core (S2) | Finalizada | 1h 30m | 1h 30m | `Frontend`, `Semana-1`, `Urgencia_alta` |
| **[TAL-39]** | Validaciones de formulario y manejo de estado | Core (S2) | Finalizada | 2h 30m | 2h 30m | `Frontend`, `Semana-1`, `Urgencia_alta` |
| **[TAL-44]** | Maquetación del panel de asignación de órdenes | Core (S3) | Finalizada | 2h 30m | 2h 30m | `Frontend`, `Semana-2`, `Urgencia_alta` |
| **[TAL-45]** | Integración asíncrona de asignación web | Core (S3) | Finalizada | 2h 30m | 2h 30m | `Frontend`, `Semana-2`, `Urgencia_alta` |
| **[TAL-62]** | Actualización de BD y endpoints para "Prioridad" | Core (S4) | Finalizada | 2h 30m | 2h 30m | `Semana-2`, `Urgencia_moderada`, `backend` |
| **[TAL-63]** | Implementación de indicadores de prioridad web | Core (S4) | Finalizada | 1h | 1h 20m | `Frontend`, `Semana-2`, `Urgencia_moderada` |
| **[TAL-71]** | Estudio tareas de layout, maquetación y validaciones | Estudio | Finalizada | 1h 30m | 1h 30m | `Semana-1`, `estudio` |
| **[TAL-120]** | Tarjeta estudio de JSON TAL-5 | Estudio | Finalizada | 1h | 1h | - |
| **[TAL-5]** | Componente visual de trazabilidad de activos | Soporte | Finalizada | 2h 30m | 2h 30m | `Frontend` |

