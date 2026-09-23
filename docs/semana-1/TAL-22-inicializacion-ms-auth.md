# Technical Note: TAL-22
## Inicialización del Proyecto MS Autenticación

**Fecha:** 22 de Septiembre de 2026  
**Autor:** Benjamín Soto (`bsoto2025`)  
**Estado:** 🟢 Completado  
**Épica/Semana:** Semana 1  

---

## 1. Contexto y Requerimientos

La tarjeta **[TAL-22]** requería la creación y configuración inicial del Microservicio de Autenticación (`ms-auth`). Este servicio es la piedra angular de la seguridad del sistema, encargado de verificar identidades, emitir tokens JWT y gestionar los roles de los usuarios antes de que accedan a cualquier otro módulo (Incidencias o Activos).

Se requería:
1. Una estructura base sólida y limpia que permitiese trabajar en equipo de manera escalable.
2. Un entorno de desarrollo rápido, predecible y estandarizado.
3. Un núcleo HTTP configurado y listo para recibir controladores y lógica de negocio.

---

## 2. Decisiones de Implementación

Para cumplir con los requerimientos, se ejecutaron las siguientes acciones estructurales:

### 2.1. Generación del Scaffolding con NestJS CLI
En lugar de crear archivos manualmente, se utilizó la herramienta oficial `@nestjs/cli` para generar el esqueleto del proyecto (`nest new ms-auth`).
* **Por qué:** Asegura que la arquitectura inicial respete al 100% las convenciones de NestJS (Main, AppModule, configuraciones de TypeScript, ESLint y Jest preconfigurados). Esto ahorra horas de configuración inicial (boilerplate) y minimiza el riesgo de errores en la configuración del compilador.

### 2.2. Uso de `pnpm` como Gestor de Paquetes
* **Decisión:** Al momento de inicializar el proyecto, se seleccionó `pnpm` en lugar de `npm` o `yarn`.
* **Por qué:** `pnpm` utiliza un almacén global de contenido direccionable (content-addressable store) y enlaces simbólicos. Esto significa que las instalaciones son increíblemente más rápidas, el espacio en disco utilizado es mucho menor, y, lo más importante para nuestro proyecto, resuelve las dependencias de manera estricta evitando el acceso a módulos fantasma.

### 2.3. Estructura de Carpetas Orientada a Dominios (Domain-Driven)
Se organizó el código dentro de `src/` agrupándolo por funcionalidad (dominios) en lugar de por tipo de archivo:
```text
ms-auth/
├── src/
│   ├── auth/          # Controladores, Servicios y DTOs de Autenticación
│   ├── common/        # Filtros globales, Guards, Decoradores y utilidades
│   ├── prisma/        # Módulo global para la conexión a Base de Datos
│   └── app.module.ts  # Módulo raíz que orquesta los subdominios
```
* **Por qué:** Esta estructura (Feature Modules) evita que el proyecto se vuelva inmanejable cuando crece. Si en el futuro se necesita añadir lógica de "Recuperación de Contraseña", todo vivirá dentro de su propio módulo, altamente cohesionado y con bajo acoplamiento.

### 2.4. Limpieza del Código de Ejemplo
Se eliminaron los archivos generados por defecto (`app.controller.ts`, `app.service.ts`) que solo retornaban "Hello World".
* **Por qué:** Evitar código basura en el repositorio principal, manteniendo únicamente un `AppModule` limpio que sirve como orquestador de los verdaderos módulos de negocio (`AuthModule`, `PrismaModule`).

---

## 3. Consecuencias (Trade-offs)

**Ventajas logradas:**
* La configuración estandarizada con ESLint y Prettier garantiza que el código de todos los miembros del equipo que toquen este microservicio mantenga el mismo estilo visual y lógico.
* El uso de `pnpm` redujo drásticamente el tiempo de instalación y despliegue del contenedor de desarrollo.

**Limitaciones iniciales:**
* Al ser el primer microservicio del proyecto, el equipo frontend tuvo que esperar a que el puerto y la configuración de este servicio estuvieran definidos para empezar a probar sus integraciones.

---

## 4. Referencias al Código

* Configuración de dependencias y scripts base: [`ms-auth/package.json`](../../ms-auth/package.json)
* Punto de entrada de la aplicación: [`ms-auth/src/main.ts`](../../ms-auth/src/main.ts)
* Módulo raíz: [`ms-auth/src/app.module.ts`](../../ms-auth/src/app.module.ts)
