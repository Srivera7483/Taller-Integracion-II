const getRateLimitConfig = (options = {}) => {
  const max = Number(options.rateLimitMax ?? process.env.RATE_LIMIT_MAX ?? 100);
  const timeWindow = options.rateLimitWindow ?? process.env.RATE_LIMIT_WINDOW ?? '1 minute';

  return {
    max,
    timeWindow,
    cache: 10000,
    allowList: (req) => {
      return req.url === '/' || req.url === '/health';
    },
    errorResponseBuilder: (req, context) => {
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

module.exports = { getRateLimitConfig };
