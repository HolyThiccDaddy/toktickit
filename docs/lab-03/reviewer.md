# Lab 3 - Peer Review Record

Status: Contract approved after peer review; Issues #36–#38 are merged into `lab3-staging`, and Issue #39 implementation/release evidence is complete on the feature branch pending peer review.

**Author:** Thira Rungruangkaset - GitHub: @HolyThiccDaddy
**Peer reviewer:** Ashira Sangkaset - GitHub: @osizk

## Contract review

| PR | Scope | Reviewer verdict | Follow-up |
|---|---|---|---|
| [#40](https://github.com/HolyThiccDaddy/toktickit/pull/40) | Lab 3 specification, API contract, UI specification, and test plan | Approved by @osizk after the second review; merged into `lab3-staging` as `40ca398` | Contract approval recorded; implementation and release evidence remain open |

## Review protocol

Reviewers should check that the contract covers authentication, first-login password change, role and ownership authorization, staff queue/detail, public comments/internal notes, admin safeguards, migration compatibility, responsive UI, and traceable tests. Record comments as dated paragraphs with links to the exact PR or commit. Do not mark approval until requested changes are implemented and verified.

## Peer review round 1 - 2026-09-12

The reviewer requested a complete eight-status transition matrix with permitted roles, confirmations, and invalid-transition behavior. The contract now defines NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CLOSED, REOPENED, and CANCELLED, including terminal states and the rule that a Requester indication never formally resolves a Ticket.

The reviewer found a contradiction about Administrator Ticket access. The contract now states that the authorization matrix explicitly grants Administrators the same queue and Ticket operations as IT Staff, while keeping user management Administrator-only. The API, UI, and tests use this same decision.

The reviewer requested exact seed quantities, queue query behavior, and Administrator safeguards. The contract now specifies the required active and inactive account counts, realistic assigned and unassigned Tickets, searchable/filterable/sortable fields, pagination metadata and invalid-query errors, plus server-side self-deactivation, self-role-change, duplicate-email, invalid-role, and last-active-Administrator protection.

The reviewer requested Requester-side tests for comments and the resolution indication. The test plan now maps AC-06 to a Requester Ticket Detail component test and a Requester regression E2E flow that checks ownership rejection and confirms the indication does not set RESOLVED or CLOSED.

The reviewer requested safer inactive-login handling and Administrator assignment eligibility. The API now returns ACCOUNT_INACTIVE only after the submitted password is verified, and assignment accepts only active IT Staff or Administrator users. Public/internal message append-only, author/time, validation, and safe-rendering rules are also recorded.

## Peer review round 2 - 2026-09-12

The reviewer requested a global backend first-login gate. The API contract now limits a must-change session to `/auth/me`, `/auth/csrf`, `/auth/change-password`, and `/auth/logout`, with `PASSWORD_CHANGE_REQUIRED` for every other protected endpoint, and the test plan includes direct API bypass checks.

The reviewer requested precise API response schemas and success codes. The API contract now defines shared named schemas for sessions, users, tickets, comments, notes, attachments, and pagination, plus a success-status map for every endpoint.

The reviewer requested complete data-model decisions. The specification now includes a model table with types, nullability, relationships, indexes, deletion behavior, migration mapping, and preservation of Lab 2 identifiers and ownership.

The reviewer requested the actual IT Priority enum. The contract now defines `LOW`, `MEDIUM`, `HIGH`, and `URGENT`, requires the migrated or newly created Ticket to copy Requested Priority into IT Priority, and maps validation to the API and test plan.

## Contract approval - 2026-09-12

The reviewer approved the corrected contract in [PR #40](https://github.com/HolyThiccDaddy/toktickit/pull/40#pullrequestreview-5186011435). GitHub merged it into `lab3-staging` as [commit `40ca398`](https://github.com/HolyThiccDaddy/toktickit/commit/40ca3983e3e706c72d757e2155562aada788a374), satisfying the Issue #36 dependency.

## Implementation review round 1 - 2026-09-12

In [PR #41](https://github.com/HolyThiccDaddy/toktickit/pull/41#discussion_r3996194389), the reviewer found that seeding only the five hard-coded requester fixtures left additional Lab 2 requesters with the `__MIGRATION_PENDING__` marker. The reviewer also found in [the second implementation comment](https://github.com/HolyThiccDaddy/toktickit/pull/41#discussion_r3996195048) that fixed staff and Administrator IDs could collide with preserved requester IDs. Commit [`82e5caa`](https://github.com/HolyThiccDaddy/toktickit/commit/82e5caaae6acf7c2e0627e09707faa808043b098) now walks the actual `RequesterUser` table, provisions deterministic local-only credentials only for pending hashes, preserves changed hashes, allocates staff and Administrator IDs from PostgreSQL after migrated rows, and adds both regression cases.

The reviewer then identified a case-sensitive first-login gate in `server/src/auth.ts` that could be bypassed with a mixed-case protected path. Commit [`9ed473a`](https://github.com/HolyThiccDaddy/toktickit/commit/9ed473ac4990c69ef46aa2b2b2fad97da511e6ce) normalizes request paths before applying the global gate and adds a `/API/TiCkEtS` regression assertion. The auth suite (9/9), full server regression (72/72 on two serial runs), production build, and Lab 2 E2E suite (5/5) passed after the fix. PR #41 is awaiting the reviewer’s follow-up review; no final implementation approval has been recorded yet.

## Implementation and release history

Issue #38 was merged into `lab3-staging` through [PR #43](https://github.com/HolyThiccDaddy/toktickit/pull/43). Issue #39 adds Administrator user management and the remaining release evidence on the current feature branch. The implementation includes the Administrator-only `/api/admin/users` API, safe user summaries, create/edit/activation/reset operations, duplicate-email and role validation, first-login password provisioning, session revocation on deactivation/reset, self-administration safeguards, the responsive User Management screen, functional authentication/user-administration E2E coverage, and real desktop/tablet/mobile screenshots for authentication, User Management, Staff Queue, and Staff Ticket Detail.

The current Issue #39 verification is recorded in `docs/lab-03/tests.md`: 15 server test files/92 tests, 15 client test files/48 tests, six desktop Lab 3 E2E tests, two responsive tablet/mobile E2E tests, and production builds passed. Add the feature PR link, peer-review comments, final approval, and release-merge commit here after the branch is pushed and reviewed.
