# Arquitectura del Sistema - SupportFlow

Monolito modular con frontend y backend separados de forma estricta.
- Frontend: Next.js (App Router)
- Backend: NestJS
- ORM: Prisma
- Base de Datos: PostgreSQL

## Monorepo

El proyecto usa npm workspaces:

- `apps/api`: API NestJS.
- `apps/web`: interfaz Next.js.
- `docs`: documentacion tecnica y guias de trabajo.

## Modulos Backend

- `auth`: registro, login JWT, validacion de sesion con `GET /auth/me` y bypass solo para desarrollo local.
- `users`: administracion de usuarios, roles y estado activo. Protege contra dejar el sistema sin administradores activos.
- `tickets`: CRUD de tickets, paginacion, asignacion, categoria, prioridad, fechas SLA y transiciones de cierre/resolucion.
- `comments`: comentarios publicos e internos. Las notas internas solo son visibles y editables por `AGENT` y `ADMIN`.
- `prisma`: servicio compartido para conexion a PostgreSQL.

## Frontend

La app web usa rutas del App Router:

- `/login`: inicio de sesion, registro y limpieza de sesion local.
- `/dashboard`: resumen operativo de tickets, usuarios y comentarios.
- `/tickets`: listado paginado con filtros y asignacion rapida.
- `/tickets/new`: creacion de tickets.
- `/tickets/[id]`: detalle, actualizacion, comentarios publicos e internos.
- `/admin/users`: administracion de nombre, email, rol y estado de usuarios.

## Autenticacion y Permisos

El frontend guarda el token JWT y el usuario actual en `localStorage`. `AppShell` valida la sesion contra `GET /auth/me` antes de renderizar rutas protegidas.

Roles:

- `USER`: crea tickets y ve comentarios publicos.
- `AGENT`: gestiona tickets, asignaciones y notas internas.
- `ADMIN`: administra usuarios, roles, tickets y notas internas.

`AUTH_GUARDS_DISABLED=true` permite trabajar localmente sin token, pero no aplica en `NODE_ENV=production`.

## Modelo de Datos

Entidades principales:

- `User`: identidad, email unico, hash de password, rol y estado.
- `Ticket`: estado, prioridad, categoria, requester, asignado, fechas SLA y resolucion.
- `Comment`: contenido publico o interno asociado a un ticket y usuario.

Indices clave:

- Tickets por `status` y `priority`.
- Tickets por `category`, `assignedToId`, `createdById` y `dueAt`.

## Calidad

Validaciones esperadas antes de cerrar un modulo:

```bash
npm run build -w apps/api
npm run build -w apps/web
npm test -w apps/api
```

La guia de entorno local esta en `docs/local-development.md`.
