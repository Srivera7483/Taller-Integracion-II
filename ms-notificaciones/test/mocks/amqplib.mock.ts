export const createMockChannel = () => ({
  assertExchange: jest.fn().mockResolvedValue({}),
  assertQueue: jest.fn().mockResolvedValue({}),
  bindQueue: jest.fn().mockResolvedValue({}),
  prefetch: jest.fn().mockResolvedValue(undefined),
  consume: jest.fn().mockResolvedValue({ consumerTag: 'mock-tag' }),
  publish: jest.fn(
    (
      exchange: string,
      routingKey: string,
      content: Buffer,
      options?: any,
      callback?: (err?: any, ok?: any) => void,
    ) => {
      if (typeof callback === 'function') {
        callback(null, true);
      }
      return true;
    },
  ),
  waitForConfirms: jest.fn().mockResolvedValue(undefined),
  ack: jest.fn(),
  nack: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
});

export const createMockConnection = () => {
  const channel = createMockChannel();
  return {
    createChannel: jest.fn().mockResolvedValue(channel),
    createConfirmChannel: jest.fn().mockResolvedValue(channel),
    close: jest.fn().mockResolvedValue(undefined),
  };
};

export const mockConnect = jest.fn().mockResolvedValue(createMockConnection());

jest.mock('amqplib', () => ({
  __esModule: true,
  default: {
    connect: mockConnect,
  },
  connect: mockConnect,
}));

