import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  type Ticket,
} from '../../generated/prisma/client.js';
import {
  TicketCategory,
  TicketPriority,
  Role,
  TicketStatus,
} from '../../generated/prisma/enums.js';
import { areAuthGuardsDisabled } from '../auth/auth.config';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { FindTicketsQueryDto } from './dto/find-tickets-query.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Injectable()
export class TicketsService {
  private readonly defaultPage = 1;
  private readonly defaultPageLimit = 25;

  private readonly safeUserSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    isActive: true,
  } satisfies Prisma.UserSelect;

  private readonly ticketSelect = {
    id: true,
    title: true,
    description: true,
    status: true,
    priority: true,
    category: true,
    createdAt: true,
    updatedAt: true,
    dueAt: true,
    lastStatusChangeAt: true,
    resolvedAt: true,
    closedAt: true,
    resolution: true,
    createdById: true,
    assignedToId: true,
    createdBy: { select: this.safeUserSelect },
    assignedTo: { select: this.safeUserSelect },
    _count: { select: { comments: true } },
  } satisfies Prisma.TicketSelect;

  constructor(private readonly prisma: PrismaService) {}

  async create(createTicketDto: CreateTicketDto, user: AuthenticatedUser) {
    const createdById = this.resolveActorId(user, createTicketDto.createdById);
    const category = createTicketDto.category ?? TicketCategory.GENERAL;
    const priority = this.resolvePriority(category);

    try {
      return await this.prisma.ticket.create({
        data: {
          title: createTicketDto.title.trim(),
          description: createTicketDto.description.trim(),
          priority,
          category,
          dueAt: this.resolveDueAt(priority),
          createdById,
        },
        select: this.ticketSelect,
      });
    } catch (error) {
      this.handlePrismaWriteError(error);
    }
  }

  async findAll(query: FindTicketsQueryDto) {
    const where = this.buildWhere(query);
    const { page, skip, take } = this.resolvePagination(query);
    const [total, data] = await this.prisma.$transaction([
      this.prisma.ticket.count({ where }),
      this.prisma.ticket.findMany({
        where,
        skip,
        take,
        select: this.ticketSelect,
        orderBy: [
          { priority: 'desc' },
          { dueAt: 'asc' },
          { createdAt: 'desc' },
        ],
      }),
    ]);

    return {
      data,
      meta: {
        page,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      select: this.ticketSelect,
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async update(id: string, updateTicketDto: UpdateTicketDto) {
    const currentTicket = await this.ensureTicketExists(id);
    const statusChanged =
      updateTicketDto.status !== undefined &&
      updateTicketDto.status !== currentTicket.status;
    const priority = updateTicketDto.priority
      ?? (updateTicketDto.category
        ? this.resolvePriority(updateTicketDto.category)
        : undefined);
    const resolution = this.resolveResolution(
      updateTicketDto.resolution,
      currentTicket.resolution,
    );

    this.ensureTerminalStatusHasResolution(
      updateTicketDto.status ?? currentTicket.status,
      resolution,
    );

    try {
      return await this.prisma.ticket.update({
        where: { id },
        data: {
          title: updateTicketDto.title?.trim(),
          description: updateTicketDto.description?.trim(),
          status: updateTicketDto.status,
          priority,
          category: updateTicketDto.category,
          dueAt: this.parseNullableDate(updateTicketDto.dueAt),
          resolution,
          assignedToId: updateTicketDto.assignedToId,
          lastStatusChangeAt: statusChanged ? new Date() : undefined,
          resolvedAt: this.resolveResolvedAt(
            updateTicketDto.status,
            currentTicket.resolvedAt,
          ),
          closedAt: this.resolveClosedAt(
            updateTicketDto.status,
            currentTicket.closedAt,
          ),
        },
        select: this.ticketSelect,
      });
    } catch (error) {
      this.handlePrismaWriteError(error);
    }
  }

  async remove(id: string): Promise<Ticket> {
    await this.ensureTicketExists(id);

    try {
      return await this.prisma.ticket.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Ticket has comments and cannot be deleted',
        );
      }

      throw error;
    }
  }

  private resolveActorId(
    user: AuthenticatedUser,
    fallbackUserId?: string,
  ): string {
    if (areAuthGuardsDisabled()) {
      if (!fallbackUserId) {
        throw new BadRequestException(
          'createdById is required when auth guards are disabled',
        );
      }

      return fallbackUserId;
    }

    if (fallbackUserId && this.canCreateOnBehalf(user.role)) {
      return fallbackUserId;
    }

    return user.id;
  }

  private canCreateOnBehalf(role: Role): boolean {
    return role === Role.ADMIN || role === Role.AGENT;
  }

  private resolvePriority(category: TicketCategory): TicketPriority {
    const priorities: Record<TicketCategory, TicketPriority> = {
      [TicketCategory.INCIDENT]: TicketPriority.URGENT,
      [TicketCategory.TECHNICAL]: TicketPriority.HIGH,
      [TicketCategory.BILLING]: TicketPriority.MEDIUM,
      [TicketCategory.ACCOUNT]: TicketPriority.MEDIUM,
      [TicketCategory.GENERAL]: TicketPriority.MEDIUM,
      [TicketCategory.FEATURE_REQUEST]: TicketPriority.LOW,
    };

    return priorities[category];
  }

  private resolveDueAt(priority: TicketPriority): Date {
    const hoursByPriority: Record<TicketPriority, number> = {
      [TicketPriority.URGENT]: 4,
      [TicketPriority.HIGH]: 24,
      [TicketPriority.MEDIUM]: 48,
      [TicketPriority.LOW]: 120,
    };

    return new Date(Date.now() + hoursByPriority[priority] * 60 * 60 * 1000);
  }

  private buildWhere(query: FindTicketsQueryDto): Prisma.TicketWhereInput {
    const where: Prisma.TicketWhereInput = {
      status: query.status,
      priority: query.priority,
      category: query.category,
      createdById: query.createdById,
    };

    if (query.assignedToId) {
      where.assignedToId = query.assignedToId;
    }

    if (query.unassigned === 'true') {
      where.assignedToId = null;
    }

    if (query.overdue === 'true') {
      where.dueAt = { lt: new Date() };
      if (!query.status) {
        where.status = { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] };
      }
    }

    const search = query.q?.trim();
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { resolution: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private resolvePagination(query: FindTicketsQueryDto) {
    const page = query.page ?? this.defaultPage;
    const limit = query.limit ?? this.defaultPageLimit;

    return {
      page,
      skip: (page - 1) * limit,
      take: limit,
    };
  }

  private parseDate(value?: string): Date | undefined {
    return value ? new Date(value) : undefined;
  }

  private parseNullableDate(value?: string | null): Date | null | undefined {
    if (value === null) {
      return null;
    }

    return this.parseDate(value);
  }

  private trimNullable(value?: string | null): string | null | undefined {
    if (value === null) {
      return null;
    }

    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  private resolveResolution(
    value: string | null | undefined,
    currentResolution: string | null,
  ): string | null {
    const resolution = this.trimNullable(value);

    if (resolution === undefined) {
      return currentResolution;
    }

    return resolution;
  }

  private ensureTerminalStatusHasResolution(
    status: TicketStatus,
    resolution: string | null,
  ): void {
    if (
      (status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED) &&
      !resolution
    ) {
      throw new BadRequestException(
        'Resolution is required before resolving or closing a ticket',
      );
    }
  }

  private resolveResolvedAt(
    status: TicketStatus | undefined,
    currentResolvedAt: Date | null,
  ): Date | null | undefined {
    if (!status) {
      return undefined;
    }

    if (status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED) {
      return currentResolvedAt ?? new Date();
    }

    return null;
  }

  private resolveClosedAt(
    status: TicketStatus | undefined,
    currentClosedAt: Date | null,
  ): Date | null | undefined {
    if (!status) {
      return undefined;
    }

    return status === TicketStatus.CLOSED ? currentClosedAt ?? new Date() : null;
  }

  private async ensureTicketExists(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        resolvedAt: true,
        closedAt: true,
        resolution: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  private handlePrismaWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      throw new BadRequestException('Invalid user reference');
    }

    throw error;
  }
}
