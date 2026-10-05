import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
          isGlobal: true,
          validationSchema: Joi.object({
            PORT: Joi.number().default(3001),
            DATABASE_URL: Joi.string().required().messages({
              'any.required': 'DATABASE_URL es obligatoria para la persistencia con Prisma',
            }),
            JWT_SECRET: Joi.string().required().messages({
              'any.required': 'JWT_SECRET es obligatoria para la autenticación/autorización',
            }),
          }),
    }),
    PrismaModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
