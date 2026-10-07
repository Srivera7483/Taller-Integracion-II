import { Injectable, UnauthorizedException, NotFoundException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { verify, hash } from 'argon2';
import { UserRepository } from './user.repository.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
  ) {}

  async register(registerDto: RegisterDto): Promise<any> {
    const email = registerDto.email.trim().toLowerCase();

    // Verificamos si el usuario ya existe
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('El correo ya está registrado');
    }

    // Hasheamos la contraseña
    const passwordHash = await hash(registerDto.password);

    // Creamos al usuario con el rol predeterminado de "REPORTANTE" u 8 (asumiendo que exista)
    // Usaremos connect por nombre de rol para evitar hardcodear el ID
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

    if (!user) {
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
    };

    const token = this.jwtService.sign(payload);

    return {
      token,
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
}