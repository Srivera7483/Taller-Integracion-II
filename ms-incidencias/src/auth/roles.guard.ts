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

    if (!user || !user.role) {
      throw new ForbiddenException(
        'Acceso denegado: usuario no autenticado o rol ausente',
      );
    }

    const userRole = user.role.toUpperCase();
    const hasRole = requiredRoles.some(
      (role) => role.toUpperCase() === userRole,
    );

    if (!hasRole) {
      throw new ForbiddenException(
        'Acceso denegado: rol insuficiente para acceder a este recurso',
      );
    }

    return true;
  }
}
