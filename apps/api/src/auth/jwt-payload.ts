import type { UserRole } from '@altora/types';

/** Claims carried by an access token. `sub` is the user id. */
export interface JwtPayload {
  sub: string;
  email: string;
  role?: UserRole;
}
