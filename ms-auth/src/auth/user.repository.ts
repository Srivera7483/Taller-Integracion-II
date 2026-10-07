import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
  }

  async findByEmail(email: string) {
    return await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
  }

  async updateRole(id: string, roleName: string) {
    return await this.prisma.user.update({
      where: { id },
      data: {
        role: {
          connect: { nombreRol: roleName },
        },
      },
      include: { role: true },
    });
  }

  async createUser(data: any) {
    return await this.prisma.user.create({
      data,
      include: { role: true },
    });
  }
}