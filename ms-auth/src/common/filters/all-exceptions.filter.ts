import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    // Determinamos si es un error controlado (HttpException) o una excepción desconocida
    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Obtener la respuesta nativa de NestJS para parsear el mensaje
    let errorMessage: string | string[] = 'Internal server error';
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      // Si proviene de class-validator, la estructura típica es un objeto con la propiedad "message" en forma de array.
      if (typeof response === 'object' && response !== null && 'message' in response) {
        errorMessage = (response as any).message;
      } else if (typeof response === 'string') {
        errorMessage = response;
      } else {
        errorMessage = exception.message;
      }
    }

    // Logueamos solo si es un error fatal (500) para no exponer información sensible 
    // y no colapsar la consola con errores comunes (400, 404, etc).
    if (httpStatus === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `Error crítico no controlado: ${exception instanceof Error ? exception.stack : exception}`
      );
    }

    // JSON estandarizado para la respuesta del cliente (TAL-35)
    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
      message: errorMessage,
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
