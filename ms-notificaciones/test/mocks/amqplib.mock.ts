export const createMockChannel = () => ({
  assertExchange: jest.fn().mockResolvedValue({}),
  assertQueue: jest.fn().mockResolvedValue({}),
  bindQueue: jest.fn().mockResolvedValue({}),
  prefetch: jest.fn().mockResolvedValue(undefined),
  consume: jest.fn().mockResolvedValue({ consumerTag: 'mock-tag' }),
  publish: jest.fn().mockReturnValue(true),
  ack: jest.fn(),
  nack: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
});

export const createMockConnection = () => ({
  createChannel: jest.fn().mockResolvedValue(createMockChannel()),
  close: jest.fn().mockResolvedValue(undefined),
});

export const mockConnect = jest.fn().mockResolvedValue(createMockConnection());

jest.mock('amqplib', () => ({
  __esModule: true,
  default: {
    connect: mockConnect,
  },
  connect: mockConnect,
}));
