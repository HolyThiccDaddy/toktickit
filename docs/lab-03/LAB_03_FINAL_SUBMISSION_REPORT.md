# LAB 3 : TokTickIT Authenticated IT Ticketing System

Final submission report for the merged Lab 3 release at main commit 92fac36.

Student: Thira Rungruangkaset (67070503419)
GitHub: @HolyThiccDaddy
Peer reviewer: Ashira Sangkaset (67070503445)

## Answer Part 1: Git Use with Engineering Workflow (10 Points)

Lab 3 was developed on issue-specific branches, reviewed through pull requests, integrated into lab3-staging, and released to main. The final release is [PR #46](https://github.com/HolyThiccDaddy/toktickit/pull/46), merged as commit 92fac36.

Key evidence:

- [Repository](https://github.com/HolyThiccDaddy/toktickit)
- [Project board](https://github.com/users/HolyThiccDaddy/projects/1)
- [Issue #36 - authentication and migration](https://github.com/HolyThiccDaddy/toktickit/issues/36)
- [Issue #37 - requester authorization regression](https://github.com/HolyThiccDaddy/toktickit/issues/37)
- [Issue #38 - staff queue and ticket operations](https://github.com/HolyThiccDaddy/toktickit/issues/38)
- [Issue #39 - Administrator and release evidence](https://github.com/HolyThiccDaddy/toktickit/issues/39)
- [PR #40](https://github.com/HolyThiccDaddy/toktickit/pull/40) through [PR #46](https://github.com/HolyThiccDaddy/toktickit/pull/46), including peer review and merge history.

The documentation follow-up is [PR #47](https://github.com/HolyThiccDaddy/toktickit/pull/47). It updates the final source records and this report without changing the released implementation.

## Answer Part 2: Spec DD (5 Points)

The approved contract is maintained in:

- [specification.md](specification.md): requirements, roles, business rules, data model, migration, and Definition of Done.
- [api-spec.md](api-spec.md): named request/response schemas, status codes, authorization, and compatibility.
- [ui-spec.md](ui-spec.md): screens, states, Zen Green tokens, accessibility, and responsive rules.

PR #40 records the contract approval before implementation. The contract covers authentication, first-login password change, role and ownership authorization, Lab 2 migration, staff queue/detail, comments and notes, Administrator safeguards, responsive UI, and acceptance-criterion tests.

## Answer Part 3: Test DD and Traceability (10 Points)

Final verification from the merged Lab 3 release:

| Check | Result |
|---|---|
| Server regression | 15 test files / 92 tests passed twice |
| Client regression | 15 test files / 50 tests passed twice |
| Server and client builds | Passed |
| Playwright E2E | 13 tests passed across desktop, tablet, and mobile |
| Migration and seed | 7 migration/regression tests passed |
| Repository hygiene | Source git diff --check passed; local credentials remain ignored |

The full acceptance-criterion traceability matrix and exact test paths are in [tests.md](tests.md). It maps AC-01 to AC-15 to API, unit, UI, security, migration, responsive, and E2E evidence.

## Answer Part 4: AI Use with Reflection (5 Points)

The LLM used was OpenAI Codex (GPT-5). The selected prompts covered contract extraction, implementation, regression tests, responsive UI, peer-review fixes, and final release auditing. The complete eight-prompt record is in [ai-use.md](ai-use.md).

### My Reflection

Codex was most useful for turning the handout into a traceable contract, finding mismatches between requirements and tests, and generating focused regression cases. Human decisions and peer review remained authoritative: authorization, migration safety, password handling, and status transitions were accepted only after executable tests and real evidence passed. Suggestions that weakened server-side checks, exposed credentials, relied on hidden UI controls, or added excluded features were changed or rejected. The final release was rechecked from merged main before this report was generated.

## Answer Part 5: Working Login and Password Change UI (5 Points)

The authenticated session boundary replaces the Lab 2 Development Requester selector. The UI covers valid and invalid login, inactive-account handling, first-login password change, role-aware navigation, logout, and direct-access protection after logout.

Evidence: artifacts/lab-03/screenshots/authentication/{desktop,tablet,mobile}.png.

Supporting tests include server/tests/lab-03/auth.api.test.ts, server/tests/lab-03/authorization.api.test.ts, client/tests/lab-03/Login.test.tsx, client/tests/lab-03/ChangePassword.test.tsx, and e2e/lab-03/authentication.spec.ts.

## Answer Part 6: Working IT Staff Ticket Queue UI (5 Points)

IT Staff and Administrators share a searchable queue with status, IT Priority, assignee, category, sorting, pagination, realistic empty/no-results states, retryable failure feedback, and a responsive card layout.

Evidence: artifacts/lab-03/screenshots/staff-queue/{desktop,tablet,mobile}.png.

The mobile card layout includes visible sorting controls, and the Open Detail action is backed by the staff detail route and regression coverage.

## Answer Part 7: Working IT Staff Ticket Detail UI (10 Points)

Staff Ticket Detail supports claim/reassign, IT Priority, permitted status transitions and confirmations, attachment continuity, Public Comments, Internal Notes, Requester resolution indication, role restrictions, validation, and safe failure behavior.

Evidence: artifacts/lab-03/screenshots/staff-ticket-detail/{desktop,tablet,mobile}.png.

## Answer Part 8: Working Administrator User Management UI (5 Points)

The Administrator-only screen lists users, supports name/email search and role filtering, creates and edits one-role accounts, changes activation state, sets an initial password, and enforces duplicate-email and last-Administrator protections.

Evidence: artifacts/lab-03/screenshots/user-management/{desktop,tablet,mobile}.png.

## Answer Part 9: Zen Green UI and Responsive Evidence (5 Points)

The released screens reuse the Zen Green tokens and shared controls established in Lab 2. Visual tests and Playwright projects cover desktop, tablet, and mobile layouts for authentication, User Management, Staff Queue, and Staff Ticket Detail.

The completed visual checklist covers:

- Zen Green colors, typography, field styling, and button hierarchy.
- Loading, empty/no-results, validation, failure/retry, and submitting states.
- Focus order, labels, safe errors, readable badges, and editable/read-only boundaries.
- No clipping, overlap, horizontal overflow, or hidden mobile queue sorting controls.

Lab 3 exclusions remain external identity providers, password-recovery email, multi-role accounts, staff assignment history, and administrative deletion. Deactivation is used instead of deletion so historical ownership and authored communication remain queryable.

The rendered PDF is generated from this source and follows the required Answer Part 1 through Answer Part 9 order.
