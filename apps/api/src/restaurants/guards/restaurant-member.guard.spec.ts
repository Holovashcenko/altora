import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Restaurant, RestaurantMember } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { RestaurantMemberGuard } from './restaurant-member.guard';

describe('RestaurantMemberGuard', () => {
  let guard: RestaurantMemberGuard;
  let prisma: { restaurantMember: { findFirst: jest.Mock } };
  let mockContext: ExecutionContext;

  const mockRestaurant: Restaurant = {
    id: 'r_1',
    name: 'Test Restaurant',
    slug: 'test-restaurant',
    timezone: 'UTC',
    currency: 'USD',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  const mockMembership: RestaurantMember & { restaurant: Restaurant } = {
    id: 'm_1',
    userId: 'usr_1',
    restaurantId: 'r_1',
    role: 'owner',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    restaurant: mockRestaurant,
  };

  beforeEach(async () => {
    prisma = {
      restaurantMember: {
        findFirst: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RestaurantMemberGuard,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    guard = moduleRef.get(RestaurantMemberGuard);

    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { id: 'usr_1', email: 'owner@altora.test', role: 'owner' },
        }),
      }),
    } as unknown as ExecutionContext;
  });

  describe('authenticated member with membership', () => {
    it('allows access when user has restaurant membership', async () => {
      prisma.restaurantMember.findFirst.mockResolvedValue(mockMembership);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(prisma.restaurantMember.findFirst).toHaveBeenCalledWith({
        where: { userId: 'usr_1' },
        include: { restaurant: true },
      });
    });

    it('attaches restaurant and membership to request', async () => {
      prisma.restaurantMember.findFirst.mockResolvedValue(mockMembership);

      const request = (mockContext.switchToHttp().getRequest as jest.Mock)();
      await guard.canActivate(mockContext);

      expect(request.restaurant).toEqual(mockRestaurant);
      expect(request.membership).toEqual(mockMembership);
    });

    it('allows access for manager role member', async () => {
      const managerMembership: RestaurantMember & { restaurant: Restaurant } = {
        ...mockMembership,
        role: 'manager',
      };
      prisma.restaurantMember.findFirst.mockResolvedValue(managerMembership);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('allows access for staff role member', async () => {
      const staffMembership: RestaurantMember & { restaurant: Restaurant } = {
        ...mockMembership,
        role: 'staff',
      };
      prisma.restaurantMember.findFirst.mockResolvedValue(staffMembership);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });
  });

  describe('user without membership', () => {
    it('rejects access when user has no restaurant membership', async () => {
      prisma.restaurantMember.findFirst.mockResolvedValue(null);

      await expect(guard.canActivate(mockContext)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'User is not a member of any restaurant',
      );
    });
  });

  describe('missing authentication', () => {
    it('rejects when no user is attached to request', async () => {
      const requestWithoutUser = (mockContext.switchToHttp().getRequest as jest.Mock)();
      requestWithoutUser.user = undefined;

      await expect(guard.canActivate(mockContext)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Authentication required',
      );
      expect(prisma.restaurantMember.findFirst).not.toHaveBeenCalled();
    });

    it('rejects when user.id is missing', async () => {
      const requestWithInvalidUser = (mockContext.switchToHttp().getRequest as jest.Mock)();
      requestWithInvalidUser.user = { email: 'owner@altora.test', role: 'owner' };

      await expect(guard.canActivate(mockContext)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Authentication required',
      );
      expect(prisma.restaurantMember.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('queries by userId only (first membership is primary)', async () => {
      prisma.restaurantMember.findFirst.mockResolvedValue(mockMembership);

      await guard.canActivate(mockContext);

      expect(prisma.restaurantMember.findFirst).toHaveBeenCalledWith({
        where: { userId: 'usr_1' },
        include: { restaurant: true },
      });
    });
  });
});
