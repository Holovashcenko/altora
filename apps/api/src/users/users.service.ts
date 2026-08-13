import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  name: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Emails are stored and looked up lowercased so logins are case-insensitive. */
  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(input: CreateUserInput): Promise<User> {
    return this.prisma.user.create({
      data: { ...input, email: normalizeEmail(input.email) },
    });
  }

  /**
   * Create an owner user together with a restaurant and membership in a single
   * transaction so there is one source of truth for roles from day one.
   */
  async createWithRestaurant(
    input: CreateUserInput,
    restaurantName?: string,
  ): Promise<{
    user: User;
    restaurant: {
      id: string;
      name: string;
      slug: string;
      timezone?: string;
      currency?: string;
      createdAt: Date;
      updatedAt: Date;
    };
  }> {
    const normalizedEmail = normalizeEmail(input.email);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { ...input, email: normalizedEmail } });

      const name = restaurantName ?? `${input.name}'s Restaurant`;
      const slug = slugify(name);

      const restaurant = await tx.restaurant.create({ data: { name, slug } });

      await tx.restaurantMember.create({
        data: { userId: user.id, restaurantId: restaurant.id, role: 'owner' },
      });

      return { user, restaurant };
    });
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50);
}
