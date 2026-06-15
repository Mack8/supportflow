import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../../generated/prisma/enums.js';
import { Prisma, type User } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

export type SafeUser = Omit<User, 'passwordHash'>;

type CreateUserData = {
  name: string;
  email: string;
  passwordHash: string;
};

@Injectable()
export class UsersService {
  private readonly safeUserSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  } satisfies Prisma.UserSelect;

  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserData): Promise<SafeUser> {
    try {
      const user = await this.prisma.user.create({
        data: {
          name: data.name.trim(),
          email: this.normalizeEmail(data.email),
          passwordHash: data.passwordHash,
        },
      });

      return this.toSafeUser(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email is already registered');
      }

      throw error;
    }
  }

  async findAll(): Promise<SafeUser[]> {
    return this.prisma.user.findMany({
      select: this.safeUserSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAssignees(): Promise<SafeUser[]> {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: [Role.ADMIN, Role.AGENT] },
      },
      select: this.safeUserSelect,
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.safeUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(email) },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<SafeUser> {
    const currentUser = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, isActive: true },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    await this.ensureAdminContinuity(id, currentUser, updateUserDto);

    const email = updateUserDto.email
      ? this.normalizeEmail(updateUserDto.email)
      : undefined;

    if (email) {
      const userWithEmail = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (userWithEmail && userWithEmail.id !== id) {
        throw new ConflictException('Email is already registered');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        name: updateUserDto.name?.trim(),
        email,
        role: updateUserDto.role,
        isActive: updateUserDto.isActive,
      },
      select: this.safeUserSelect,
    });
  }

  async deactivate(id: string): Promise<SafeUser> {
    return this.update(id, { isActive: false });
  }

  toSafeUser(user: User): SafeUser {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  private async ensureAdminContinuity(
    id: string,
    currentUser: Pick<User, 'id' | 'role' | 'isActive'>,
    updateUserDto: UpdateUserDto,
  ): Promise<void> {
    const nextRole = updateUserDto.role ?? currentUser.role;
    const nextIsActive = updateUserDto.isActive ?? currentUser.isActive;
    const removesActiveAdmin =
      currentUser.role === Role.ADMIN &&
      currentUser.isActive &&
      (nextRole !== Role.ADMIN || !nextIsActive);

    if (!removesActiveAdmin) {
      return;
    }

    const remainingActiveAdmins = await this.prisma.user.count({
      where: {
        id: { not: id },
        role: Role.ADMIN,
        isActive: true,
      },
    });

    if (remainingActiveAdmins === 0) {
      throw new BadRequestException(
        'At least one active admin must remain available',
      );
    }
  }
}
