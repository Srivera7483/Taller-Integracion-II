import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from './roles.decorator';
import { JwtUser } from './auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: JwtUser }>();
    const user = request.user;

    const rolUsuario = (user?.rol || user?.role)?.toString().toUpperCase();

    if (!user || !rolUsuario) {
      throw new ForbiddenException(
        'Acceso denegado: usuario no autenticado o rol ausente',
      );
    }

    const hasRole = requiredRoles.some((rolRequerido) => {
      const req = rolRequerido.toUpperCase();
      if (req === rolUsuario) return true;
      if (req === 'ADMINISTRADOR' && (rolUsuario === 'ADMIN' || rolUsuario === 'ADMINISTRADOR')) return true;
      if (req === 'REPORTANTE' && (rolUsuario === 'USUARIO' || rolUsuario === 'REPORTANTE')) return true;
      if (req === 'TECNICO' && (rolUsuario === 'TÉCNICO' || rolUsuario === 'TECNICO')) return true;
      return false;
    });

    if (!hasRole) {
      throw new ForbiddenException(
        'El rol no tiene permiso para acceder a este recurso',
      );
    }

    return true;
  }
}
