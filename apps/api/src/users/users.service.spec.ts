import { BadRequestException } from '@nestjs/common';
import { Role } from '../../generated/prisma/enums.js';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const safeUser = {
    id: 'user-1',
    name: 'Support Agent',
    email: 'agent@supportflow.dev',
    role: Role.AGENT,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  function createService() {
    const prisma = {
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    return {
      prisma,
      service: new UsersService(prisma as never),
    };
  }

  it('returns only active support assignees', async () => {
    const { prisma, service } = createService();
    prisma.user.findMany.mockResolvedValue([safeUser]);

    await expect(service.findAssignees()).resolves.toEqual([safeUser]);
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        isActive: true,
        role: { in: [Role.ADMIN, Role.AGENT] },
      },
      select: expect.any(Object),
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
  });

  it('updates role and active status', async () => {
    const { prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValueOnce({
      id: safeUser.id,
      role: Role.USER,
      isActive: true,
    });
    prisma.user.update.mockResolvedValue(safeUser);

    await expect(
      service.update(safeUser.id, {
        role: Role.AGENT,
        isActive: true,
      }),
    ).resolves.toEqual(safeUser);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: safeUser.id },
      data: {
        name: undefined,
        email: undefined,
        role: Role.AGENT,
        isActive: true,
      },
      select: expect.any(Object),
    });
  });

  it('prevents disabling the final active admin', async () => {
    const { prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'admin-1',
      role: Role.ADMIN,
      isActive: true,
    });
    prisma.user.count.mockResolvedValue(0);

    await expect(
      service.update('admin-1', { isActive: false }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
