import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  name?: string | null;
  role: Role;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthProfile {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}
