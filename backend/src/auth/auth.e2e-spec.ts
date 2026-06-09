import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from './auth.module';
import { UsersModule } from '../users/users.module';
import { GlobalExceptionFilter } from '../common/http-exception.filter';

interface UserBody {
  email: string;
  name: string;
  password?: string;
}

interface AuthBody {
  user: UserBody;
}

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
              JWT_REFRESH_SECRET: 'test-refresh-secret-key-for-e2e-tests-only',
            }),
          ],
        }),
        MongooseModule.forRoot(mongod.getUri()),
        AuthModule,
        UsersModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication({ logger: false });
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
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
    it('201 — registers a new user, sets cookies, returns user', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { status, body, headers } = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(alice);

      const { user } = body as AuthBody;
      expect(status).toBe(201);
      expect(user.email).toBe(alice.email);
      expect(user.name).toBe(alice.name);
      expect(user.password).toBeUndefined();
      expect(headers['set-cookie']).toBeDefined();
    });

    it('409 — rejects duplicate email', async () => {
      const { status } = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(alice);

      expect(status).toBe(409);
    });

    it.each([
      ['invalid email format', { ...alice, email: 'not-an-email' }],
      [
        'name shorter than 3 chars',
        { ...alice, name: 'Al', email: 'other@test.com' },
      ],
      [
        'password shorter than 8 chars',
        { ...alice, password: 'Ab1!', email: 'other2@test.com' },
      ],
      [
        'password with no letter',
        { ...alice, password: '12345678!', email: 'other3@test.com' },
      ],
      [
        'password with no number',
        { ...alice, password: 'Password!', email: 'other4@test.com' },
      ],
      [
        'password with no special char',
        { ...alice, password: 'Password1', email: 'other5@test.com' },
      ],
    ])('400 — %s', async (_label, payload) => {
      const { status } = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(payload);

      expect(status).toBe(400);
    });
  });

  // ── POST /auth/signin ──────────────────────────────────────────────────────

  describe('POST /auth/signin', () => {
    it('200 — returns user and sets cookies for valid credentials', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { status, body, headers } = await request(app.getHttpServer())
        .post('/auth/signin')
        .send({ email: alice.email, password: alice.password });

      const { user } = body as AuthBody;
      expect(status).toBe(200);
      expect(user.email).toBe(alice.email);
      expect(user.password).toBeUndefined();
      expect(headers['set-cookie']).toBeDefined();
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
    let accessTokenCookie: string;

    beforeAll(async () => {
      const { headers } = await request(app.getHttpServer())
        .post('/auth/signin')
        .send({ email: alice.email, password: alice.password });

      const cookies = headers['set-cookie'] as string[] | string;
      const cookieList = Array.isArray(cookies) ? cookies : [cookies];
      accessTokenCookie =
        cookieList.find((c) => c.startsWith('accessToken=')) ?? '';
    });

    it('200 — returns the current user when access token cookie is present', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { status, body } = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', accessTokenCookie);

      const { user } = body as AuthBody;
      expect(status).toBe(200);
      expect(user.email).toBe(alice.email);
    });

    it('401 — rejects requests without a cookie', async () => {
      const { status } = await request(app.getHttpServer()).get('/auth/me');
      expect(status).toBe(401);
    });

    it('401 — rejects a malformed token cookie', async () => {
      const { status } = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', 'accessToken=this.is.invalid');

      expect(status).toBe(401);
    });
  });
});
