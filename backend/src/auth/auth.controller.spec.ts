import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { Response as ExpressResponse } from 'express';

const mockTokens = { accessToken: 'access.token', refreshToken: 'refresh.token' };
const mockUser = { _id: 'user-id-1', email: 'alice@example.com', name: 'Alice' };
const mockAuthResult = { tokens: mockTokens, user: mockUser };

const mockAuthService: Partial<AuthService> = {
  signUp: jest.fn(),
  signIn: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
};

// Minimal response mock — only what the controller uses
function mockRes(): ExpressResponse {
  return { cookie: jest.fn(), clearCookie: jest.fn() } as unknown as ExpressResponse;
}

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get(AuthController);
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('calls AuthService.signUp, sets cookie, returns accessToken + user', async () => {
      const dto = { email: 'alice@example.com', name: 'Alice', password: 'Password1!' };
      (mockAuthService.signUp as jest.Mock).mockResolvedValue(mockAuthResult);
      const res = mockRes();

      const result = await controller.signUp(dto, res);

      expect(mockAuthService.signUp).toHaveBeenCalledWith(dto);
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        mockTokens.refreshToken,
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({ accessToken: mockTokens.accessToken, user: mockUser });
    });
  });

  describe('signIn', () => {
    it('calls AuthService.signIn, sets cookie, returns accessToken + user', async () => {
      const dto = { email: 'alice@example.com', password: 'Password1!' };
      (mockAuthService.signIn as jest.Mock).mockResolvedValue(mockAuthResult);
      const res = mockRes();

      const result = await controller.signIn(dto, res);

      expect(mockAuthService.signIn).toHaveBeenCalledWith(dto);
      expect(res.cookie).toHaveBeenCalled();
      expect(result).toEqual({ accessToken: mockTokens.accessToken, user: mockUser });
    });
  });

  describe('logout', () => {
    it('calls AuthService.logout and clears the cookie', async () => {
      const req = { user: { userId: 'user-id-1', email: 'alice@example.com' } };
      const res = mockRes();

      await controller.logout(req as never, res);

      expect(mockAuthService.logout).toHaveBeenCalledWith('user-id-1');
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));
    });
  });

  describe('getMe', () => {
    it('returns the user payload from the request', () => {
      const req = { user: { userId: 'user-id-1', email: 'alice@example.com' } };

      const result = controller.getMe(req as never);

      expect(result).toEqual({ user: req.user });
    });
  });
});
