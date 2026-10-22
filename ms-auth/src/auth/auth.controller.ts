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
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard}  from './roles.guard.js';
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

@Controller('auth')
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
    const secureAttribute =
      process.env.NODE_ENV === 'production' ? '; Secure' : '';
    response.header(
      'Set-Cookie',
      `refresh_token=${result.refreshToken}; HttpOnly; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800${secureAttribute}`,
    );

    const { refreshToken: _refreshToken, ...loginResponse } = result;
    return loginResponse;
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
