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
   * restaurant membership to include their role.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.users.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException();
    }

    const authUser = toAuthUser(user);

    // Fetch the first restaurant membership to determine the user's role
    const membership = await this.prisma.restaurantMember.findFirst({
      where: { userId: user.id },
    });

    if (membership) {
      authUser.role = membership.role;
    }

    return authUser;
  }
}
