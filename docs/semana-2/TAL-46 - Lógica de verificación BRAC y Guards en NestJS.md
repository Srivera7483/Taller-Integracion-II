#nodejs #nestjs

El<span style="color:rgb(192, 0, 0)"><span style="color:rgb(192, 0, 0)"> <span style="color:rgb(192, 0, 0)"><i><span style="color:red"><b>Controller</b></span></i> </span></span></span>es el gateway de la API a los proyectos NestJS: define los endpoints HTTP y recibe las peticiones.

Cuando una petición HTTP llega al servidor, se pone a un <span style="color:rgb(193, 1, 1)"><b>guardia</b></span> para filtrar, antes de que la petición llegue al *Controller* :

- `JwtAuthGuard` revisa el encabezado del JWT, valida la firma y vigencia, e inyecta la identidad del usuario en `request.user`
- `RolesGuard` lee la información de `request.user` y verifica si el rol del usuario coincide con los permisos requeridos por la ruta.

#### Creación del guard por roles

Se crea el decorador/metadato `@Roles` con un código como este:

```typescript
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

Luego, se crea el guard propiamente tal:

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { ROLES_KEY } from './roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Obtener los roles permitidos definidos en el decorador @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si la ruta no exige ningún rol específico, se permite el acceso libre
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 2. Extraer el usuario que inyectó JwtAuthGuard en la petición
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const user = request.user;

    // 3. Validar si el usuario existe y si su rol coincide con los requeridos
    if (!user || !user.role || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Acceso denegado: no tienes el rol requerido para este recurso',
      ); // Retorna automáticamente HTTP 403 Forbidden
    }

    return true;
  }
}
```

Función de prueba:

```typescript
  @Get('supervisor-data')
  @UseGuards(JwtAuthGuard, RolesGuard) // Se ejecutan en orden
  @Roles('SUPERVISOR', 'ADMINISTRADOR')
  getSupervisorReport(@Req() request: FastifyRequest) {
    return {
      message: 'Acceso concedido a datos de supervisor',
      user: request.user,
    }
  }
```

El Guard queda listo para aplicarse en funciones de entrada, por ejemplo, si se quisiera borrar un usuario, la lógica sería:

```typescript
// 1. AuthController (Solo Guard y delegación)
@Delete('users/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMINISTRADOR')
async deleteUser(@Param('id') id: string) {
  return await this.authLogic.deleteUser(id); // Delega a AuthLogic
}

// 2. AuthLogic / AuthService (Lógica)
async deleteUser(userId: string) {
  const user = await this.userRepository.findById(userId);
  if (!user) throw new NotFoundException('Usuario no encontrado');
  
  // Regla de negocio: borrado lógico (Soft delete)
  return await this.userRepository.softDelete(userId); 
}

// 3. UserRepository (Prisma / BD)
async softDelete(id: string) {
  return await this.prisma.usuario.update({
    where: { id_usuario: id },
    data: { deleted_at: new Date() },
  });
}
```


**Commit TAL-46**

• Se creó el decorador @Role en `src/auth/roles.decorator.ts` para marcar roles.
• Se creó propiamente tal el `RolesGuard` en `src/auth/roles.guard.ts` que validará los roles necesarios de la función.
• Se añadió una función de preuba en el Controller para poner a prueba el Guard.
• Se fabricaron tests unitarios para el Guard (entregándole rutas) y para el Controller (ejecutando la función de prueba `getSupervisorReport()`).
