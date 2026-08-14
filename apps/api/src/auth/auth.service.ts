import type { AuthResponse, UserRole } from '@altora/types';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import { compare, hash } from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
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
    private readonly prisma: PrismaService,
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

    const passwordHash = await hash(dto.password, SALT_ROUNDS);

    const { user, restaurant } = await this.users.createWithRestaurant(
      {
        email: dto.email,
        passwordHash,
        name: dto.name,
      },
      dto.restaurantName,
    );

    return this.buildResponse(user, restaurant, 'owner');
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

    // Fetch the user's restaurant membership with restaurant details
    const membership = await this.prisma.restaurantMember.findFirst({
      where: { userId: user.id },
      include: { restaurant: true },
    });

    const authUser = toAuthUser(user);
    const payload: JwtPayload = { sub: user.id, email: user.email };

    // Attach restaurant and role if membership exists
    if (membership) {
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
    }

    return {
      user: authUser,
      tokens: { accessToken: this.jwt.sign(payload) },
    };
  }

  private buildResponse(
    user: User,
    restaurant?: {
      id: string;
      name: string;
      slug: string;
      timezone?: string;
      currency?: string;
      createdAt: Date;
      updatedAt: Date;
    },
    role?: UserRole,
  ): AuthResponse {
    const payload: JwtPayload = { sub: user.id, email: user.email, role };

    const authUser = toAuthUser(user);

    if (restaurant) {
      authUser.restaurant = {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        timezone: restaurant.timezone ?? undefined,
        currency: restaurant.currency ?? undefined,
        createdAt: restaurant.createdAt.toISOString(),
        updatedAt: restaurant.updatedAt.toISOString(),
      };
      authUser.role = role;
    }

    return {
      user: authUser,
      tokens: { accessToken: this.jwt.sign(payload) },
    };
  }
}
