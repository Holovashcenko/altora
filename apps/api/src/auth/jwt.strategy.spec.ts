import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { User } from '@prisma/client';

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

  it('resolves the current user from the token subject', async () => {
    findById.mockResolvedValue(USER);
    findFirst.mockResolvedValue({ role: 'owner' });

    await expect(strategy.validate(PAYLOAD)).resolves.toEqual({
      id: 'usr_1',
      email: 'owner@altora.test',
      name: 'Owner',
      role: 'owner',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    expect(findById).toHaveBeenCalledWith('usr_1');
  });

  it('rejects a token whose user no longer exists', async () => {
    findById.mockResolvedValue(null);

    await expect(strategy.validate(PAYLOAD)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('reads the role from the database membership rather than trusting the token', async () => {
    findById.mockResolvedValue(USER);
    findFirst.mockResolvedValue({ role: 'staff' });

    const user = await strategy.validate({ ...PAYLOAD, role: 'owner' });

    expect(user.role).toBe('staff');
  });
});
