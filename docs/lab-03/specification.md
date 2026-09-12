# Lab 3 Sprint Engineering Specification

Status: Approved contract (PR #40 merged into `lab3-staging`); implementation is incremental by issue.

## 1. Sprint goal

Replace Lab 2's temporary requester selector with authenticated, role-aware TokTickIT workflows. Preserve Lab 2 ticket creation, requester-owned My Tickets, read-only Ticket Detail, and attachment rules while adding Requester, IT Staff, and Administrator capabilities.

## 2. Stakeholder request

TokTickIT needs a small internal service-desk workflow. Requesters must sign in and manage only their tickets. IT Staff must work a shared queue, claim or reassign tickets, set IT priority, move tickets through permitted statuses, and communicate through public comments and internal notes. Administrators must manage users and roles safely. For this contract the authorization matrix explicitly permits Administrators to perform the same Ticket operations as IT Staff; this is an approved matrix decision, not an automatic consequence of the Administrator role. The server remains the authority for identity and authorization.

## 3. Scope

### Included

- Real email/password login, logout, current-session lookup, and secure password change.
- First-login password-change gate for accounts provisioned with an initial password.
- Exactly one role per user: REQUESTER, IT_STAFF, or ADMIN.
- Authenticated requester regression of Lab 2 ticket and attachment behavior.
- Requester-owned public comments and a Problem appears resolved indication.
- IT Staff shared queue with search/filter/sort/pagination, claim/reassign, IT priority, allowed status transitions, public comments, and internal notes. The approved matrix also permits Administrators to use these Ticket operations.
- Minimal administrator user list, search and role filter, create/edit, activate/deactivate, and initial-password reset.
- Server-side authorization on every protected endpoint and screen.
- Database migration, deterministic fixtures, automated tests, responsive evidence, and release traceability.

### Excluded

- Email invitations or email password reset, MFA, social login, SSO, and self-registration.
- Actions Taken, SLA/escalation/notification engines, dashboards/KPIs, multi-tenant organizations, production/cloud deployment.
- Multiple roles per user, user deletion, bulk import/export, role history, account audit history, extended profiles, advanced recovery, or mandatory pagination/sorting/multi-filter for the admin user list.

## 4. Functional requirements

- FR-01 Login accepts email and password and returns the authenticated session or a safe authentication error.
- FR-02 Logout invalidates the current session; unauthenticated requests cannot use protected resources.
- FR-03 The application exposes the current user and role, and blocks normal navigation until a must-change-password user completes the change.
- FR-04 Password change validates the policy, replaces the password hash, clears the first-login flag, and prevents reuse of the initial password.
- FR-05 Every protected API derives identity from the server-side session; client-supplied requester or role IDs are ignored.
- FR-06 Requesters retain Lab 2 create, list, detail, attachment, search, filtering, sorting, and pagination behavior for their own records only.
- FR-07 A requester cannot read, query, update, comment on, or manage another requester's ticket or attachment.
- FR-08 Requesters can add public comments and mark a ticket as appearing resolved; the action is auditable by timestamp.
- FR-09 IT Staff and Administrators can open a shared queue containing tickets regardless of requester, with documented search, filters, sorting, pagination, and safe query errors.
- FR-10 IT Staff and Administrators can view ticket detail, claim an unclaimed ticket, and reassign it to an eligible active IT Staff or Administrator user.
- FR-11 IT Staff and Administrators can set IT priority and perform only the status transitions allowed by the contract.
- FR-12 IT Staff and Administrators can add append-only public comments and internal notes; public comments are visible to the Requester, IT Staff, and Administrator, while internal notes are never visible to requesters.
- FR-13 Administrators can list/search/filter users, create users with one role and an activation state, edit email/name/role/activation where valid, activate/deactivate, and reset an initial password.
- FR-14 Deactivation prevents new login and access while preserving historical ticket ownership and authored communication.
- FR-15 The migration preserves Lab 2 ticket, attachment, category, system, requester, and counter data.
- FR-16 Tests and evidence map every acceptance criterion to an executed check before release.

## 5. Business rules and security

- BR-01 Passwords are never stored or returned in plaintext. Use Node crypto.scrypt with a unique salt and constant-time verification.
- BR-02 Password length is 12–128 characters. Wrong credentials return a generic safe error; only after the submitted password is verified may an inactive account receive the distinct `ACCOUNT_INACTIVE` response, with no session created.
- BR-03 Use an opaque server-side session cookie named toktickit_session. Sessions expire after 8 hours, are HttpOnly and SameSite=Lax, and are Secure in production.
- BR-04 State-changing requests require a server-issued CSRF token sent in a dedicated header; GET requests remain safe and non-mutating.
- BR-05 Role and user identity come only from the validated session. UI hiding is not authorization.
- BR-06 Requester resources are owner-scoped. Missing or unauthorized ticket/attachment access uses the same safe not-found response.
- BR-07 IT_STAFF and ADMIN can access the shared queue and Ticket operations because the approved authorization matrix explicitly grants both roles those capabilities. Only ADMIN can access user administration.
- BR-08 Status starts at NEW and uses the required enum NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CLOSED, REOPENED, and CANCELLED. Only IT_STAFF or ADMIN may change status, and every change must match this matrix:

| From | To | Permitted role | Confirmation | Invalid behavior |
|---|---|---|---|---|
| NEW | OPEN | IT_STAFF, ADMIN | No | 409 `CONFLICT`; no mutation |
| OPEN | IN_PROGRESS | IT_STAFF, ADMIN | No | 409 `CONFLICT`; no mutation |
| IN_PROGRESS | WAITING_FOR_REQUESTER | IT_STAFF, ADMIN | No | 409 `CONFLICT`; no mutation |
| WAITING_FOR_REQUESTER | IN_PROGRESS | IT_STAFF, ADMIN | No | 409 `CONFLICT`; no mutation |
| IN_PROGRESS | RESOLVED | IT_STAFF, ADMIN | Yes | 409 `CONFLICT`; no mutation |
| RESOLVED | CLOSED | IT_STAFF, ADMIN | Yes | 409 `CONFLICT`; no mutation |
| RESOLVED | REOPENED | IT_STAFF, ADMIN | Yes | 409 `CONFLICT`; no mutation |
| REOPENED | IN_PROGRESS | IT_STAFF, ADMIN | No | 409 `CONFLICT`; no mutation |
| NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED | CANCELLED | IT_STAFF, ADMIN | Yes | 409 `CONFLICT`; no mutation |

Closed and Cancelled are terminal. Any transition not listed above, or any transition requested by a Requester, is rejected without mutation. The Requester “problem appears resolved” indication never changes formal status.
- BR-09 IT Priority is separate from Requested Priority and uses the shared enum `LOW`, `MEDIUM`, `HIGH`, or `URGENT`. A newly migrated or created Ticket copies `requestedPriority` to `itPriority`; only IT_STAFF or ADMIN may change it later.
- BR-10 Public comments are visible to the ticket requester, IT Staff, and Administrator; internal notes are visible only to IT Staff and Administrator. Both are append-only, record backend author and creation time, reject empty or whitespace-only content, enforce a 2,000-character maximum to keep operational messages readable and payloads bounded, and render user text safely without interpreting HTML.
- BR-11 Deactivated users cannot log in, claim, reassign, or create new protected content.
- BR-12 An Administrator cannot deactivate their own account, change their own role away from ADMIN, or deactivate/remove the last active Administrator. Deactivation is used instead of deletion.
- BR-13 All validation, authentication, authorization, conflict, and server errors use stable codes and safe messages without secrets, SQL, paths, or storage keys.
- BR-14 Seeds are deterministic and idempotent: at least four active and one inactive Requester, at least three active and one inactive IT Staff user, and at least one active Administrator. They include realistic assigned and unassigned Tickets across the required statuses and priorities plus example Public Comments and Internal Notes. Seed credentials are local-development-only and are not real secrets.

## 6. Authorization matrix

| Capability | Requester | IT Staff | Administrator |
|---|---:|---:|---:|
| Login/logout/current session | Yes | Yes | Yes |
| Own ticket create/list/detail/attachments | Own only | Queue access | Queue/admin access |
| Other user's ticket | No | Yes | Yes |
| Public comments | Own tickets | Any queue ticket | Any ticket |
| Internal notes | No | Any queue ticket | Any ticket |
| Claim/reassign/IT priority/status | No | Yes | Yes, by explicit matrix grant |
| User management | No | No | Yes |

## 7. Migration and implementation choices

Extend the existing requester identity into a single canonical User model (or an equivalent transactional rename/map) while preserving primary keys and all foreign-key relationships. Existing Development Requesters become REQUESTER users with active=true and mustChangePassword=true; their Ticket requester foreign keys remain unchanged. Assign deterministic local-only initial passwords and document the change-password path without committing secrets. Add role, passwordHash, mustChangePassword, active, and timestamps. Add AuthSession, ticket assignee, IT priority, requesterResolutionIndicatedAt, status values, PublicComment, and InternalNote. Apply and verify the migration before application code is released and preserve all Lab 2 records. The Issue #36 foundation keeps the legacy RequesterUser mirror and header compatibility only for unauthenticated Lab 2 regression calls; a validated session always wins and stale cookies never fall back to that header. Issue #37 removes the Development Requester selector and the remaining `X-Requester-Id` trust boundary.

### 7.1 Data-model decisions

The migration keeps the existing integer identifiers so Lab 2 foreign keys and ticket numbers remain stable. One User has exactly one role; user deactivation is used instead of deletion so historical ownership and authored communication remain queryable.

| Model / field | Type and nullability | Relationship / behavior | Indexes and deletion behavior |
|---|---|---|---|
| `User.id` | `Int` primary key | Preserves the existing `RequesterUser.id` values | Primary key; referenced records use `RESTRICT` because users are not deleted |
| `User.email` | `String` required, unique | Login identifier, normalized before uniqueness validation | Unique index |
| `User.displayName` | `String` required | Migrated from the Lab 2 requester name | — |
| `User.role` | Enum `REQUESTER \| IT_STAFF \| ADMIN` required | Exactly one role per user | Index for Admin user filtering |
| `User.passwordHash` | `String` required | Node `scrypt` hash; never returned or stored plaintext | — |
| `User.mustChangePassword` | `Boolean` required, default `true` for provisioned users | Blocks normal application access until changed | Index with `active` for login checks |
| `User.active` | `Boolean` required, default `true` | Deactivation blocks login and protected operations without deleting history | Index with `role` |
| `User.createdAt`, `updatedAt` | `DateTime` required | Backend-managed timestamps | — |
| `AuthSession` | `id String/UUID` PK, `tokenHash String` unique, `userId Int` required, `expiresAt DateTime` required, `revokedAt DateTime?`, `createdAt DateTime` | Many sessions belong to one User; logout sets `revokedAt` | Unique `tokenHash`; index `[userId, expiresAt]`; session rows may cascade on explicit user removal, which the API does not expose |
| `Ticket.requesterId` | `Int` required FK to `User.id` | One Requester owns many submitted Tickets; existing values are preserved | Existing requester indexes remain; requester deletion is restricted |
| `Ticket.ownerId` | `Int?` nullable FK to `User.id` | Zero or one primary owner; target must be active IT_STAFF or ADMIN | Index `[ownerId, currentStatus]`; owner deletion is restricted and deactivation leaves history intact |
| `Ticket.itPriority` | Enum `LOW \| MEDIUM \| HIGH \| URGENT` required | Initially copies `requestedPriority`; mutable only by IT_STAFF/ADMIN | Index `[currentStatus, itPriority, updatedAt]` |
| `Ticket.currentStatus` | Enum `NEW \| OPEN \| IN_PROGRESS \| WAITING_FOR_REQUESTER \| RESOLVED \| CLOSED \| REOPENED \| CANCELLED`, default `NEW` | Validated by BR-08; CLOSED/CANCELLED are terminal | Included in queue index above |
| `Ticket.requesterResolutionIndicatedAt` | `DateTime?` nullable | Records the Requester indication without changing formal status | Index optional; no cascade side effect |
| `PublicComment` | `id Int` PK, `ticketId Int` required FK, `authorId Int` required FK, `body String` required, `createdAt DateTime` required | One Ticket has many comments; each comment has one User author; append-only | Index `[ticketId, createdAt]`; deleting a Ticket cascades its comments, while User deletion is restricted |
| `InternalNote` | `id Int` PK, `ticketId Int` required FK, `authorId Int` required FK, `body String` required, `createdAt DateTime` required | One Ticket has many notes; each note has one IT_STAFF/ADMIN author; append-only | Index `[ticketId, createdAt]`; deleting a Ticket cascades its notes, while User deletion is restricted |

Migration sets `User.role=REQUESTER`, maps the existing requester name/email/active fields, and writes a non-login `__MIGRATION_PENDING__` marker. The immediately following idempotent seed replaces that marker with deterministic local-only scrypt hashes, sets `mustChangePassword=true`, copies `requestedPriority` into the new `itPriority`, and preserves all requester/category/system/attachment/counter keys. The Issue #36 foundation records the canonical session boundary while Issue #37 removes the Development Requester selector after the authenticated requester regression is in place.

## 8. Acceptance criteria

- AC-01 A valid active user can log in and receives the correct role-aware shell.
- AC-02 Invalid credentials receive a generic safe failure; a correct password for an inactive user receives `ACCOUNT_INACTIVE`; neither path creates an authenticated session.
- AC-03 A first-login user can do only the password change until it succeeds.
- AC-04 Session expiry/logout blocks protected API and UI access.
- AC-05 Requester Lab 2 flows still work and remain owner-isolated.
- AC-06 A Requester can add a valid public comment and “problem appears resolved” indication on an owned Ticket; another Requester is rejected, and the indication does not set formal status to RESOLVED or CLOSED.
- AC-07 IT Staff and explicitly authorized Administrators can use queue search, filters, sorting, pagination, ownership/status/priority data, responsive states, and safe invalid-query feedback.
- AC-08 IT Staff and Administrators can claim/reassign only to an active eligible owner, set IT Priority to one of `LOW|MEDIUM|HIGH|URGENT`, and enforce every valid/invalid status transition and confirmation rule in BR-08.
- AC-09 Public comments and internal notes obey visibility rules.
- AC-10 Admin user management supports list/search/filter/create/edit/activate/deactivate/reset, including one role and an explicit activation state on creation.
- AC-11 Self-deactivation, self-role-change, last-active-admin protection, inactive-user protection, duplicate-email rejection, and invalid-role rejection work server-side.
- AC-12 Migration preserves Lab 2 data, copies Requested Priority into IT Priority, and seed is deterministic/idempotent.
- AC-13 Every protected API rejects missing/forged identity and unauthorized role access.
- AC-14 Desktop, tablet, and mobile screens have no clipping, overlap, or horizontal overflow.
- AC-15 Required unit, API, UI, style, responsive, security, migration, and E2E checks pass before release.

## 9. Definition of done

- [ ] Contract documents reviewed and linked to GitHub issues.
- [ ] Migration and implementation tests pass twice where determinism matters.
- [ ] Server/client builds and the complete E2E suite pass.
- [ ] Security and ownership cases are covered by executable tests.
- [ ] Required screenshots and terminal logs are captured from real runs.
- [ ] Reviewer record, AI-use record, release PR, and final PDF evidence are updated from main.

## 10. Assumptions to confirm in review

- Use opaque cookie sessions rather than JWT in browser storage.
- Use crypto.scrypt from Node's standard library; no external identity provider.
- One role per account is sufficient for Lab 3.
- Existing Lab 2 requester accounts receive deterministic development passwords and must-change-password state.
- The final report keeps the Lab 2 Answer Part 1–9 evidence structure while adding Lab 3 evidence.
