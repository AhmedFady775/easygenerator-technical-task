import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Response,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RefreshJwtAuthGuard } from './refresh-jwt-auth.guard';

const REFRESH_COOKIE = 'refreshToken';
const ACCESS_COOKIE = 'accessToken';
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: COOKIE_SECURE,
  sameSite: 'strict' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/',
};

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: COOKIE_SECURE,
  sameSite: 'strict' as const,
  maxAge: 15 * 60 * 1000, // 15 minutes
  path: '/',
};

interface AuthenticatedRequest extends ExpressRequest {
  user: { userId: string; email: string };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  @Throttle({
    short: { limit: 3, ttl: 60_000 },
    medium: { limit: 10, ttl: 3_600_000 },
  })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'Returns access token; sets httpOnly refresh cookie',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async signUp(
    @Body() dto: SignUpDto,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const { tokens, user } = await this.authService.signUp(dto);
    res.cookie(ACCESS_COOKIE, tokens.accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
    return { user };
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    short: { limit: 5, ttl: 60_000 },
    medium: { limit: 20, ttl: 3_600_000 },
  })
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Returns access token; sets httpOnly refresh cookie',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async signIn(
    @Body() dto: SignInDto,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const { tokens, user } = await this.authService.signIn(dto);
    res.cookie(ACCESS_COOKIE, tokens.accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
    return { user };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshJwtAuthGuard)
  @ApiOperation({
    summary: 'Get a new access token using the httpOnly refresh cookie',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns new access token; rotates refresh cookie',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid refresh cookie',
  })
  async refresh(
    @Request() req: AuthenticatedRequest,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const tokens = await this.authService.refresh(
      req.user.userId,
      req.user.email,
    );
    res.cookie(ACCESS_COOKIE, tokens.accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
    return {};
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke refresh token and clear cookie' })
  @ApiResponse({ status: 204, description: 'Logged out' })
  async logout(
    @Request() req: AuthenticatedRequest,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    await this.authService.logout(req.user.userId);
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
  }

  @Get('me')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user (protected)' })
  @ApiResponse({
    status: 200,
    description: 'Returns authenticated user profile',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMe(@Request() req: AuthenticatedRequest) {
    return { user: req.user };
  }
}
