# LAB 4: TokTickIT Service Desk Workflow and Dashboards

**Student:** Thira Rungruangkaset (67070503419)<br>
**GitHub:** HolyThiccDaddy<br>
**Peer reviewer:** Ashira Sansoda (67070503445)<br>
**Edition:** Evidence edition — 1 November 2026

> **Readiness:** Lab 4 Issues #51–#56 / PRs #57–#62, UX/UI Issue #63 / PR #64, and responsive follow-up Issue #65 / PR #66 are closed and merged. The latest merge, `a76ee09dc558aa2efcd6f4ef3f3bd759ba3bed7e`, is the current `main` tip. Server tests/build were freshly rerun at source commit `ca82049e16816729c8883c98c105659625696464`; PR #66 changed no server files. Client and Playwright results cover the responsive follow-up. GitHub returned no status checks or workflow runs. Project board status and student reflection still need the student's confirmation; no guaranteed grade is claimed.

## Answer Part 1 — Git Use with Engineering Workflow (10 Points)

The five feature PRs (#57–#61) were reviewed and merged to `lab4-staging`; PR #62 was approved and merged into `main` at `96a34538efcb6675ac8129fd7e7b7c63e619e724` by Ashira Sansoda (`osizk`). The associated Issues #51–#56 are closed. [Repository](https://github.com/HolyThiccDaddy/toktickit) · [Project board](https://github.com/users/HolyThiccDaddy/projects/1) · [PR #62](https://github.com/HolyThiccDaddy/toktickit/pull/62).

PR #64 was approved and merged by @osizk at `e22a50e3a93250567e9722e3ce4c4c6402458c81` from `codex/63-ux-ui-rework` (head `ca82049e16816729c8883c98c105659625696464`). The tablet-overlap follow-up Issue #65 / PR #66 used `codex/65-tablet-ticket-operations` → `main`, head `097cdca6ba6e47b64ae053c034604a069bedb440`, and merge `a76ee09dc558aa2efcd6f4ef3f3bd759ba3bed7e`; it was formally approved and merged. The reviewer record renders peer findings, author re-review responses, formal approvals, and merge acknowledgments for PRs #57–#62, #64, and #66. The Project board card status remains unverified because the connected account could not read it. README and .gitignore repository evidence is rendered in this report and linked.

## Answer Part 2 — Specification Driven Development (Spec DD) (5 Points)

The scope, exclusions, FR-01–FR-20, Action business rules, eight Ticket statuses, authorization, resolution gate, dashboard metrics, and DoD are in [specification.md](https://github.com/HolyThiccDaddy/toktickit/blob/main/docs/lab-04/specification.md). API filters and role boundaries are in [api-spec.md](https://github.com/HolyThiccDaddy/toktickit/blob/main/docs/lab-04/api-spec.md); screen states, shared tokens and breakpoints are in [ui-spec.md](https://github.com/HolyThiccDaddy/toktickit/blob/main/docs/lab-04/ui-spec.md). Initial spec/Test DD commit `8b8577781957d6079fcfbed421a77e2a5f6345c9` predates implementation PR #58, opened 30 Oct 2026 at 20:59 UTC; the reviewed contract was merged before implementation began.

## Answer Part 3 — Test Driven Development and Traceability (Test DD) (10 Points)

The complete AC-to-test mapping and named test files are in [tests.md](https://github.com/HolyThiccDaddy/toktickit/blob/main/docs/lab-04/tests.md). Server: 44 files / 136 passed / 0 failed, with the TypeScript build passing, freshly run at source commit `ca82049e16816729c8883c98c105659625696464`. PR #66 changed no server files, so this server source is unchanged at the final main SHA. PR #66's [verification record](https://github.com/HolyThiccDaddy/toktickit/pull/66) reports Client 46 files / 73 passed, the production client build passed, and Playwright 36 passed / 0 failed / 0 skipped across desktop/tablet/mobile, including the 768/991/992px overlap regression. Raw outputs: `final-server-results.json`, `final-server-run.json`, `responsive-fix-client-results.json`, and `responsive-fix-e2e-results.json`. GitHub returned zero checks for final main `a76ee09dc558aa2efcd6f4ef3f3bd759ba3bed7e`, so no CI pass is claimed.

## Answer Part 4 — AI Use with Reflection (5 Points)

Ten selected prompt summaries, model identification, verification sources and a reflection that distinguishes the student's requirements/review decisions from Codex-assisted implementation and verification are recorded in [ai-use.md](https://github.com/HolyThiccDaddy/toktickit/blob/main/docs/lab-04/ai-use.md). The student should confirm that the personal account is accurate before final submission.

## Answer Part 5 — Working IT Staff Dashboard UI (5 Points)

Requester/staff/admin dashboards use server-calculated role-scoped metrics and matching drill-down predicates. A report-time authenticated Staff dashboard check compared three API metrics against independent Prisma counts; all three matched. Fresh release evidence captures all three role dashboards and My Actions at desktop/tablet/mobile widths.

## Answer Part 6 — Working Actions Taken UI (10 Points)

Real browser captures show validation, assigned follow-up creation, reassignment/edit, immutable history, multiple completed/cancelled Actions, inactive-assignee rejection without mutation, and requester read-only history. Evidence: `artifacts/lab-04/screenshots/report/` and `artifacts/lab-04/verification/report/`.

## Answer Part 7 — Ticket Workflow and Resolution Gate (5 Points)

A real API-backed browser run shows outstanding follow-up blocking resolution, follow-up resolution, Ticket RESOLVED, and REOPENED states. The full gate message and run metadata are in `artifacts/lab-04/verification/report/browser-flow.json`.

## Answer Part 8 — Requester Dashboard and Lab 1–3 Regression (5 Points)

Requester Dashboard, My Tickets, Ticket attachments, public comments, internal notes, Administrator user management, and seven authentication states are shown. Inherited Lab 3 Staff Queue, Ticket Detail and User Management are shown at desktop/tablet/mobile. The 991 × 1200 tablet User Management capture keeps all columns visible. Existing Lab 1–3 regression categories remain mapped in `tests.md`.

## Answer Part 9 — Final Release Summary and Readiness (5 Points)

The UI specification, palette, type scale, responsive/accessibility checklist, and 15 desktop/tablet/mobile Lab 4 screen captures are rendered in Part 9. PR #66's tablet-overlap correction is approved and merged at `a76ee09dc558aa2efcd6f4ef3f3bd759ba3bed7e`; its client/full E2E results and the freshly rerun server tests/build are recorded with their source revisions. GitHub checks were absent and no CI pass is claimed. Confirm the Project board cards and personal reflection before submission. This report does not guarantee a 10/10 grade.
