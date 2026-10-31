# Lab 4 Test Driven Development Plan

Status: Final evidence is prepared from `lab4-staging` at merge SHA `026ba36348b553449bc2e5b4fda799110ddad4e6`. Rows below name the executable test or the approved Lab 1–3 replacement used by the final release run.

## 1. Test policy

Write a failing focused test before each implementation slice. Keep the Lab 1–3 suites as a required regression gate. Destructive tests load `server/.env.test`, verify that `DATABASE_URL` names a database ending in `_test`, and use isolated deterministic fixtures. Every result in the final evidence must include the exact commit SHA and command actually run.

## 2. Acceptance-criterion traceability

| Test ID | Type | Acceptance criteria | What it proves | Planned test file | Status |
|---|---|---|---|---|---|
| DOC-01 | contract/document | AC-01 | Contract documents exist, cross-link, and contain the agreed Action/workflow/dashboard rules | `server/tests/lab-04/contract-docs.test.ts` | Implemented in Issue 6; full server suite passes |
| API-01 | API | AC-02, AC-03, AC-20 | Create valid Action and enforce exact trimmed limits, whitespace, and conditional fields | `server/tests/lab-04/actions-taken.api.test.ts` | Implemented in Issue 2; full server suite passes |
| API-02 | API/security | AC-04 | Requester read isolation and write denial | `server/tests/lab-04/actions-taken.api.test.ts` | Implemented in Issue 2; full server suite passes |
| API-03 | API/security/audit | AC-05, AC-18 | Current-version edit appends an immutable before-image; stale/rejected edit adds no revision and cannot change creation/audit metadata | `server/tests/lab-04/actions-taken.api.test.ts` | Implemented in Issue 2; full server suite passes |
| API-04 | API | AC-06 | Idempotent seed and zero/one/many Action fixtures | `server/tests/lab-04/actions-seed.test.ts` | Implemented in Issue 2; guarded seed passes twice |
| API-05 | API/workflow | AC-07, AC-09 | Complete status transition matrix and terminal protection | `server/tests/lab-04/ticket-workflow.api.test.ts` | Implemented in Issue 4; full server suite passes |
| API-06 | API/workflow | AC-08, AC-21 | Resolution gate blocks on outstanding follow-up, then permits Ticket resolution after authorized follow-up resolution records audit/revision/version | `server/tests/lab-04/ticket-workflow.api.test.ts` | Implemented in Issue 4; full server suite passes |
| API-07 | API/dashboard | AC-10 | Requester metrics, UTC boundaries, zero/one/many, and equality between each dashboard count and the matching `GET /tickets` filter, including `currentStatus`, `currentStatuses`, and date windows | `server/tests/lab-04/requester-dashboard.api.test.ts` | Implemented in Issue 5; focused tests pass |
| API-08 | API/dashboard | AC-11 | Staff/Admin metrics, exact queue drill-down equality using `assigneeId=me/unassigned`, multi-status and UTC date filters, current-user Actions filtering, role scope, and empty results | `server/tests/lab-04/staff-dashboard.api.test.ts` | Implemented in Issue 5; focused tests pass |
| API-09 | migration/regression | AC-15 | Existing records and Lab 1–3 behavior survive migration | `server/tests/lab-03/migration-regression.api.test.ts` | Implemented as the approved Lab 3 regression replacement; full server suite passes |
| UI-01 | component | AC-12, AC-14, AC-18–AC-21 | Actions list/form exact validation, assignment/state controls, follow-up resolution, immutable edit-history timeline, focus, and live feedback | `client/tests/lab-04/ActionsTaken.test.tsx` | Implemented in Issue 3; full client suite passes |
| UI-02 | component | AC-10, AC-12 | Requester dashboard metrics, ownership states, and exact Waiting/Open/Recently Updated/Recently Resolved list filters and links | `client/tests/lab-04/RequesterDashboard.test.tsx` | Implemented in Issue 5; focused tests pass |
| UI-03 | component | AC-11, AC-12 | Staff/Admin dashboard metric-to-queue predicate equality, supported owner/unassigned/status/date filters, My Actions view, retry, empty, and forbidden states | `client/tests/lab-04/StaffDashboard.test.tsx` | Implemented in Issue 5; focused tests pass |
| UI-04 | component/workflow | AC-08, AC-09, AC-12 | Status controls and resolution gate feedback | `client/tests/lab-04/TicketWorkflow.test.tsx` | Implemented in Issue 4; full client suite passes |
| UI-05 | visual/responsive | AC-13, AC-14 | Desktop/tablet/mobile layout and keyboard accessibility | `e2e/lab-04/responsive.visual.spec.ts`, `e2e/lab-04/release-evidence.visual.spec.ts` | Implemented in Issue 6; full Playwright run 28 passed, 2 intentionally skipped |
| UI-STYLE-01 | UI style/unit | AC-12, AC-13, AC-14 | Shared Zen Green tokens, accessible names, focus ring, and no-overflow style contract | `client/tests/lab-04/StaffDashboard.test.tsx`, `client/tests/lab-04/RequesterDashboard.test.tsx`, `e2e/lab-04/release-evidence.visual.spec.ts` | Implemented in Issues 3/5/6; full client and Playwright suites pass |
| UNIT-01 | unit | AC-07–AC-09 | Action state transitions and resolution-gate predicate as pure domain rules | `server/tests/lab-04/ticket-workflow.api.test.ts`, `client/tests/lab-04/TicketWorkflow.test.tsx` | Implemented as focused API/component workflow coverage; full suites pass |
| PERF-01 | performance-smoke | AC-10–AC-13 | Dashboard queries and bounded drill-down remain within the documented smoke budget | `e2e/lab-04/dashboard-performance-smoke.spec.ts` | Implemented in Issue 6; desktop smoke passes |
| E2E-01 | E2E | AC-02–AC-06, AC-17, AC-18, AC-20 | Staff creates Actions with retry-safe keys, edits, retries, and Requester reads the prior-value timeline | `e2e/lab-04/actions-taken-flow.spec.ts` | Implemented in Issue 3; desktop suite passes |
| E2E-02 | E2E | AC-07–AC-09 | Status workflow, resolution gate, reopen/cancel | `e2e/lab-04/ticket-resolution.spec.ts` | Implemented in Issue 4; desktop suite passes |
| E2E-03 | E2E | AC-10–AC-13 | Requester/staff/admin dashboards and responsive widths | `e2e/lab-04/dashboards.spec.ts`, `e2e/lab-04/release-evidence.visual.spec.ts` | Implemented in Issues 5/6; desktop/tablet/mobile suite passes |
| A11Y-01 | accessibility | AC-12–AC-14 | Labels, focus, status cues, live regions, no overflow | `e2e/lab-04/responsive.visual.spec.ts`, `e2e/lab-04/release-evidence.visual.spec.ts` | Implemented in Issue 6; responsive suite passes |
| EVID-01 | release evidence | AC-16 | Final evidence records exact SHA, command output, screenshots, links, and the single nine-part PDF | `e2e/lab-04/release-evidence.visual.spec.ts`, `docs/lab-04/LAB_04_FINAL_SUBMISSION_REPORT.md` | Implemented in Issue 6; evidence and PDF generated |
| API-10 | API/idempotency | AC-17 | Missing/malformed key rejection, same-key/same-payload replay without duplicate row, and same-key/different-payload conflict | `server/tests/lab-04/actions-taken.api.test.ts` | Implemented in Issue 2; full server suite passes |
| API-11 | API/authorization | AC-19 | Assign/reassign, full Action transition matrix, inactive target rejection, terminal protection, and no-mutation assertions | `server/tests/lab-04/actions-taken.api.test.ts` | Implemented in Issue 2; full server suite passes |
| E2E-04 | E2E/authorization | AC-19 | Staff assigns/reassigns an Action, completes or cancels through permitted transitions, and receives safe rejection for an inactive assignee | `server/tests/lab-04/actions-taken.api.test.ts`, `client/tests/lab-04/ActionsTaken.test.tsx` | Implemented as API/component authorization coverage; full suites pass |
| E2E-05 | E2E/workflow | AC-08, AC-21 | Ticket resolve is blocked by a completed Action's outstanding follow-up; authorized Staff resolves it; the Ticket then resolves and audit/version/history are verified | `server/tests/lab-04/ticket-workflow.api.test.ts`, `client/tests/lab-04/ActionsTaken.test.tsx` | Implemented as API/component workflow coverage; full suites pass |

## 3. Required regression coverage

The final run must keep every approved Lab 1–3 suite, including health/categories, ticket creation, requester ownership/My Tickets/Detail, attachments, session/login/logout/password gate, authorization, comments, notes, staff queue/detail, admin user management, migration regression, client component suites, and existing Playwright flows. If a historical suite is replaced, this file must name the replacement and explain equivalent coverage before release.

## 4. Final verification commands

From the final integration checkout, the focused and complete server/client suites, production builds, migration plus guarded test-database seed twice, Playwright desktop/tablet/mobile projects, accessibility/responsive checks, `git diff --check`, and credential-pattern scan were run. Exact commands and results are recorded in `docs/lab-04/LAB_04_FINAL_SUBMISSION_REPORT.md`; the final integration PR head SHA is the release evidence commit.

## 5. Release evidence checklist

- [x] Contract files existed before implementation PRs were completed.
- [x] Every AC maps to at least one named executable test or an explicitly named Lab 1–3 replacement.
- [x] All required test files exist at their documented paths or are mapped to the approved replacement file.
- [x] Results are green from the final Lab 4 integration checkout; skipped visual workflow variants are documented and do not count as passing tests.
- [x] Migration and guarded compiled seed output proves the database is a `_test` database and the seed is idempotent.
- [x] Screenshots cover dashboards, Actions Taken, workflow, loading/empty/error/forbidden, and desktop/tablet/mobile.
- [x] Final PDF uses exactly `Answer Part 1` through `Answer Part 9` and links to the committed documents.

## 6. Final evidence source

The release evidence is generated from the `lab4-staging` merge base `026ba36348b553449bc2e5b4fda799110ddad4e6` and the final integration branch head recorded on PR #62. The PDF and Markdown report are updated together; no result is copied from an uncommitted working tree.
