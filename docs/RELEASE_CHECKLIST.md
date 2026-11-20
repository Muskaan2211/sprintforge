# SprintForge verification and release checklist

## Local acceptance

- [ ] `docker compose up -d postgres redis` succeeds (port 5433 for PostgreSQL)
- [ ] `npm install && npm run db:generate && npm run db:push && npm run db:seed` succeeds
- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] Login as `alex@sprintforge.dev` succeeds
- [ ] Dashboard and analytics load
- [ ] Board drag/drop and status-menu updates persist after refresh
- [ ] Issue creation, edit, comment, deletion and pagination function
- [ ] Activity feed shows new changes with actor and timestamp
- [ ] Open app in two browsers and verify issue mutation appears via WebSocket
- [ ] Viewer cannot create/edit/delete issues; Member cannot delete or change members
- [ ] Different-workspace user cannot read private issues or room events
- [ ] Verify CORS matches the active frontend port (3000 vs 3001)
- [ ] Verify responsive layouts at 375px and 768px

## Before a publicly accessible demo

- [ ] Fix or document every security advisory in `npm audit`
- [ ] Avoid demo credentials in an exposed environment; use strong secrets
- [ ] Replace browser localStorage JWT with hardened session handling
- [ ] Set up HTTPS, correct origins, secret management and monitoring
- [ ] Add integration/E2E tests with a temporary database
- [ ] Create and commit an audited production migration history
- [ ] Capture actual screenshots after local validation; put them in `docs/screenshots/`
- [ ] Confirm `.env` and other secrets remain gitignored

Do not mark items as complete without personally verifying them.
