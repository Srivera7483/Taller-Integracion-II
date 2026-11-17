export const createMockPrismaService = () => ({
  notificacion: {
    create: jest.fn().mockImplementation(({ data }: any) =>
      Promise.resolve({
        id_notificacion: 'mock-uuid-notificacion',
        fecha_creacion: new Date(),
        ...data,
      }),
    ),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockImplementation(({ data }: any) =>
      Promise.resolve({
        id_notificacion: 'mock-uuid-notificacion',
        ...data,
      }),
    ),
  },
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
  connected: true,
});
