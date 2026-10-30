import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
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
import { RegisterDto } from './dto/register.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard}  from './roles.guard.js';
import { Roles } from './roles.decorator.js';

@Controller(['auth', 'autenticacion'])
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post(['register', 'registro'])
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async register(@Body() registerDto: RegisterDto): Promise<any> {
    return await this.authService.register(registerDto);
  }

  @Post(['login', 'inicio-sesion'])
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async login(@Body() loginDto: LoginDto): Promise<any> {
    try {
      return await this.authService.login(loginDto);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Credenciales inválidas');
    }
  }

  @Post(['refresh', 'renovar-token'])
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Body() body: { refreshToken?: string },
    @Req() request: Request,
  ): Promise<any> {
    const headerToken = request.headers.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
    const token = body?.refreshToken || headerToken;
    if (!token) {
      throw new UnauthorizedException('Refresh token requerido');
    }
    return await this.authService.refreshToken(token);
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
  @UseGuards(JwtAuthGuard)
  async listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.max(1, parseInt(limit || '15', 10) || 15);
    return await this.authService.listUsers(pageNum, limitNum);
  }
}
