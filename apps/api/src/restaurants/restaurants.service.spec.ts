import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Restaurant, RestaurantMember } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RestaurantsService } from './restaurants.service';

describe('RestaurantsService', () => {
  let service: RestaurantsService;
  let prisma: {
    restaurant: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    restaurantMember: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
    };
  };

  const mockRestaurant: Restaurant = {
    id: 'r_1',
    name: 'Test Restaurant',
    slug: 'test-restaurant',
    timezone: 'UTC',
    currency: 'USD',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  const mockMembership: RestaurantMember = {
    id: 'm_1',
    userId: 'usr_1',
    restaurantId: 'r_1',
    role: 'owner',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      restaurant: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      restaurantMember: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RestaurantsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(RestaurantsService);
  });

  describe('updateRestaurant', () => {
    it('updates restaurant with provided fields', async () => {
      prisma.restaurant.findUnique.mockResolvedValue(mockRestaurant);
      prisma.restaurant.update.mockResolvedValue({
        ...mockRestaurant,
        name: 'Updated Restaurant',
        timezone: 'America/New_York',
      });

      const result = await service.updateRestaurant('r_1', {
        name: 'Updated Restaurant',
        timezone: 'America/New_York',
      });

      expect(result.name).toBe('Updated Restaurant');
      expect(result.timezone).toBe('America/New_York');
      expect(prisma.restaurant.update).toHaveBeenCalledWith({
        where: { id: 'r_1' },
        data: {
          name: 'Updated Restaurant',
          timezone: 'America/New_York',
        },
      });
    });

    it('updates only the name when only name is provided', async () => {
      prisma.restaurant.findUnique.mockResolvedValue(mockRestaurant);
      prisma.restaurant.update.mockResolvedValue({
        ...mockRestaurant,
        name: 'New Name',
      });

      await service.updateRestaurant('r_1', { name: 'New Name' });

      expect(prisma.restaurant.update).toHaveBeenCalledWith({
        where: { id: 'r_1' },
        data: { name: 'New Name' },
      });
    });

    it('updates only the currency when only currency is provided', async () => {
      prisma.restaurant.findUnique.mockResolvedValue(mockRestaurant);
      prisma.restaurant.update.mockResolvedValue({
        ...mockRestaurant,
        currency: 'EUR',
      });

      await service.updateRestaurant('r_1', { currency: 'EUR' });

      expect(prisma.restaurant.update).toHaveBeenCalledWith({
        where: { id: 'r_1' },
        data: { currency: 'EUR' },
      });
    });

    it('throws NotFoundException when restaurant does not exist', async () => {
      prisma.restaurant.findUnique.mockResolvedValue(null);

      await expect(
        service.updateRestaurant('nonexistent_r', { name: 'New Name' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.updateRestaurant('nonexistent_r', { name: 'New Name' }),
      ).rejects.toThrow('Restaurant not found');
      expect(prisma.restaurant.update).not.toHaveBeenCalled();
    });
  });

  describe('listMembers', () => {
    it('returns all members of a restaurant', async () => {
      const members = [
        mockMembership,
        {
          id: 'm_2',
          userId: 'usr_2',
          restaurantId: 'r_1',
          role: 'manager' as const,
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
        },
        {
          id: 'm_3',
          userId: 'usr_3',
          restaurantId: 'r_1',
          role: 'staff' as const,
          createdAt: new Date('2026-01-03T00:00:00.000Z'),
        },
      ];
      prisma.restaurantMember.findMany.mockResolvedValue(members);

      const result = await service.listMembers('r_1');

      expect(result).toEqual(members);
      expect(result).toHaveLength(3);
      expect(prisma.restaurantMember.findMany).toHaveBeenCalledWith({
        where: { restaurantId: 'r_1' },
      });
    });

    it('returns an empty array when restaurant has no members', async () => {
      prisma.restaurantMember.findMany.mockResolvedValue([]);

      const result = await service.listMembers('r_1');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('queries members by restaurantId only', async () => {
      prisma.restaurantMember.findMany.mockResolvedValue([mockMembership]);

      await service.listMembers('r_1');

      expect(prisma.restaurantMember.findMany).toHaveBeenCalledWith({
        where: { restaurantId: 'r_1' },
      });
    });
  });

  describe('removeMember', () => {
    it('removes a member from a restaurant', async () => {
      prisma.restaurantMember.findUnique.mockResolvedValue(mockMembership);
      prisma.restaurantMember.delete.mockResolvedValue(mockMembership);

      const result = await service.removeMember('r_1', 'usr_1');

      expect(result).toEqual({ success: true });
      expect(prisma.restaurantMember.findUnique).toHaveBeenCalledWith({
        where: { userId_restaurantId: { userId: 'usr_1', restaurantId: 'r_1' } },
      });
      expect(prisma.restaurantMember.delete).toHaveBeenCalledWith({
        where: { userId_restaurantId: { userId: 'usr_1', restaurantId: 'r_1' } },
      });
    });

    it('throws NotFoundException when membership does not exist', async () => {
      prisma.restaurantMember.findUnique.mockResolvedValue(null);

      await expect(
        service.removeMember('r_1', 'nonexistent_usr'),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        service.removeMember('r_1', 'nonexistent_usr'),
      ).rejects.toThrow('Membership not found');
      expect(prisma.restaurantMember.delete).not.toHaveBeenCalled();
    });

    it('still deletes even if findUnique returns a membership (confirms deletion)', async () => {
      prisma.restaurantMember.findUnique.mockResolvedValue(mockMembership);
      prisma.restaurantMember.delete.mockResolvedValue(mockMembership);

      await service.removeMember('r_1', 'usr_1');

      expect(prisma.restaurantMember.delete).toHaveBeenCalled();
    });
  });

  describe('missing/forbidden restaurant access', () => {
    it('updateRestaurant checks existence before updating', async () => {
      prisma.restaurant.findUnique.mockResolvedValue(null);

      await expect(
        service.updateRestaurant('r_999', { name: 'Hacker' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.restaurant.update).not.toHaveBeenCalled();
    });

    it('removeMember rejects when membership does not exist at the specified restaurant', async () => {
      prisma.restaurantMember.findUnique.mockResolvedValue(null);

      await expect(
        service.removeMember('r_1', 'usr_999'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.restaurantMember.delete).not.toHaveBeenCalled();
    });

    it('removeMember checks existence before deletion', async () => {
      prisma.restaurantMember.findUnique.mockResolvedValue(null);

      const promise = service.removeMember('r_1', 'usr_1');

      await expect(promise).rejects.toThrow('Membership not found');
    });
  });
});
