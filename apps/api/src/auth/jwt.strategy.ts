import type { AuthUser } from '@altora/types';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { toAuthUser } from '../users/user.mapper';
import { UsersService } from '../users/users.service';
import type { JwtPayload } from './jwt-payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  /**
   * Re-reads the user on every request so deleted accounts and role changes take
   * effect immediately rather than at token expiry.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.users.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException();
    }

    return toAuthUser(user);
  }
}
