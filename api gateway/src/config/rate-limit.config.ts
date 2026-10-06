declare const process: {
  env: Record<string, string | undefined>;
};

export interface RateLimitConfigOptions {
  rateLimitMax?: number;
  rateLimitWindow?: string | number;
}

export interface RateLimitErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  max: number;
  timeWindow: string;
  date: string;
}

export const getRateLimitConfig = (options: RateLimitConfigOptions = {}) => {
  const max = Number(options.rateLimitMax ?? process.env.RATE_LIMIT_MAX ?? 100);
  const timeWindow = options.rateLimitWindow ?? process.env.RATE_LIMIT_WINDOW ?? '1 minute';

  return {
    max,
    timeWindow,
    cache: 10000,
    allowList: (req: { url: string }) => {
      return req.url === '/' || req.url === '/health';
    },
    errorResponseBuilder: (_req: unknown, context: { max: number; after: string }): RateLimitErrorResponse => {
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Has excedido el límite de solicitudes permitidas. Por favor, intenta de nuevo más tarde.',
        max: context.max,
        timeWindow: context.after,
        date: new Date().toISOString(),
      };
    },
  };
};
