import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { Role, TicketStatus } from '../generated/prisma/enums.js';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { AuthController } from '../src/auth/auth.controller';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { AuthService } from '../src/auth/auth.service';
import { CommentsController } from '../src/comments/comments.controller';
import { CommentsService } from '../src/comments/comments.service';
import { TicketsController } from '../src/tickets/tickets.controller';
import { TicketsService } from '../src/tickets/tickets.service';
import { UsersService } from '../src/users/users.service';

describe('SupportFlow HTTP workflows (e2e)', () => {
  let app: INestApplication<App>;

  const authService = {
    login: jest.fn().mockResolvedValue({
      accessToken: 'signed-token',
      tokenType: 'Bearer',
      user: {
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@supportflow.dev',
        role: Role.ADMIN,
        isActive: true,
      },
    }),
  };
  const usersService = {
    findOne: jest.fn().mockResolvedValue({
      id: 'admin-1',
      name: 'Admin User',
      email: 'admin@supportflow.dev',
      role: Role.ADMIN,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  };
  const ticketsService = {
    findAll: jest.fn().mockReturnValue({
      data: [
        {
          id: 'ticket-1',
          title: 'Printer offline',
          status: TicketStatus.OPEN,
        },
      ],
      meta: {
        page: 1,
        limit: 25,
        total: 1,
        totalPages: 1,
      },
    }),
  };
  const commentsService = {
    findAll: jest.fn().mockReturnValue([
      {
        id: 'comment-1',
        content: 'Public update',
        isInternal: false,
      },
    ]),
  };
  const jwtGuard = {
    canActivate: (context: ExecutionContext) => {
      const request = context.switchToHttp().getRequest();
      request.user = {
        id: 'admin-1',
        email: 'admin@supportflow.dev',
        role: Role.ADMIN,
      };

      return true;
    },
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        AppController,
        AuthController,
        TicketsController,
        CommentsController,
      ],
      providers: [
        AppService,
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: usersService },
        { provide: TicketsService, useValue: ticketsService },
        { provide: CommentsService, useValue: commentsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(jwtGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('serves the health root', () => {
    return request(app.getHttpAdapter().getInstance())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('logs in and validates the authenticated session', async () => {
    await request(app.getHttpAdapter().getInstance())
      .post('/auth/login')
      .send({ email: 'admin@supportflow.dev', password: 'Password123' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.accessToken).toBe('signed-token');
      });

    await request(app.getHttpAdapter().getInstance())
      .get('/auth/me')
      .expect(200)
      .expect(({ body }) => {
        expect(body.email).toBe('admin@supportflow.dev');
      });
  });

  it('returns paginated tickets and ticket comments', async () => {
    await request(app.getHttpAdapter().getInstance())
      .get('/tickets?page=1&limit=25')
      .expect(200)
      .expect(({ body }) => {
        expect(body.meta.total).toBe(1);
        expect(body.data[0].id).toBe('ticket-1');
      });

    await request(app.getHttpAdapter().getInstance())
      .get('/comments?ticketId=ticket-1')
      .expect(200)
      .expect(({ body }) => {
        expect(body[0].content).toBe('Public update');
      });
  });
});
