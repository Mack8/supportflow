import { ForbiddenException } from '@nestjs/common';
import { Role } from '../../generated/prisma/enums.js';
import { CommentsService } from './comments.service';

describe('CommentsService', () => {
  function createService() {
    const prisma = {
      comment: {
        create: jest.fn(),
        findMany: jest.fn(),
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
        {
          id: 'user-1',
          email: 'user@supportflow.dev',
          role: Role.USER,
        },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('filters internal comments for regular users', async () => {
    const { prisma, service } = createService();
    prisma.comment.findMany.mockResolvedValue([]);

    await service.findAll(
      { ticketId: 'ticket-1' },
      {
        id: 'user-1',
        email: 'user@supportflow.dev',
        role: Role.USER,
      },
    );
    expect(prisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ticketId: 'ticket-1',
          isInternal: false,
        }),
      }),
    );
  });
});
