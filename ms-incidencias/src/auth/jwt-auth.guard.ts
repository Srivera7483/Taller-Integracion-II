import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { JwtUser } from './auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: JwtUser }>();
    const token = request.headers.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];

    if (!token) {
      throw new UnauthorizedException('Token de acceso requerido');
    }

    try {
      const payload = this.jwtService.verify(token);

      const id = payload.sub || payload.userId;
      const rol = payload.rol || payload.role;

      if (typeof id !== 'string' || !id || typeof rol !== 'string' || !rol) {
        throw new Error('JWT claims incompletos o inválidos');
      }

      request.user = {
        sub: id,
        rol: rol,
        userId: id,
        role: rol,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}