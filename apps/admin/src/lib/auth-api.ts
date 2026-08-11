import type { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from '@altora/types';

import { apiRequest } from './api-client';

/** POST /auth/login — returns the user plus the access token to store. */
export function login(credentials: LoginRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: credentials });
}

/** POST /auth/register — open owner signup, same response shape as login. */
export function register(details: RegisterRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: details });
}

/** GET /auth/me — resolves the stored token to a user, or throws 401 if stale. */
export function fetchCurrentUser(token: string): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/me', { token });
}

export type { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from '@altora/types';
