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
- [ ] AC-01: Document screen inventory, role permissions, current flows and approved visual direction before implementation.
- [ ] AC-02: All roles use a coherent shared shell with clear active navigation and account controls.
- [ ] AC-03: Dashboards, lists and forms share consistent tokens and readable visual hierarchy.
- [ ] AC-04: Ticket/Action workflows retain authorization, ownership, validation, confirmation, resolution gates, idempotency and stale-update handling.
- [ ] AC-05: Public replies and internal notes are unmistakable before submission; requester views never expose staff-only data.
- [ ] AC-06: Loading, empty, no-results, submitting, success, failure/retry, forbidden, not-found and conflict states are covered where applicable.
- [ ] AC-07: Desktop >=992px, tablet 768–991px and mobile <768px have no clipped content, overlapping controls or page-level horizontal overflow.
- [ ] AC-08: Keyboard operation, field labels/errors, live feedback, focus and reduced-motion behavior are verified.
- [ ] AC-09: Relevant server/client/build/E2E regression checks pass with real SHA-bound evidence and screenshots.
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

## Initial status
Planning only. UI implementation and verification are pending; no completed redesign or passing new test results are claimed.

## Current architecture
React/TypeScript and Bootstrap with Zen Green CSS; view state is managed inside App.tsx. Express/Prisma/PostgreSQL enforce authentication, authorization and workflow rules. Navigation currently uses callbacks and local state; URL routing improvements require explicit tests and are not assumed to exist.

## Current role entry points
Requester starts on Home and can navigate to Dashboard, My Tickets, Create Ticket and owned Ticket Detail. IT Staff starts on Queue and can open Dashboard, My Actions and Ticket Detail. Administrator starts on User Management and also has the staff surfaces. All roles pass session restore and the first-login password-change gate.

## Proposed direction for review
Use a quiet neutral canvas with Zen Green primary actions, consistent type/spacing and restrained borders. Explore a shared desktop sidebar and mobile drawer; reduce repeated headers, excessive stacked cards and ambiguous primary actions. Preserve all existing business rules. Route/default-page changes are proposals until implemented and verified.

## Validation status
This commit adds planning documentation only. No application code changed; no runtime tests were run for this documentation-only commit. UI implementation, visual verification and regression evidence remain pending.
