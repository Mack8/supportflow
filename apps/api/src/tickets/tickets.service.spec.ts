import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  Role,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { TicketsService } from './tickets.service';

describe('TicketsService', () => {
  const ticket = {
    id: 'ticket-1',
    title: 'Printer offline',
    description: 'The shared printer is unavailable.',
    status: TicketStatus.OPEN,
    priority: TicketPriority.MEDIUM,
    category: TicketCategory.TECHNICAL,
    createdAt: new Date(),
    updatedAt: new Date(),
    dueAt: new Date(),
    lastStatusChangeAt: new Date(),
    resolvedAt: null,
    closedAt: null,
    resolution: null,
    createdById: 'user-1',
    assignedToId: null,
  };
  const adminUser: AuthenticatedUser = {
    id: 'admin-1',
    email: 'admin@supportflow.dev',
    role: Role.ADMIN,
  };
  const regularUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'user@supportflow.dev',
    role: Role.USER,
  };

  function createService() {
    const prisma = {
      ticket: {
        count: jest.fn().mockReturnValue('count-query'),
        findMany: jest.fn().mockReturnValue('find-many-query'),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    return {
      prisma,
      service: new TicketsService(prisma as never),
    };
  }

  it('returns paginated ticket metadata', async () => {
    const { prisma, service } = createService();
    prisma.$transaction.mockResolvedValue([42, [ticket]]);

    await expect(
      service.findAll({ page: 2, limit: 10 }, adminUser),
    ).resolves.toEqual({
      data: [ticket],
      meta: {
        page: 2,
        limit: 10,
        total: 42,
        totalPages: 5,
      },
    });
    expect(prisma.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      }),
    );
  });

  it('scopes regular users to tickets they created', async () => {
    const { prisma, service } = createService();
    prisma.$transaction.mockResolvedValue([1, [ticket]]);

    await service.findAll({ createdById: 'other-user' }, regularUser);

    expect(prisma.ticket.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        createdById: regularUser.id,
      }),
    });
    expect(prisma.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdById: regularUser.id,
        }),
      }),
    );
  });

  it('returns role scoped ticket stats', async () => {
    const { prisma, service } = createService();
    prisma.$transaction.mockResolvedValue([12, 6, 2, 1, 3, 4, 1, 1, 3, 3]);

    await expect(service.getStats(regularUser)).resolves.toEqual({
      total: 12,
      active: 6,
      urgent: 2,
      overdue: 1,
      unassigned: 3,
      byStatus: {
        [TicketStatus.OPEN]: 4,
        [TicketStatus.IN_PROGRESS]: 1,
        [TicketStatus.WAITING_USER]: 1,
        [TicketStatus.RESOLVED]: 3,
        [TicketStatus.CLOSED]: 3,
      },
    });
    expect(prisma.ticket.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        createdById: regularUser.id,
      }),
    });
  });

  it('hides ticket details that do not belong to regular users', async () => {
    const { prisma, service } = createService();
    prisma.ticket.findFirst.mockResolvedValue(null);

    await expect(service.findOne(ticket.id, regularUser)).rejects.toThrow(
      'Ticket not found',
    );
    expect(prisma.ticket.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: ticket.id,
          createdById: regularUser.id,
        },
      }),
    );
  });

  it('requires a resolution before resolving tickets', async () => {
    const { prisma, service } = createService();
    prisma.ticket.findUnique.mockResolvedValue({
      id: ticket.id,
      status: TicketStatus.OPEN,
      resolvedAt: null,
      closedAt: null,
      resolution: null,
    });

    await expect(
      service.update(ticket.id, { status: TicketStatus.RESOLVED }, adminUser),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });

  it('blocks regular users from managing tickets', async () => {
    const { prisma, service } = createService();

    await expect(
      service.update(ticket.id, { status: TicketStatus.IN_PROGRESS }, regularUser),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.ticket.findUnique).not.toHaveBeenCalled();
    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });
});
