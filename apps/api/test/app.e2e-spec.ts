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
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';

describe('SupportFlow HTTP workflows (e2e)', () => {
  let app: INestApplication<App>;
  const ticketId = '11111111-1111-4111-8111-111111111111';
  const agentId = '22222222-2222-4222-8222-222222222222';
  const customerId = '33333333-3333-4333-8333-333333333333';

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
    findAssignees: jest.fn().mockResolvedValue([
      {
        id: agentId,
        name: 'Support Agent',
        email: 'agent@supportflow.dev',
        role: Role.AGENT,
        isActive: true,
      },
    ]),
    findRequesters: jest.fn().mockResolvedValue([
      {
        id: customerId,
        name: 'Customer User',
        email: 'user@supportflow.dev',
        role: Role.USER,
        isActive: true,
      },
    ]),
  };
  const ticketsService = {
    create: jest.fn().mockResolvedValue({
      id: ticketId,
      title: 'Printer offline',
      status: TicketStatus.OPEN,
      createdById: customerId,
    }),
    findAll: jest.fn().mockReturnValue({
      data: [
        {
          id: ticketId,
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
    getStats: jest.fn().mockReturnValue({
      total: 1,
      active: 1,
      urgent: 0,
      overdue: 0,
      unassigned: 1,
      byStatus: {
        [TicketStatus.OPEN]: 1,
        [TicketStatus.IN_PROGRESS]: 0,
        [TicketStatus.WAITING_USER]: 0,
        [TicketStatus.RESOLVED]: 0,
        [TicketStatus.CLOSED]: 0,
      },
    }),
    update: jest.fn().mockResolvedValue({
      id: ticketId,
      title: 'Printer offline',
      status: TicketStatus.OPEN,
      assignedToId: agentId,
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
  const rolesGuard = {
    canActivate: () => true,
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        AppController,
        AuthController,
        TicketsController,
        CommentsController,
        UsersController,
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
      .overrideGuard(RolesGuard)
      .useValue(rolesGuard)
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

  it('returns paginated tickets, stats and ticket comments', async () => {
    await request(app.getHttpAdapter().getInstance())
      .get('/tickets?page=1&limit=25')
      .expect(200)
      .expect(({ body }) => {
        expect(body.meta.total).toBe(1);
        expect(body.data[0].id).toBe(ticketId);
      });

    await request(app.getHttpAdapter().getInstance())
      .get('/tickets/stats')
      .expect(200)
      .expect(({ body }) => {
        expect(body.total).toBe(1);
        expect(body.byStatus.OPEN).toBe(1);
      });

    await request(app.getHttpAdapter().getInstance())
      .get(`/comments?ticketId=${ticketId}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body[0].content).toBe('Public update');
      });
  });

  it('returns controlled user lists and supports create plus assignment', async () => {
    await request(app.getHttpAdapter().getInstance())
      .get('/users/assignees')
      .expect(200)
      .expect(({ body }) => {
        expect(body[0].role).toBe(Role.AGENT);
      });

    await request(app.getHttpAdapter().getInstance())
      .get('/users/requesters')
      .expect(200)
      .expect(({ body }) => {
        expect(body[0].role).toBe(Role.USER);
      });

    await request(app.getHttpAdapter().getInstance())
      .post('/tickets')
      .send({
        title: 'Printer offline',
        description: 'The shared printer is unavailable.',
        createdById: customerId,
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.createdById).toBe(customerId);
      });

    await request(app.getHttpAdapter().getInstance())
      .patch(`/tickets/${ticketId}`)
      .send({ assignedToId: agentId })
      .expect(200)
      .expect(({ body }) => {
        expect(body.assignedToId).toBe(agentId);
      });
  });
});
