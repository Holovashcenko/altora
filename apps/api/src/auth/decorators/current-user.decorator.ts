import type { AuthUser } from '@altora/types';
import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';

/**
 * Injects the authenticated user resolved by `JwtStrategy.validate`.
 * Only valid on routes guarded by `JwtAuthGuard` — on `@Public()` routes it is undefined.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest<{ user: AuthUser }>();

    return request.user;
  },
);
