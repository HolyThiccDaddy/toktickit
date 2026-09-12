# Lab 3 API Specification

Status: Draft contract for peer review before implementation

## Conventions

- Base path: /api.
- JSON requests and responses use UTF-8 and the standard envelope `{ data: ... }` on success.
- Failures use `{ error: { code, message, fieldErrors? } }`. Codes are stable; messages never expose secrets, SQL, filesystem paths, storage keys, or account-existence details.
- Browser authentication uses an opaque HttpOnly cookie named `toktickit_session`; the server resolves the user and role from the session.
- GET endpoints are safe. Every POST, PATCH, and DELETE requires the CSRF token returned by GET `/api/auth/csrf` in `X-CSRF-Token`.
- `401 UNAUTHENTICATED` means no valid session; `403 FORBIDDEN` means a valid session lacks the role or ownership; protected ticket resources may return `404 NOT_FOUND` for both missing and unauthorized records.
- Validation is `400 VALIDATION_ERROR`; duplicate or invalid state is `409 CONFLICT`; unexpected failures are `500 INTERNAL_ERROR`.

## Authentication

| Method | Path | Auth | Contract |
|---|---|---|---|
| POST | /auth/login | Public | Body `{ email, password }`; creates session for an active account. Invalid or inactive accounts receive the same safe error. |
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
| POST | /tickets/:ticketId/comments | Owner REQUESTER, IT_STAFF, or ADMIN + CSRF | Body `{ body }`; creates a public comment authored by the session user. |
| POST | /tickets/:ticketId/requester-resolution | Owner REQUESTER + CSRF | Records the requester’s “problem appears resolved” indication and timestamp. |

Requester endpoints never trust `requesterId`, `ownerId`, `authorId`, or role values in client input.

## IT Staff queue and ticket operations

| Method | Path | Auth | Contract |
|---|---|---|---|
| GET | /staff/tickets | IT_STAFF or ADMIN | Shared queue with query search, status, IT priority, assignee, and requester filters. |
| GET | /staff/tickets/:ticketId | IT_STAFF or ADMIN | Staff detail including assignment, IT priority, status, public comments, and internal notes. |
| POST | /staff/tickets/:ticketId/claim | IT_STAFF + CSRF | Assigns the ticket to the current staff user when claimable; conflict if already claimed. |
| PATCH | /staff/tickets/:ticketId/assignment | IT_STAFF or ADMIN + CSRF | Body `{ assigneeId|null }`; target must be active IT_STAFF, or null to unassign. |
| PATCH | /staff/tickets/:ticketId/priority | IT_STAFF or ADMIN + CSRF | Body `{ itPriority }`; validates documented enum. |
| PATCH | /staff/tickets/:ticketId/status | IT_STAFF or ADMIN + CSRF | Body `{ status }`; enforces NEW→IN_PROGRESS→RESOLVED→CLOSED and valid RESOLVED→IN_PROGRESS reopen only. |
| GET | /tickets/:ticketId/notes | IT_STAFF or ADMIN | Returns internal notes; requester receives 403/404 and never sees note content. |
| POST | /tickets/:ticketId/notes | IT_STAFF or ADMIN + CSRF | Body `{ body }`; creates an internal note authored by the session user. |

## Administrator user management

| Method | Path | Auth | Contract |
|---|---|---|---|
| GET | /admin/users | ADMIN | Optional `q` and `role` filters. Returns safe user summaries; no passwords or session data. |
| POST | /admin/users | ADMIN + CSRF | Body `{ email, displayName, role, initialPassword }`; creates one-role account with mustChangePassword=true. |
| PATCH | /admin/users/:userId | ADMIN + CSRF | Body may update email, displayName, role, or active state; validates unique email and last-admin safety. |
| POST | /admin/users/:userId/initial-password | ADMIN + CSRF | Sets a new initial password and mustChangePassword=true without returning it. |

Admin operations preserve historical tickets and authored comments/notes. An administrator cannot deactivate the last active administrator.

## Error examples

- Missing session: HTTP 401 with code `UNAUTHENTICATED`.
- Wrong role: HTTP 403 with code `FORBIDDEN`.
- Unauthorized ticket lookup: HTTP 404 with code `NOT_FOUND`.
- Invalid password or field: HTTP 400 with code `VALIDATION_ERROR`.
- Duplicate email, claim race, or invalid status transition: HTTP 409 with code `CONFLICT`.
- Missing or invalid CSRF token: HTTP 403 with code `CSRF_INVALID`.

## Compatibility and migration

Lab 2 routes keep their response shapes where practical, but requester identity is now session-derived rather than supplied through `X-Requester-Id`. Existing ticket, attachment, category, system, and counter identifiers remain stable through the migration.
