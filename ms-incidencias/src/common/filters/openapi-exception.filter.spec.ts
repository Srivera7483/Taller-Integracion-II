import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { OpenApiExceptionFilter } from './openapi-exception.filter';

describe('OpenApiExceptionFilter', () => {
  let filter: OpenApiExceptionFilter;
  let mockHttpAdapter: { reply: jest.Mock };
  let mockAdapterHost: HttpAdapterHost;
  let mockArgumentsHost: ArgumentsHost;
  let mockResponse: Record<string, unknown>;

  beforeEach(() => {
    mockHttpAdapter = { reply: jest.fn() };
    mockAdapterHost = { httpAdapter: mockHttpAdapter as any } as HttpAdapterHost;
    mockResponse = {};

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as unknown as ArgumentsHost;

    filter = new OpenApiExceptionFilter(mockAdapterHost);
  });

  it('debe estructurar el error solo con la propiedad mensaje según el contrato OpenAPI', () => {
    const exception = new HttpException('Ocurrió un error', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockArgumentsHost);

    expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
      mockResponse,
      { mensaje: 'Ocurrió un error' },
      HttpStatus.BAD_REQUEST,
    );
  });

  it('debe concatenar arreglos de mensajes en un solo string', () => {
    const exception = new HttpException(
      { message: ['El título es obligatorio', 'Categoría inválida'] },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );

    filter.catch(exception, mockArgumentsHost);

    expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
      mockResponse,
      { mensaje: 'El título es obligatorio; Categoría inválida' },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  });
});
