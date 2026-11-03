import { Injectable, UnauthorizedException, NotFoundException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verify, hash } from 'argon2';
import { UserRepository } from './user.repository.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';

interface RefreshTokenPayload {
  sub: string;
  tokenUse: 'refresh';
}

function getRefreshTokenSecret(): string {
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!refreshSecret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_REFRESH_SECRET must be configured in production');
  }

  return refreshSecret ?? process.env.JWT_SECRET ?? 'dev-secret-change-me';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
  ) {}

  async register(registerDto: RegisterDto): Promise<any> {
    const email = registerDto.email.trim().toLowerCase();

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('El correo ya está registrado');
    }

    const passwordHash = await hash(registerDto.password);

    const newUser = await this.userRepository.createUser({
      rut_o_id: registerDto.rut_o_id,
      nombre: registerDto.nombre,
      apellido: registerDto.apellido,
      email: email,
      passwordHash: passwordHash,
      role: {
        connect: { nombreRol: 'REPORTANTE' },
      }
    });

    return {
      message: 'Usuario registrado exitosamente',
      usuario: {
        id_usuario: newUser.id,
        rut_o_id: newUser.rut_o_id,
        nombre: newUser.nombre,
        apellido: newUser.apellido,
        correo: newUser.email,
        rol: newUser.role.nombreRol
      }
    };
  }

  async login(loginDto: LoginDto): Promise<any> {
    const email = loginDto.email.trim().toLowerCase();

    const user = await this.userRepository.findByEmail(email);

    if (!user || user.fechaEliminacion) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatches = await verify(user.passwordHash, loginDto.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: user.id,
      rol: user.role.nombreRol,
      userId: user.id,
      role: user.role.nombreRol,
      email: user.email,
    };

    const token = this.jwtService.sign({ ...payload, tokenUse: 'access' });
    const refreshToken = this.jwtService.sign(
      { sub: user.id, tokenUse: 'refresh' },
      { secret: getRefreshTokenSecret(), expiresIn: '7d' },
    );

    return {
      token,
      accessToken: token,
      refreshToken,
      usuario: {
        id_usuario: user.id,
        rut_o_id: user.rut_o_id,
        nombre: user.nombre,
        apellido: user.apellido,
        correo: user.email,
        rol: {
          id_rol: user.role.id,
          nombre_rol: user.role.nombreRol
        },
        created_at: user.fechaCreacion.toISOString()
      }
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    let payload: RefreshTokenPayload;

    try {
      payload = this.jwtService.verify<RefreshTokenPayload>(refreshToken, {
        secret: getRefreshTokenSecret(),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        ['JsonWebTokenError', 'NotBeforeError', 'TokenExpiredError'].includes(
          error.name,
        )
      ) {
        throw new UnauthorizedException('Refresh token inválido o expirado');
      }

      throw error;
    }

    if (
      payload.tokenUse !== 'refresh' ||
      typeof payload.sub !== 'string' ||
      payload.sub.length === 0
    ) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const user = await this.userRepository.findById(payload.sub);

    if (!user || user.fechaEliminacion) {
      throw new UnauthorizedException('Usuario no válido');
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      rol: user.role.nombreRol,
      userId: user.id,
      role: user.role.nombreRol,
      email: user.email,
      tokenUse: 'access',
    });

    return { accessToken };
  }

  // Alias por compatibilidad si alguna ruta o prueba llama a refreshToken
  async refreshToken(refreshTokenStr: string): Promise<{ accessToken: string }> {
    return this.refresh(refreshTokenStr);
  }

  async updateUserRole(id: string, updateRoleDto: UpdateRoleDto) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`Usuario con ID '${id}' no fue encontrado`);
    }

    return await this.userRepository.updateRole(id, updateRoleDto.rol);
  }

  async getAuthenticatedUser(userId: string) {
    const user = await this.userRepository.findById(userId);
    
    if (!user || user.fechaEliminacion) {
      throw new UnauthorizedException('Usuario no válido');
    }
    
    return {
      id_usuario: user.id,
      rut_o_id: user.rut_o_id,
      nombre: user.nombre,
      apellido: user.apellido,
      correo: user.email,
      rol: {
        id_rol: user.role.id,
        nombre_rol: user.role.nombreRol
      },
      created_at: user.fechaCreacion.toISOString()
    };
  }

  async listUsers(page: number = 1, limit: number = 15) {
    const clampedLimit = Math.max(1, Math.min(50, limit));
    const clampedPage = Math.max(1, page);
    const { usuarios, total, totalPages } = await this.userRepository.findMany(clampedPage, clampedLimit);
    return {
      datos: usuarios.map((user: any) => ({
        id_usuario: user.id,
        rut_o_id: user.rut_o_id,
        nombre: user.nombre,
        apellido: user.apellido,
        correo: user.email,
        email: user.email,
        rol: user.role.nombreRol,
        rol_info: {
          id_rol: user.role.id,
          nombre_rol: user.role.nombreRol,
        },
        fecha_creacion: user.fechaCreacion.toISOString(),
        fecha_eliminacion: user.fechaEliminacion ? user.fechaEliminacion.toISOString() : null,
        estado: user.fechaEliminacion ? 'inactivo' : 'activo',
      })),
      total,
      totalItems: total,
      pagina: clampedPage,
      currentPage: clampedPage,
      page: clampedPage,
      limite: clampedLimit,
      limit: clampedLimit,
      totalPaginas: totalPages,
      totalPages: totalPages,
    };
  }
}