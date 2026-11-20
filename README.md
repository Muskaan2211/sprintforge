# SprintForge

### Full-Stack Issue Tracking & Analytics Platform

SprintForge is a Jira-inspired workspace for organizing software projects, managing issues, tracking team activity, and analyzing work in progress. It combines a responsive Next.js interface with a TypeScript/Express API, PostgreSQL persistence, Redis-backed analytics caching, and real-time workspace updates through Socket.IO.

**Tech stack:** Next.js 15 · React 19 · TypeScript · Node.js · Express · Prisma · PostgreSQL · Redis · Socket.IO · Tailwind CSS · Recharts · Docker

## Features

| Area | Capabilities |
| --- | --- |
| **Workspace management** | Team workspaces, membership and role-based access control |
| **Issue tracking** | Create, edit, assign, comment on, search, filter and paginate issues |
| **Sprint board** | Drag-and-drop workflow columns, project filters and status controls |
| **Real-time collaboration** | Workspace-scoped Socket.IO events and automatic issue refresh |
| **Activity history** | Recorded issue creation, updates and comments |
| **Analytics** | Workload metrics, status distribution, priority breakdown and issue trends |
| **Caching** | Redis read-through cache for analytics, with invalidation after issue mutations |
| **API security** | Signed JWT authentication, workspace membership checks, RBAC, request validation and structured error responses |
| **Developer tooling** | Docker Compose, Prisma schema, seeded sample data, automated unit tests and GitHub Actions |

## Architecture

```text
                 ┌──────────────────────────────────┐
                 │ Next.js / React / Tailwind CSS  │
                 │ Dashboard · Board · Analytics    │
                 └──────────────┬───────────────────┘
                                │ REST + Socket.IO
                 ┌──────────────▼───────────────────┐
                 │ Express / TypeScript API         │
                 │ JWT · RBAC · Zod · Socket.IO      │
                 └───────────┬──────────┬───────────┘
                             │          │
                       Prisma ORM   Analytics cache
                             │          │
                       ┌─────▼────┐ ┌───▼─────┐
                       │PostgreSQL│ │ Redis   │
                       └──────────┘ └─────────┘
```

Issue records and memberships are stored in PostgreSQL. Workspace membership is checked on protected issue operations and Socket.IO room joins. Analytics responses use a short-lived Redis cache, invalidated when relevant data changes.

## Getting started

### Requirements

- Node.js 20+ (Node.js 22 LTS recommended)
- npm
- Docker Desktop with Docker Compose

### 1. Configure the application

```bash
git clone https://github.com/Muskaan2211/sprintforge.git
cd sprintforge
cp .env.example .env
cp .env apps/api/.env
```

The provided environment example is for **local development only**. Use a strong, unique `JWT_SECRET` before exposing the API outside your computer.

### 2. Start infrastructure

```bash
docker compose up -d postgres redis
```

By default, Docker exposes PostgreSQL on **localhost:5433** and Redis on **localhost:6379**. If Redis port 6379 is occupied, change the Compose mapping to `127.0.0.1:6380:6379` and set `REDIS_URL=redis://localhost:6380` in both `.env` files. Container-to-container Redis connections continue to use `redis:6379`.

### 3. Install and initialize

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
```

### 4. Launch

```bash
npm run dev
```

| Service | Local address |
| --- | --- |
| Web application | `http://localhost:3000` |
| REST API | `http://localhost:4000` |
| Health check | `http://localhost:4000/api/health` |
| API specification | `http://localhost:4000/api/openapi.json` |

If Next.js selects port **3001**, update `WEB_ORIGIN=http://localhost:3001` in `.env` and `apps/api/.env`, restart the dev servers, and open `http://localhost:3001`.

### Sample account

The seed command creates sample workspace data, projects and issues.

```text
Email:    alex@sprintforge.dev
Password: Demo12345!
```

These are **public development credentials**. Do not use the sample accounts or passwords with sensitive data or in a public deployment.

## Project structure

```text
apps/
  api/
    prisma/          # Data model and sample data
    src/             # Express API, authentication, authorization and tests
    openapi.json     # API endpoint reference
  web/
    app/             # Next.js routes and pages
    components/      # Reusable UI components
    lib/             # Frontend API client
.github/workflows/   # CI pipeline
docs/                # Architecture and technical documentation
docker-compose.yml   # Database, cache and service configuration
```

## Key API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register a user and workspace |
| `POST` | `/api/auth/login` | Authenticate |
| `GET` | `/api/me` | Current user |
| `GET` | `/api/workspaces` | Accessible workspaces |
| `GET, POST` | `/api/projects` | List and create projects |
| `GET, POST` | `/api/issues` | Search and create issues |
| `GET, PATCH, DELETE` | `/api/issues/:id` | Read, modify or remove issues |
| `POST` | `/api/issues/:id/comments` | Add an issue comment |
| `GET` | `/api/analytics` | Workspace analytics |
| `GET` | `/api/analytics/engineering` | Engineering workload metrics |
| `GET` | `/api/health` | API health |

The API includes validation and permission checks. The OpenAPI document provides endpoint discovery rather than an exhaustive generated schema.

## Roles and permissions

- **Owner / Admin:** Manage members and projects, and perform authorized issue operations.
- **Member:** View, create and update issues and add comments.
- **Viewer:** Read-only access to permitted workspace resources.

Workspace access is validated server-side; hiding frontend controls alone is not used as an authorization boundary.

## Quality checks

```bash
npm run test     # API unit tests
npm run build    # API TypeScript compilation and Next.js production build
npm run check    # Prisma generation, tests and build
npm audit        # Dependency vulnerability report
```

The repository currently includes unit tests for JWT handling, permission rules and input validation. Integration, browser end-to-end and load-test coverage are separate areas for further development.

## Engineering considerations

- **Database:** Relational entities, foreign keys, indexed lookups, filtering and pagination.
- **Caching:** Redis analytics cache with a 30-second TTL and invalidation after mutations.
- **Real-time delivery:** Socket.IO events are scoped to workspaces; clients refresh authoritative server state.
- **Observability:** A restricted cache-diagnostics endpoint reports in-process cache counters.
- **Deployment:** Docker definitions are included. Production deployment requires managed secrets, HTTPS, deployment migrations, backups, and stronger session security.

The current local development flow uses bearer tokens held in browser storage. An internet-facing deployment should additionally implement secure HttpOnly cookie sessions, refresh-token rotation/revocation, and appropriate CSRF defenses. Review `npm audit` findings before public deployment.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architecture and technical details
- [`apps/api/openapi.json`](apps/api/openapi.json) — API endpoint reference
- [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) — release and security checklist

## License

Released under the [MIT License](LICENSE).
