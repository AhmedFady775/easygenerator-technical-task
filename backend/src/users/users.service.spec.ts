import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.schema';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;

  const savedUser = {
    _id: 'abc123',
    email: 'alice@example.com',
    name: 'Alice',
    password: '$2b$12$hashedpassword',
  };

  const mockSave = jest.fn().mockResolvedValue(savedUser);

  // Mongoose model mock: behaves as both a class and a query object
  const MockUserModel = jest
    .fn()
    .mockImplementation(() => ({ save: mockSave })) as jest.Mock & {
    findOne: jest.Mock;
    findById: jest.Mock;
  };
  MockUserModel.findOne = jest.fn();
  MockUserModel.findById = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: MockUserModel },
      ],
    }).compile();

    service = module.get(UsersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('hashes the password with cost 12 and persists the user', async () => {
      MockUserModel.findOne.mockResolvedValue(null);
      mockSave.mockResolvedValue(savedUser);

      const result = await service.create(
        'alice@example.com',
        'Alice',
        'Password1!',
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('Password1!', 12);
      expect(MockUserModel).toHaveBeenCalledWith({
        email: 'alice@example.com',
        name: 'Alice',
        password: '$2b$12$hashedpassword',
      });
      expect(mockSave).toHaveBeenCalled();
      expect(result).toEqual(savedUser);
    });

    it('throws ConflictException when the email is already registered', async () => {
      MockUserModel.findOne.mockResolvedValue(savedUser);

      await expect(
        service.create('alice@example.com', 'Alice', 'Password1!'),
      ).rejects.toThrow(ConflictException);

      expect(bcrypt.hash).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('returns the user document when found', async () => {
      MockUserModel.findOne.mockResolvedValue(savedUser);

      const result = await service.findByEmail('alice@example.com');

      expect(MockUserModel.findOne).toHaveBeenCalledWith({
        email: 'alice@example.com',
      });
      expect(result).toEqual(savedUser);
    });

    it('returns null when no user matches the email', async () => {
      MockUserModel.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('ghost@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('returns the user document when found', async () => {
      MockUserModel.findById.mockResolvedValue(savedUser);

      const result = await service.findById('abc123');

      expect(MockUserModel.findById).toHaveBeenCalledWith('abc123');
      expect(result).toEqual(savedUser);
    });
  });
});
