// auth.types.ts

export interface JwtUser {
  sub: string;
  rol: string;
  exp?: number;
  userId?: string;
  role?: string;
  email?: string;
}
