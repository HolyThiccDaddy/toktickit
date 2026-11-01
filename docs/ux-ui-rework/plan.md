# TokTickIT UX/UI rework plan

Tracking: https://github.com/HolyThiccDaddy/toktickit/issues/63

## Goal
Rework TokTickIT UX/UI into a calm, consistent Zen Green service desk that makes daily ticket work easier to scan and operate.

## Baseline and branch workflow
Start from main commit 96a34538efcb6675ac8129fd7e7b7c63e619e724 (merged Lab 4).
This is a post-Lab-4 enhancement: use one dedicated feature branch and a Draft PR targeting main. Preserve existing Lab 2/3/4 functionality and unrelated worktrees.

## Scope
- Shared responsive shell, role-aware navigation, consistent page headers and account controls.
- Design tokens for typography, spacing, color, borders, radii, focus, and reusable UI states.
- Requester/staff/admin dashboards with balanced metrics and clearer drill-downs.
- Ticket lists and queue: scan-friendly rows/cards, filters, sorting, pagination, and context preservation.
- Ticket Detail: clear content/operations hierarchy, Actions Taken, attachments, public conversation and internal notes.
- Auth, password-change, create-ticket and user-management forms.
- Mobile navigation, touch targets, long content, keyboard interaction and visible focus.

## Acceptance criteria

Checks below describe local implementation. Release/publishing criteria remain open until their real GitHub events occur.
- [ ] AC-01: Document screen inventory, role permissions, current flows and approved visual direction before implementation.
- [x] AC-02: All roles use a coherent shared shell with clear active navigation and account controls.
- [x] AC-03: Dashboards, lists and forms share consistent tokens and readable visual hierarchy.
- [x] AC-04: Ticket/Action workflows retain authorization, ownership, validation, confirmation, resolution gates, idempotency and stale-update handling.
- [x] AC-05: Public replies and internal notes are unmistakable before submission; requester views never expose staff-only data.
- [x] AC-06: Loading, empty, no-results, submitting, success, failure/retry, forbidden, not-found and conflict states are covered where applicable.
- [x] AC-07: Desktop >=992px, tablet 768–991px and mobile <768px have no clipped content, overlapping controls or page-level horizontal overflow.
- [x] AC-08: Keyboard operation, field labels/errors, live feedback, focus and reduced-motion behavior are verified.
- [x] AC-09: Relevant server/client/build/E2E regression checks pass with real SHA-bound evidence and screenshots.
- [ ] AC-10: Peer approval and teammate merge are required before completion.

## Delivery order
1. Screen/flow inventory and design contract.
2. Tokens, shared shell and navigation.
3. Dashboard, Ticket Queue and My Tickets.
4. Ticket Detail, Actions Taken and conversations.
5. Auth/forms/Admin polish.
6. Responsive/accessibility/regression verification and peer review.

## Workflow gates
Keep this Issue open while the PR is draft. Move the project card to Started before UI coding, and PR Review only when implementation and evidence are ready. Use Fixing for actionable review changes. Mark Done after formal peer approval and verified teammate merge.

## Initial status (historical planning commit)
Planning only. UI implementation and verification are pending; no completed redesign or passing new test results are claimed.

## Current architecture
React/TypeScript and Bootstrap with Zen Green CSS; view state is managed inside App.tsx. Express/Prisma/PostgreSQL enforce authentication, authorization and workflow rules. Navigation currently uses callbacks and local state; URL routing improvements require explicit tests and are not assumed to exist.

## Current role entry points
Requester starts on Home and can navigate to Dashboard, My Tickets, Create Ticket and owned Ticket Detail. IT Staff starts on Queue and can open Dashboard, My Actions and Ticket Detail. Administrator starts on User Management and also has the staff surfaces. All roles pass session restore and the first-login password-change gate.

## Proposed direction for review
Use a quiet neutral canvas with Zen Green primary actions, consistent type/spacing and restrained borders. Explore a shared desktop sidebar and mobile drawer; reduce repeated headers, excessive stacked cards and ambiguous primary actions. Preserve all existing business rules. Route/default-page changes are proposals until implemented and verified.

## Validation status (historical planning commit)
This commit adds planning documentation only. No application code changed; no runtime tests were run for this documentation-only commit. UI implementation, visual verification and regression evidence remain pending.

## Local implementation status — 1 November 2026

The initial plan and role-flow outline above existed at `1cfa768860691c93e8349dff5e217f103cf992ce` before UI implementation. The expanded [screen inventory](inventory.md) was maintained during the current conformance pass; it is not backdated as a pre-implementation artifact.

AC-02 through AC-08 are implemented locally: all roles share the shell, exact Zen Green tokens and inherited entry views remain, toolbar searches preserve owned/staff filters, original backend permissions/workflow rules are unchanged, modal/mobile focus is protected, and transitions respect reduced motion. Existing regression assertions are retained. The [verification record](verification.md) gives exact commands, results, artifact provenance and remaining limits.

AC-09 is bound to implementation `3eb6535f4658ad96ba2fabdc1620331e00302b3f`; normalized committed application/test blobs match the tested content and screenshots. The PR page remains authoritative for the current head after documentation follow-ups. AC-10 remains pending peer approval and teammate merge. Issue #63 stays open until then. On 1 November 2026 the student authorized delivery through the waiting-for-review stage, superseding the earlier no-push instruction; no approval, merge or Project Done state is inferred.
