import type { AuthUser } from '@altora/types';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PrismaService } from '../prisma/prisma.service';
import { toAuthUser } from '../users/user.mapper';
import { UsersService } from '../users/users.service';
import type { JwtPayload } from './jwt-payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  /**
   * Re-reads the user on every request so deleted accounts and role changes take
   * effect immediately rather than at token expiry. Also fetches the user's
   * restaurant membership to include their role and active restaurant. A user
   * without a restaurant membership is rejected immediately (403).
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.users.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException();
    }

    const authUser = toAuthUser(user);

    // Fetch the first restaurant membership with restaurant details
    const membership = await this.prisma.restaurantMember.findFirst({
      where: { userId: user.id },
      include: { restaurant: true },
    });

    if (!membership) {
      throw new UnauthorizedException('User does not have an active restaurant membership');
    }

    authUser.role = membership.role;
    authUser.restaurant = {
      id: membership.restaurant.id,
      name: membership.restaurant.name,
      slug: membership.restaurant.slug,
      timezone: membership.restaurant.timezone ?? undefined,
      currency: membership.restaurant.currency ?? undefined,
      createdAt: membership.restaurant.createdAt.toISOString(),
      updatedAt: membership.restaurant.updatedAt.toISOString(),
    };

    return authUser;
  }
}
