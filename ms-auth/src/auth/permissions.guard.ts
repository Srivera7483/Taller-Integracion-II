import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const grantedPermissions = request.user?.permissions ?? [];

    const allowed = requiredPermissions.every((permission) =>
      grantedPermissions.includes(permission),
    );

    if (!allowed) {
      throw new ForbiddenException(
        'Acceso denegado: permiso insuficiente para ejecutar esta accion',
      );
    }

    return true;
  }
}
