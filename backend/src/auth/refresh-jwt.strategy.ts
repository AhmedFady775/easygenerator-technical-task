import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../users/users.service';

interface RefreshPayload {
  sub: string;
  email: string;
  jti: string;
}

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) =>
          (req.cookies as Record<string, string>)?.refreshToken ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET') as string,
    });
  }

  async validate(payload: RefreshPayload) {
    const user = await this.usersService.verifyRefreshToken(
      payload.sub,
      payload.jti,
    );
    if (!user)
      throw new UnauthorizedException('Invalid or expired refresh token');
    return { userId: payload.sub, email: payload.email };
  }
}
