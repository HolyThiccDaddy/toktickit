# Lab 3 API Specification

Status: Approved contract (PR #40 merged into `lab3-staging`); implementation is incremental by issue.

## Conventions

- Base path: /api.
- JSON requests and responses use UTF-8 and the standard envelope `{ data: ... }` on success.
- Failures use `{ error: { code, message, fieldErrors? } }`. Codes are stable; messages never expose secrets, SQL, filesystem paths, storage keys, or unnecessary account details.
- Browser authentication uses an opaque HttpOnly cookie named `toktickit_session`; the server resolves the user and role from the session.
- GET endpoints are safe. Every authenticated POST, PATCH, and DELETE requires the CSRF token returned by GET `/api/auth/csrf` in `X-CSRF-Token`; the public login request is the exception.
- `401 UNAUTHENTICATED` means no valid session; `403 FORBIDDEN` means a valid session lacks the role or ownership; protected ticket resources may return `404 NOT_FOUND` for both missing and unauthorized records.
- Validation is `400 VALIDATION_ERROR`; duplicate or invalid state is `409 CONFLICT`; unexpected failures are `500 INTERNAL_ERROR`.
- A session with `mustChangePassword=true` is authenticated but restricted. Until the password is changed, it may call only `/auth/me`, `/auth/csrf`, `/auth/change-password`, and `/auth/logout`. Every other protected endpoint returns `403 PASSWORD_CHANGE_REQUIRED` without performing a mutation.

## Response schemas and success status codes

New Lab 3 JSON responses use the `{ data: ... }` envelope. The following named schemas are the shared contract for the backend, frontend, and tests. Legacy Lab 2 routes temporarily retain their existing response shapes during the incremental migration described below.

- `UserSummary`: `{ id: number, email: string, displayName: string, role: "REQUESTER" | "IT_STAFF" | "ADMIN", active: boolean, mustChangePassword: boolean }`.
- `SessionData`: `{ user: UserSummary, expiresAt: string }`; the server also sets or clears the HttpOnly session cookie as described above.
- `PageMeta`: `{ page: number, pageSize: number, total: number, totalPages: number, sortBy?: string, sortDir?: "asc" | "desc" }`.
- `CategorySummary`: `{ id: number, name: string, description: string | null }`.
- `RelatedSystemSummary`: `{ id: number, name: string, description: string | null }`.
- `AttachmentSummary`: `{ id: number, originalFilename: string, mimeType: string, fileSize: number, isDeleted: boolean, createdAt: string }`; storage keys are never returned.
- `TicketSummary`: `{ id: number, ticketNumber: string, summary: string, requestedPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT", itPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT", currentStatus: "NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "RESOLVED" | "CLOSED" | "REOPENED" | "CANCELLED", requester: UserSummary, owner: UserSummary | null, createdAt: string, updatedAt: string }`.
- `TicketDetail`: `TicketSummary` plus `{ description: string, category: CategorySummary, relatedSystem: RelatedSystemSummary, requesterResolutionIndicatedAt: string | null, attachments: AttachmentSummary[], publicComments: PublicComment[], internalNotes?: InternalNote[] }`; `internalNotes` is omitted for Requesters.
- `PublicComment`: `{ id: number, ticketId: number, author: UserSummary, body: string, createdAt: string }`.
- `InternalNote`: `{ id: number, ticketId: number, author: UserSummary, body: string, createdAt: string }`.

Endpoint success contracts are:

| Method | Path | Success status and response |
|---|---|---|
| POST | `/auth/login` | `200 OK`, `{ data: SessionData }`; a must-change user receives a restricted session |
| POST | `/auth/logout` | `204 No Content`; session cookie is cleared |
| GET | `/auth/me` | `200 OK`, `{ data: UserSummary }` |
| GET | `/auth/csrf` | `200 OK`, `{ data: { csrfToken: string, expiresAt: string } }` |
| POST | `/auth/change-password` | `200 OK`, `{ data: UserSummary }` with `mustChangePassword=false` |
| GET | `/categories` | `200 OK`, `{ data: CategorySummary[] }` |
| GET | `/related-systems` | `200 OK`, `{ data: RelatedSystemSummary[] }` |
| POST | `/tickets` | `201 Created`, `{ data: TicketDetail }` |
| GET | `/tickets` | `200 OK`, `{ data: { items: TicketSummary[], meta: PageMeta } }` |
| GET | `/tickets/:ticketId` | `200 OK`, `{ data: TicketDetail }` |
| POST | `/tickets/:ticketId/attachments` | `201 Created`, `{ data: AttachmentSummary }` |
| GET | `/attachments/:attachmentId/download` | `200 OK` binary stream with safe filename and MIME headers |
| DELETE | `/attachments/:attachmentId` | `204 No Content` |
| GET | `/tickets/:ticketId/comments` | `200 OK`, `{ data: PublicComment[] }` |
| POST | `/tickets/:ticketId/comments` | `201 Created`, `{ data: PublicComment }` |
| POST | `/tickets/:ticketId/requester-resolution` | `200 OK`, `{ data: { ticketId: number, indicatedAt: string } }` |
| GET | `/staff/tickets` | `200 OK`, `{ data: { items: TicketSummary[], meta: PageMeta } }` |
| GET | `/staff/tickets/:ticketId` | `200 OK`, `{ data: TicketDetail }` with `internalNotes` |
| POST | `/staff/tickets/:ticketId/claim` | `200 OK`, `{ data: TicketDetail }` |
| PATCH | `/staff/tickets/:ticketId/assignment` | `200 OK`, `{ data: TicketDetail }` |
| PATCH | `/staff/tickets/:ticketId/priority` | `200 OK`, `{ data: TicketDetail }` |
| PATCH | `/staff/tickets/:ticketId/status` | `200 OK`, `{ data: TicketDetail }` |
| GET | `/tickets/:ticketId/notes` | `200 OK`, `{ data: InternalNote[] }` |
| POST | `/tickets/:ticketId/notes` | `201 Created`, `{ data: InternalNote }` |
| GET | `/admin/users` | `200 OK`, `{ data: UserSummary[] }` |
| POST | `/admin/users` | `201 Created`, `{ data: UserSummary }` |
| PATCH | `/admin/users/:userId` | `200 OK`, `{ data: UserSummary }` |
| POST | `/admin/users/:userId/initial-password` | `200 OK`, `{ data: { userId: number, mustChangePassword: true } }` |

## Authentication

| Method | Path | Auth | Contract |
|---|---|---|---|
| POST | /auth/login | Public | Body `{ email, password }`; wrong credentials return `401 INVALID_CREDENTIALS`. After the submitted password is verified, an inactive account returns `403 ACCOUNT_INACTIVE` and no session. An active account receives a fresh session. |
| POST | /auth/logout | Authenticated | Invalidates current session and clears cookie. |
| GET | /auth/me | Authenticated | Returns `{ data: UserSummary }`; allowed while the first-login gate is active. |
| GET | /auth/csrf | Authenticated | Returns `{ data: { csrfToken, expiresAt } }`; allowed while the first-login gate is active. |
| POST | /auth/change-password | Authenticated + CSRF | Body `{ currentPassword, newPassword }`; enforces 12–128 characters, updates scrypt hash, clears mustChangePassword, and returns `{ data: UserSummary }`. |

Login creates a fresh session after credential verification. Session expiry is eight hours. Secure is enabled in production; HttpOnly and SameSite=Lax are always enabled. No password or hash is returned.

## Requester resources

| Method | Path | Auth | Contract |
|---|---|---|---|
| GET | /categories | Authenticated | Lab 2 category list. |
| GET | /related-systems | Authenticated | Lab 2 related-system list. |
| POST | /tickets | REQUESTER + CSRF | Creates a NEW ticket owned by the session user; ignores any requester ID in body/query and initializes `itPriority` to the submitted `requestedPriority`. |
| GET | /tickets | REQUESTER | Returns only the session user's tickets with Lab 2 search, filters, sorting, and pagination. |
| GET | /tickets/:ticketId | Owner REQUESTER, IT_STAFF, or ADMIN | Returns ticket detail subject to role and ownership. |
| POST | /tickets/:ticketId/attachments | Owner REQUESTER + CSRF | Validates type, extension, magic bytes, size, count, and ownership before storing. |
| GET | /attachments/:attachmentId/download | Owner REQUESTER, IT_STAFF, or ADMIN | Streams an active attachment only after authorization. |
| DELETE | /attachments/:attachmentId | Owner REQUESTER + CSRF | Soft-removes an owned active attachment and records the reason. |
| GET | /tickets/:ticketId/comments | Owner REQUESTER, IT_STAFF, or ADMIN | Returns public comments only for a requester; staff/admin may see all public comments. |
| POST | /tickets/:ticketId/comments | Owner REQUESTER, IT_STAFF, or ADMIN + CSRF | Body `{ body }`; rejects empty/whitespace-only text and text over 2,000 characters, then creates an append-only public comment authored and timestamped by the session user. |
| POST | /tickets/:ticketId/requester-resolution | Owner REQUESTER + CSRF | Records the requester’s “problem appears resolved” indication and timestamp. |

Requester endpoints never trust `requesterId`, `ownerId`, `authorId`, or role values in client input.

## IT Staff queue and ticket operations

| Method | Path | Auth | Contract |
|---|---|---|---|
| GET | /staff/tickets | IT_STAFF or ADMIN | Shared queue with documented search, filters, sorting, and pagination. |
| GET | /staff/tickets/:ticketId | IT_STAFF or ADMIN | Staff detail including assignment, IT priority, status, public comments, and internal notes. |
| POST | /staff/tickets/:ticketId/claim | IT_STAFF or ADMIN + CSRF | Assigns the ticket to the current staff/admin user when claimable; conflict if already claimed. |
| PATCH | /staff/tickets/:ticketId/assignment | IT_STAFF or ADMIN + CSRF | Body `{ assigneeId|null }`; target must be an active IT_STAFF or ADMIN user, or null to unassign. |
| PATCH | /staff/tickets/:ticketId/priority | IT_STAFF or ADMIN + CSRF | Body `{ itPriority }`; accepts only `LOW`, `MEDIUM`, `HIGH`, or `URGENT`. |
| PATCH | /staff/tickets/:ticketId/status | IT_STAFF or ADMIN + CSRF | Body `{ status, confirm? }`; enforces the complete eight-status matrix in specification.md and requires `confirm=true` for transitions marked as requiring confirmation. |
| GET | /tickets/:ticketId/notes | IT_STAFF or ADMIN | Returns internal notes; requester receives 403/404 and never sees note content. |
| POST | /tickets/:ticketId/notes | IT_STAFF or ADMIN + CSRF | Body `{ body }`; rejects empty/whitespace-only text and text over 2,000 characters, then creates an append-only internal note authored and timestamped by the session user. |

## Administrator user management

| Method | Path | Auth | Contract |
|---|---|---|---|
| GET | /admin/users | ADMIN | Optional `q` and `role` filters. Returns safe user summaries; no passwords or session data. |
| POST | /admin/users | ADMIN + CSRF | Body `{ email, displayName, role, active, initialPassword }`; `active` is a boolean and defaults to true when omitted. Creates one-role account with mustChangePassword=true. |
| PATCH | /admin/users/:userId | ADMIN + CSRF | Body may update email, displayName, role, or active state; validates unique email, permitted role, self-deactivation/self-role-change protection, and last-admin safety. |
| POST | /admin/users/:userId/initial-password | ADMIN + CSRF | Sets a new initial password and mustChangePassword=true without returning it. |

Admin operations preserve historical tickets and authored comments/notes. An administrator cannot deactivate their own account, change their own role away from ADMIN, or deactivate the last active administrator. Deactivation never deletes a user.

## Staff queue query contract

The queue accepts `q`, `status`, `itPriority`, `assigneeId`, `categoryId`, `sortBy`, `sortDir`, `page`, and `pageSize`. Search covers ticket number, summary, category name, requester display name, and requester email. Filters cover status, IT priority, assignee, and category. Sortable fields are `ticketNumber`, `createdAt`, `updatedAt`, `status`, and `itPriority`; the default is `updatedAt` descending. `page` defaults to 1 and `pageSize` defaults to 20 with a maximum of 100. The success response is `{ data: { items, meta: { page, pageSize, total, totalPages, sortBy, sortDir } } }`. Unknown fields, invalid enum values, non-positive pages, and page sizes outside 1–100 return `400 VALIDATION_ERROR`.

## Error examples

- Missing session: HTTP 401 with code `UNAUTHENTICATED`.
- Wrong role: HTTP 403 with code `FORBIDDEN`.
- Must-change-password session calling another protected endpoint: HTTP 403 with code `PASSWORD_CHANGE_REQUIRED`.
- Unauthorized ticket lookup: HTTP 404 with code `NOT_FOUND`.
- Invalid password or field: HTTP 400 with code `VALIDATION_ERROR`.
- Duplicate email, claim race, or invalid status transition: HTTP 409 with code `CONFLICT`.
- Correct credentials for a deactivated account: HTTP 403 with code `ACCOUNT_INACTIVE`.
- Invalid queue query values: HTTP 400 with code `VALIDATION_ERROR`.
- Missing or invalid CSRF token: HTTP 403 with code `CSRF_INVALID`.

## Compatibility and migration

During the incremental Issue #36 foundation, the existing Lab 2 routes remain temporarily compatible: a request with no session may still use `X-Requester-Id` and those legacy routes keep their existing raw response shapes so the Lab 2 regression suite keeps running. As soon as any session cookie is present, the server ignores that header (including for stale or malformed cookies) and uses only the validated session identity. Issue #37 removes this compatibility path and the Development Requester selector; the authenticated requester APIs then adopt the named response envelopes above. Existing ticket, attachment, category, system, and counter identifiers remain stable through the migration.
