import {
  Body,
  Controller,
  Headers,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch, 
  Post,
  Res,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Query,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard}  from './roles.guard.js';
import { Roles } from './roles.decorator.js';
import { AuditService } from './audit.service.js';
import { AuditPaginationDto } from './dto/audit-pagination.dto.js';
import { AuditEvent } from '@prisma/client';

interface CookieResponse {
  header(name: string, value: string): unknown;
}

function getCookieValue(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) {
    return undefined;
  }

  for (const cookie of cookieHeader.split(';')) {
    const separator = cookie.indexOf('=');

    if (separator >= 0 && cookie.slice(0, separator).trim() === name) {
      return cookie.slice(separator + 1).trim();
    }
  }

  return undefined;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: CookieResponse,
    @Req() request?: Request,
  ): Promise<any> {
    const result = request
      ? await this.authService.login(loginDto, {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] as string | undefined,
        })
      : await this.authService.login(loginDto);
    const secureAttribute =
      process.env.NODE_ENV === 'production' ? '; Secure' : '';
    response.header(
      'Set-Cookie',
      `refresh_token=${result.refreshToken}; HttpOnly; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800${secureAttribute}`,
    );

    const { refreshToken: _refreshToken, ...loginResponse } = result;
    return loginResponse;
  }

  @Get('audit/logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRADOR')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getAuditLogs(@Query() query: AuditPaginationDto) {
    return this.auditService.list(query.page ?? 1, query.limit ?? 20);
  }

  @Post('audit/rate-limit-blocked')
  @HttpCode(HttpStatus.NO_CONTENT)
  async recordRateLimitBlocked(
    @Headers('x-audit-secret') auditSecret: string | undefined,
    @Body() body: { email?: string; ipAddress?: string; userAgent?: string },
  ) {
    const expectedSecret = process.env.AUDIT_INTERNAL_SECRET ?? 'dev-audit-secret';
    if (auditSecret !== expectedSecret) {
      throw new UnauthorizedException('Credenciales internas invalidas');
    }

    await this.auditService.record(AuditEvent.RATE_LIMIT_BLOCKED, {
      email: body.email,
      ipAddress: body.ipAddress,
      userAgent: body.userAgent,
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Headers('cookie') cookieHeader?: string) {
    const refreshToken = getCookieValue(cookieHeader, 'refresh_token');

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token requerido');
    }

    return this.authService.refresh(refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getAuthenticatedUser(@Req() request: Request & { user: any }) {
    const userId = request.user.sub || request.user.userId;
    return await this.authService.getAuthenticatedUser(userId);
  }

  @Patch('usuarios/:id/rol')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRADOR')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateUserRole(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return await this.authService.updateUserRole(id, updateRoleDto);
  }
}
