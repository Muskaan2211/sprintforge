# SprintForge — Full-Stack Issue Tracking & Analytics

A polished, Jira-inspired engineering workspace built with **Next.js 15, React 19, TypeScript, Express, Prisma, PostgreSQL, Redis, Socket.IO, Docker, and Recharts**. Built as a hands-on, interview-ready portfolio application.

## Screens

- **Overview:** KPIs, status chart, priority donut, recent issues, active projects
- **Sprint board:** drag and drop between status columns, plus accessible status dropdowns and project filter
- **Activity:** workspace-scoped history of issue creation, edits and comments
- **Issues:** full-text search, project/status/priority filters, server pagination, issue editor, assignment, comments
- **Projects:** project directory and creation
- **Analytics:** project workload, issue distribution, priority mix, resolution proxy, and assignee workload
- **Authentication:** registration, login, signed JWTs, workspace membership and RBAC
- **Collaboration:** workspace-scoped WebSocket events for issue create/update/delete

## Architecture

```text
Browser (Next.js 15, React, Tailwind, Recharts)
  | HTTP /api/* (JWT Bearer)         | Socket.IO (JWT handshake)
  v                                  v
Express / Node.js REST API -------- Socket.IO rooms per workspace
  | Prisma ORM                       | membership verified before join
  v                                  |
PostgreSQL (users, workspaces, projects, issues, comments, activity)
  ^
  | Analytics read-through cache, 30s TTL; invalidated on mutations
Redis
```

### Quick start: local Node + Docker databases (recommended)

**Prerequisites:** Node.js 20+ (22 recommended), npm, Docker Desktop with Docker Compose.

```bash
unzip sprintforge-interview-edition.zip
cd sprintforge
cp .env.example .env
# Edit .env: choose a strong JWT_SECRET if exposing the app beyond your computer.
docker compose up -d --force-recreate postgres redis
cp .env apps/api/.env
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Open **http://localhost:3000**. Demo login:

```text
Email: alex@sprintforge.dev
Password: Demo12345!
```

The API is available at **http://localhost:4000/api/health**, and machine-readable API discovery at **http://localhost:4000/api/openapi.json**.

If your Mac is already running something on 3000, Next.js may start at **http://localhost:3001**. In that case set `WEB_ORIGIN=http://localhost:3001` in both `.env` and `apps/api/.env`, then restart. Do not overwrite your database volumes when upgrading.

**Important:** For workspace npm scripts, Prisma reads `.env` from `apps/api/.env` or the process environment, not necessarily the repository root. Before `db:push`, `db:seed`, or `dev`, copy the root `.env` to `apps/api/.env`:

```bash
cp .env apps/api/.env
```

The `NEXT_PUBLIC_*` URLs are defaulted in the frontend for localhost; for custom ports copy relevant values into `apps/web/.env.local` and restart Next.js.

### Alternative: full Docker stack

```bash
# At the repo root; no Node installation needed, only Docker
cp .env.example .env
# Edit JWT_SECRET in .env
# Run infrastructure, API, and frontend:
docker compose up --build -d
# After services are healthy, seed sample data:
docker compose exec api npx tsx prisma/seed.ts
```

Then visit **http://localhost:3000**. Docker builds can take a few minutes. If you change frontend API URLs, rebuild the web image.

### PostgreSQL port on macOS

The host PostgreSQL port is **5433** to avoid clashing with a local PostgreSQL installation on **5432**. The database inside Docker still listens on 5432, and the API service inside Docker correctly connects to `postgres:5432`. For local Prisma commands, the connection string in both `.env` and `apps/api/.env` must use `localhost:5433`.

If upgrading from the previous ZIP, make sure you use the new folder contents and execute `docker compose up -d --force-recreate postgres` to apply the port change. **Do not** run `docker compose down -v` because that removes database volumes.

Verify the mapped port with `docker compose ps`, then run `npm run db:push && npm run db:seed`.

### Common commands

```bash
npm run dev               # API and Next.js dev servers
npm run build             # TypeScript API + production Next.js build
npm run test              # Unit tests
npm run db:generate       # Generate Prisma client after schema changes
npm run db:push           # Apply Prisma schema (development only)
npm run db:seed           # Seed demo workspace, projects, issues
npx prisma studio --schema apps/api/prisma/schema.prisma
```

## API routes

| Method | Route | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Create account + workspace |
| POST | `/api/auth/login` | Get JWT |
| POST | `/api/auth/refresh` | Issue replacement JWT for valid token |
| GET | `/api/me` | Current user |
| GET | `/api/workspaces` | My workspaces |
| GET | `/api/workspaces/:id/members` | Workspace roster |
| POST | `/api/workspaces/:id/members` | Add existing user (admin) |
| GET, POST | `/api/projects` | List/create projects |
| GET, POST | `/api/issues` | Search/list/create issues |
| GET, PATCH, DELETE | `/api/issues/:id` | Issue details/update/delete |
| POST | `/api/issues/:id/comments` | Add comment |
| GET | `/api/analytics?workspaceId=...` | Workspace KPIs, cached 30s |
| GET | `/api/health` | Liveness |

### RBAC

- **OWNER / ADMIN:** project creation, membership management, issue changes and deletion.
- **MEMBER:** view and create/update issues, add comments.
- **VIEWER:** read-only access to workspace resources.
- All issue routes validate workspace membership. WebSocket workspace joins validate membership server-side.

## Interview talking points

1. **System design:** explain browser → REST/Socket.IO → Express → Prisma/PostgreSQL; Redis caches analytics only.
2. **Authorization:** contrast authentication (JWT signature/expiry) with authorization (workspace membership and role checks).
3. **Real time:** mutation emits workspace-scoped events; clients refetch authoritative state. Discuss multi-replica scaling with Redis Socket.IO adapter as a future enhancement.
4. **Database:** relational model, foreign keys, composite uniqueness, indexes, filtering and pagination.
5. **Caching:** read-through 30-second analytics cache, invalidated after mutations; cache failures degrade gracefully.
6. **Reliability:** Zod validation, structured error responses, rate-limited auth endpoints, Helmet, bcrypt, tests, Docker, CI.

## Implemented vs. future work

**Implemented:** email/password auth with short-lived JWT, basic token refresh endpoint, workspace RBAC, project creation, issue CRUD, filtering and pagination, comments, activity records, WebSocket issue events, Redis analytics caching, charts, responsive UI, Docker, demo seed, CI and basic validation tests.

**Not yet implemented:** refresh-token rotation/revocation, HttpOnly cookie auth, invitation email delivery, file uploads, drag-and-drop Kanban, notifications, full audit log UI, background jobs, WebSocket horizontal scaling, OpenAPI spec generation, production observability, and full end-to-end test coverage. Do not claim these in interviews until built.

### Production hardening checklist

- Replace localStorage bearer tokens with HttpOnly Secure SameSite cookie sessions, CSRF defense, refresh rotation and logout revocation.
- Configure strict deployment origins, secrets manager, HTTPS, trusted proxy settings, and DB connection pooling.
- Add migration history (`prisma migrate`), backups, observability, integration/E2E tests, load testing and a Redis Socket.IO adapter for multiple API instances.
- Never deploy with demo credentials or default local database passwords.

## GitHub upload

```bash
git init
git add .
git commit -m "feat: build SprintForge full-stack issue tracking platform"
git branch -M main
# Create a new EMPTY public GitHub repo named sprintforge
# Replace YOUR_USERNAME below:
git remote add origin https://github.com/YOUR_USERNAME/sprintforge.git
git push -u origin main
```

**Do not commit `.env`, `apps/api/.env`, or `apps/web/.env.local`.** They are ignored.

## License

MIT — see LICENSE.

### Troubleshooting: Prisma P1012 or Prisma Client not initialized

The schema in the initial archive had invalid single-line generator, datasource, and enum declarations. This **fixed archive** formats these correctly. From the repository root:

```bash
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

If Next.js reports port 3000 is busy and starts on 3001, stop the other program using port 3000 before retrying. The API CORS `WEB_ORIGIN` defaults to `http://localhost:3000`. To deliberately use port 3001 instead, set `WEB_ORIGIN=http://localhost:3001` in `apps/api/.env`, then restart the API.

Node 22 LTS is recommended. Node 25 is not the version used for this project's intended setup.


## Interview edition upgrades

- **Sprint board:** `/board` supports native HTML drag-and-drop, keyboard-friendly status selection, project filtering, and live refresh when teammates change issues.
- **Activity timeline:** `/activity` shows who created, edited, or commented on an issue. Existing demo records from previous ZIPs will not have retroactive activity logs; new actions appear immediately.
- **More analytics:** `/api/analytics/engineering` provides open work by assignee and a clearly labeled *resolution proxy* (creation to most recent update for completed issues; **not** true cycle time).
- **Cache diagnostics:** `/api/diagnostics/cache?workspaceId=...` is restricted to OWNER/ADMIN and exposes in-process counters for analytics cache hits, misses and write failures. Metrics reset when the API restarts.
- **Tests:** permission matrix and JWT verification tests supplement the original input-validation tests. These are unit tests, *not* a comprehensive integration or end-to-end suite.
- **OpenAPI:** `/api/openapi.json` exposes endpoint discovery; the document is an overview, not an exhaustive generated request/response schema.

### Upgrade existing SprintForge without losing demo data

1. Back up your old `sprintforge` directory (especially any edits and `.env`).
2. Extract the ZIP into a **different directory** or copy the updated source files into the old directory. The database is in a Docker volume, **not** in the ZIP.
3. Set the existing Postgres URL to `localhost:5433` in both environment files, and `WEB_ORIGIN` to your frontend origin (3000 or 3001).
4. Run `npm install && npm run db:generate && npm run db:push && npm run test && npm run dev`.
5. The new schema adds indexes only; running `db:push` should retain existing rows. Always keep a backup of important databases.

### Security and production caveats

- Demo login and passwords are intentionally public. **Never deploy the seeded accounts with real or confidential data.**
- Browser JWT storage is in `localStorage`; this is a deliberate demo limitation. A hardened internet-facing application should use short-lived access tokens and rotating refresh sessions with secure, HTTP-only cookies and CSRF protection.
- This ZIP does **not** claim zero npm vulnerabilities. Run `npm audit` on your Mac; fix and review relevant advisories *before* exposing an instance to the public. Avoid blind `npm audit fix --force` upgrades.
- The board currently queries up to 100 issues. A production board would use column-based cursor pagination or virtualization for large workspaces.
- `prisma db push` is used for local development. Production release workflow should use a reviewed, committed Prisma migration history (`prisma migrate deploy`).
- No paid services, hosted infrastructure, or deployment are configured. This is a local portfolio implementation, **not** a verified production-ready SaaS.
- API data access is workspace checked on every issue/query route; change control and endpoint-specific authorization should be re-tested during any further feature work.
