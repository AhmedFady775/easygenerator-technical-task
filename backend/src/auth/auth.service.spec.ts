import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const ACCESS_TOKEN = 'access.token';
const REFRESH_TOKEN = 'refresh.token';

const storedUser = {
  _id: { toString: () => 'user-id-1' },
  email: 'alice@example.com',
  name: 'Alice',
  password: '$2b$12$hashedpassword',
};

const mockUsersService: Partial<UsersService> = {
  create: jest.fn(),
  findByEmail: jest.fn(),
  setRefreshToken: jest.fn().mockResolvedValue(undefined),
};

const mockJwtService: Partial<JwtService> = {
  // Returns different tokens based on expiry — mirrors issueTokenPair logic
  signAsync: jest
    .fn()
    .mockImplementation((_payload: unknown, options: { expiresIn: string }) =>
      Promise.resolve(
        options?.expiresIn === '15m' ? ACCESS_TOKEN : REFRESH_TOKEN,
      ),
    ),
};

const mockConfigService: Partial<ConfigService> = {
  get: jest.fn().mockReturnValue('test-secret'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    const dto = {
      email: 'alice@example.com',
      name: 'Alice',
      password: 'Password1!',
    };

    it('creates the user and returns a token pair with the user', async () => {
      (mockUsersService.create as jest.Mock).mockResolvedValue(storedUser);

      const result = await service.signUp(dto);

      expect(mockUsersService.create).toHaveBeenCalledWith(
        dto.email,
        dto.name,
        dto.password,
      );
      expect(result.tokens.accessToken).toBe(ACCESS_TOKEN);
      expect(result.tokens.refreshToken).toBe(REFRESH_TOKEN);
      expect(result.user).toBe(storedUser);
    });

    it('propagates ConflictException raised by UsersService', async () => {
      (mockUsersService.create as jest.Mock).mockRejectedValue(
        new ConflictException('Email already registered'),
      );

      await expect(service.signUp(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('signIn', () => {
    const dto = { email: 'alice@example.com', password: 'Password1!' };

    it('verifies credentials and returns a token pair with the user', async () => {
      (mockUsersService.findByEmail as jest.Mock).mockResolvedValue(storedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.signIn(dto);

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        dto.password,
        storedUser.password,
      );
      expect(result.tokens.accessToken).toBe(ACCESS_TOKEN);
      expect(result.user).toBe(storedUser);
    });

    it('throws UnauthorizedException when email is not found', async () => {
      (mockUsersService.findByEmail as jest.Mock).mockResolvedValue(null);

      await expect(service.signIn(dto)).rejects.toThrow(UnauthorizedException);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      (mockUsersService.findByEmail as jest.Mock).mockResolvedValue(storedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.signIn(dto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
