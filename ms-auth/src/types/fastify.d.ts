import type { JwtUser } from '../auth/auth.types.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtUser;
  }
}

export {};