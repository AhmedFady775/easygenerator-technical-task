import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(
    email: string,
    name: string,
    password: string,
  ): Promise<UserDocument> {
    const existing = await this.userModel.findOne({
      email: email.toLowerCase(),
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = new this.userModel({ email, name, password: hashed });
    const saved = await user.save();
    this.logger.log(`New user registered: ${email}`);
    return saved;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  async setRefreshToken(userId: string, token: string | null): Promise<void> {
    const hash = token ? await bcrypt.hash(token, 10) : null;
    await this.userModel.findByIdAndUpdate(userId, { refreshTokenHash: hash });
  }

  async verifyRefreshToken(
    userId: string,
    token: string,
  ): Promise<UserDocument | null> {
    const user = await this.userModel.findById(userId);
    if (!user?.refreshTokenHash) return null;
    const valid = await bcrypt.compare(token, user.refreshTokenHash);
    return valid ? user : null;
  }
}
