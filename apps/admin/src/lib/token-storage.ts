const TOKEN_KEY = 'altora.auth.token';

/**
 * Access tokens live in `localStorage` so a refresh keeps the session.
 *
 * The trade-off is XSS exposure; moving to an httpOnly cookie means the API must
 * set the cookie on login and the admin must send credentialed requests instead.
 */
export function readToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function writeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
