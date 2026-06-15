import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role } from '../../generated/prisma/enums.js';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const safeUser = {
    id: 'user-1',
    name: 'Admin User',
    email: 'admin@supportflow.dev',
    role: Role.ADMIN,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let usersService: jest.Mocked<Pick<
    UsersService,
    'findByEmailWithPassword' | 'toSafeUser' | 'create'
  >>;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync'>>;
  let authService: AuthService;

  beforeEach(() => {
    usersService = {
      findByEmailWithPassword: jest.fn(),
      toSafeUser: jest.fn().mockReturnValue(safeUser),
      create: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
    };
    authService = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
    );
  });

  it('returns a signed token for active users with valid credentials', async () => {
    const passwordHash = await bcrypt.hash('Password123', 4);
    usersService.findByEmailWithPassword.mockResolvedValue({
      ...safeUser,
      passwordHash,
    });

    await expect(
      authService.login({
        email: 'ADMIN@supportflow.dev',
        password: 'Password123',
      }),
    ).resolves.toEqual({
      accessToken: 'signed-token',
      tokenType: 'Bearer',
      user: safeUser,
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: safeUser.id,
      id: safeUser.id,
      email: safeUser.email,
      role: safeUser.role,
    });
  });

  it('rejects inactive users even when the password is valid', async () => {
    const passwordHash = await bcrypt.hash('Password123', 4);
    usersService.findByEmailWithPassword.mockResolvedValue({
      ...safeUser,
      isActive: false,
      passwordHash,
    });

    await expect(
      authService.login({
        email: safeUser.email,
        password: 'Password123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
