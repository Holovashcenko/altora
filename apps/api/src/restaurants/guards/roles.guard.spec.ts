import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { RestaurantMember } from '@prisma/client';

import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let mockContext: ExecutionContext;

  const mockMembership: RestaurantMember = {
    id: 'm_1',
    userId: 'usr_1',
    restaurantId: 'r_1',
    role: 'owner',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    guard = moduleRef.get(RolesGuard);

    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          membership: mockMembership,
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  });

  describe('role-based authorization', () => {
    it('allows owner to access owner-only endpoints', () => {
      reflector.getAllAndOverride.mockReturnValue(['owner']);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('allows manager to access endpoints requiring manager or owner', () => {
      const request = (mockContext.switchToHttp().getRequest as jest.Mock)();
      request.membership.role = 'manager';
      reflector.getAllAndOverride.mockReturnValue(['owner', 'manager']);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('allows staff to access endpoints allowing all roles', () => {
      const request = (mockContext.switchToHttp().getRequest as jest.Mock)();
      request.membership.role = 'staff';
      reflector.getAllAndOverride.mockReturnValue(['owner', 'manager', 'staff']);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('rejects staff from owner-only endpoints', () => {
      const request = (mockContext.switchToHttp().getRequest as jest.Mock)();
      request.membership.role = 'staff';
      reflector.getAllAndOverride.mockReturnValue(['owner']);

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow(
        'Insufficient role for this endpoint',
      );
    });

    it('rejects manager from owner-only endpoints', () => {
      const request = (mockContext.switchToHttp().getRequest as jest.Mock)();
      request.membership.role = 'manager';
      reflector.getAllAndOverride.mockReturnValue(['owner']);

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow(
        'Insufficient role for this endpoint',
      );
    });

    it('rejects staff from manager-or-owner endpoints', () => {
      const request = (mockContext.switchToHttp().getRequest as jest.Mock)();
      request.membership.role = 'staff';
      reflector.getAllAndOverride.mockReturnValue(['owner', 'manager']);

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow(
        'Insufficient role for this endpoint',
      );
    });
  });

  describe('no role requirements', () => {
    it('allows any role when no roles are specified', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('allows any role when roles array is empty', () => {
      reflector.getAllAndOverride.mockReturnValue([]);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });
  });

  describe('missing membership', () => {
    it('rejects when no membership is attached to request but roles are required', () => {
      const request = (mockContext.switchToHttp().getRequest as jest.Mock)();
      request.membership = undefined;
      reflector.getAllAndOverride.mockReturnValue(['owner']);

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow(
        'Missing restaurant membership',
      );
    });

    it('allows access when no membership and no role requirements', () => {
      const request = (mockContext.switchToHttp().getRequest as jest.Mock)();
      request.membership = undefined;
      reflector.getAllAndOverride.mockReturnValue([]);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });
  });
});
