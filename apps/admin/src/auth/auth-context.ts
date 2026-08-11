import type { AuthUser, LoginRequest } from '@altora/types';
import { createContext, use } from 'react';

/**
 * `loading` covers the initial `/auth/me` round-trip. Routes must wait it out,
 * otherwise a refresh on a protected page bounces the user to `/login`.
 */
export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  /** Throws `ApiError` on bad credentials so the form can show the message. */
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = use(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }

  return value;
}
