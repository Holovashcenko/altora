import type { AuthResponse, LoginRequest } from '@altora/types';

const API_BASE = '/api';

/** POST /auth/login — typed client stub for Phase 4 UI. */
export async function login(
  credentials: LoginRequest,
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    throw new Error(`Login failed (${response.status})`);
  }

  return response.json() as Promise<AuthResponse>;
}

export type { AuthResponse, AuthUser, LoginRequest } from '@altora/types';
