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

  async findMany(page: number = 1, limit: number = 15) {
    const take = limit;
    const skip = (page - 1) * limit;
    const [usuarios, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take,
        where: { fechaEliminacion: null },
        include: { role: true },
        orderBy: { fechaCreacion: 'desc' },
      }),
      this.prisma.user.count({
        where: { fechaEliminacion: null },
      }),
    ]);
    return {
      usuarios,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}