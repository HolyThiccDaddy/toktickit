# Lab 4 Test Driven Development Plan

Status: Planned before implementation for Issue #51. A row is marked `Planned` until the named test is implemented and executed from the reviewed commit; no passing result is claimed in this contract.

## 1. Test policy

Write a failing focused test before each implementation slice. Keep the Lab 1–3 suites as a required regression gate. Destructive tests load `server/.env.test`, verify that `DATABASE_URL` names a database ending in `_test`, and use isolated deterministic fixtures. Every result in the final evidence must include the exact commit SHA and command actually run.

## 2. Acceptance-criterion traceability

| Test ID | Type | Acceptance criteria | What it proves | Planned test file | Status |
|---|---|---|---|---|---|
| DOC-01 | contract/document | AC-01 | Contract documents exist, cross-link, and contain the agreed Action/workflow/dashboard rules | `server/tests/lab-04/contract-docs.test.ts` | Planned |
| API-01 | API | AC-02, AC-03 | Create valid Action and validate required/conditional fields | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-02 | API/security | AC-04 | Requester read isolation and write denial | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-03 | API/security | AC-05 | Staff/Admin edit with current version and stale conflict | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-04 | API | AC-06 | Idempotent seed and zero/one/many Action fixtures | `server/tests/lab-04/seed.test.ts` | Planned |
| API-05 | API/workflow | AC-07, AC-09 | Complete status transition matrix and terminal protection | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-06 | API/workflow | AC-08 | Resolution evidence gate: qualifying completed Action allows the transition, while an outstanding follow-up blocks it without mutation | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-07 | API/dashboard | AC-10 | Requester metrics, UTC boundary, zero/one/many, drill-down | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| API-08 | API/dashboard | AC-11 | Staff/Admin metrics, filters, role scope, and empty results | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| API-09 | migration/regression | AC-15 | Existing records and Lab 1–3 behavior survive migration | `server/tests/lab-04/migration-regression.api.test.ts` | Planned |
| UI-01 | component | AC-12, AC-14 | Actions Taken list, create/edit validation, focus, live feedback | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-02 | component | AC-10, AC-12 | Requester dashboard metrics and ownership states | `client/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| UI-03 | component | AC-11, AC-12 | Staff/Admin dashboard filters, retry, empty, forbidden states | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| UI-04 | component/workflow | AC-08, AC-09, AC-12 | Status controls and resolution gate feedback | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| UI-05 | visual/responsive | AC-13, AC-14 | Desktop/tablet/mobile layout and keyboard accessibility | `client/tests/lab-04/ResponsiveLayout.test.tsx` | Planned |
| UI-STYLE-01 | UI style/unit | AC-12, AC-13, AC-14 | Shared Zen Green tokens, accessible names, focus ring, and no-overflow style contract | `client/tests/lab-04/ui-style.test.tsx` | Planned |
| UNIT-01 | unit | AC-07–AC-09 | Action state transitions and resolution-gate predicate as pure domain rules | `server/tests/lab-04/action-state.unit.test.ts` | Planned |
| PERF-01 | performance-smoke | AC-10–AC-13 | Dashboard queries and bounded drill-down remain within the documented smoke budget | `e2e/lab-04/dashboard-performance-smoke.spec.ts` | Planned |
| E2E-01 | E2E | AC-02–AC-06 | Staff creates/edits multiple Actions on one Ticket | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-02 | E2E | AC-07–AC-09 | Status workflow, resolution gate, reopen/cancel | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| E2E-03 | E2E | AC-10–AC-13 | Requester/staff/admin dashboards and responsive widths | `e2e/lab-04/dashboards.spec.ts` | Planned |
| A11Y-01 | accessibility | AC-12–AC-14 | Labels, focus, status cues, live regions, no overflow | `e2e/lab-04/responsive.visual.spec.ts` | Planned |
| EVID-01 | release evidence | AC-16 | Final evidence records exact SHA, command output, screenshots, links, and the single nine-part PDF | `e2e/lab-04/release-evidence.test.ts` | Planned |

## 3. Required regression coverage

The final run must keep every approved Lab 1–3 suite, including health/categories, ticket creation, requester ownership/My Tickets/Detail, attachments, session/login/logout/password gate, authorization, comments, notes, staff queue/detail, admin user management, migration regression, client component suites, and existing Playwright flows. If a historical suite is replaced, this file must name the replacement and explain equivalent coverage before release.

## 4. Planned verification commands

From the final integration checkout, run the smallest focused tests first, then the complete server and client suites, production builds, migration plus guarded test-database seed twice, Playwright desktop/tablet/mobile projects, accessibility/responsive checks, `git diff --check`, and a secret scan. Record the exact output and SHA in the final evidence section; do not copy counts from another branch.

## 5. Release evidence checklist

- [ ] Contract files existed before implementation PRs were completed.
- [ ] Every AC maps to at least one named executable test.
- [ ] All required test files exist at their documented paths.
- [ ] Results are green from final `main`, with no skipped/disabled/placeholder tests counted as passing.
- [ ] Migration and seed output proves the database is a `_test` database and the seed is idempotent.
- [ ] Screenshots cover dashboards, Actions Taken, workflow, loading/empty/error/forbidden, and desktop/tablet/mobile.
- [ ] Final PDF uses exactly `Answer Part 1` through `Answer Part 9` and links to the committed documents.
