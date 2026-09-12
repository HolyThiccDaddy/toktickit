# Lab 3 Test Plan and Results

Status: Planned before implementation; no Lab 3 result is claimed yet.

## 1. Testing strategy

Use unit, API/integration, UI component, UI style, responsive, security/authorization, migration/regression, and Playwright E2E layers. Every acceptance criterion in specification.md is mapped below. Test fixtures use server/.env.test, a database name ending in _test, isolated deterministic setup, and cleanup that is platform-neutral.

## 2. Traceability matrix

| ID | Acceptance criterion | Layer | Planned test file / evidence |
|---|---|---|---|
| T-01 | AC-01 valid login and role shell | API + UI + E2E | server/tests/lab-03/auth.api.test.ts; client/tests/lab-03/Login.test.tsx; e2e/lab-03/authentication.spec.ts |
| T-02 | AC-02 invalid/inactive login safety | API + UI + E2E | auth.api.test.ts; Login.test.tsx; authentication.spec.ts |
| T-03 | AC-03 first-login password gate | API + UI + E2E | auth.api.test.ts; client/tests/lab-03/ChangePassword.test.tsx; authentication.spec.ts |
| T-04 | AC-04 logout/expiry protection | API + security + E2E | auth.api.test.ts; authorization.api.test.ts; authentication.spec.ts |
| T-05 | AC-05 requester Lab 2 regression/ownership | API + UI + migration + E2E | authorization.api.test.ts; existing Lab 2 suites; authentication.spec.ts |
| T-06 | AC-06 public comment/resolution indication | API + UI + E2E | server/tests/lab-03/comments-notes.api.test.ts; StaffTicketDetail.test.tsx; staff-ticket-flow.spec.ts |
| T-07 | AC-07 shared queue filters/responsive states | API + UI + style + responsive + E2E | staff-queue.api.test.ts; StaffTicketQueue.test.tsx; e2e/lab-03/staff-ticket-flow.spec.ts; artifacts/lab-03/screenshots/staff-queue |
| T-08 | AC-08 claim/reassign/priority/status authorization | API + UI + security + E2E | staff-queue.api.test.ts; staff-ticket-detail.api.test.ts; StaffTicketDetail.test.tsx; staff-ticket-flow.spec.ts |
| T-09 | AC-09 public vs internal visibility | API + UI + security + E2E | comments-notes.api.test.ts; StaffTicketDetail.test.tsx; staff-ticket-flow.spec.ts |
| T-10 | AC-10 admin user management | API + UI + E2E | server/tests/lab-03/users-admin.api.test.ts; client/tests/lab-03/UserManagement.test.tsx; e2e/lab-03/user-administration.spec.ts |
| T-11 | AC-11 last-admin/deactivated-user safety | API + security + UI | users-admin.api.test.ts; authorization.api.test.ts; UserManagement.test.tsx |
| T-12 | AC-12 migration/data preservation/idempotent seed | Migration + regression | server/tests/lab-03/migration-regression.api.test.ts; migration terminal evidence |
| T-13 | AC-13 forged identity/wrong-role rejection | API + security | server/tests/lab-03/authorization.api.test.ts |
| T-14 | AC-14 responsive no-overflow behavior | UI style + responsive + E2E | client/tests/lab-03/ResponsiveLayout.test.tsx; all Lab 3 E2E projects; artifacts/lab-03/screenshots |
| T-15 | AC-15 release gates | Regression + build + E2E | server/client test and build logs; e2e results; release checklist |

## 3. Planned server suites

- server/tests/lab-03/auth.api.test.ts: login, logout, session, CSRF, password policy, first-login gate, expiry.
- server/tests/lab-03/authorization.api.test.ts: session-derived identity, role boundaries, ownership, deactivated users, safe errors.
- server/tests/lab-03/staff-queue.api.test.ts: queue search/filter, claim race, reassignment, IT priority.
- server/tests/lab-03/staff-ticket-detail.api.test.ts: detail access and status transition matrix.
- server/tests/lab-03/comments-notes.api.test.ts: public comments, internal notes, visibility and ownership.
- server/tests/lab-03/users-admin.api.test.ts: admin CRUD-like operations, role validation, activation, initial password, last-admin guard.
- server/tests/lab-03/migration-regression.api.test.ts: preserved Lab 2 records and deterministic repeated seed.

## 4. Planned client and E2E suites

- client/tests/lab-03/Login.test.tsx and ChangePassword.test.tsx.
- client/tests/lab-03/StaffTicketQueue.test.tsx, StaffTicketDetail.test.tsx, UserManagement.test.tsx, and ResponsiveLayout.test.tsx.
- e2e/lab-03/authentication.spec.ts, staff-ticket-flow.spec.ts, and user-administration.spec.ts.
- Screenshots are captured from real runs under artifacts/lab-03/screenshots/authentication, staff-queue, staff-ticket-detail, and user-management.

## 5. Release checklist

- [ ] All planned tests implemented and passing.
- [ ] Server and client builds pass.
- [ ] Playwright desktop, tablet, and mobile projects pass.
- [ ] Migration and repeated seed pass twice against isolated _test database.
- [ ] Security checks cover missing session, forged identity, wrong role, ownership, CSRF, inactive user, and last-admin guard.
- [ ] Terminal logs and visual evidence are captured and linked.
- [ ] Results below are updated only with commands actually run.

## 6. Executed results

No Lab 3 implementation or test command has been run yet. This section will be filled from real terminal output after the contract is reviewed and implementation begins.
