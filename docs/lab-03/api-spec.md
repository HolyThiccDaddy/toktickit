# Lab 3 API Specification

Status: Draft contract for peer review before implementation

## Conventions

- Base path: /api.
- JSON requests and responses use UTF-8 and the standard envelope `{ data: ... }` on success.
- Failures use `{ error: { code, message, fieldErrors? } }`. Codes are stable; messages never expose secrets, SQL, filesystem paths, storage keys, or unnecessary account details.
- Browser authentication uses an opaque HttpOnly cookie named `toktickit_session`; the server resolves the user and role from the session.
- GET endpoints are safe. Every authenticated POST, PATCH, and DELETE requires the CSRF token returned by GET `/api/auth/csrf` in `X-CSRF-Token`; the public login request is the exception.
- `401 UNAUTHENTICATED` means no valid session; `403 FORBIDDEN` means a valid session lacks the role or ownership; protected ticket resources may return `404 NOT_FOUND` for both missing and unauthorized records.
- Validation is `400 VALIDATION_ERROR`; duplicate or invalid state is `409 CONFLICT`; unexpected failures are `500 INTERNAL_ERROR`.

## Authentication

| Method | Path | Auth | Contract |
|---|---|---|---|
| POST | /auth/login | Public | Body `{ email, password }`; wrong credentials return `401 INVALID_CREDENTIALS`. After the submitted password is verified, an inactive account returns `403 ACCOUNT_INACTIVE` and no session. An active account receives a fresh session. |
| POST | /auth/logout | Authenticated | Invalidates current session and clears cookie. |
| GET | /auth/me | Authenticated | Returns `{ id, email, displayName, role, mustChangePassword, active }`. |
| GET | /auth/csrf | Authenticated | Returns a short-lived CSRF token bound to the session. |
| POST | /auth/change-password | Authenticated + CSRF | Body `{ currentPassword, newPassword }`; enforces 12–128 characters, updates scrypt hash, and clears mustChangePassword. |

Login creates a fresh session after credential verification. Session expiry is eight hours. Secure is enabled in production; HttpOnly and SameSite=Lax are always enabled. No password or hash is returned.

## Requester resources

| Method | Path | Auth | Contract |
|---|---|---|---|
| GET | /categories | Authenticated | Lab 2 category list. |
| GET | /related-systems | Authenticated | Lab 2 related-system list. |
| POST | /tickets | REQUESTER + CSRF | Creates a NEW ticket owned by the session user; ignores any requester ID in body/query. |
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
| PATCH | /staff/tickets/:ticketId/priority | IT_STAFF or ADMIN + CSRF | Body `{ itPriority }`; validates documented enum. |
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
- Unauthorized ticket lookup: HTTP 404 with code `NOT_FOUND`.
- Invalid password or field: HTTP 400 with code `VALIDATION_ERROR`.
- Duplicate email, claim race, or invalid status transition: HTTP 409 with code `CONFLICT`.
- Correct credentials for a deactivated account: HTTP 403 with code `ACCOUNT_INACTIVE`.
- Invalid queue query values: HTTP 400 with code `VALIDATION_ERROR`.
- Missing or invalid CSRF token: HTTP 403 with code `CSRF_INVALID`.

## Compatibility and migration

Lab 2 routes keep their response shapes where practical, but requester identity is now session-derived rather than supplied through `X-Requester-Id`. Existing ticket, attachment, category, system, and counter identifiers remain stable through the migration.
