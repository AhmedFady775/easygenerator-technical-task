import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from './auth.module';
import { UsersModule } from '../users/users.module';
import { GlobalExceptionFilter } from '../common/http-exception.filter';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET: 'test-secret-key-for-e2e-tests-only',
              JWT_EXPIRES_IN: '1h',
            }),
          ],
        }),
        MongooseModule.forRoot(mongod.getUri()),
        AuthModule,
        UsersModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  const alice = {
    email: 'alice@example.com',
    name: 'Alice Doe',
    password: 'SecurePass1!',
  };

  // ── POST /auth/signup ──────────────────────────────────────────────────────

  describe('POST /auth/signup', () => {
    it('201 — registers a new user and returns a JWT', async () => {
      const { status, body } = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(alice);

      expect(status).toBe(201);
      expect(body.accessToken).toBeDefined();
      expect(body.user.email).toBe(alice.email);
      expect(body.user.name).toBe(alice.name);
      expect(body.user.password).toBeUndefined();
    });

    it('409 — rejects duplicate email', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(alice);

      expect(status).toBe(409);
    });

    it.each([
      ['invalid email format', { ...alice, email: 'not-an-email' }],
      ['name shorter than 3 chars', { ...alice, name: 'Al', email: 'other@test.com' }],
      ['password shorter than 8 chars', { ...alice, password: 'Ab1!', email: 'other2@test.com' }],
      ['password with no letter', { ...alice, password: '12345678!', email: 'other3@test.com' }],
      ['password with no number', { ...alice, password: 'Password!', email: 'other4@test.com' }],
      ['password with no special char', { ...alice, password: 'Password1', email: 'other5@test.com' }],
    ])('400 — %s', async (_label, payload) => {
      const { status } = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(payload);

      expect(status).toBe(400);
    });
  });

  // ── POST /auth/signin ──────────────────────────────────────────────────────

  describe('POST /auth/signin', () => {
    it('200 — returns a JWT for valid credentials', async () => {
      const { status, body } = await request(app.getHttpServer())
        .post('/auth/signin')
        .send({ email: alice.email, password: alice.password });

      expect(status).toBe(200);
      expect(body.accessToken).toBeDefined();
      expect(body.user.email).toBe(alice.email);
      expect(body.user.password).toBeUndefined();
    });

    it('401 — rejects an unknown email', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/auth/signin')
        .send({ email: 'nobody@example.com', password: alice.password });

      expect(status).toBe(401);
    });

    it('401 — rejects a wrong password', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/auth/signin')
        .send({ email: alice.email, password: 'WrongPass1!' });

      expect(status).toBe(401);
    });
  });

  // ── GET /auth/me ──────────────────────────────────────────────────────────

  describe('GET /auth/me', () => {
    let accessToken: string;

    beforeAll(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/auth/signin')
        .send({ email: alice.email, password: alice.password });
      accessToken = body.accessToken as string;
    });

    it('200 — returns the current user for a valid token', async () => {
      const { status, body } = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(status).toBe(200);
      expect(body.user.email).toBe(alice.email);
    });

    it('401 — rejects requests without a token', async () => {
      const { status } = await request(app.getHttpServer()).get('/auth/me');
      expect(status).toBe(401);
    });

    it('401 — rejects a malformed token', async () => {
      const { status } = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer this.is.invalid');

      expect(status).toBe(401);
    });
  });
});
