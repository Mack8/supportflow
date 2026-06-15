# Local Development

SupportFlow runs as a modular monorepo with a NestJS API, Next.js web app and PostgreSQL database.

## Requirements

- Node.js 22 or newer
- npm
- Docker

## Environment

Create `apps/api/.env` with these variables:

```bash
DATABASE_URL="postgresql://mack:12345678@localhost:5432/supportflow_db?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN="1h"
CORS_ORIGINS="http://localhost:3001,http://127.0.0.1:3001"
AUTH_GUARDS_DISABLED="true"
```

`AUTH_GUARDS_DISABLED` is only for local development. It is ignored when `NODE_ENV=production`.

## Run Locally

Start PostgreSQL:

```bash
docker compose up -d
```

Start the API:

```bash
npm run dev:api
```

Start the web app:

```bash
npm run dev:web
```

Default URLs:

- API: `http://localhost:3000`
- Web: `http://localhost:3001`
- PostgreSQL: `localhost:5432`

## Demo Users

Seed demo accounts:

```bash
npm run seed:demo-users -w apps/api
```

Created accounts:

| Email | Role | Password |
| --- | --- | --- |
| `admin@supportflow.dev` | `ADMIN` | `Password123` |
| `agent@supportflow.dev` | `AGENT` | `Password123` |
| `user@supportflow.dev` | `USER` | `Password123` |

## Validation

Before committing a module, run:

```bash
npm run build -w apps/api
npm run build -w apps/web
```
