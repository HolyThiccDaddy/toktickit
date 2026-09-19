# TokTickIT Lab 3 - Final Submission Report

## Release status

Lab 3 is integrated into `main` by [Final Release PR #46](https://github.com/HolyThiccDaddy/toktickit/pull/46) at [commit `92fac36`](https://github.com/HolyThiccDaddy/toktickit/commit/92fac36cb39a3f37dbdcb7be8431788e4465789b). The implementation, peer-review record, AI-use record, test plan, and responsive evidence are included in this repository.

## Scope delivered

- Authenticated sessions with first-login password change, CSRF protection, expiry, logout, and role-aware navigation.
- Requester-owned ticket and attachment flows, public comments, and the resolution indication.
- Shared IT Staff/Administrator queue with search, filters, sorting, pagination, assignment, IT Priority, and the complete status matrix.
- Public comments and staff-only Internal Notes with ownership and visibility enforcement.
- Administrator user management with safe role/activation changes, initial-password reset, duplicate-email validation, and last-administrator protection.
- Lab 2 data-preserving migration and idempotent seed behavior.
- Desktop, tablet, and mobile responsive evidence for authentication, User Management, Staff Queue, and Staff Ticket Detail.

## Verification evidence

| Check | Result |
|---|---|
| Server regression | 15 test files / 92 tests passed twice |
| Client regression | 15 test files / 50 tests passed twice; Create Ticket loading race stabilized |
| Server production build | Passed |
| Client production build | Passed |
| Playwright E2E | 13 tests passed across desktop, tablet, and mobile |
| Migration/seed regression | 7 migration tests passed, including preserved Lab 2 rows, collision-safe IDs, and non-fixture credentials |
| Repository hygiene | `git diff --check` passed; local env files and credentials remain ignored |

The detailed command history and acceptance-criterion traceability are recorded in [`tests.md`](tests.md). The contract decisions are recorded in [`specification.md`](specification.md), [`api-spec.md`](api-spec.md), and [`ui-spec.md`](ui-spec.md).

## Peer-review and release history

| Stage | Evidence |
|---|---|
| Contract | [PR #40](https://github.com/HolyThiccDaddy/toktickit/pull/40) approved and merged as `40ca398` |
| Authentication and migration | [PR #41](https://github.com/HolyThiccDaddy/toktickit/pull/41) merged as `b49c8b2` |
| Requester regression | [PR #42](https://github.com/HolyThiccDaddy/toktickit/pull/42) merged as `0ee0002` |
| Staff queue | [PR #43](https://github.com/HolyThiccDaddy/toktickit/pull/43) merged as `c1cd708` |
| Administrator implementation and release evidence | [PR #44](https://github.com/HolyThiccDaddy/toktickit/pull/44) approved after requested changes and merged as `bd5872a` |
| Documentation and review record | [PR #45](https://github.com/HolyThiccDaddy/toktickit/pull/45) approved and merged as `e82ac21` |
| Final integration | [PR #46](https://github.com/HolyThiccDaddy/toktickit/pull/46) approved and merged into `main` as `92fac36` |

## Responsive evidence

The real-run screenshots are stored under `artifacts/lab-03/screenshots/`:

- `authentication`: desktop, tablet, mobile
- `user-management`: desktop, tablet, mobile
- `staff-queue`: desktop, tablet, mobile
- `staff-ticket-detail`: desktop, tablet, mobile

## Lab 3 exclusions

Real external identity providers, password recovery email, multi-role accounts, staff assignment history, and administrative deletion are outside the approved Lab 3 scope. Deactivation is used instead of deletion so historical ownership and authored communication remain queryable.

## Submission checklist

- [x] Contract reviewed and approved by peer review.
- [x] Migration, API, UI, security, responsive, and E2E checks passed.
- [x] Reviewer and AI-use records updated from merged `main`.
- [x] Final release PR merged into `main`.
- [x] Final PDF generated from this report source.
