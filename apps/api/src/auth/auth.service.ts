import type { AuthResponse } from '@altora/types';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import { compare, hash } from 'bcrypt';

import { toAuthUser } from '../users/user.mapper';
import { UsersService } from '../users/users.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './jwt-payload';

const SALT_ROUNDS = 12;

/**
 * Compared against when no account matches, so a wrong email and a wrong password
 * cost the same time and cannot be told apart by an attacker enumerating emails.
 */
const DUMMY_HASH = '$2b$12$qNABwWHdW8UwNQOYZqgOV.4g86w670y2kRhrGpruz54H6RKeWEQ8a';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * v1 is open owner signup — every account created here owns its own restaurant.
   * Staff and manager accounts arrive with invites in Restaurant management.
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.users.findByEmail(dto.email);

    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const user = await this.users.create({
      email: dto.email,
      passwordHash: await hash(dto.password, SALT_ROUNDS),
      name: dto.name,
      role: 'owner',
    });

    return this.buildResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.users.findByEmail(dto.email);

    if (!user) {
      await compare(dto.password, DUMMY_HASH);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildResponse(user);
  }

  private buildResponse(user: User): AuthResponse {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };

    return {
      user: toAuthUser(user),
      tokens: { accessToken: this.jwt.sign(payload) },
    };
  }
}
