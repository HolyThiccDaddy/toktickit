# Lab 3 Sprint Engineering Specification

Status: Draft contract for peer review before implementation

## 1. Sprint goal

Replace Lab 2's temporary requester selector with authenticated, role-aware TokTickIT workflows. Preserve Lab 2 ticket creation, requester-owned My Tickets, read-only Ticket Detail, and attachment rules while adding Requester, IT Staff, and Administrator capabilities.

## 2. Stakeholder request

TokTickIT needs a small internal service-desk workflow. Requesters must sign in and manage only their tickets. IT Staff must work a shared queue, claim or reassign tickets, set IT priority, move tickets through permitted statuses, and communicate through public comments and internal notes. Administrators must manage users and roles safely. The server remains the authority for identity and authorization.

## 3. Scope

### Included

- Real email/password login, logout, current-session lookup, and secure password change.
- First-login password-change gate for accounts provisioned with an initial password.
- Exactly one role per user: REQUESTER, IT_STAFF, or ADMIN.
- Authenticated requester regression of Lab 2 ticket and attachment behavior.
- Requester-owned public comments and a Problem appears resolved indication.
- IT Staff shared queue with search/filter, claim/reassign, IT priority, allowed status transitions, public comments, and internal notes.
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
- FR-09 IT Staff can open a shared queue containing tickets regardless of requester, with safe search and filters.
- FR-10 IT Staff can view ticket detail, claim an unclaimed ticket, and reassign it to an eligible IT Staff user.
- FR-11 IT Staff can set IT priority and perform only the status transitions allowed by the contract.
- FR-12 IT Staff can add public comments and internal notes; internal notes are never visible to requesters.
- FR-13 Administrators can list/search/filter users, create users with one role, edit email/name/role where valid, activate/deactivate, and reset an initial password.
- FR-14 Deactivation prevents new login and access while preserving historical ticket ownership and authored communication.
- FR-15 The migration preserves Lab 2 ticket, attachment, category, system, requester, and counter data.
- FR-16 Tests and evidence map every acceptance criterion to an executed check before release.

## 5. Business rules and security

- BR-01 Passwords are never stored or returned in plaintext. Use Node crypto.scrypt with a unique salt and constant-time verification.
- BR-02 Password length is 12–128 characters; login errors do not reveal whether an email exists.
- BR-03 Use an opaque server-side session cookie named toktickit_session. Sessions expire after 8 hours, are HttpOnly and SameSite=Lax, and are Secure in production.
- BR-04 State-changing requests require a server-issued CSRF token sent in a dedicated header; GET requests remain safe and non-mutating.
- BR-05 Role and user identity come only from the validated session. UI hiding is not authorization.
- BR-06 Requester resources are owner-scoped. Missing or unauthorized ticket/attachment access uses the same safe not-found response.
- BR-07 Only IT_STAFF can access queue and staff operations; only ADMIN can access user administration.
- BR-08 Status starts at NEW. Allowed transitions are NEW to IN_PROGRESS, IN_PROGRESS to RESOLVED, RESOLVED to CLOSED, and RESOLVED to IN_PROGRESS for a valid reopen. No other transition is accepted.
- BR-09 IT priority is separate from requester priority and accepts the documented enum only.
- BR-10 Public comments are visible to the ticket requester and IT Staff; internal notes are visible only to IT Staff and administrators.
- BR-11 Deactivated users cannot log in, claim, reassign, or create new protected content.
- BR-12 Admin cannot deactivate the last active administrator.
- BR-13 All validation, authentication, authorization, conflict, and server errors use stable codes and safe messages without secrets, SQL, paths, or storage keys.
- BR-14 Seeds are deterministic and idempotent, include one admin, one IT Staff user, active/inactive requesters, and test tickets without leaking real credentials.

## 6. Authorization matrix

| Capability | Requester | IT Staff | Administrator |
|---|---:|---:|---:|
| Login/logout/current session | Yes | Yes | Yes |
| Own ticket create/list/detail/attachments | Own only | Queue access | Queue/admin access |
| Other user's ticket | No | Yes | Yes |
| Public comments | Own tickets | Any queue ticket | Any ticket |
| Internal notes | No | Any queue ticket | Any ticket |
| Claim/reassign/IT priority/status | No | Yes | Yes |
| User management | No | No | Yes |

## 7. Migration and implementation choices

Extend the existing requester identity into a single User model (or an equivalent transactional rename/map) while preserving primary keys and all foreign-key relationships. Add role, passwordHash, mustChangePassword, active, and timestamps. Add AuthSession, ticket assignee, IT priority, requesterResolutionIndicatedAt, status values, PublicComment, and InternalNote. Apply the migration before application code is released, preserve existing Lab 2 records, and provide deterministic seed users for every role. Remove the Lab 2 x-requester-id trust boundary after session authentication is live.

## 8. Acceptance criteria

- AC-01 A valid active user can log in and receives the correct role-aware shell.
- AC-02 Invalid credentials and inactive users receive a safe failure and no authenticated session.
- AC-03 A first-login user can do only the password change until it succeeds.
- AC-04 Session expiry/logout blocks protected API and UI access.
- AC-05 Requester Lab 2 flows still work and remain owner-isolated.
- AC-06 Requester public comments and resolution indication persist and display correctly.
- AC-07 IT Staff queue supports the required search/filter and responsive states.
- AC-08 IT Staff claim/reassign, IT priority, and valid/invalid status transitions enforce authorization.
- AC-09 Public comments and internal notes obey visibility rules.
- AC-10 Admin user management supports list/search/filter/create/edit/activate/deactivate/reset.
- AC-11 Last-active-admin protection and deactivated-user protection work.
- AC-12 Migration preserves Lab 2 data and seed is deterministic/idempotent.
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
