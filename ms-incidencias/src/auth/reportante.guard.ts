import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

type RequestWithUser = Request & { user?: { role?: string } };

@Injectable()
export class ReportanteGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (request.user?.role !== 'Reportante') {
      throw new ForbiddenException('El rol Reportante es requerido');
    }
    return true;
  }
}