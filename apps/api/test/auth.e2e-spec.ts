import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

/** Every account this suite creates shares this prefix so cleanup never touches other rows. */
const EMAIL_PREFIX = 'e2e-auth-';
const EMAIL = `${EMAIL_PREFIX}owner@altora.test`;
const PASSWORD = 'correct-horse-battery';
const NAME = 'E2E Owner';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: Server;
  let accessToken: string;
  let userId: string;

  const clearTestUsers = (): Promise<unknown> =>
    prisma.user.deleteMany({ where: { email: { startsWith: EMAIL_PREFIX } } });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = configureApp(moduleRef.createNestApplication());
    await app.init();

    prisma = app.get(PrismaService);
    await clearTestUsers();

    http = app.getHttpServer();
  });

  afterAll(async () => {
    await clearTestUsers();
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('creates an owner account and returns a token', async () => {
      const response = await request(http)
        .post('/api/auth/register')
        .send({ email: EMAIL, password: PASSWORD, name: NAME })
        .expect(201);

      expect(response.body.user).toMatchObject({ email: EMAIL, name: NAME, role: 'owner' });
      expect(response.body.tokens.accessToken).toEqual(expect.any(String));
      expect(response.body.user).not.toHaveProperty('passwordHash');

      userId = response.body.user.id;
    });

    it('persists a hash, never the raw password', async () => {
      const stored = await prisma.user.findUnique({ where: { email: EMAIL } });

      expect(stored?.passwordHash).toBeDefined();
      expect(stored?.passwordHash).not.toBe(PASSWORD);
    });

    it('rejects a duplicate email with 409', async () => {
      await request(http)
        .post('/api/auth/register')
        .send({ email: EMAIL, password: PASSWORD, name: NAME })
        .expect(409);
    });

    it('rejects a password shorter than 8 characters with 400', async () => {
      await request(http)
        .post('/api/auth/register')
        .send({ email: `${EMAIL_PREFIX}short@altora.test`, password: 'short', name: NAME })
        .expect(400);
    });

    it('rejects a malformed email with 400', async () => {
      await request(http)
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: PASSWORD, name: NAME })
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns a token for valid credentials', async () => {
      const response = await request(http)
        .post('/api/auth/login')
        .send({ email: EMAIL, password: PASSWORD })
        .expect(200);

      expect(response.body.user.id).toBe(userId);
      expect(response.body.tokens.accessToken).toEqual(expect.any(String));

      accessToken = response.body.tokens.accessToken;
    });

    it('matches emails case-insensitively', async () => {
      await request(http)
        .post('/api/auth/login')
        .send({ email: EMAIL.toUpperCase(), password: PASSWORD })
        .expect(200);
    });

    it('rejects a wrong password with 401', async () => {
      await request(http)
        .post('/api/auth/login')
        .send({ email: EMAIL, password: 'wrong-password' })
        .expect(401);
    });

    it('rejects an unknown email with 401', async () => {
      await request(http)
        .post('/api/auth/login')
        .send({ email: `${EMAIL_PREFIX}nobody@altora.test`, password: PASSWORD })
        .expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns the current user for a valid token', async () => {
      const response = await request(http)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({ id: userId, email: EMAIL, role: 'owner' });
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('rejects a request with no token', async () => {
      await request(http).get('/api/auth/me').expect(401);
    });

    it('rejects a malformed token', async () => {
      await request(http)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(401);
    });

    it('rejects a valid token whose user has been deleted', async () => {
      const doomed = await request(http)
        .post('/api/auth/register')
        .send({ email: `${EMAIL_PREFIX}deleted@altora.test`, password: PASSWORD, name: 'Gone' })
        .expect(201);

      await prisma.user.delete({ where: { id: doomed.body.user.id } });

      await request(http)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${doomed.body.tokens.accessToken}`)
        .expect(401);
    });
  });

  describe('public routes', () => {
    it('serves the health check without a token', async () => {
      await request(http).get('/api/health').expect(200, { status: 'ok' });
    });
  });
});
