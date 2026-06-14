import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
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

  async findAll(query: FindCommentsQueryDto) {
    return this.prisma.comment.findMany({
      where: {
        ticketId: query.ticketId,
        userId: query.userId,
      },
      select: this.commentSelect,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      select: this.commentSelect,
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  async update(id: string, updateCommentDto: UpdateCommentDto) {
    await this.ensureCommentExists(id);

    return this.prisma.comment.update({
      where: { id },
      data: {
        content: updateCommentDto.content?.trim(),
        isInternal: updateCommentDto.isInternal,
      },
      select: this.commentSelect,
    });
  }

  async remove(id: string) {
    await this.ensureCommentExists(id);

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

  private async ensureCommentExists(id: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
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
