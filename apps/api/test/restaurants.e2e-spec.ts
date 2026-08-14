import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import * as bcrypt from 'bcrypt';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

/** Every account this suite creates shares this prefix so cleanup never touches other rows. */
const EMAIL_PREFIX = 'e2e-restaurants-';
const PASSWORD = 'correct-horse-battery';

describe('Restaurants (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: Server;

  // Owner account
  let ownerEmail: string;
  let ownerToken: string;
  let restaurantId: string;

  // Manager account in same restaurant
  let managerEmail: string;
  let managerToken: string;
  let managerId: string;

  // Staff account in same restaurant
  let staffEmail: string;
  let staffToken: string;
  let staffId: string;

  // User with no restaurant membership
  let lonelyEmail: string;

  const clearTestUsers = (): Promise<unknown> =>
    prisma.user.deleteMany({ where: { email: { startsWith: EMAIL_PREFIX } } });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = configureApp(moduleRef.createNestApplication());
    await app.init();

    prisma = app.get(PrismaService);
    await clearTestUsers();

    http = app.getHttpServer();
    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    // Create owner account
    ownerEmail = `${EMAIL_PREFIX}owner-${Date.now()}@altora.test`;
    const ownerName = `Owner ${Date.now()}`;
    let response = await request(http)
      .post('/api/auth/register')
      .send({ email: ownerEmail, password: PASSWORD, name: ownerName })
      .expect(201);

    restaurantId = response.body.user.restaurant.id;
    ownerToken = response.body.tokens.accessToken;

    // Create manager account and add to owner's restaurant
    managerId = `${EMAIL_PREFIX}manager-id-${Date.now()}`;
    managerEmail = `${EMAIL_PREFIX}manager-${Date.now()}@altora.test`;
    await prisma.user.create({
      data: { id: managerId, email: managerEmail, passwordHash, name: 'Manager' },
    });
    await prisma.restaurantMember.create({
      data: {
        userId: managerId,
        restaurantId,
        role: 'manager',
      },
    });
    response = await request(http)
      .post('/api/auth/login')
      .send({ email: managerEmail, password: PASSWORD })
      .expect(200);
    managerToken = response.body.tokens.accessToken;

    // Create staff account and add to owner's restaurant
    staffId = `${EMAIL_PREFIX}staff-id-${Date.now()}`;
    staffEmail = `${EMAIL_PREFIX}staff-${Date.now()}@altora.test`;
    await prisma.user.create({
      data: { id: staffId, email: staffEmail, passwordHash, name: 'Staff' },
    });
    await prisma.restaurantMember.create({
      data: {
        userId: staffId,
        restaurantId,
        role: 'staff',
      },
    });
    response = await request(http)
      .post('/api/auth/login')
      .send({ email: staffEmail, password: PASSWORD })
      .expect(200);
    staffToken = response.body.tokens.accessToken;

    // Create user with no restaurant membership.
    // Authentication should still succeed; lack of restaurant membership
    // is handled by restaurant authorization, not login.
    const lonelyId = `${EMAIL_PREFIX}lonely-id-${Date.now()}`;
    lonelyEmail = `${EMAIL_PREFIX}lonely-${Date.now()}@altora.test`;

    await prisma.user.create({
      data: {
        id: lonelyId,
        email: lonelyEmail,
        passwordHash,
        name: 'Lonely',
      },
    });

    const lonelyResponse = await request(http)
      .post('/api/auth/login')
      .send({ email: lonelyEmail, password: PASSWORD })
      .expect(200);

    expect(lonelyResponse.body.tokens.accessToken).toEqual(expect.any(String));
  });

  afterAll(async () => {
    await clearTestUsers();
    await app.close();
  });

  describe('GET /api/restaurants/current', () => {
    it('returns the current restaurant for an authenticated owner', async () => {
      const response = await request(http)
        .get('/api/restaurants/current')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: restaurantId,
        name: expect.any(String),
        slug: expect.any(String),
      });
      expect(response.body).toHaveProperty('timezone');
      expect(response.body).toHaveProperty('currency');
    });

    it('returns the current restaurant for an authenticated manager', async () => {
      const response = await request(http)
        .get('/api/restaurants/current')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: restaurantId,
        name: expect.any(String),
        slug: expect.any(String),
      });
    });

    it('returns the current restaurant for an authenticated staff member', async () => {
      const response = await request(http)
        .get('/api/restaurants/current')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: restaurantId,
        name: expect.any(String),
        slug: expect.any(String),
      });
    });

    it('rejects a request with no token with 401', async () => {
      await request(http).get('/api/restaurants/current').expect(401);
    });

    it('rejects a malformed token with 401', async () => {
      await request(http)
        .get('/api/restaurants/current')
        .set('Authorization', 'Bearer malformed')
        .expect(401);
    });
  });

  describe('PATCH /api/restaurants/current', () => {
    it('allows owner to update restaurant name', async () => {
      const newName = `Updated Restaurant ${Date.now()}`;
      const response = await request(http)
        .patch('/api/restaurants/current')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: newName })
        .expect(200);

      expect(response.body.name).toBe(newName);

      // Verify update persisted
      const verified = await request(http)
        .get('/api/restaurants/current')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(verified.body.name).toBe(newName);
    });

    it('allows owner to update timezone', async () => {
      const newTz = 'America/New_York';
      const response = await request(http)
        .patch('/api/restaurants/current')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ timezone: newTz })
        .expect(200);

      expect(response.body.timezone).toBe(newTz);
    });

    it('allows owner to update currency', async () => {
      const newCurrency = 'EUR';
      const response = await request(http)
        .patch('/api/restaurants/current')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ currency: newCurrency })
        .expect(200);

      expect(response.body.currency).toBe(newCurrency);
    });

    it('allows owner to update multiple fields at once', async () => {
      const updateData = {
        name: `Multi-Update ${Date.now()}`,
        timezone: 'Europe/London',
        currency: 'GBP',
      };
      const response = await request(http)
        .patch('/api/restaurants/current')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject(updateData);
    });

    it('rejects manager from updating with 403', async () => {
      await request(http)
        .patch('/api/restaurants/current')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'Hacker' })
        .expect(403);
    });

    it('rejects staff from updating with 403', async () => {
      await request(http)
        .patch('/api/restaurants/current')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ name: 'Hacker' })
        .expect(403);
    });

    it('rejects unauthorized request with 401', async () => {
      await request(http).patch('/api/restaurants/current').send({ name: 'Hacker' }).expect(401);
    });
  });

  describe('GET /api/restaurants/current/members', () => {
    it('returns all members for an authenticated owner', async () => {
      const response = await request(http)
        .get('/api/restaurants/current/members')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3); // owner, manager, staff

      // Verify member shapes
      response.body.forEach((member: any) => {
        expect(member).toHaveProperty('userId');
        expect(member).toHaveProperty('restaurantId', restaurantId);
        expect(member).toHaveProperty('role');
        expect(['owner', 'manager', 'staff']).toContain(member.role);
      });
    });

    it('returns all members for an authenticated manager', async () => {
      const response = await request(http)
        .get('/api/restaurants/current/members')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3);
    });

    it('rejects staff from listing members with 403', async () => {
      await request(http)
        .get('/api/restaurants/current/members')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('rejects unauthorized request with 401', async () => {
      await request(http).get('/api/restaurants/current/members').expect(401);
    });
  });

  describe('DELETE /api/restaurants/current/members/:userId', () => {
    it('allows owner to remove a staff member', async () => {
      // Create a disposable member
      const disposableId = `${EMAIL_PREFIX}disposable-${Date.now()}`;
      const disposableEmail = `${EMAIL_PREFIX}disposable-${Date.now()}@altora.test`;
      await prisma.user.create({
        data: { id: disposableId, email: disposableEmail, passwordHash: 'dummy', name: 'Temp' },
      });
      await prisma.restaurantMember.create({
        data: {
          userId: disposableId,
          restaurantId,
          role: 'staff',
        },
      });

      // Remove the member
      const response = await request(http)
        .delete(`/api/restaurants/current/members/${disposableId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toEqual({ success: true });

      // Verify member is gone
      const membership = await prisma.restaurantMember.findUnique({
        where: { userId_restaurantId: { userId: disposableId, restaurantId } },
      });

      expect(membership).toBeNull();
    });

    it('rejects manager from removing members with 403', async () => {
      await request(http)
        .delete(`/api/restaurants/current/members/${staffId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
    });

    it('rejects staff from removing members with 403', async () => {
      await request(http)
        .delete(`/api/restaurants/current/members/${managerId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('rejects removing a nonexistent member with 404', async () => {
      await request(http)
        .delete(`/api/restaurants/current/members/nonexistent-user-id`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });

    it('rejects unauthorized request with 401', async () => {
      await request(http).delete(`/api/restaurants/current/members/${staffId}`).expect(401);
    });
  });

  describe('authorization behavior across all endpoints', () => {
    it('prevents unauthenticated users from accessing any restaurant endpoint', async () => {
      await request(http).get('/api/restaurants/current').expect(401);
      await request(http).patch('/api/restaurants/current').send({}).expect(401);
      await request(http).get('/api/restaurants/current/members').expect(401);
      await request(http).delete(`/api/restaurants/current/members/${staffId}`).expect(401);
    });

    it('enforces role hierarchy for restricted endpoints', async () => {
      // Staff cannot access manager/owner endpoints
      await request(http)
        .patch('/api/restaurants/current')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ name: 'Hacker' })
        .expect(403);

      await request(http)
        .get('/api/restaurants/current/members')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);

      await request(http)
        .delete(`/api/restaurants/current/members/${managerId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);

      // Manager can list but not modify
      await request(http)
        .get('/api/restaurants/current/members')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      await request(http)
        .patch('/api/restaurants/current')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'Hacker' })
        .expect(403);

      await request(http)
        .delete(`/api/restaurants/current/members/${managerId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
    });
  });

  describe('data consistency', () => {
    it('reflects updates immediately for all authenticated members', async () => {
      const updateName = `Consistency Test ${Date.now()}`;

      // Owner updates
      await request(http)
        .patch('/api/restaurants/current')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: updateName })
        .expect(200);

      // Manager should see the update
      const managerView = await request(http)
        .get('/api/restaurants/current')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(managerView.body.name).toBe(updateName);

      // Staff should see the update
      const staffView = await request(http)
        .get('/api/restaurants/current')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(staffView.body.name).toBe(updateName);
    });

    it('reflects member removals immediately', async () => {
      // Create a temporary member
      const tempId = `${EMAIL_PREFIX}temp-${Date.now()}`;
      const tempEmail = `${EMAIL_PREFIX}temp-${Date.now()}@altora.test`;
      await prisma.user.create({
        data: { id: tempId, email: tempEmail, passwordHash: 'dummy', name: 'Temp' },
      });
      await prisma.restaurantMember.create({
        data: {
          userId: tempId,
          restaurantId,
          role: 'staff',
        },
      });

      // Count before removal
      const beforeRemoval = await request(http)
        .get('/api/restaurants/current/members')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const countBefore = beforeRemoval.body.length;

      // Remove the member
      await request(http)
        .delete(`/api/restaurants/current/members/${tempId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // Count after removal
      const afterRemoval = await request(http)
        .get('/api/restaurants/current/members')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const countAfter = afterRemoval.body.length;

      expect(countAfter).toBe(countBefore - 1);
      expect(afterRemoval.body.find((m: any) => m.userId === tempId)).toBeUndefined();
    });
  });

  describe('input validation', () => {
    it('accepts valid update payloads', async () => {
      const updates = [
        { name: 'Valid Name' },
        { timezone: 'UTC' },
        { currency: 'USD' },
        { name: 'Multi', timezone: 'America/Chicago', currency: 'CAD' },
      ];

      for (const update of updates) {
        await request(http)
          .patch('/api/restaurants/current')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send(update)
          .expect(200);
      }
    });

    it('rejects invalid update fields with 400', async () => {
      await request(http)
        .patch('/api/restaurants/current')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ invalidField: 'value' })
        .expect(400);
    });
  });
});
