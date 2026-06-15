import { BadRequestException } from '@nestjs/common';
import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../../generated/prisma/enums.js';
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

  function createService() {
    const prisma = {
      ticket: {
        count: jest.fn().mockReturnValue('count-query'),
        findMany: jest.fn().mockReturnValue('find-many-query'),
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

    await expect(service.findAll({ page: 2, limit: 10 })).resolves.toEqual({
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
      service.update(ticket.id, { status: TicketStatus.RESOLVED }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });
});
