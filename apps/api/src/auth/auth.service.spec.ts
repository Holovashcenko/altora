import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import type { User } from '@prisma/client';
import { compare, hash } from 'bcrypt';

import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

const PASSWORD = 'correct-horse-battery';

/** Hashed once — bcrypt at 12 rounds is deliberately slow. */
let passwordHash: string;

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'usr_1',
    email: 'owner@altora.test',
    passwordHash,
    name: 'Owner',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  } as User;
}

describe('AuthService', () => {
  let service: AuthService;
  let users: {
    findByEmail: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    createWithRestaurant: jest.Mock;
  };
  let jwt: { sign: jest.Mock };

  beforeAll(async () => {
    passwordHash = await hash(PASSWORD, 12);
  });

  beforeEach(async () => {
    users = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      createWithRestaurant: jest.fn(),
    };
    jwt = { sign: jest.fn().mockReturnValue('signed.jwt.token') };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('stores a bcrypt hash rather than the raw password', async () => {
      users.findByEmail.mockResolvedValue(null);
      users.createWithRestaurant.mockImplementation(
        (input: { passwordHash: string }) =>
          Promise.resolve({
            user: buildUser({ passwordHash: input.passwordHash }),
            restaurant: {
              id: 'r_1',
              name: "Owner's Restaurant",
              slug: 'owners-restaurant',
              createdAt: new Date('2026-01-01T00:00:00.000Z'),
              updatedAt: new Date('2026-01-02T00:00:00.000Z'),
            },
          }),
      );

      await service.register({ email: 'new@altora.test', password: PASSWORD, name: 'New' });

      const [createInput] = users.createWithRestaurant.mock.calls[0];
      expect(createInput.passwordHash).not.toBe(PASSWORD);
      await expect(compare(PASSWORD, createInput.passwordHash)).resolves.toBe(true);
    });

    it('assigns the owner role to v1 signups', async () => {
      users.findByEmail.mockResolvedValue(null);
      users.createWithRestaurant.mockResolvedValue({
        user: buildUser(),
        restaurant: {
          id: 'r_1',
          name: "Owner's Restaurant",
          slug: 'owners-restaurant',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      });

      await service.register({ email: 'new@altora.test', password: PASSWORD, name: 'New' });

      expect(users.createWithRestaurant).toHaveBeenCalled();
    });

    it('returns a signed token and a user with no password hash', async () => {
      users.findByEmail.mockResolvedValue(null);

      users.createWithRestaurant.mockResolvedValue({
        user: buildUser(),
        restaurant: {
          id: 'r_1',
          name: "Owner's Restaurant",
          slug: 'owners-restaurant',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      });

      const result = await service.register({
        email: 'owner@altora.test',
        password: PASSWORD,
        name: 'Owner',
      });

      expect(result.tokens.accessToken).toBe('signed.jwt.token');
      expect(result.user).toEqual({
        id: 'usr_1',
        email: 'owner@altora.test',
        name: 'Owner',
        role: 'owner',
        restaurant: {
          id: 'r_1',
          name: "Owner's Restaurant",
          slug: 'owners-restaurant',
          timezone: undefined,
          currency: undefined,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      });
      expect(jwt.sign).toHaveBeenCalledWith({
        sub: 'usr_1',
        email: 'owner@altora.test',
        role: 'owner',
      });
    });

    it('rejects an email that is already registered without creating a second user', async () => {
      users.findByEmail.mockResolvedValue(buildUser());

      await expect(
        service.register({ email: 'owner@altora.test', password: PASSWORD, name: 'Owner' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(users.createWithRestaurant).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('issues a token for valid credentials', async () => {
      users.findByEmail.mockResolvedValue(buildUser());

      const result = await service.login({ email: 'owner@altora.test', password: PASSWORD });

      expect(result.tokens.accessToken).toBe('signed.jwt.token');
      expect(result.user.id).toBe('usr_1');
    });

    it('rejects a wrong password', async () => {
      users.findByEmail.mockResolvedValue(buildUser());

      await expect(
        service.login({ email: 'owner@altora.test', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('rejects an unknown email with the same message as a wrong password', async () => {
      users.findByEmail.mockResolvedValue(null);

      const unknownEmail = service.login({ email: 'nobody@altora.test', password: PASSWORD });
      await expect(unknownEmail).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(unknownEmail).rejects.toThrow('Invalid credentials');

      users.findByEmail.mockResolvedValue(buildUser());
      const wrongPassword = service.login({ email: 'owner@altora.test', password: 'nope' });
      await expect(wrongPassword).rejects.toThrow('Invalid credentials');
    });
  });
});
