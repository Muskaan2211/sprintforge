# SprintForge Interview Walkthrough

## 60-second pitch

SprintForge is a Jira-inspired, multi-user issue tracking platform. I built a Next.js and TypeScript frontend, a Node.js/Express REST API, and a PostgreSQL schema with users, workspaces, roles, projects, issues, and comments. I added JWT authentication and workspace-scoped RBAC, Socket.IO updates, and Redis-cached analytics. The dashboard surfaces project workloads and workflow trends, and the entire stack has Docker configuration and GitHub Actions validation.

## Live demo (5 minutes)

1. Log in as Alex and show the workspace overview.
2. Navigate to Issues; search, filter by priority/status, paginate.
3. Create a HIGH-priority issue and assign Jordan.
4. Open the issue, update status, and post a comment.
5. Open a second browser window, change the issue in the first, and explain Socket.IO room events and authoritative refetch.
6. Open Analytics; explain cache invalidation.

## Deep dive

**Why PostgreSQL?** Relational integrity, indexing, and joins across workspaces, members, projects, issues and comments.

**Why Redis?** Fast short-lived analytics cache with invalidation after issue mutations. Cache failure falls back to the database.

**How does RBAC work?** JWT authenticates identity, but each workspace-scoped route also looks up the membership and role. VIEWER is read-only; MEMBER can edit; ADMIN/OWNER can create projects, manage members, delete issues.

**What happens on issue update?** Validate input with Zod, check membership, write PostgreSQL, record activity, invalidate Redis analytics, emit a Socket.IO event to the authorized workspace room. The client refetches the updated data.

**How would you scale?** Socket.IO Redis adapter for multi-instance broadcasting; DB connection pooling; background workers; durable event/outbox pattern; cursor pagination; distributed tracing; integration tests.

## Accurate scope

This version is a substantial working codebase but has not been fully end-to-end verified in the delivery environment. Do not claim production deployment, benchmark results, horizontal scaling, advanced refresh-token security, or extensive test coverage without implementing and measuring them.
