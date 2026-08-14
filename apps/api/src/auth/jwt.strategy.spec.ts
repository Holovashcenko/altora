import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Restaurant, RestaurantMember, User } from '@prisma/client';

import type { PrismaService } from '../prisma/prisma.service';
import type { UsersService } from '../users/users.service';
import { JwtStrategy } from './jwt.strategy';

const PAYLOAD = { sub: 'usr_1', email: 'owner@altora.test', role: 'owner' as const };

const USER = {
  id: 'usr_1',
  email: 'owner@altora.test',
  passwordHash: '$2b$12$hash',
  name: 'Owner',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
} as User;

const RESTAURANT: Restaurant = {
  id: 'r_1',
  name: "Owner's Restaurant",
  slug: 'owner-restaurant',
  timezone: 'UTC',
  currency: 'USD',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

const MEMBERSHIP: RestaurantMember & { restaurant: Restaurant } = {
  id: 'm_1',
  userId: 'usr_1',
  restaurantId: 'r_1',
  role: 'owner',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  restaurant: RESTAURANT,
};

describe('JwtStrategy', () => {
  let findById: jest.Mock;
  let findFirst: jest.Mock;
  let strategy: JwtStrategy;

  beforeEach(() => {
    findById = jest.fn();
    findFirst = jest.fn();

    const config = { get: jest.fn().mockReturnValue('test-secret-at-least-32-characters-long') };
    const users = { findById } as unknown as UsersService;
    const prisma = { restaurantMember: { findFirst } } as unknown as PrismaService;

    strategy = new JwtStrategy(config as unknown as ConfigService, users, prisma);
  });

  describe('authenticated member with membership', () => {
    it('resolves the current user with restaurant and role from membership', async () => {
      findById.mockResolvedValue(USER);
      findFirst.mockResolvedValue(MEMBERSHIP);

      const result = await strategy.validate(PAYLOAD);

      expect(result.id).toBe('usr_1');
      expect(result.email).toBe('owner@altora.test');
      expect(result.name).toBe('Owner');
      expect(result.role).toBe('owner');
      expect(result.restaurant).toEqual({
        id: 'r_1',
        name: "Owner's Restaurant",
        slug: 'owner-restaurant',
        timezone: 'UTC',
        currency: 'USD',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      });
    });

    it('queries membership with restaurant included', async () => {
      findById.mockResolvedValue(USER);
      findFirst.mockResolvedValue(MEMBERSHIP);

      await strategy.validate(PAYLOAD);

      expect(findFirst).toHaveBeenCalledWith({
        where: { userId: 'usr_1' },
        include: { restaurant: true },
      });
    });

    it('includes optional timezone and currency if present', async () => {
      findById.mockResolvedValue(USER);
      findFirst.mockResolvedValue({
        ...MEMBERSHIP,
        restaurant: {
          ...RESTAURANT,
          timezone: 'America/New_York',
          currency: 'EUR',
        },
      });

      const result = await strategy.validate(PAYLOAD);

      expect(result.restaurant?.timezone).toBe('America/New_York');
      expect(result.restaurant?.currency).toBe('EUR');
    });

    it('includes restaurant even if user token claims a different role', async () => {
      findById.mockResolvedValue(USER);
      const managerMembership = { ...MEMBERSHIP, role: 'manager' as const };
      findFirst.mockResolvedValue(managerMembership);

      const result = await strategy.validate({ ...PAYLOAD, role: 'owner' });

      expect(result.role).toBe('manager');
      expect(result.restaurant).toBeDefined();
    });
  });

  describe('user without membership', () => {
    it('rejects with UnauthorizedException when user has no restaurant membership', async () => {
      findById.mockResolvedValue(USER);
      findFirst.mockResolvedValue(null);

      await expect(strategy.validate(PAYLOAD)).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(strategy.validate(PAYLOAD)).rejects.toThrow(
        'User does not have an active restaurant membership',
      );
    });
  });

  describe('missing user', () => {
    it('rejects a token whose user no longer exists', async () => {
      findById.mockResolvedValue(null);

      await expect(strategy.validate(PAYLOAD)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(findFirst).not.toHaveBeenCalled();
    });
  });

  describe('role resolution from membership', () => {
    it('reads the role from the database membership rather than trusting the token', async () => {
      findById.mockResolvedValue(USER);
      findFirst.mockResolvedValue({ ...MEMBERSHIP, role: 'staff' as const });

      const user = await strategy.validate({ ...PAYLOAD, role: 'owner' });

      expect(user.role).toBe('staff');
    });

    it('allows manager role from membership', async () => {
      findById.mockResolvedValue(USER);
      findFirst.mockResolvedValue({ ...MEMBERSHIP, role: 'manager' as const });

      const user = await strategy.validate(PAYLOAD);

      expect(user.role).toBe('manager');
    });

    it('allows staff role from membership', async () => {
      findById.mockResolvedValue(USER);
      findFirst.mockResolvedValue({ ...MEMBERSHIP, role: 'staff' as const });

      const user = await strategy.validate(PAYLOAD);

      expect(user.role).toBe('staff');
    });
  });
});
