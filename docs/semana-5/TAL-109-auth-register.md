# TAL-109: Endpoint POST /auth/register y validación de dominios institucionales

## 1. Contexto del Problema
Dentro de las asignaciones de la Semana 5, se detectó que el sistema de autenticación (`ms-auth`) permitía la entrada manual de usuarios (mediante seeds o SQL directo), pero carecía de una puerta de enlace segura y controlada para que nuevos profesores o alumnos (Reportantes) pudieran registrarse por su cuenta. Además, se requería una validación de dominio institucional estricta para evitar cuentas falsas.

## 2. Solución Arquitectónica Adoptada
Se implementó un flujo completo de registro en NestJS, aprovechando el pipeline de validación y la encriptación asimétrica.

### 2.1. Implementación del Patrón y Validaciones
*   **Data Transfer Object (RegisterDto):** Se creó un DTO fuertemente tipado que utiliza validadores nativos de `class-validator`. Se incluyó el decorador `@Matches(/@uct\.cl$/)` para asegurar matemáticamente mediante expresiones regulares que solo correos del dominio universitario sean procesados.
*   **Seguridad Criptográfica:** En `auth.service.ts` se implementó el algoritmo `Argon2` (específicamente la función `hash()`), el cual previene ataques de fuerza bruta al encriptar la contraseña proporcionada antes de insertarla en la base de datos.
*   **Roles Automáticos:** El patrón Repositorio (`user.repository.ts`) fue extendido con un método `createUser` que realiza una consulta Prisma anidada, vinculando al nuevo usuario automáticamente al rol base "REPORTANTE", garantizando el menor privilegio (Least Privilege Principle).

### 2.2. Ventajas Técnicas Obtenidas
1.  **Prevención de Bad Data:** Gracias a `ValidationPipe({ whitelist: true })`, cualquier campo basura (ej. intentar enviar un parámetro `id_rol: 1` malicioso desde Postman) será cortado antes de llegar al controlador.
2.  **Manejo de Errores Semántico:** Se protegió la integridad de PostgreSQL respondiendo con un `ConflictException` (HTTP 409) si el usuario intenta registrar un correo que ya existe, evitando caídas del servidor.
3.  **Seguridad de Contraseñas:** Cumplimiento de estándares criptográficos actuales con Argon2, haciendo el sistema invulnerable frente a ataques Rainbow Table.

## 3. Próximos Pasos (Deuda de Integración)
*   En tareas venideras (Frontend), se deberá construir el formulario visual en React que consuma este endpoint `POST /auth/register`.
*   A mediano plazo, implementar envío asíncrono de un correo electrónico (mediante `ms-notificaciones`) con un enlace de confirmación tras el registro.
