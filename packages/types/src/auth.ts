/** Must stay in sync with the `UserRole` enum in `apps/api/prisma/schema.prisma`. */
export type UserRole = 'owner' | 'manager' | 'staff';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthTokens {
  accessToken: string;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}
