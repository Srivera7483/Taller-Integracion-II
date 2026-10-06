# Technical Note: TAL-23
## Modelado de Usuarios y Roles en Código (Prisma)

**Fecha:** 22 de Septiembre de 2026  
**Autor:** Benjamín Soto (`bsoto2025`)  
**Estado:** 🟢 Completado  
**Épica/Semana:** Semana 1  

---

## 1. Contexto y Requerimientos

La tarjeta **[TAL-23]** tenía como objetivo modelar las entidades fundamentales para el sistema de Control de Accesos (RBAC - Role-Based Access Control). Para que el microservicio de autenticación pudiese gestionar inicios de sesión y emitir JWTs, era imperativo definir la estructura de datos que alojaría las credenciales y los privilegios de los usuarios.

Se requería:
1. Diseñar las entidades `User` y `Role` y su relación en base de datos.
2. Trasladar este diseño a código mediante el ORM Prisma (`schema.prisma`).
3. Sentar las bases para la posterior validación de rutas según roles.

---

## 2. Decisiones de Implementación y Diseño

El modelo de datos no se creó al azar; cada campo fue diseñado pensando en la seguridad y escalabilidad del proyecto:

### 2.1. Uso de UUIDs (Universally Unique Identifiers)
* **Decisión:** En lugar de usar IDs numéricos auto-incrementables (`id Int @id @default(autoincrement())`), se decidió usar UUIDs (`id String @id @default(uuid())`) tanto para usuarios como para roles.
* **Justificación Técnica:** 
  1. **Seguridad (Prevención de IDOR):** Si un usuario tiene el ID `5`, es muy fácil deducir que existen los usuarios `1`, `2`, `3` y `4`. Un atacante podría iterar endpoints intentando acceder a perfiles ajenos (Ataque de Enumeración). Un UUID oculta el volumen de datos de la plataforma y hace imposible la predicción matemática del siguiente ID.
  2. **Arquitectura Distribuida:** Al estar en un entorno de microservicios, si en el futuro MS Activos o MS Incidencias necesitan generar registros de forma asíncrona sin consultar al servicio principal, un UUID garantiza que nunca habrá una "colisión de IDs".

### 2.2. Relación de Roles (1:N) en lugar de N:M
* **Decisión:** Se implementó una relación de Uno a Muchos (Un Rol -> Muchos Usuarios) en vez de una relación de Muchos a Muchos.
* **Justificación Técnica:** Para el contexto del Taller de Integración, los requisitos de negocio indican jerarquías claras (Técnico, Supervisor, Reportante, Administrador). Un usuario no necesita tener el rol de "Técnico" y "Supervisor" simultáneamente; un Supervisor ya tiene implícitos los permisos de los niveles inferiores. Simplificar a `1:N` reduce drásticamente la latencia en la Base de Datos, ya que evita la necesidad de una tabla pivote (`UserRoles`) y hace que los `JOINs` (o `includes` en Prisma) sean más económicos.

### 2.3. Estructura de Credenciales Seguras
* **Decisión:** El campo `password` en el esquema de Prisma se dejó sin límite estricto de longitud corta.
* **Justificación Técnica:** Era necesario prever el uso de algoritmos modernos de derivación de claves (como Argon2id, abordado en TAL-28). Estos algoritmos generan *hashes* muy largos (más de 90 caracteres). Limitar el campo a `VARCHAR(50)` habría causado un quiebre en la base de datos al momento de registrar usuarios.

---

## 3. Consecuencias (Trade-offs)

**Ventajas logradas:**
* **Desempeño y Mantenibilidad:** Gracias a la relación 1:N, obtener a un usuario y su rol toma solo una consulta SQL simple. Esto hace que el login sea extremadamente rápido.
* **Código como Verdad Absoluta:** Con Prisma, el `schema.prisma` se convirtió en la única fuente de la verdad para la base de datos, evitando que los desarrolladores modifiquen manualmente las tablas usando comandos SQL (DBeaver, pgAdmin), lo que suele romper entornos de desarrollo colaborativos.

**Limitaciones:**
* **Indexación y Tamaño:** Los UUIDs ocupan más espacio en disco (128 bits vs 32/64 bits de un Entero) y los índices de las bases de datos tardan marginalmente más en recorrer cadenas de texto que números enteros secuenciales. Sin embargo, en la balanza de "Rendimiento vs Seguridad", para la tabla de Usuarios primó la Seguridad.

---

## 4. Referencias al Código

* Esquema de Prisma con las entidades definidas: [`ms-auth/prisma/schema.prisma`](../../ms-auth/prisma/schema.prisma)
