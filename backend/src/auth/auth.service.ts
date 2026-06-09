import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/user.schema';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  tokens: TokenPair;
  user: UserDocument;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async signUp(dto: SignUpDto): Promise<AuthResult> {
    const user = await this.usersService.create(
      dto.email,
      dto.name,
      dto.password,
    );
    const tokens = await this.issueTokenPair(String(user._id), user.email);
    this.logger.log(`Sign-up successful: ${dto.email}`);
    return { tokens, user };
  }

  async signIn(dto: SignInDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.issueTokenPair(String(user._id), user.email);
    this.logger.log(`Sign-in successful: ${dto.email}`);
    return { tokens, user };
  }

  async refresh(userId: string, email: string): Promise<TokenPair> {
    const tokens = await this.issueTokenPair(userId, email);
    this.logger.log(`Token refreshed for: ${email}`);
    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.setRefreshToken(userId, null);
  }

  private async issueTokenPair(
    userId: string,
    email: string,
  ): Promise<TokenPair> {
    // jti is a random UUID stored (hashed) in the DB for revocation
    const jti = crypto.randomUUID();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: '15m',
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, email, jti },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: '30d',
        },
      ),
    ]);

    await this.usersService.setRefreshToken(userId, jti);
    return { accessToken, refreshToken };
  }
}
