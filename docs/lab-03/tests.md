# Lab 3 Test Plan and Results

Status: In progress. The Issue #36 authentication/migration foundation and Issue #37 authenticated requester regression have executed results below; staff, administrator, and their remaining UI/E2E layers are planned for subsequent Lab 3 issues.

## 1. Testing strategy

Use unit, API/integration, UI component, UI style, responsive, security/authorization, migration/regression, and Playwright E2E layers. Every acceptance criterion in specification.md is mapped below. Test fixtures use server/.env.test, a database name ending in _test, isolated deterministic setup, and cleanup that is platform-neutral.

## 2. Traceability matrix

| ID | Acceptance criterion | Layer | Planned test file / evidence |
|---|---|---|---|
| T-01 | AC-01 valid login and role shell | API + UI + E2E | server/tests/lab-03/auth.api.test.ts; client/tests/lab-03/Login.test.tsx; e2e/lab-03/authentication.spec.ts |
| T-02 | AC-02 invalid/inactive login safety | API + UI + E2E | auth.api.test.ts; Login.test.tsx; authentication.spec.ts |
| T-03 | AC-03 first-login password gate and direct API blocking | API + UI + security + E2E | auth.api.test.ts; authorization.api.test.ts; client/tests/lab-03/ChangePassword.test.tsx; authentication.spec.ts |
| T-04 | AC-04 logout/expiry protection | API + security + E2E | auth.api.test.ts; authorization.api.test.ts; authentication.spec.ts |
| T-05 | AC-05 requester Lab 2 regression/ownership | API + UI + migration + E2E | server/tests/lab-03/authorization.api.test.ts; server/tests/lab-02/create-ticket.api.test.ts, my-tickets.api.test.ts, ticket-detail.api.test.ts; e2e/lab-02/multi-requester-isolation.spec.ts, requester-ticket-flow.spec.ts, responsive.visual.spec.ts |
| T-06 | AC-06 requester public comment/resolution indication and ownership | API + UI + security + E2E | server/tests/lab-03/comments-notes.api.test.ts; client/tests/lab-03/RequesterTicketDetail.test.tsx; e2e/lab-03/requester-regression.spec.ts |
| T-07 | AC-07 shared queue search/filters/sort/pagination/responsive states | API + UI + style + responsive + E2E | staff-queue.api.test.ts; StaffTicketQueue.test.tsx; e2e/lab-03/staff-ticket-flow.spec.ts; artifacts/lab-03/screenshots/staff-queue |
| T-08 | AC-08 claim/reassign/IT Priority enum/complete status matrix authorization | API + UI + security + E2E | staff-queue.api.test.ts; staff-ticket-detail.api.test.ts; StaffTicketDetail.test.tsx; staff-ticket-flow.spec.ts |
| T-09 | AC-09 public vs internal visibility and append-only validation | API + UI + security + E2E | comments-notes.api.test.ts; StaffTicketDetail.test.tsx; staff-ticket-flow.spec.ts |
| T-10 | AC-10 admin user management and activation state | API + UI + E2E | server/tests/lab-03/users-admin.api.test.ts; client/tests/lab-03/UserManagement.test.tsx; e2e/lab-03/user-administration.spec.ts |
| T-11 | AC-11 self-deactivation/self-role-change, last-admin, and deactivated-user safety | API + security + UI | users-admin.api.test.ts; authorization.api.test.ts; UserManagement.test.tsx |
| T-12 | AC-12 migration/data preservation/idempotent seed | Migration + regression | server/tests/lab-03/migration-regression.api.test.ts; migration terminal evidence |
| T-13 | AC-13 forged identity/wrong-role rejection | API + security | server/tests/lab-03/authorization.api.test.ts |
| T-14 | AC-14 responsive no-overflow behavior | UI style + responsive + E2E | client/tests/lab-03/ResponsiveLayout.test.tsx; all Lab 3 E2E projects; artifacts/lab-03/screenshots |
| T-15 | AC-15 release gates | Regression + build + E2E | server/client test and build logs; e2e results; release checklist |

T-03 must call a protected Ticket and Admin endpoint directly while `mustChangePassword=true` and assert `403 PASSWORD_CHANGE_REQUIRED`, including an uppercase or mixed-case path variant; only `/auth/me`, `/auth/csrf`, `/auth/change-password`, and `/auth/logout` remain available until the password change succeeds.

T-06 must exercise a Requester-owned Ticket Detail, successful Public Comment submission, successful Problem Appears Resolved indication, rejection for a different Requester, and an assertion that the indication does not change formal status to RESOLVED or CLOSED.

## 3. Planned server suites

- server/tests/lab-03/auth.api.test.ts: valid/invalid login, inactive-account response after password verification, logout, session, CSRF, password policy, first-login gate, expiry, and response schema/status assertions.
- server/tests/lab-03/authorization.api.test.ts: session-derived identity, role boundaries, ownership, deactivated users, must-change-password gate, and safe errors.
- server/tests/lab-03/staff-queue.api.test.ts: queue search/filter/sort/pagination, invalid query behavior, claim race, reassignment to active IT Staff/Admin, IT Priority enum validation, and response metadata.
- server/tests/lab-03/staff-ticket-detail.api.test.ts: detail access and every valid/invalid status transition with confirmation rules.
- server/tests/lab-03/comments-notes.api.test.ts: Requester/staff/Admin public comments, internal notes, visibility, append-only behavior, length/whitespace validation, and ownership.
- server/tests/lab-03/users-admin.api.test.ts: admin CRUD-like operations, role validation, activation on create/edit, initial password, self-deactivation/self-role-change, duplicate email, and last-admin guards.
- server/tests/lab-03/migration-regression.api.test.ts: preserved Lab 2 records, data-model relationships, Requested-to-IT Priority copy, and deterministic repeated seed.

## 4. Planned client and E2E suites

- client/tests/lab-03/Login.test.tsx, ChangePassword.test.tsx, and RequesterTicketDetail.test.tsx.
- client/tests/lab-03/StaffTicketQueue.test.tsx, StaffTicketDetail.test.tsx, UserManagement.test.tsx, and ResponsiveLayout.test.tsx.
- e2e/lab-03/authentication.spec.ts, requester-regression.spec.ts, staff-ticket-flow.spec.ts, and user-administration.spec.ts.
- Screenshots are captured from real runs under artifacts/lab-03/screenshots/authentication, staff-queue, staff-ticket-detail, and user-management.

## 5. Release checklist

- [ ] All planned tests implemented and passing.
- [ ] Server and client builds pass.
- [ ] Playwright desktop, tablet, and mobile projects pass.
- [ ] Migration and repeated seed pass twice against isolated _test database.
- [ ] Security checks cover missing session, forged identity, wrong role, ownership, CSRF, inactive user, and last-admin guard.
- [ ] First-login sessions cannot bypass the password gate through direct API calls.
- [ ] API response schemas, status codes, data-model decisions, and IT Priority enum are covered by tests.
- [ ] Terminal logs and visual evidence are captured and linked.
- [ ] Results below are updated only with commands actually run.

## 6. Executed results

- Issue #36 authentication API: `server/tests/lab-03/auth.api.test.ts` — 10 tests passed, including generic inactive-account failures, case-insensitive first-login API-gate bypass checks, malformed JSON handling, expired sessions, and CSRF expiry.
- Issue #36 migration and deterministic-fixture regression: `server/tests/lab-03/migration-regression.api.test.ts` — 7 tests passed, including canonical ownership links, repeated-seed equality, preservation of Lab 2 reference/counter/ticket/attachment rows, a legacy requester ID collision, and a non-fixture requester credential.
- Issue #37 requester authorization and communication regression: `server/tests/lab-03/authorization.api.test.ts` plus `server/tests/lab-03/comments-notes.api.test.ts` — 11 tests passed, covering session-derived identity, forged-header rejection, role/ownership boundaries, public-comment validation/visibility, internal-note visibility, idempotent resolution indication, and the RESOLVED-ticket indication case.
- Full server regression: `server npm test` — 13 test files, 53 tests passed on each of two serial runs.
- Full client regression: `client npm test` — 12 test files, 40 tests passed on each of two serial runs, including expired-session recovery, retryable logout failure, and the authenticated requester detail conversation tests.
- Authenticated requester E2E regression: `client npm run test:e2e` — 6 tests passed across desktop, tablet, and mobile projects, including public comment/resolution flow.
- Server and client production builds passed on repeated runs.
- `npx prisma validate` passed.
- `npx prisma migrate deploy` applied the two Lab 3 migrations to the isolated `toktickit_test` database.

The release checklist remains unchecked until the later requester, staff, administrator, UI, responsive, and E2E issues are implemented and evidenced.
