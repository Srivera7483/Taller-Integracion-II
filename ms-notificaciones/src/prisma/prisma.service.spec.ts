import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(() => {
    service = new PrismaService();
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('debe inicializarse desconectado por defecto', () => {
    expect(service.connected).toBe(false);
  });

  it('debe conectar exitosamente en onModuleInit', async () => {
    const connectSpy = jest
      .spyOn(service, '$connect')
      .mockResolvedValueOnce(undefined);

    await service.onModuleInit();

    expect(connectSpy).toHaveBeenCalled();
    expect(service.connected).toBe(true);
  });

  it('debe manejar error de conexión sin lanzar excepción (modo degradado)', async () => {
    jest
      .spyOn(service, '$connect')
      .mockRejectedValueOnce(new Error('Connection refused'));

    await expect(service.onModuleInit()).resolves.not.toThrow();
    expect(service.connected).toBe(false);
  });

  it('debe desconectar en onModuleDestroy si estaba conectado', async () => {
    (service as any).isConnected = true;
    const disconnectSpy = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValueOnce(undefined);

    await service.onModuleDestroy();

    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('debe manejar error al desconectar sin lanzar excepción', async () => {
    (service as any).isConnected = true;
    jest
      .spyOn(service, '$disconnect')
      .mockRejectedValueOnce(new Error('Disconnect error'));

    await expect(service.onModuleDestroy()).resolves.not.toThrow();
  });
});
