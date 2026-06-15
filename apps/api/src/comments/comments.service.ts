import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { Role } from '../../generated/prisma/enums.js';
import { areAuthGuardsDisabled } from '../auth/auth.config';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { FindCommentsQueryDto } from './dto/find-comments-query.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  private readonly safeUserSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    isActive: true,
  } satisfies Prisma.UserSelect;

  private readonly commentSelect = {
    id: true,
    content: true,
    isInternal: true,
    createdAt: true,
    ticketId: true,
    userId: true,
    user: { select: this.safeUserSelect },
    ticket: {
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
      },
    },
  } satisfies Prisma.CommentSelect;

  constructor(private readonly prisma: PrismaService) {}

  async create(createCommentDto: CreateCommentDto, user: AuthenticatedUser) {
    this.ensureInternalCommentAllowed(createCommentDto.isInternal, user);
    await this.ensureTicketVisible(createCommentDto.ticketId, user);

    const userId = this.resolveActorId(user, createCommentDto.userId);

    try {
      return await this.prisma.comment.create({
        data: {
          content: createCommentDto.content.trim(),
          isInternal: createCommentDto.isInternal,
          ticketId: createCommentDto.ticketId,
          userId,
        },
        select: this.commentSelect,
      });
    } catch (error) {
      this.handlePrismaWriteError(error);
    }
  }

  async findAll(query: FindCommentsQueryDto, user: AuthenticatedUser) {
    return this.prisma.comment.findMany({
      where: this.buildWhere(query, user),
      select: this.commentSelect,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const comment = await this.prisma.comment.findFirst({
      where: this.buildVisibilityWhere({ id }, user),
      select: this.commentSelect,
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  async update(
    id: string,
    updateCommentDto: UpdateCommentDto,
    user: AuthenticatedUser,
  ) {
    const currentComment = await this.ensureCommentExists(id);

    if (currentComment.isInternal || updateCommentDto.isInternal) {
      this.ensureInternalCommentAllowed(true, user);
    }

    this.ensureCommentMutable(currentComment, user);

    return this.prisma.comment.update({
      where: { id },
      data: {
        content: updateCommentDto.content?.trim(),
        isInternal: updateCommentDto.isInternal,
      },
      select: this.commentSelect,
    });
  }

  async remove(id: string, user: AuthenticatedUser) {
    const currentComment = await this.ensureCommentExists(id);

    if (currentComment.isInternal) {
      this.ensureInternalCommentAllowed(true, user);
    }

    this.ensureCommentMutable(currentComment, user);

    return this.prisma.comment.delete({
      where: { id },
    });
  }

  private resolveActorId(
    user: AuthenticatedUser,
    fallbackUserId?: string,
  ): string {
    if (areAuthGuardsDisabled()) {
      if (!fallbackUserId) {
        throw new BadRequestException(
          'userId is required when auth guards are disabled',
        );
      }

      return fallbackUserId;
    }

    return user.id;
  }

  private canUseInternalComments(user: AuthenticatedUser): boolean {
    return user.role === Role.ADMIN || user.role === Role.AGENT;
  }

  private buildWhere(
    query: FindCommentsQueryDto,
    user: AuthenticatedUser,
  ): Prisma.CommentWhereInput {
    return this.buildVisibilityWhere(
      {
        ticketId: query.ticketId,
        userId: query.userId,
      },
      user,
    );
  }

  private buildVisibilityWhere(
    where: Prisma.CommentWhereInput,
    user: AuthenticatedUser,
  ): Prisma.CommentWhereInput {
    if (this.canUseInternalComments(user)) {
      return where;
    }

    return {
      ...where,
      isInternal: false,
      ticket: { createdById: user.id },
    };
  }

  private ensureInternalCommentAllowed(
    isInternal: boolean | undefined,
    user: AuthenticatedUser,
  ): void {
    if (isInternal && !this.canUseInternalComments(user)) {
      throw new ForbiddenException('Internal comments require a support role');
    }
  }

  private async ensureTicketVisible(
    ticketId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    if (this.canUseInternalComments(user)) {
      return;
    }

    const ticket = await this.prisma.ticket.findFirst({
      where: {
        id: ticketId,
        createdById: user.id,
      },
      select: { id: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
  }

  private async ensureCommentExists(id: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      select: {
        id: true,
        isInternal: true,
        userId: true,
        ticket: {
          select: {
            createdById: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  private ensureCommentMutable(
    comment: Awaited<ReturnType<CommentsService['ensureCommentExists']>>,
    user: AuthenticatedUser,
  ): void {
    if (this.canUseInternalComments(user)) {
      return;
    }

    if (
      comment.isInternal ||
      !comment.ticket ||
      comment.ticket.createdById !== user.id
    ) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== user.id) {
      throw new ForbiddenException('Only the comment author can modify it');
    }
  }

  private handlePrismaWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      throw new BadRequestException('Invalid ticket or user reference');
    }

    throw error;
  }
}
