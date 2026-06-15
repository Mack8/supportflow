import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '../../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CommentsService } from './comments.service';

describe('CommentsService', () => {
  const regularUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'user@supportflow.dev',
    role: Role.USER,
  };

  function createService() {
    const prisma = {
      comment: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      ticket: {
        findFirst: jest.fn(),
      },
    };

    return {
      prisma,
      service: new CommentsService(prisma as never),
    };
  }

  it('blocks regular users from creating internal comments', async () => {
    const { service } = createService();

    await expect(
      service.create(
        {
          ticketId: 'ticket-1',
          userId: 'user-1',
          content: 'Internal escalation note',
          isInternal: true,
        },
        regularUser,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('filters internal comments for regular users', async () => {
    const { prisma, service } = createService();
    prisma.comment.findMany.mockResolvedValue([]);

    await service.findAll(
      { ticketId: 'ticket-1' },
      regularUser,
    );
    expect(prisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ticketId: 'ticket-1',
          isInternal: false,
          ticket: { createdById: regularUser.id },
        }),
      }),
    );
  });

  it('blocks regular users from commenting on tickets they do not own', async () => {
    const { prisma, service } = createService();
    prisma.ticket.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        {
          ticketId: 'ticket-1',
          content: 'Can I get an update?',
        },
        regularUser,
      ),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.comment.create).not.toHaveBeenCalled();
  });
});
