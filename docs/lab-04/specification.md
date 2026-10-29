# Lab 4 Sprint Engineering Specification

Status: Draft contract for Issue #51. This document is written before the Lab 4 implementation PRs and is the source of truth for the approved increment. The baseline is `lab4-staging` at the Lab 3 release merge.

## 1. Sprint goal

Extend TokTickIT from ticket communication into a traceable service-desk workflow. IT Staff and Administrators can record multiple Actions Taken per Ticket, the backend enforces the complete Ticket lifecycle and resolution gate, and each authenticated role receives a concise dashboard without weakening Lab 1–3 behavior.

## 2. Stakeholder request

The service desk needs a reliable work log under every Ticket. Each action records when work happened, what was done, its result, who performed it, follow-up needs, and attachment guidance. A primary Ticket Owner coordinates the Ticket, but another authorized staff member may perform an action. Requesters need useful summaries of their own work; staff need operational queues and drill-downs; Administrators retain the staff workflow and support access.

## 3. Scope

### Included

- A one-Ticket-to-many-Actions Taken model with append-only history and authorized edits.
- Action fields: action date/time, description, result, state, optional assignee, authenticated performer, completion/cancellation audit fields, follow-up required, conditional follow-up note/resolution timestamp, and attachment notes.
- IT Staff and Administrator Action Taken create/update/read operations; Requester read-only access for owned Tickets.
- The complete status set: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, and `CANCELLED`.
- Backend-enforced transition permissions, terminal-state protection, stale-update handling, and the resolution evidence gate.
- Requester, IT Staff, and Administrator dashboard metrics backed by authoritative queries and linked detail views.
- PostgreSQL/Prisma migration, recovery documentation, idempotent seed data, focused tests, full regression, accessible responsive UI, and final release evidence.

### Explicitly excluded

- SLA clocks, escalation engines, on-call scheduling, breach alerts, or external notifications.
- Inventory, purchasing, spare-parts, cost accounting, time-sheet billing, payroll, or labor-cost calculations.
- Multi-level approvals, electronic signatures, advanced BI/report builders, export warehouses, multi-tenant production operations, or unapproved product features.

## 4. Functional requirements

- FR-01 Every Action Taken belongs to exactly one Ticket and is displayed in chronological order.
- FR-02 An authorized IT Staff member or Administrator can create an Action Taken with all required fields; the performer is derived from the authenticated session.
- FR-02a Each Action Taken has a state (`OPEN`, `IN_PROGRESS`, `COMPLETED`, or `CANCELLED`), an optional assignee, and immutable completion/cancellation audit fields (`completedAt`, `completedBy`, `cancelledAt`, `cancelledBy`).
- FR-02b Authorized IT Staff and Administrators can assign an Action, move it through the allowed state transitions, complete it, or cancel it; Requesters cannot mutate Action state or assignment.
- FR-03 An authorized IT Staff member or Administrator can update an Action Taken with optimistic/stale-write protection; the original creation time and performer remain auditable.
- FR-04 Requesters can read Actions Taken for Tickets they own and cannot create or edit them.
- FR-05 Action history distinguishes shared/public work from internal communication where the approved UI exposes both; requester responses never reveal internal notes.
- FR-06 Follow-up note is required when `followUpRequired=true` and rejected otherwise when the contract disallows irrelevant text.
- FR-07 Attachment notes are descriptive metadata only; file upload rules remain those already approved in Lab 2/3.
- FR-08 Tickets support all eight statuses and expose only transitions permitted for the current role and source status.
- FR-09 `RESOLVED` and `CLOSED` require the documented resolution evidence/action gate; a requester indication remains advisory.
- FR-10 `CLOSED` and `CANCELLED` are terminal; invalid, repeated, or unauthorized transitions never mutate the Ticket.
- FR-11 Requester dashboard returns only owned-ticket metrics and drill-down links.
- FR-12 IT Staff dashboard returns operational queue metrics, current-user ownership, recent/urgent work, filters, and drill-down links.
- FR-13 Administrator dashboard may reuse staff metrics and may add concise account counts without exposing unauthorized data.
- FR-14 Dashboard responses contain concise metric data, not unbounded Ticket collections; empty results are valid and explicit.
- FR-15 All protected reads and writes use the authenticated session and server-side role/ownership checks.
- FR-16 Concurrent or stale updates return a safe conflict and do not silently overwrite newer work.
- FR-17 Migration preserves Lab 1–3 Users, Tickets, Attachments, Comments, Notes, categories, systems, and ticket numbers.
- FR-18 Seed data is deterministic and idempotent and covers every status, priority, assigned/unassigned ownership, and zero/one/many Actions Taken.
- FR-19 Existing authentication, requester ownership, staff queue/detail, comments, notes, attachments, and admin behavior remain regression-covered.
- FR-20 Loading, empty/no-results, validation, success, forbidden, not-found, conflict, and retryable failure states are implemented and testable.

## 5. Business rules

- BR-01 An Action Taken references one existing Ticket; deleting a Ticket removes its dependent Actions according to the established retention policy.
- BR-02 The Ticket Owner coordinates the Ticket, but any active IT Staff or Administrator authorized for that Ticket may record an Action Taken.
- BR-03 `actionDateTime` is required, stored with timezone-aware semantics, and rendered in the documented application timezone.
- BR-04 `description` and `result` are required, trimmed, length-bounded text; HTML is rendered as text.
- BR-05 `performedBy` is always the authenticated backend user and ignores client-supplied actor IDs or roles.
- BR-06 `followUpRequired=true` requires a non-empty `followUpNote`; validation errors do not create a partial Action.
- BR-07 Action history is append-only for creation metadata; updates require a version/updated-at precondition.
- BR-08 An inactive or deactivated account cannot create, update, claim, or reassign work.
- BR-09 Requesters read only Actions attached to their own Tickets; a missing or unauthorized Ticket uses the existing safe not-found behavior.
- BR-10 IT Staff and Administrators may create/update Actions on accessible Tickets; user-interface hiding is not authorization.
- BR-10a An Action starts in `OPEN`. The only permitted state transitions are `OPEN -> IN_PROGRESS`, `OPEN -> COMPLETED`, `OPEN -> CANCELLED`, and `IN_PROGRESS -> COMPLETED` or `IN_PROGRESS -> CANCELLED`. `COMPLETED` and `CANCELLED` are terminal. Assigning or reassigning an Action is allowed only for active IT Staff/Administrators and never changes its performer or audit history.
- BR-11 Status transitions are:

| From | To | Authorized role | Confirmation/evidence |
|---|---|---|---|
| `NEW` | `OPEN` | IT Staff, Administrator | no confirmation |
| `OPEN` | `IN_PROGRESS` | IT Staff, Administrator | no confirmation |
| `IN_PROGRESS` | `WAITING_FOR_REQUESTER` | IT Staff, Administrator | no confirmation |
| `WAITING_FOR_REQUESTER` | `IN_PROGRESS` | IT Staff, Administrator | no confirmation |
| `IN_PROGRESS` | `RESOLVED` | IT Staff, Administrator | resolution gate and confirmation |
| `RESOLVED` | `CLOSED` | IT Staff, Administrator | resolution gate and confirmation |
| `RESOLVED` | `REOPENED` | IT Staff, Administrator | confirmation |
| `REOPENED` | `IN_PROGRESS` | IT Staff, Administrator | no confirmation |
| `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED` | `CANCELLED` | IT Staff, Administrator | confirmation |

Any unlisted transition, Requester transition, or terminal-state transition is rejected without mutation.

- BR-12 The resolution gate requires at least one qualifying Action Taken where `state=COMPLETED`, `description` and `result` are non-empty after trimming, `completedAt` and `completedBy` are present, and the Action belongs to the Ticket. An Action in `OPEN`, `IN_PROGRESS`, or `CANCELLED` never qualifies.
- BR-12a A Ticket cannot move to `RESOLVED` or `CLOSED` while any Action on it has `followUpRequired=true` and no `followUpResolvedAt`. The follow-up is cleared only by recording the resolution timestamp/performer; the API and UI must report the outstanding Action instead of silently allowing the transition. Tests cover both a qualifying completed Action with no outstanding follow-up (allowed) and a qualifying Action with an outstanding follow-up (rejected without mutation).
- BR-13 A Requester “problem appears resolved” indication never changes formal status and never satisfies the staff resolution gate by itself.
- BR-14 Dashboard counts use the same status and ownership predicates as the detailed endpoints and are calculated server-side.
- BR-15 Dashboard date windows use UTC storage and an explicitly documented inclusive start/exclusive end boundary.
- BR-16 A dashboard card with no matching rows returns zero and an empty drill-down state, not an error or fabricated placeholder.
- BR-17 Repeated create submission or retry must not create duplicate Actions when the same idempotency key is supplied.
- BR-18 Errors use stable safe codes and never expose secrets, SQL, filesystem paths, or storage keys.
- BR-19 Migration is forward-only in normal deployment, with a tested recovery procedure that restores a database snapshot before retrying.
- BR-20 Seed upserts stable fixture identities and never deletes user-created rows or overwrites changed credentials.

## 6. UI specification summary

The detailed screen contract is in [ui-spec.md](ui-spec.md). The application continues the Lab 2/3 Zen Green language, shared controls, visible focus, semantic labels, and no page-level horizontal overflow. Desktop is `>= 992px`, tablet is `768–991px`, and mobile is `< 768px`.

- The authenticated shell adds role-aware Dashboard navigation while preserving Login, Change Password, My Tickets, Staff Queue, Staff Detail, and User Management behavior.
- Staff Ticket Detail adds an Actions Taken list, create mode, view/edit mode, validation, retry-safe failures, and a read-only requester rendering.
- Status controls display only permitted transitions, show confirmation/evidence requirements, and refresh the Ticket summary after success.
- Requester Dashboard is ownership-scoped; Staff Dashboard is operational and filterable; Administrator Dashboard retains staff behavior and permitted account summaries.
- Every screen specifies loading, empty, forbidden, not-found, conflict, retry, submitting, success, keyboard, focus, and responsive states.

## 7. Authorization matrix

| Capability | Requester | IT Staff | Administrator |
|---|---:|---:|---:|
| View Actions Taken on owned Ticket | yes | yes | yes |
| View Actions Taken on another user’s Ticket | no | yes, if accessible | yes, if accessible |
| Create/update Actions Taken | no | yes | yes |
| Change Ticket status/priority/assignment | no | yes | yes |
| Satisfy resolution gate | no | yes | yes |
| Requester dashboard | own data | no | no |
| Staff dashboard | no | own permitted queue | yes |
| Administrator account management | no | no | yes |

All write permissions are enforced by the backend. The UI is only a usability layer.

## 8. Data and migration decisions

Add `ActionTaken` with the following additive columns and relations:

| Column | Type/nullability | Constraint or relation |
|---|---|---|
| `id` | generated `Int`, not null | primary key |
| `ticketId` | `Int`, not null | FK to `Ticket.id`; cascade behavior follows the established Ticket retention policy |
| `actionDateTime` | timezone-aware `DateTime`, not null | part of stable chronological ordering |
| `description`, `result` | bounded `String`, not null | trimmed/non-empty validation |
| `state` | `ActionState`, not null, default `OPEN` | enum values `OPEN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`; terminal audit checks apply |
| `assigneeId` | `Int?` | nullable FK to `User.id` with `ON DELETE SET NULL`; target must be active IT Staff/Admin |
| `performedById` | `Int`, not null | FK to `User.id`; immutable authenticated creator/performer |
| `completedAt`, `cancelledAt` | timezone-aware `DateTime?` | nullable; only the matching terminal state may set its field |
| `completedById`, `cancelledById` | `Int?` | nullable FKs to `User.id`; immutable authenticated audit performers |
| `followUpRequired` | `Boolean`, not null, default `false` | when true, `followUpNote` is required |
| `followUpNote`, `attachmentNotes` | `String?` | nullable; irrelevant follow-up text is rejected |
| `followUpResolvedAt` | timezone-aware `DateTime?` | nullable; set only when the outstanding follow-up is resolved |
| `followUpResolvedById` | `Int?` | nullable FK to `User.id`; records the authenticated resolver |
| `idempotencyKey` | `String?` | unique per Ticket when supplied; retries cannot create a duplicate |
| `createdAt`, `updatedAt` | timezone-aware `DateTime`, not null | `updatedAt` changes on an accepted edit |
| `version` | positive `Int`, not null, default `1` | incremented atomically for optimistic concurrency |

The database uses enum/check constraints for the Action state and terminal audit invariants (a completed Action has `completedAt`/`completedById`, a cancelled Action has `cancelledAt`/`cancelledById`, and terminal audit fields are immutable). Add foreign keys to `Ticket` and `User`, indexes on `(ticketId, actionDateTime, id)`, `(performedById, actionDateTime)`, `(assigneeId, state)`, and `(state, completedAt)`, plus a scoped unique constraint on `(ticketId, idempotencyKey)` when the implementation supports idempotency keys. `Ticket.ownerId` remains the existing nullable primary-owner FK; Lab 4 does not rename it to `assigneeId`.

The migration does not rewrite existing Ticket or User identifiers. Legacy Tickets have zero Actions until new work is recorded; dashboards count them correctly. The migration is applied and verified before application code, and recovery is documented as snapshot restore plus migration retry. Seed upserts deterministic categories, systems, users, Tickets, and Actions and is safe to run twice.

Two design decisions are deliberate: (1) `performedById` is a foreign key instead of copied text so audit identity remains consistent with authorization; (2) `(ticketId, actionDateTime, id)` provides stable ordering even when two actions share a timestamp while retaining a simple Ticket-detail query plan.

## 9. API contract summary

The complete endpoint shapes are in [api-spec.md](api-spec.md). The API uses the existing `/api` base path, `{ data: ... }` success envelopes, stable `{ error: { code, message, fieldErrors? } }` failures, session-derived identity, CSRF for mutations, safe not-found behavior, and `409 CONFLICT` for invalid transitions or stale writes.

## 10. Acceptance criteria

- AC-01 Contract documents exist before implementation and link to one another.
- AC-02 A valid staff Action is stored under the selected Ticket with authenticated performer metadata.
- AC-03 Action validation rejects missing date, description, result, and conditional follow-up note.
- AC-04 Requester can read owned Actions but cannot write or read another requester’s Actions.
- AC-05 Staff/Admin can edit an Action with a current version; stale edits return conflict without mutation.
- AC-06 Seed is idempotent and demonstrates zero, one, and many Actions and every Ticket status.
- AC-07 Every listed status transition succeeds only for the permitted role and source state.
- AC-08 RESOLVED/CLOSED are blocked without qualifying resolution evidence and allowed with it.
- AC-09 Terminal and unlisted transitions are rejected without mutation.
- AC-10 Requester dashboard metrics and drill-downs are ownership-scoped and correct for zero/one/many records.
- AC-11 Staff/Admin dashboard metrics, queue filters, and drill-downs are role-scoped and correct.
- AC-12 Dashboard and Action UI cover loading, empty, validation, forbidden, not-found, conflict, retry, and success states.
- AC-13 Desktop/tablet/mobile views have no clipping, overlap, or page-level horizontal overflow.
- AC-14 Keyboard focus, labels, non-color status cues, and live-region feedback are present for all new controls.
- AC-15 Lab 1–3 server, client, and E2E regression suites remain green from the reviewed final main commit.
- AC-16 Final evidence records exact commit SHAs, real command output, screenshots, document links, and the final nine-part PDF.

## 11. Product Definition of Done

- [ ] All six Lab 4 issues follow the Kanban workflow and are formally reviewed and merged.
- [ ] Spec DD, Test DD, UI spec, API spec, reviewer record, and AI-use reflection are committed.
- [ ] Migration, seed, Actions Taken API/UI, dashboards, workflow gate, and regression tests are complete.
- [ ] Server/client/build/Playwright, migration/guarded seed, accessibility, responsive, diff-check, and secret-scan evidence passes.
- [ ] Final main contains the reviewed code and documentation; no evidence says uncommitted worktree or points to a stale SHA.
- [ ] One PDF uses exactly `Answer Part 1` through `Answer Part 9`, with readable real screenshots and working links.
- [ ] The Kanban board has all six Lab 4 issues in Done only after approval, teammate merge, and final main verification.

## 12. Assumptions and decisions

- The existing Lab 3 session and CSRF boundary remain authoritative; Lab 4 does not reintroduce requester selectors or client-supplied identity.
- Dashboard calculations are intentionally concise and link to existing detailed screens instead of introducing a reporting warehouse.
- Action editing is allowed for authorized staff/admin users, but creation metadata and audit identity remain immutable.
- The final evidence branch and PDF are produced only after all implementation PRs are merged into `lab4-staging` and the final integration is verified on `main`.
