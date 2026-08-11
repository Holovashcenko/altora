import type { AuthUser, LoginRequest } from '@altora/types';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import * as authApi from '../lib/auth-api';
import { clearToken, readToken, writeToken } from '../lib/token-storage';
import type { AuthContextValue, AuthStatus } from './auth-context';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  // Captured once: without a stored token there is nothing to resolve, so the app
  // can render `/login` immediately instead of flashing a loading state.
  const [storedToken] = useState(readToken);
  const [status, setStatus] = useState<AuthStatus>(storedToken ? 'loading' : 'anonymous');
  const [user, setUser] = useState<AuthUser | null>(null);

  // Trades the token left by a previous session for the user behind it.
  useEffect(() => {
    if (!storedToken) {
      return;
    }

    let active = true;

    authApi
      .fetchCurrentUser(storedToken)
      .then((currentUser) => {
        if (!active) {
          return;
        }

        setUser(currentUser);
        setStatus('authenticated');
      })
      .catch(() => {
        // Expired, revoked, or issued by a different JWT_SECRET — start over.
        clearToken();

        if (active) {
          setUser(null);
          setStatus('anonymous');
        }
      });

    return () => {
      active = false;
    };
  }, [storedToken]);

  const login = useCallback(async (credentials: LoginRequest) => {
    const { user: authenticated, tokens } = await authApi.login(credentials);

    writeToken(tokens.accessToken);
    setUser(authenticated);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(() => {
    // Tokens are stateless, so signing out is purely client-side for now.
    clearToken();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, logout }),
    [status, user, login, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
