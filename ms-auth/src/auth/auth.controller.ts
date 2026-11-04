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
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { Roles } from './roles.decorator.js';

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

@Controller(['auth', 'autenticacion'])
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<any> {
    const result = await this.authService.login(loginDto);
    const secureAttribute = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    
    // Setea el refresh token en una cookie segura (TAL-125)
    response.header(
      'Set-Cookie',
      `refresh_token=${result.refreshToken}; HttpOnly; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800${secureAttribute}`,
    );

    // Oculta el refresh token del JSON de respuesta
    const { refreshToken: _refreshToken, ...loginResponse } = result;
    return loginResponse;
  }

  @Post(['refresh', 'renovar-token'])
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Headers('cookie') cookieHeader?: string,
    @Body() body?: { refreshToken?: string }
  ) {
    // Prioriza la cookie HttpOnly, con fallback al body para retrocompatibilidad
    const refreshToken = getCookieValue(cookieHeader, 'refresh_token') || body?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token requerido');
    }

    // Nota: Asegúrate de que tu authService exponga este método como 'refresh'
    return this.authService.refresh(refreshToken);
  }

  @Post(['logout', 'cerrar-sesion'])
  @HttpCode(HttpStatus.OK)
  async logout(): Promise<any> {
    return { message: 'Sesión cerrada exitosamente' };
  }

  @Get(['me', 'usuario-actual'])
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

  @Get('usuarios')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRADOR')
  async listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit || '15', 10) || 15));
    return await this.authService.listUsers(pageNum, limitNum);
  }
}
