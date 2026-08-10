import type { AuthUser, UserRole } from '@altora/types';
import type { User } from '@prisma/client';

/** Maps a Prisma `User` row to the public `AuthUser` contract (no password). */
export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
