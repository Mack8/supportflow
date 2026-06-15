# SupportFlow

SupportFlow is a portfolio MVP for a role-based support ticket platform. It is
built as a modular monorepo with a NestJS API, a Next.js operational web app,
Prisma and PostgreSQL.

The current goal is to keep the product solid locally before deployment: clear
auth flows, predictable permissions, paginated tickets, support assignment,
public/internal comments and enough tests/docs for another developer to run it.

## Current Status

Implemented:

- JWT login, logout and session validation through `GET /auth/me`.
- Roles: `USER`, `AGENT` and `ADMIN`.
- User administration for admins, including role/status changes and protection
  against disabling the final active admin.
- Ticket creation, listing, filtering, pagination, assignment, SLA target dates
  and explicit status transition rules.
- Role-aware dashboard metrics through `GET /tickets/stats`.
- Public comments for customers and internal notes for support roles.
- Demo user seed script for local testing.
- API unit tests and e2e coverage for the main auth/ticket/comment workflows.

Not implemented yet:

- Production deployment.
- File attachments.
- Notification delivery.
- Full audit trail/history UI.
- Advanced reporting.

## Tech Stack

- Monorepo: npm workspaces
- API: NestJS, Prisma, PostgreSQL
- Web: Next.js App Router, React, TypeScript
- Auth: JWT stored by the web app and validated by the API
- Local infra: Docker Compose for PostgreSQL

## Project Structure

```text
apps/api   NestJS API, Prisma schema, migrations, seeds and tests
apps/web   Next.js frontend for login, dashboard, tickets and admin users
docs       Architecture, local setup and git commit guidelines
```

## Main Features

### Authentication and roles

- `GET /auth/me` is the source of truth for the frontend session.
- `USER` can create and follow their own tickets.
- `AGENT` can manage tickets, assignment and internal notes.
- `ADMIN` can manage users, roles, tickets and support workflows.

### Tickets

- `GET /tickets` returns paginated results with `{ data, meta }`.
- `GET /tickets/stats` returns role-scoped metrics for the dashboard.
- `PATCH /tickets/:id` validates status transitions and resolution rules.
- Support users can assign tickets to active `AGENT` or `ADMIN` users.

### Comments

- Public comments are visible to the requester and support roles.
- Internal comments are only visible to `AGENT` and `ADMIN`.
- Comment authorship is tied to the authenticated user.

## Local Development

Requirements:

- Node.js 22+
- npm
- Docker

Install dependencies:

```bash
npm install
```

Start PostgreSQL:

```bash
docker compose up -d
```

Create `apps/api/.env`:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/supportflow_db?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN="1h"
CORS_ORIGINS="http://localhost:3001,http://127.0.0.1:3001"
AUTH_GUARDS_DISABLED="true"
```

If your local PostgreSQL user/password differs from `docker-compose.yml`, adjust
`DATABASE_URL` accordingly.

Run database migrations, generate Prisma artifacts and seed demo accounts:

```bash
npx prisma migrate dev --schema apps/api/prisma/schema.prisma
npx prisma generate --schema apps/api/prisma/schema.prisma
npm run seed:demo-users -w apps/api
```

Run the API and web app:

```bash
npm run dev:api
npm run dev:web
```

Default local URLs:

- API: `http://localhost:3000`
- Web: `http://localhost:3001`
- PostgreSQL: `localhost:5432`

## Demo Accounts

| Email | Role | Password |
| --- | --- | --- |
| `admin@supportflow.dev` | `ADMIN` | `Password123` |
| `agent@supportflow.dev` | `AGENT` | `Password123` |
| `user@supportflow.dev` | `USER` | `Password123` |

## Validation

Run these checks before closing a module:

```bash
npm test -w apps/api -- --runInBand
npm run test:e2e -w apps/api
npm run build -w apps/api
npm run lint -w apps/web
npm run build -w apps/web
```

In this environment, API e2e tests may need to run outside the sandbox because
Supertest opens a local listener.

## Roadmap

Next improvements:

- Add ticket history/audit events for status, assignment and priority changes.
- Add attachment support for tickets and comments.
- Add notification hooks for assignment and customer replies.
- Add dashboard/reporting views for SLA breaches and support workload.
- Harden production readiness with logging, rate limits, secure env defaults and
  deployment documentation.

## Git Workflow

This project is maintained with Conventional Commits and module-focused changes.
Examples:

- `feat(api): add role scoped ticket stats`
- `feat(web): improve requester and assignment flows`
- `fix(api): enforce ticket status transitions`
- `test(api): cover role scoped ticket workflows`
- `docs: update project readme`

Avoid mixing unrelated local files or generated artifacts into feature commits.

## Documentation

- Architecture: `docs/architecture.md`
- Local setup: `docs/local-development.md`
- Git commit guide: `docs/git-commits-convencionales.docx`
