export type AuthenticatedUser = {
  id: string;
  role: string;
};

export type JwtClaims = {
  sub?: unknown;
  userId?: unknown;
  rol?: unknown;
  role?: unknown;
};
