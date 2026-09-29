# LAB 3 : TokTickIT Authenticated IT Ticketing System

Core Lab 3 implementation was merged to `main` at `92fac36`. The documentation and evidence follow-ups were merged through PR #47 and PR #48. The final report/PDF refresh was approved and merged through PR #49 at `b45a853`.

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

The documentation follow-ups are [PR #47](https://github.com/HolyThiccDaddy/toktickit/pull/47) and [PR #48](https://github.com/HolyThiccDaddy/toktickit/pull/48). The final report/PDF refresh was merged by [PR #49](https://github.com/HolyThiccDaddy/toktickit/pull/49) as `b45a853`, without changing the released application behavior.

## Answer Part 2: Spec DD (5 Points)

The approved contract is maintained in:

- [specification.md](specification.md): requirements, roles, business rules, data model, migration, and Definition of Done.
- [api-spec.md](api-spec.md): named request/response schemas, status codes, authorization, and compatibility.
- [ui-spec.md](ui-spec.md): screens, states, Zen Green tokens, accessibility, and responsive rules.

PR #40 records the contract approval before implementation. The contract covers authentication, first-login password change, role and ownership authorization, Lab 2 migration, staff queue/detail, comments and notes, Administrator safeguards, responsive UI, and acceptance-criterion tests.

### Contract completeness crosswalk

| Required contract element | Evidence in the approved source | Release check |
|---|---|---|
| Sprint goal, stakeholder request, and scope/exclusions | `specification.md` sections 1–3 | Scope is explicit before implementation |
| Numbered functional requirements and business/security rules | `specification.md` sections 4–5 (`FR-01`–`FR-16`, `BR-01`–`BR-14`) | Authentication, ownership, CSRF, status, migration, and safe-error rules are testable |
| UI specification summary | `specification.md` section 6 plus the detailed `ui-spec.md` | Shell, screens, states, roles, breakpoints, accessibility, and no-overflow rules are named |
| Authorization matrix | `specification.md` section 7 | Requester, IT Staff, and Administrator capabilities are explicit; Administrator Ticket access is an intentional grant |
| Data/migration decisions | `specification.md` section 8 and section 8.1 | Existing Lab 2 identifiers/relationships and deterministic credential backfill are preserved |
| API contract | `specification.md` section 9 plus the detailed `api-spec.md` | Envelopes, schemas, status codes, CSRF/session boundary, authorization, and safe errors are named |
| Acceptance criteria and Definition of Done | `specification.md` sections 10–11 | `AC-01`–`AC-15` map to executable checks in `tests.md` |
| Review assumptions | `specification.md` section 12 | Session, crypto, role, migration-password, and report assumptions are recorded |

This explicit crosswalk closes the common DD gap where a project links separate API/UI documents but does not show that the master specification itself contains the UI and API contract summaries.

## Answer Part 3: Test DD and Traceability (10 Points)

Verification provenance is separated below: the executable gates were rerun from merged `main @ 69ed72e` on 29 September 2026 before the documentation-only report/PDF merge. The final report/PDF refresh is now merged by PR #49 as `b45a853`; the earlier implementation release remains identified as `92fac36` for historical release context.

| Check | Result |
|---|---|
| Server regression on final merged main | 16 test files / 92 tests passed at `69ed72e`; `artifacts/lab-03/verification/server-test.txt` |
| Client regression on final merged main | 15 test files / 50 tests passed at `69ed72e`; `artifacts/lab-03/verification/client-test.txt` |
| Server and client builds | Both passed on the same checkout; `artifacts/lab-03/verification/server-build.txt` and `client-build.txt` |
| Playwright E2E | 13 passed, 0 failed/skipped/flaky across desktop, tablet, and mobile; `artifacts/lab-03/verification/playwright-e2e.txt` and `artifacts/lab-02/e2e-results.json` |
| Migration and seed | 5 migrations found, none pending; after a documented manual `.env.test` preflight, `npm run prisma:seed` completed twice against `toktickit_test`; `artifacts/lab-03/verification/migration-seed-final.txt` |
| Repository hygiene | `git diff --check` passed for the local changes; local credentials remain ignored |

The full acceptance-criterion traceability matrix and exact test paths are in [tests.md](tests.md). It maps AC-01 to AC-15 to API, unit, UI, security, migration, responsive, and E2E evidence.

Seed safety note: `npm run prisma:seed` is `tsx prisma/seed.ts` and does not guard its own `DATABASE_URL`; Vitest's `_test` check does not run for this command. Before the recorded migration/seed run, the PowerShell session loaded `DATABASE_URL` from `server/.env.test`, checked that the value used the PostgreSQL protocol and contained the `_test` database marker, set `$env:DATABASE_URL` explicitly, and then ran `npx prisma migrate deploy`. Prisma printed the selected database as `toktickit_test` before the two seed runs. The transcript line `Environment variables loaded from .env` is Prisma's dotenv message and is not evidence that the production `.env` was selected. To reproduce safely, parse the URL and require the database name itself to end in `_test` before setting `$env:DATABASE_URL`; never run the seed command against an unchecked `.env`.

The executed source layout is also explicit: server coverage is in `auth.api.test.ts`, `authorization.api.test.ts`, `comments-notes.api.test.ts`, `migration-regression.api.test.ts`, `staff-queue.api.test.ts`, `staff-ticket-detail.api.test.ts`, and `users-admin.api.test.ts`; client coverage is in the Lab 3 Login, ChangePassword, RequesterTicketDetail, StaffTicketQueue, StaffTicketDetail, UserManagement, and shared responsive suites; E2E coverage is in `authentication.spec.ts`, `requester-regression.spec.ts`, `staff-ticket-flow.spec.ts`, `user-administration.spec.ts`, and `responsive.visual.spec.ts`. The report does not count a screenshot as a test: each claim is tied to an executable path or a named terminal run.

## Answer Part 4: AI Use with Reflection (5 Points)

The LLM used was OpenAI Codex (GPT-5). The selected prompts covered contract extraction, implementation, regression tests, responsive UI, peer-review fixes, and final release auditing. The complete eight-prompt record is in [ai-use.md](ai-use.md).

### My Reflection

Codex was most useful for turning the handout into a traceable contract, finding mismatches between requirements and tests, and generating focused regression cases. Human decisions and peer review remained authoritative: authorization, migration safety, password handling, and status transitions were accepted only after executable tests and real evidence passed. Suggestions that weakened server-side checks, exposed credentials, relied on hidden UI controls, or added excluded features were changed or rejected. The final release evidence was rerun from merged `main @ 69ed72e` before this report was finalized.

## Answer Part 5: Working Login and Password Change UI (5 Points)

The authenticated session boundary replaces the Lab 2 Development Requester selector. The UI covers valid and invalid login, inactive-account handling, first-login password change, role-aware navigation, logout, and direct-access protection after logout.

The original desktop/tablet/mobile login images prove responsive layout only. The following real Playwright captures from the local Lab 3 application show the actual authentication states used for Part 5:

| UI evidence | What the image shows |
|---|---|
| `artifacts/lab-03/screenshots/authentication/states/01_invalid_login.png` | Invalid credentials receive a safe error and retry action. |
| `artifacts/lab-03/screenshots/authentication/states/02_inactive_account.png` | A seeded inactive account is refused. |
| `artifacts/lab-03/screenshots/authentication/states/03_valid_login_filled.png` | An active Administrator account is entered with the password masked, before submitting. |
| `artifacts/lab-03/screenshots/authentication/states/04_first_login_gate.png` | Valid initial credentials lead to the mandatory password-change screen instead of the protected workspace. |
| `artifacts/lab-03/screenshots/authentication/states/05_password_change_form.png` | Current, new, and confirmation fields are completed; passwords remain masked. |
| `artifacts/lab-03/screenshots/authentication/states/06_login_and_change_success.png` | After saving the new password, User Management opens with the authenticated name, ADMIN role, role-aware navigation, and Sign out. |
| `artifacts/lab-03/screenshots/authentication/states/07_after_logout_protected.png` | After Sign out and direct navigation back to `/`, the protected workspace remains unavailable and the Sign in screen appears. |

The desktop/tablet/mobile images remain in `artifacts/lab-03/screenshots/authentication/` for Part 9 responsive evidence. The seven state captures above come from one passing E2E journey in `e2e/lab-03/authentication.spec.ts`. Busy, validation, safe API-failure, session, and direct API-authorization behavior are supported by the executable tests below; a still image alone does not prove those transitions.

Supporting tests include server/tests/lab-03/auth.api.test.ts, server/tests/lab-03/authorization.api.test.ts, client/tests/lab-03/Login.test.tsx, client/tests/lab-03/ChangePassword.test.tsx, and e2e/lab-03/authentication.spec.ts.

| Required state/behavior | Executable evidence |
|---|---|
| Valid login, role-aware shell, logout, and session lookup | `auth.api.test.ts`, `Login.test.tsx`, `authentication.spec.ts` |
| Generic invalid-credential and verified inactive-account errors | `auth.api.test.ts`, `Login.test.tsx` |
| First-login gate, direct protected-route blocking, and password policy | `auth.api.test.ts`, `authorization.api.test.ts`, `ChangePassword.test.tsx`, `authentication.spec.ts` |
| Loading, validation, retry, inactive/deauthenticated redirect, and responsive layout | `Login.test.tsx`, `ChangePassword.test.tsx`, `ResponsiveLayout.test.tsx`, responsive E2E evidence |

## Answer Part 6: Working IT Staff Ticket Queue UI (5 Points)

IT Staff and Administrators share a searchable queue with status, IT Priority, assignee, category, sorting, pagination, realistic empty/no-results states, retryable failure feedback, and a responsive card layout.

Part 6 provides a rubric-to-figure index and seven local UI captures. Figures 6.1–6.3 show real records in the dedicated test database. Figures 6.5–6.6 show two pages of 21 additional Tickets created through the authenticated Requester API in the same E2E run; Figure 6.7 shows a real assigned row beside an unassigned row. Figure 6.4 is a screenshot of the real UI reacting to a **simulated 503 API response intercepted by Playwright**; it is labeled as such and must not be presented as an organic outage. After removing the interception, Retry returns to the real API successfully.

| Figure | Local screenshot | What is directly visible |
|---|---|---|
| 6.1 | `artifacts/lab-03/screenshots/staff-flow/states/01_queue_loaded.png` | Shared queue, populated row, role, result count, and pagination controls. |
| 6.2 | `artifacts/lab-03/screenshots/staff-flow/states/02_queue_filter_sort.png` | NEW and HIGH filters with Ticket Number sorting. |
| 6.3 | `artifacts/lab-03/screenshots/staff-flow/states/03_queue_no_results.png` | Genuine unmatched query, no-results message, and Clear filters. |
| 6.4 | `artifacts/lab-03/screenshots/staff-flow/states/04_queue_retry_simulated_api_failure.png` | Safe retry UI under the explicitly simulated 503. |
| 6.5–6.6 | `05_queue_page_1_of_2.png`, `06_queue_page_2_of_2.png` in the same states folder | Real 21-record filtered result, page 1 and page 2 navigation. |
| 6.7 | `07_queue_assigned_unassigned.png` | Casey Staff assignment and another unassigned Ticket in the shared list. |

The desktop/tablet/mobile captures are embedded in Part 9 from `artifacts/lab-03/screenshots/staff-queue/`. Mobile sorting remains accessible on cards. The screenshot pair proves this 21-record pagination journey; other filter combinations are covered by named executable tests.

| Queue requirement | Evidence |
|---|---|
| Search, status/IT-priority/assignee/category filters, sorting, page size, pagination, and result count | `staff-queue.api.test.ts`, `StaffTicketQueue.test.tsx`, `staff-ticket-flow.spec.ts` |
| Loading, empty/no-results, validation, and retryable failure | `StaffTicketQueue.test.tsx` and the queue E2E flow |
| Desktop/tablet table and mobile card reflow with sorting still visible | `ResponsiveLayout.test.tsx`, `responsive.visual.spec.ts`, terminal responsive checklist |

## Answer Part 7: Working IT Staff Ticket Detail UI (10 Points)

Staff Ticket Detail supports claim/reassign, IT Priority, permitted status transitions and confirmations, attachment continuity, Public Comments, Internal Notes, Requester resolution indication, role restrictions, validation, and safe failure behavior.

Part 7 links the rubric to eight figures from real local workflows. The Requester created the ticket with an attachment, then IT Staff opened it, claimed it, reassigned it to another active Staff user, raised IT Priority, moved through valid statuses, saw confirmation enforcement before RESOLVED, and added separate public and internal communication. Figure 7.3 shows the rejected unconfirmed transition; Figure 7.4 shows the subsequently confirmed RESOLVED state. These are sequential states, not independent mock-ups. Figure 7.8 shows the separate Requester role-denial check.

| Figure | Local screenshot | What is directly visible |
|---|---|---|
| 7.1 | `artifacts/lab-03/screenshots/staff-flow/states/10_attachment_continuity.png` | Original Requester attachment and Download in Staff detail. |
| 7.2 | `artifacts/lab-03/screenshots/staff-flow/states/11_claimed_operation.png` | Populated assignee and disabled Claim for me after success. |
| 7.3 | `artifacts/lab-03/screenshots/staff-flow/states/07_detail_confirmation_required.png` | Safe error when RESOLVED is requested without explicit confirmation. |
| 7.4 | `artifacts/lab-03/screenshots/staff-flow/states/08_detail_resolved.png` | Confirmed RESOLVED status and URGENT IT Priority. |
| 7.5 | `artifacts/lab-03/screenshots/staff-flow/states/14_public_comment.png` | Persisted public comment with author and timestamp. |
| 7.6 | `artifacts/lab-03/screenshots/staff-flow/states/15_internal_note.png` | Separate Staff-only internal note with author and timestamp. |
| 7.7 | `artifacts/lab-03/screenshots/staff-flow/states/16_reassigned_operation.png` | Assignee ID changed to Casey Staff; the named owner is confirmed by Figure 6.7 and an API assertion in the same E2E run. |
| 7.8 | `artifacts/lab-03/screenshots/staff-flow/states/19_requester_staff_403_response.png` | Browser displays the real 403 JSON after a signed-in Requester directly opens the Staff queue API; Playwright checks the HTTP status. |

Full-screen desktop/tablet/mobile views are embedded in Part 9 from `artifacts/lab-03/screenshots/staff-ticket-detail/`. The complete transition matrix, Requester-visible resolution, and role/ownership protections are supported by tests below, not inferred from still images alone.

Supporting tests include `staff-queue.api.test.ts` (queue queries, claim, and reassignment), `staff-ticket-detail.api.test.ts` (staff-detail, IT Priority, complete BR-08 status matrix, and communication visibility), `StaffTicketDetail.test.tsx`, `comments-notes.api.test.ts`, `authorization.api.test.ts`, and `staff-ticket-flow.spec.ts`.

| Detail requirement | Evidence |
|---|---|
| Claim/reassign only to an active eligible owner | API claim-race and assignment cases; `StaffTicketDetail.test.tsx` |
| IT Priority and valid/invalid/confirmed status transitions | API parameterized BR-08 cases; detail component controls; staff E2E |
| Public comments vs internal notes, attachments, and requester-resolution indication | `comments-notes.api.test.ts`, `RequesterTicketDetail.test.tsx`, `StaffTicketDetail.test.tsx` |
| Forbidden role/ownership, validation, loading, and safe failure | authorization/API cases plus component retry/validation assertions |

## Answer Part 8: Working Administrator User Management UI (5 Points)

The Administrator-only screen lists users, supports name/email search and role filtering, creates and edits one-role accounts, changes activation state, sets an initial password, and enforces duplicate-email and last-Administrator protections.

Part 8 contains a rubric-to-figure index and thirteen local browser figures: loaded list, search/filter, create, name/email/role edit, deactivation, password reset, safe self/duplicate rejection, the mandatory change-password gate on the next login, native invalid-input blocking, and direct Administrator API denial for IT Staff. The Administrator UI states come from one passing E2E flow against the dedicated test database; the denial is checked in the Staff E2E flow. The responsive desktop/tablet/mobile views are embedded in Part 9.

| Figure | Local screenshot | What is directly visible |
|---|---|---|
| 8.1–8.3 | `artifacts/lab-03/screenshots/user-management/states/01_user_list.png`, `02_user_search.png`, `03_user_role_filter.png` | List, email search, and role filter. |
| 8.4–8.5 | `05_create_filled.png`, `06_created_success.png` in the same states folder | Filled create form and first-login password-change flag after creation. |
| 8.6–8.8 | `07_edit_form.png`, `09_deactivated.png`, `11_reset_success.png` | Email/name/role edit, inactive state, and safe reset confirmation. |
| 8.9–8.10 | `12_self_deactivation_rejected.png`, `13_duplicate_email_rejected.png` | Backend safeguards surfaced as safe UI errors. |
| 8.11 | `14_reset_requires_change_on_next_login.png` | Reset credentials reach the password-change gate instead of the protected workspace. |
| 8.12 | `04_invalid_input_blocked.png` | Browser validation prevents malformed email and a short password from submitting. |
| 8.13 | `artifacts/lab-03/screenshots/staff-flow/states/20_staff_admin_403_response.png` | Browser displays the real 403 JSON after signed-in IT Staff directly opens the Administrator API; Playwright checks the HTTP status. |

Other captured intermediate states (`04_create_form.png`, `08_updated_success.png`, `10_reset_form.png`) remain available alongside the embedded figures. The last-active-Administrator race is established by API tests; Figure 8.13 also shows a real browser response for non-admin denial.

Supporting tests include `users-admin.api.test.ts`, `UserManagement.test.tsx`, `authorization.api.test.ts`, and `user-administration.spec.ts`. The evidence covers list/search/filter, create/edit, activation/deactivation, initial-password reset, duplicate email, invalid role, inactive login, self-safety, and concurrent last-active-Administrator protection.

## Answer Part 9: Zen Green UI and Responsive Evidence (5 Points)

The released screens reuse the Zen Green tokens and shared controls established in Lab 2. Part 9 embeds all twelve original desktop/tablet/mobile Playwright screenshots for Authentication, User Management, Staff Queue, and Staff Ticket Detail. Long mobile captures also have magnified, clearly labeled views of the same unaltered screenshot. Visual inspection of these twelve captured states found no clipped text or overlapping buttons; the E2E run separately asserts that the document width never exceeds the viewport on each screen.

The completed visual checklist covers:

- Zen Green colors, typography, field styling, and button hierarchy.
- Loading, empty/no-results, validation, failure/retry, and submitting states.
- Focus order, labels, safe errors, readable badges, and editable/read-only boundaries.
- No clipping, overlap, horizontal overflow, or hidden mobile queue sorting controls.

### Zen Green and responsive acceptance record

| Token/rule | Approved value or rule |
|---|---|
| Primary / secondary / pale green | `#006B3C` / `#0B7A46` / `#EAF6EF` |
| Page / surface / primary text | `#F5F7F6` / `#FFFFFF` / `#1B2F24` |
| Secondary text / border / read-only | `#52665A` / `#D1DDD6` / `#EEF3F0` |
| Error / warning / urgent / low priority | `#C53030` / `#D69E2E` / `#E53E3E` / `#319795` |
| Breakpoints | Desktop `>=992px`; tablet `768-991px`; mobile `<768px` |
| Responsive rule | Reflow without clipping/overlap; tables stack or scroll inside the component only when necessary; no page-level horizontal overflow |
| Accessibility rule | Labels and keyboard operation for every control, associated/live-region errors, visible focus after mutations/dialogs, readable contrast and safe feedback |

The PDF includes the complete, typeset `ui-spec.md` and an explicit eight-row visual/accessibility checklist before Figures 9.1–9.12. The approved token/rule table above and those figures provide the design and responsive record. Client regression and all 13 Playwright tests passed in the final merged-main verification run; screenshots are not treated as substitutes for test assertions.

Lab 3 exclusions remain external identity providers, password-recovery email, multi-role accounts, staff assignment history, and administrative deletion. Deactivation is used instead of deletion so historical ownership and authored communication remain queryable.

The rendered PDF follows the required Answer Part 1 through Answer Part 9 order. The primary deliverable is `output/pdf/LAB_03_FINAL_SUBMISSION_REPORT.pdf`. Its main report preserves the Lab 2 submission layout; the vector-text appendix contains selected workflow and verification evidence without repeating the UI figures. All UI figures are local Playwright captures of the running app, except that Figure 6.4 deliberately simulates an API 503 response to exercise the real failure/retry UI. The `_10-10` filename is a historical alternate artifact and is not the canonical deliverable.

## Grading crosswalk: evidence index

| Part | Evidence to inspect |
|---|---|
| 1 | Real project board, main history, contract/release PR review, reviewer record, README, `.gitignore`, and repository tree |
| 2 | Contract-before-code PR plus explicit master-spec UI Summary/API Contract, numbered FR/BR/AC, matrix, migration, DoD, and assumptions |
| 3 | AC traceability, exact test paths, 92 server / 50 client results, build results, 13 E2E results, and migration/seed output |
| 4 | Eight prompt summaries, accepted/rejected decisions, named Codex model, and human-authority reflection |
| 5 | Real authentication screenshots plus API/UI/E2E coverage for valid, invalid, inactive, first-login, logout, and responsive states |
| 6 | Real queue screenshots plus query, state, mobile sorting, responsive, and retry evidence |
| 7 | Real detail screenshots plus assignment, priority/status matrix, comments/notes, attachment, ownership, and failure evidence |
| 8 | Real Administrator screenshots plus list/filter/mutation/safety API, UI, and E2E evidence |
| 9 | Exact Zen Green values, linked UI specification, twelve embedded responsive captures, and E2E no-page-overflow assertions |

## Evidence Appendix: GitHub workflow and repository evidence

The source capture inventory is retained below. The PDF embeds selected workflow images only; the unreadably long screenshots of `specification.md` and `tests.md` are replaced in the appendix by clearly labeled, readable typeset extracts from those exact files. The complete GitHub documents remain linked in Answers Parts 1-4.

1. Project board with the completed Lab 1-3 issues: `artifacts/lab-03/screenshots/report/01_kanban_done.png`.
2. Main-branch commit history showing the reviewed Lab 3 contract, implementation, and release merges: `artifacts/lab-03/screenshots/report/02_main_commit_history.png`.
3. PR #40 contract discussion, requested changes, responses, approval, and merge: `artifacts/lab-03/screenshots/report/03_pr40_contract_review.png`.
4. PR #46 final release approval and merge into `main`: `artifacts/lab-03/screenshots/report/04_pr46_release_merge.png`.
5. Rendered `reviewer.md` with review rounds, responses, approvals, and merge records: `artifacts/lab-03/screenshots/report/05_reviewer_record.png`.
6. Rendered README with prerequisites, setup, verification commands, API surface, and Lab 3 document links: `artifacts/lab-03/screenshots/report/06_readme.png`.
7. Repository `.gitignore` evidence for dependencies, secrets, build output, uploads, Playwright output, and logs: `artifacts/lab-03/screenshots/report/07_gitignore.png`.
8. Main repository tree and rendered README overview: `artifacts/lab-03/screenshots/report/08_repository_tree_readme.png`.
9. Rendered Lab 3 engineering specification with requirements, rules, authorization, data model, acceptance criteria, and DoD: `artifacts/lab-03/screenshots/report/09_specification.png`.
10. Rendered API contract with conventions, named schemas, status codes, and endpoint definitions: `artifacts/lab-03/screenshots/report/10_api_specification.png`.
11. Rendered UI specification with navigation, screen states, responsive rules, and accessibility acceptance: `artifacts/lab-03/screenshots/report/11_ui_specification.png`.
12. PR #40 changed-files view showing the contract artifacts added for review: `artifacts/lab-03/screenshots/report/12_pr40_files_changed.png`.
13. PR #40 commit history showing the contract review sequence: `artifacts/lab-03/screenshots/report/13_pr40_commits.png`.
14. Rendered tests.md with traceability, planned suites, release checklist, and executed results: `artifacts/lab-03/screenshots/report/14_tests_plan_results.png`.
15. Main-branch server Lab 3 test tree: `artifacts/lab-03/screenshots/report/15_server_lab3_test_tree.png`.
16. Main-branch client Lab 3 test tree: `artifacts/lab-03/screenshots/report/16_client_lab3_test_tree.png`.
17. Main-branch Playwright Lab 3 test tree: `artifacts/lab-03/screenshots/report/17_e2e_lab3_test_tree.png`.
18. Rendered ai-use.md with eight prompts and My Reflection: `artifacts/lab-03/screenshots/report/18_ai_use.png`.

## Evidence Appendix: Local terminal verification

These original PowerShell captures are retained under `artifacts/`. The PDF presents the final-main test/build/migration results as selectable text with paths to the complete verification logs, instead of shrinking older terminal frames 24-27 and 29-30 to unreadable size. Source token and checklist values are also selectable text in Part 9. The UI state and responsive captures used in Parts 5-9 were regenerated from the clean merged `main @ 69ed72e` checkout; the terminal captures retain their displayed local paths, while the verification logs and E2E result below are the final-main rerun.

19. Release-candidate checkout and branch/commit context used for the terminal capture: `artifacts/lab-03/screenshots/report/19_terminal_branch_status.png`.
20. Zen Green color tokens from the Lab 2 UI specification: `artifacts/lab-03/screenshots/report/20_terminal_zen_green_tokens.png`.
21. Lab 2 visual checklist: `artifacts/lab-03/screenshots/report/21_terminal_visual_checklist.png`.
22. Lab 3 responsive rules: `artifacts/lab-03/screenshots/report/22_terminal_responsive_rules.png`.
23. Lab 3 accessibility and responsive acceptance: `artifacts/lab-03/screenshots/report/23_terminal_accessibility.png`.
24. Server `npm test` result: `artifacts/lab-03/screenshots/report/24_terminal_server_tests.png`.
25. Client `npm test` result: `artifacts/lab-03/screenshots/report/25_terminal_client_tests.png`.
26. Server `npm run build` result: `artifacts/lab-03/screenshots/report/26_terminal_server_build.png`.
27. Client `npm run build` result: `artifacts/lab-03/screenshots/report/27_terminal_client_build.png`.
28. Installed Playwright browsers and runtime: `artifacts/lab-03/screenshots/report/28_terminal_playwright_install.png`.
29. Playwright E2E result with all 13 tests passing across desktop, tablet, and mobile: `artifacts/lab-03/screenshots/report/29_terminal_playwright_e2e.png`.
30. Test-database migration and two idempotent seed runs: `artifacts/lab-03/screenshots/report/30_terminal_migration_seed.png`.

## Evidence Appendix: final-checkout UI state captures

These original supplemental screenshots remain as source files. The PDF embeds only item 33, the distinct Requester-resolution state; the other states are already represented by clearer figures in Parts 5-8 and are not repeated in the appendix.

31. Invalid login with safe error and retry: `artifacts/lab-03/screenshots/evidence-extra/01_login_invalid.png`.
32. First-login mandatory password-change gate: `artifacts/lab-03/screenshots/evidence-extra/02_change_password_gate.png`.
33. Requester public comment and Problem appears resolved indication: `artifacts/lab-03/screenshots/evidence-extra/03_requester_resolution.png`.
34. Staff queue filtered no-results state: `artifacts/lab-03/screenshots/evidence-extra/04_staff_queue_no_results.png`.
35. Staff detail terminal transition requiring confirmation: `artifacts/lab-03/screenshots/evidence-extra/05_staff_detail_confirmation.png`.
36. Administrator create-user form and account list: `artifacts/lab-03/screenshots/evidence-extra/06_admin_create_form.png`.
37. Administrator duplicate-email safe error: `artifacts/lab-03/screenshots/evidence-extra/07_admin_duplicate_email.png`.
