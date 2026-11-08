import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions?.length) return true;

    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) throw new UnauthorizedException('Token de acceso requerido');

    let payload;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Token invalido o expirado');
    }

    const grantedPermissions: string[] = Array.isArray(payload.permissions)
      ? payload.permissions
      : [];
    if (
      !requiredPermissions.every((permission) =>
        grantedPermissions.includes(permission),
      )
    ) {
      throw new ForbiddenException(
        'Acceso denegado: permiso insuficiente para ejecutar esta accion',
      );
    }
    return true;
  }
}
